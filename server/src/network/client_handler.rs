use crate::logic::combat::handle_attack;
use crate::models::*;
use bcrypt::{DEFAULT_COST, hash, verify};
use bigdecimal::{BigDecimal, FromPrimitive};
use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
use sqlx::{PgPool, Row};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;

pub type PlayersMap = Arc<DashMap<String, PlayerState>>;
pub type ItemsMap = Arc<DashMap<i32, ItemData>>;
pub type MapsMap = Arc<DashMap<i32, MapData>>;
pub type NpcsMap = Arc<DashMap<i32, NpcData>>;
pub type ClassesMap = Arc<DashMap<i32, ClassData>>;
pub type SkillsMap = Arc<DashMap<i32, SkillData>>;

/// จัดการการเชื่อมต่อ WebSocket ของ Client
pub async fn handle_client(
    ws_stream: tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    pool: PgPool,
    players: PlayersMap,
    items: ItemsMap,
    maps: MapsMap,
    npcs: NpcsMap,
    classes: ClassesMap,
    skills: SkillsMap,
    active_connections: ActiveConnections,
) {
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();

    // Spawn write task
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    let mut player_id = String::new();

    let connection_id = uuid::Uuid::new_v4().to_string();

    while let Some(msg_result) = ws_receiver.next().await {
        if let Ok(msg) = msg_result {
            if let Message::Text(text) = msg {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(&text) {
                    match data["type"].as_str() {
                        Some("register") => {
                            handle_register(&tx, &pool, &data).await;
                        }
                        Some("login") => {
                            if let Some(pid) =
                                handle_login(&tx, &pool, &active_connections, &data).await
                            {
                                player_id = pid;
                            }
                        }
                        Some("move") => {
                            let pid = data["player_id"].as_str().unwrap_or("").to_string();
                            if pid == player_id || (!player_id.is_empty() && pid.is_empty()) {
                                handle_move(&tx, &player_id, &players, &active_connections, &data)
                                    .await;
                            }
                        }
                        Some("attack") => {
                            let pid = data["player_id"].as_str().unwrap_or("").to_string();
                            handle_attack(&pid, &players, &npcs);
                        }
                        Some("cast_skill") => {
                            // player_id = data["player_id"].as_str().unwrap_or("").to_string();
                            // จัดการสกิล
                        }
                        Some("save_item") => {
                            handle_save_item(&tx, &items, &data).await;
                        }
                        Some("save_npc") => {
                            handle_save_npc(&tx, &pool, &npcs, &data).await;
                        }
                        Some("save_class") => {
                            handle_save_class(&tx, &classes, &data).await;
                        }
                        Some("save_skill") => {
                            handle_save_skill(&tx, &skills, &data).await;
                        }
                        Some("save_map") => {
                            handle_save_map(&tx, &pool, &maps, &data).await;
                        }
                        Some("load_item") => {
                            handle_load_items(&tx, &items).await;
                        }
                        Some("load_npc") => {
                            handle_load_npcs(&tx, &npcs).await;
                        }
                        Some("load_classes") => {
                            handle_load_classes(&tx, &pool, &classes).await;
                        }
                        Some("load_skill") => {
                            handle_load_skills(&tx, &skills).await;
                        }
                        Some("load_map") => {
                            handle_load_maps(&tx, &pool).await;
                        }
                        Some("create_character") => {
                            handle_create_character(&tx, &pool, &players, &classes, &data).await;
                        }
                        Some("load_characters") => {
                            handle_load_characters(&tx, &pool, &data).await;
                        }
                        Some("select_character") => {
                            if let Some(pid) = handle_select_character(
                                &tx,
                                &pool,
                                &players,
                                &classes,
                                &active_connections,
                                &data,
                                &connection_id,
                            )
                            .await
                            {
                                player_id = pid;
                            }
                        }
                        Some("logout") => {
                            break;
                        }
                        _ => {}
                    }
                }
            }
        } else {
            break;
        }
    }

    // Cleanup
    if !player_id.is_empty() {
        // Only remove if the current connection is the one that registered
        let should_remove = if let Some(conn) = active_connections.get(&player_id) {
            conn.1 == connection_id
        } else {
            false
        };

        if should_remove {
            println!("Player {} disconnected (Clean exit)", player_id);
            players.remove(&player_id);
            active_connections.remove(&player_id);

            let response = serde_json::json!({
                 "type": "player_left",
                 "player_id": player_id
            });
            let response_str = response.to_string();
            for entry in active_connections.iter() {
                let (other_tx, _) = entry.value();
                let _ = other_tx.send(Message::Text(response_str.clone().into()));
            }
        } else {
            println!(
                "Player {} disconnected (Replaced or already gone)",
                player_id
            );
        }
    }
}

/// จัดการการสมัครสมาชิก
async fn handle_register(
    tx: &mpsc::UnboundedSender<Message>,
    pool: &PgPool,
    data: &serde_json::Value,
) {
    let username = data["username"].as_str().unwrap_or("");
    let password = data["password"].as_str().unwrap_or("");

    // Server-side validation
    if username.trim().is_empty() {
        let _ = tx.send(Message::Text(
            serde_json::json!({
                "type": "register_error",
                "message": "กรุณากรอกชื่อผู้ใช้"
            })
            .to_string()
            .into(),
        ));
        return;
    }

    if password.trim().is_empty() {
        let _ = tx.send(Message::Text(
            serde_json::json!({
                "type": "register_error",
                "message": "กรุณากรอกรหัสผ่าน"
            })
            .to_string()
            .into(),
        ));
        return;
    }

    if password.len() < 6 {
        let _ = tx.send(Message::Text(
            serde_json::json!({
                "type": "register_error",
                "message": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
            })
            .to_string()
            .into(),
        ));
        return;
    }

    // ตรวจสอบว่า username ซ้ำหรือไม่ในตาราง players
    let username_exists =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE username = $1")
            .bind(username.trim())
            .fetch_one(pool)
            .await;

    if let Ok(count) = username_exists {
        if count > 0 {
            let _ = tx.send(Message::Text(
                serde_json::json!({
                    "type": "register_error",
                    "message": "ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว"
                })
                .to_string()
                .into(),
            ));
            return;
        }
    }

    // เข้ารหัสรหัสผ่านด้วย bcrypt
    let password_hash = match hash(password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => {
            let _ = tx.send(Message::Text(
                serde_json::json!({
                    "type": "register_error",
                    "message": "เกิดข้อผิดพลาดในการเข้ารหัสรหัสผ่าน"
                })
                .to_string()
                .into(),
            ));
            return;
        }
    };

    // บันทึกข้อมูลผู้ใช้ลงฐานข้อมูล
    let insert_result = sqlx::query(
        "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3::user_role)",
    )
    .bind(username.trim())
    .bind(&password_hash)
    .bind("user")
    .execute(pool)
    .await;

    match insert_result {
        Ok(_) => {
            println!("ผู้ใช้ใหม่สมัครสมาชิกสำเร็จ: username={}", username);

            let _ = tx.send(Message::Text(
                serde_json::json!({
                    "type": "register_success",
                    "role": "user",
                    "message": "สมัครสมาชิกสำเร็จ"
                })
                .to_string()
                .into(),
            ));
        }
        Err(e) => {
            eprintln!("Error inserting user: {:?}", e);
            let _ = tx.send(Message::Text(
                serde_json::json!({
                    "type": "register_error",
                    "message": "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
                })
                .to_string()
                .into(),
            ));
        }
    }
}

/// ตรวจสอบและสร้างแผนที่เริ่มต้นถ้ายังไม่มี
async fn ensure_default_map(pool: &PgPool) -> Option<MapData> {
    // เช็คว่ามีแผนที่หรือยัง
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM maps")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    if count == 0 {
        println!("ไม่พบแผนที่ สร้างแผนที่เริ่มต้น...");
        let default_map = MapData {
            id: Some(1),
            name: "Default Map".to_string(),
            description: "A starter map".to_string(),
            width: 20,
            height: 20,
            tiles: serde_json::json!([]),
            spawn_points: serde_json::json!(vec![serde_json::json!({"x": 10, "y": 10})]),
            npcs: serde_json::json!([]),
        };

        let tiles_json = serde_json::to_value(&default_map.tiles).unwrap();
        let npcs_json = serde_json::to_value(&default_map.npcs).unwrap();

        let result = sqlx::query(
            "INSERT INTO maps (id, name, description, width, height, tiles, npcs) VALUES ($1, $2, $3, $4, $5, $6, $7)"
        )
        .bind(default_map.id)
        .bind(&default_map.name)
        .bind(&default_map.description)
        .bind(default_map.width)
        .bind(default_map.height)
        .bind(&tiles_json)
        .bind(&npcs_json)
        .execute(pool)
        .await;

        if let Err(e) = result {
            println!("Error creating default map: {}", e);
        }
    }

    // ดึงแผนที่แรกมา
    let map_row = sqlx::query(
        "SELECT id, name, description, width, height, tiles, spawn_points, npcs FROM maps ORDER BY id LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    if let Some(row) = map_row {
        Some(MapData {
            id: Some(row.get("id")),
            name: row.get("name"),
            description: row.get("description"),
            width: row.get("width"),
            height: row.get("height"),
            tiles: row.get("tiles"),
            spawn_points: row.get("spawn_points"),
            npcs: row.get("npcs"),
        })
    } else {
        None
    }
}

async fn handle_login(
    tx: &mpsc::UnboundedSender<Message>,
    pool: &PgPool,
    active_connections: &ActiveConnections,
    data: &serde_json::Value,
) -> Option<String> {
    let username = data["username"].as_str().unwrap_or("");
    let password = data["password"].as_str().unwrap_or("");

    println!("พยายามเข้าสู่ระบบ: username={}", username);

    // Server-side validation
    if username.trim().is_empty() {
        let _ = tx.send(Message::Text(
            serde_json::json!({
                "type": "login_error",
                "message": "กรุณากรอกชื่อผู้ใช้"
            })
            .to_string()
            .into(),
        ));
        return None;
    }

    if password.trim().is_empty() {
        let _ = tx.send(Message::Text(
            serde_json::json!({
                "type": "login_error",
                "message": "กรุณากรอกรหัสผ่าน"
            })
            .to_string()
            .into(),
        ));
        return None;
    }

    // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
    let user_result = sqlx::query_as::<_, (String, String, String)>(
        "SELECT username, password_hash, role::text FROM users WHERE username = $1",
    )
    .bind(username.trim())
    .fetch_optional(pool)
    .await;

    match user_result {
        Ok(Some((db_username, password_hash, role))) => {
            // ตรวจสอบรหัสผ่านด้วย bcrypt
            match verify(password, &password_hash) {
                Ok(valid) => {
                    if valid {
                        println!("ผู้ใช้เข้าสู่ระบบสำเร็จ: username={}", db_username);

                        // Register active connection
                        // active_connections.insert(db_username.clone(), tx.clone());
                        // Keep connection active but wait for character selection for player_id

                        // ดึงแผนที่เริ่มต้น
                        let default_map = ensure_default_map(pool).await;

                        let _ = tx.send(Message::Text(
                            serde_json::json!({
                                "type": "login_success",
                                "role": role,
                                "message": "เข้าสู่ระบบสำเร็จ",
                                "username": db_username
                            })
                            .to_string()
                            .into(),
                        ));

                        // ส่งข้อมูล init message พร้อม map
                        if let Some(map) = default_map {
                            let _ = tx.send(Message::Text(
                                serde_json::json!({
                                    "type": "init",
                                    "map": map
                                })
                                .to_string()
                                .into(),
                            ));
                        }

                        return Some(db_username);
                    } else {
                        let _ = tx.send(Message::Text(
                            serde_json::json!({
                                "type": "login_error",
                                "message": "รหัสผ่านไม่ถูกต้อง"
                            })
                            .to_string()
                            .into(),
                        ));
                    }
                }
                Err(_) => {
                    let _ = tx.send(Message::Text(
                        serde_json::json!({
                            "type": "login_error",
                            "message": "เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน"
                        })
                        .to_string()
                        .into(),
                    ));
                }
            }
        }
        Ok(None) => {
            // ไม่พบผู้ใช้ในฐานข้อมูล
            let _ = tx.send(Message::Text(
                serde_json::json!({
                    "type": "login_error",
                    "message": "ไม่พบชื่อผู้ใช้นี้ในระบบ"
                })
                .to_string()
                .into(),
            ));
        }
        Err(e) => {
            eprintln!("Database error during login: {:?}", e);
            let _ = tx.send(Message::Text(
                serde_json::json!({
                    "type": "login_error",
                    "message": "เกิดข้อผิดพลาดในการเข้าสู่ระบบ"
                })
                .to_string()
                .into(),
            ));
        }
    }
    None
}

async fn handle_move(
    tx: &mpsc::UnboundedSender<Message>,
    player_id: &str,
    players: &PlayersMap,
    active_connections: &ActiveConnections,
    data: &serde_json::Value,
) {
    if player_id.is_empty() {
        return;
    }

    // println!("handle_move called for player_id: {}", player_id);
    if let Some(mut p) = players.get_mut(player_id) {
        let dx = data["x"].as_f64().unwrap_or(0.0);
        let dy = data["y"].as_f64().unwrap_or(0.0);
        let speed = p.move_speed.clone();
        // println!("Player found! Moving dx={}, dy={}, speed={}", dx, dy, speed);

        if dx != 0.0 || dy != 0.0 {
            // Reduce speed by 4x to make movement slower
            let speed_factor = BigDecimal::from_f64(0.25).unwrap(); // 1/4 of original speed
            let adjusted_speed = &speed * speed_factor;

            let move_x = BigDecimal::from_f64(dx).unwrap_or_default() * &adjusted_speed;
            let move_y = BigDecimal::from_f64(dy).unwrap_or_default() * &adjusted_speed;

            p.x += move_x;
            p.y += move_y;

            // Send position update back to client
            let x_f64 = p.x.to_string().parse::<f64>().unwrap_or(0.0);
            let y_f64 = p.y.to_string().parse::<f64>().unwrap_or(0.0);

            let response = serde_json::json!({
                "type": "position_update",
                "x": x_f64,
                "y": y_f64,
                "player_id": player_id,
                "sprite_id": p.sprite_id // Broadcast sprite_id so others know what to render
            });

            let response_str = response.to_string();

            // Reply to self
            let _ = tx.send(Message::Text(response_str.clone().into()));

            // Broadcast to others in the same map
            let current_map_id = p.map_id;
            for entry in active_connections.iter() {
                if entry.key() != player_id {
                    // Check map_id of the other player
                    // We need to look up the other player's state to check their map_id
                    // Since active_connections only has tx, we use players map
                    if let Some(other_player) = players.get(entry.key()) {
                        if other_player.map_id == current_map_id {
                            let (other_tx, _) = entry.value();
                            let _ = other_tx.send(Message::Text(response_str.clone().into()));
                        }
                    }
                }
            }
        }
    }
}

async fn handle_save_item(
    tx: &mpsc::UnboundedSender<Message>,
    items: &ItemsMap,
    data: &serde_json::Value,
) {
    if let Some(item_data) = data.get("item") {
        if let Ok(item) = serde_json::from_value::<ItemData>(item_data.clone()) {
            let id = item.id.unwrap_or(items.len() as i32 + 1);
            let item_name = item.name.clone();
            items.insert(id, item);
            println!("บันทึกไอเทม: {}", item_name);

            let _ = tx.send(Message::Text(
                serde_json::json!({
                    "type": "save_item_success",
                    "message": "บันทึกไอเทมสำเร็จ",
                    "item_id": id
                })
                .to_string()
                .into(),
            ));
        }
    }
}

async fn handle_save_map(
    tx: &mpsc::UnboundedSender<Message>,
    pool: &PgPool,
    maps: &MapsMap,
    data: &serde_json::Value,
) {
    if let Some(map_data) = data.get("map") {
        if let Ok(map_obj) = serde_json::from_value::<MapData>(map_data.clone()) {
            let id = map_obj.id.unwrap_or(maps.len() as i32 + 1);
            let map_name = map_obj.name.clone();

            // Ensure ID is set
            let mut map_to_save = map_obj.clone();
            if map_to_save.id.is_none() {
                map_to_save.id = Some(id);
            }

            // Database UPSERT
            let result = sqlx::query(
                r#"
                INSERT INTO maps (id, name, description, width, height, tiles, spawn_points, npcs)
                VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    width = EXCLUDED.width,
                    height = EXCLUDED.height,
                    tiles = EXCLUDED.tiles,
                    spawn_points = EXCLUDED.spawn_points,
                    npcs = EXCLUDED.npcs,
                    updated_at = NOW()
                "#,
            )
            .bind(id)
            .bind(&map_to_save.name)
            .bind(&map_to_save.description)
            .bind(map_to_save.width)
            .bind(map_to_save.height)
            .bind(&map_to_save.tiles)
            .bind(&map_to_save.spawn_points)
            .bind(&map_to_save.npcs)
            .execute(pool)
            .await;

            match result {
                Ok(_) => {
                    maps.insert(id, map_to_save);
                    println!("บันทึกแผนที่: {}", map_name);

                    let _ = tx.send(Message::Text(
                        serde_json::json!({
                            "type": "save_map_success",
                            "message": "บันทึกแผนที่สำเร็จ",
                            "map_id": id
                        })
                        .to_string()
                        .into(),
                    ));
                }
                Err(e) => {
                    eprintln!("Error saving map to DB: {:?}", e);
                    let _ = tx.send(Message::Text(
                        serde_json::json!({
                            "type": "save_map_error",
                            "message": "เกิดข้อผิดพลาดในการบันทึกแผนที่"
                        })
                        .to_string()
                        .into(),
                    ));
                }
            }
        }
    }
}

async fn handle_save_npc(
    tx: &mpsc::UnboundedSender<Message>,
    pool: &PgPool,
    npcs: &NpcsMap,
    data: &serde_json::Value,
) {
    if let Some(npc_data) = data.get("npc") {
        if let Ok(npc) = serde_json::from_value::<NpcData>(npc_data.clone()) {
            let id = npc.id.unwrap_or(npcs.len() as i32 + 1);
            let npc_name = npc.name.clone();

            // Ensure ID is set
            let mut npc_to_save = npc.clone();
            if npc_to_save.id.is_none() {
                npc_to_save.id = Some(id);
            }

            // Serialize complex fields
            let dialogue_json =
                serde_json::to_value(&npc_to_save.dialogue).unwrap_or(serde_json::json!([]));
            let shop_items_json =
                serde_json::to_value(&npc_to_save.shop_items).unwrap_or(serde_json::json!([]));
            let quests_json =
                serde_json::to_value(&npc_to_save.quests).unwrap_or(serde_json::json!([]));
            let position_json = serde_json::to_value(&npc_to_save.position)
                .unwrap_or(serde_json::json!({ "x": 0, "y": 0 }));

            // Database UPSERT
            let result = sqlx::query(
                r#"
                INSERT INTO npcs (
                    id, name, description, sprite_id, level, hp, max_hp, attack, defense, move_speed,
                    is_hostile, can_trade, can_quest, dialogue, shop_items, quests, position, map_id,
                    npc_type, crit_rate, evasion, accuracy, is_attack_first
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    sprite_id = EXCLUDED.sprite_id,
                    level = EXCLUDED.level,
                    hp = EXCLUDED.hp,
                    max_hp = EXCLUDED.max_hp,
                    attack = EXCLUDED.attack,
                    defense = EXCLUDED.defense,
                    move_speed = EXCLUDED.move_speed,
                    is_hostile = EXCLUDED.is_hostile,
                    can_trade = EXCLUDED.can_trade,
                    can_quest = EXCLUDED.can_quest,
                    dialogue = EXCLUDED.dialogue,
                    shop_items = EXCLUDED.shop_items,
                    quests = EXCLUDED.quests,
                    position = EXCLUDED.position,
                    map_id = EXCLUDED.map_id,
                    npc_type = EXCLUDED.npc_type,
                    crit_rate = EXCLUDED.crit_rate,
                    evasion = EXCLUDED.evasion,
                    accuracy = EXCLUDED.accuracy,
                    attack_first = EXCLUDED.attack_first,
                    updated_at = NOW()
                "#
            )
            .bind(id)
            .bind(&npc_to_save.name)
            .bind(&npc_to_save.description)
            .bind(&npc_to_save.sprite_id)
            .bind(npc_to_save.level)
            .bind(npc_to_save.hp)
            .bind(npc_to_save.max_hp)
            .bind(npc_to_save.attack)
            .bind(npc_to_save.defense)
            .bind(&npc_to_save.move_speed)
            .bind(npc_to_save.is_hostile)
            .bind(npc_to_save.can_trade)
            .bind(npc_to_save.can_quest)
            .bind(&dialogue_json)
            .bind(&shop_items_json)
            .bind(&quests_json)
            .bind(&position_json)
            .bind(npc_to_save.map_id)
            .bind(&npc_to_save.npc_type)
            .bind(&npc_to_save.crit_rate)
            .bind(&npc_to_save.evasion)
            .bind(&npc_to_save.accuracy)
            .bind(npc_to_save.is_attack_first)
            .execute(pool)
            .await;

            match result {
                Ok(_) => {
                    npcs.insert(id, npc_to_save.clone());
                    println!("บันทึก NPC: {}", npc_name);

                    let _ = tx.send(Message::Text(
                        serde_json::json!({
                            "type": "save_npc_success",
                            "message": "บันทึก NPC สำเร็จ",
                            "npc_id": id
                        })
                        .to_string()
                        .into(),
                    ));
                }
                Err(e) => {
                    eprintln!("Error saving NPC to DB: {:?}", e);
                    let _ = tx.send(Message::Text(
                        serde_json::json!({
                            "type": "save_npc_error",
                            "message": "เกิดข้อผิดพลาดในการบันทึก NPC"
                        })
                        .to_string()
                        .into(),
                    ));
                }
            }
        }
    }
}

async fn handle_save_skill(
    tx: &mpsc::UnboundedSender<Message>,
    skills: &SkillsMap,
    data: &serde_json::Value,
) {
    if let Some(skill_data) = data.get("skill") {
        if let Ok(skill) = serde_json::from_value::<SkillData>(skill_data.clone()) {
            let id = skill.id.unwrap_or(skills.len() as i32 + 1);
            let skill_name = skill.name.clone();
            skills.insert(id, skill);
            println!("บันทึกสกิล: {}", skill_name);

            let _ = tx.send(Message::Text(
                serde_json::json!({
                    "type": "save_skill_success",
                    "message": "บันทึกสกิลสำเร็จ",
                    "skill_id": id
                })
                .to_string()
                .into(),
            ));
        }
    }
}

async fn handle_load_items(tx: &mpsc::UnboundedSender<Message>, items: &ItemsMap) {
    let items_vec: Vec<ItemData> = items.iter().map(|entry| entry.value().clone()).collect();
    let _ = tx.send(Message::Text(
        serde_json::json!({
            "type": "items_loaded",
            "items": items_vec
        })
        .to_string()
        .into(),
    ));
}

async fn handle_load_npcs(tx: &mpsc::UnboundedSender<Message>, npcs: &NpcsMap) {
    let npcs_vec: Vec<NpcData> = npcs.iter().map(|entry| entry.value().clone()).collect();
    let _ = tx.send(Message::Text(
        serde_json::json!({
            "type": "npcs_loaded",
            "npcs": npcs_vec
        })
        .to_string()
        .into(),
    ));
}

async fn handle_load_skills(tx: &mpsc::UnboundedSender<Message>, skills: &SkillsMap) {
    let skills_vec: Vec<SkillData> = skills.iter().map(|entry| entry.value().clone()).collect();
    let _ = tx.send(Message::Text(
        serde_json::json!({
            "type": "skills_loaded",
            "skills": skills_vec
        })
        .to_string()
        .into(),
    ));
}

/// Helper function to load classes
async fn handle_load_classes(
    tx: &mpsc::UnboundedSender<Message>,
    pool: &PgPool,
    classes: &ClassesMap,
) {
    // If cache is empty, try to load from DB (optional, assuming classes are preloaded or loaded on startup)
    // For now, just return what's in the map

    // Check if we need to load from DB (if map is empty)
    if classes.is_empty() {
        if let Ok(rows) = sqlx::query_as::<_, ClassData>("SELECT * FROM classes")
            .fetch_all(pool)
            .await
        {
            println!("Loaded {} classes from database", rows.len());
            for class_data in rows {
                if let Some(id) = class_data.id {
                    classes.insert(id, class_data);
                }
            }
        } else {
            println!("Failed to load classes from database or empty");
        }
    }

    let classes_vec: Vec<ClassData> = classes.iter().map(|entry| entry.value().clone()).collect();
    let _ = tx.send(Message::Text(
        serde_json::json!({
            "type": "classes_data",
            "classes": classes_vec
        })
        .to_string()
        .into(),
    ));
}

async fn handle_load_maps(tx: &mpsc::UnboundedSender<Message>, pool: &PgPool) {
    let maps = sqlx::query_as::<_, MapData>("SELECT * FROM maps")
        .fetch_all(pool)
        .await
        .unwrap_or(vec![]);

    let _ = tx.send(Message::Text(
        serde_json::json!({
            "type": "maps_loaded",
            "maps": maps
        })
        .to_string()
        .into(),
    ));
}

async fn handle_create_character(
    tx: &mpsc::UnboundedSender<Message>,
    pool: &PgPool,
    players: &PlayersMap,
    classes: &ClassesMap,
    data: &serde_json::Value,
) {
    let username = data["username"].as_str().unwrap_or("");
    let character_name = data["character_name"].as_str().unwrap_or("");
    let class_id = data["class_id"].as_i64().unwrap_or(0) as i32;

    if username.is_empty() || character_name.is_empty() {
        let _ = tx.send(Message::Text(
            serde_json::json!({
                "type": "create_character_error",
                "message": "ข้อมูลไม่ครบถ้วน"
            })
            .to_string()
            .into(),
        ));
        return;
    }

    if character_name.chars().count() < 3 {
        let _ = tx.send(Message::Text(
            serde_json::json!({
                "type": "create_character_error",
                "message": "ชื่อตัวละครต้องมีอย่างน้อย 3 ตัวอักษร"
            })
            .to_string()
            .into(),
        ));
        return;
    }

    // Check if class exists
    let class_data = if let Some(c) = classes.get(&class_id) {
        c.value().clone()
    } else {
        let _ = tx.send(Message::Text(
            serde_json::json!({
                "type": "create_character_error",
                "message": "อาชีพที่เลือกไม่ถูกต้อง"
            })
            .to_string()
            .into(),
        ));
        return;
    };

    // Get User ID
    let user_id_opt: Option<i32> = sqlx::query_scalar("SELECT id FROM users WHERE username = $1")
        .bind(username)
        .fetch_optional(pool)
        .await
        .unwrap_or(None);

    let user_id = if let Some(uid) = user_id_opt {
        uid
    } else {
        println!("User not found for character creation: {}", username);
        let _ = tx.send(Message::Text(
            serde_json::json!({
                "type": "create_character_error",
                "message": "ไม่พบข้อมูลผู้ใช้"
            })
            .to_string()
            .into(),
        ));
        return;
    };

    let new_player_id = uuid::Uuid::new_v4().to_string();

    match sqlx::query(
        r#"
        INSERT INTO players (
            id, user_id, username, classes_id, 
            map_id, x, y, 
            hp, max_hp, mp, max_mp,
            base_atk, base_def,
            str, dex, agi, int, luk, vit,
            move_speed,
            level, current_exp
        )
        VALUES (
            $1, $2, $3, $4,
            1, 6.0, 4.0,
            $5, $5, $6, $6,
            $7, $8,
            $9, $10, $11, $12, $13, $14,
            $15,
            1, 0
        )
        "#,
    )
    .bind(new_player_id.clone())
    .bind(user_id)
    .bind(character_name)
    .bind(class_id)
    .bind(class_data.hp)
    .bind(50) // Default MP/MaxMP
    .bind(class_data.atk)
    .bind(class_data.def)
    .bind(class_data.str)
    .bind(class_data.dex)
    .bind(class_data.agi)
    .bind(class_data.int)
    .bind(class_data.luk)
    .bind(class_data.vit)
    .bind(class_data.movespeed)
    .execute(pool)
    .await
    {
        Ok(_) => {
            let _ = tx.send(Message::Text(
                serde_json::json!({
                    "type": "create_character_success",
                    "player_id": new_player_id
                })
                .to_string()
                .into(),
            ));
            println!(
                "Created character: {} for user {}",
                character_name, username
            );
        }
        Err(e) => {
            println!("Failed to create character: {}", e);
            let err_msg: &str = if e.to_string().contains("unique constraint") {
                "ชื่อตัวละครนี้มีผู้ใช้แล้ว"
            } else {
                "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
            };

            let _ = tx.send(Message::Text(
                serde_json::json!({
                    "type": "create_character_error",
                    "message": err_msg
                })
                .to_string()
                .into(),
            ));
        }
    }
}

// Re-implement missing handlers based on `handle_client` usage:
async fn handle_save_class(
    tx: &mpsc::UnboundedSender<Message>,
    classes: &ClassesMap,
    data: &serde_json::Value,
) {
    if let Some(class_data) = data.get("class_data") {
        // Adjust key as needed
        if let Ok(class_obj) = serde_json::from_value::<ClassData>(class_data.clone()) {
            if let Some(id) = class_obj.id {
                classes.insert(id, class_obj);
                let _ = tx.send(Message::Text(
                    serde_json::json!({
                        "type": "save_class_success",
                        "class_id": id
                    })
                    .to_string()
                    .into(),
                ));
            }
        }
    }
}

async fn handle_load_characters(
    tx: &mpsc::UnboundedSender<Message>,
    pool: &PgPool,
    data: &serde_json::Value,
) {
    // Check if user is logged in (username should be passed or we need session)
    // For simplicity, maybe client sends username?
    let username = data["username"].as_str().unwrap_or("");
    if !username.is_empty() {
        // Get User ID from username
        let user_id_opt: Option<i32> =
            sqlx::query_scalar("SELECT id FROM users WHERE username = $1")
                .bind(username)
                .fetch_optional(pool)
                .await
                .unwrap_or(None);

        println!(
            "Loading characters for username: '{}', user_id: {:?}",
            username, user_id_opt
        );

        if let Some(user_id) = user_id_opt {
            let result = sqlx::query_as::<_, CharacterData>(
                r#"
            SELECT 
                p.id, p.username, p.level, p.current_exp, 
                p.x, p.y, p.map_id,
                p.hp, p.max_hp, p.mp, p.max_mp,
                p.str, p.dex, p.agi, p.int, p.luk, p.vit,
                p.move_speed,
                p.stat_points, p.skill_points,
                c.sprite_id
            FROM players p
            LEFT JOIN classes c ON p.classes_id = c.id
            WHERE p.user_id = $1
            "#,
            )
            .bind(user_id)
            .fetch_all(pool)
            .await;

            match result {
                Ok(characters) => {
                    println!(
                        "Found {} characters for user_id {}",
                        characters.len(),
                        user_id
                    );
                    let _ = tx.send(Message::Text(
                        serde_json::json!({
                            "type": "characters_data",
                            "characters": characters
                        })
                        .to_string()
                        .into(),
                    ));
                }
                Err(e) => {
                    println!("Failed to load characters for user_id {}: {}", user_id, e);
                    // Send error to client so we can debug
                    let _ = tx.send(Message::Text(
                        serde_json::json!({
                            "type": "load_characters_error",
                            "message": format!("DB Error: {}", e)
                        })
                        .to_string()
                        .into(),
                    ));
                }
            }
        } else {
            println!("User not found for username: {}", username);
            let _ = tx.send(Message::Text(
                serde_json::json!({
                    "type": "characters_data",
                    "characters": []
                })
                .to_string()
                .into(),
            ));
        }
    }
}

async fn handle_select_character(
    tx: &mpsc::UnboundedSender<Message>,
    pool: &PgPool,
    players: &PlayersMap,
    classes: &ClassesMap,
    active_connections: &ActiveConnections,
    data: &serde_json::Value,
    connection_id: &str,
) -> Option<String> {
    // Parse character_id as String directly
    let char_id = data
        .get("character_id")
        .and_then(|v| v.as_str())
        .map(|v| v.to_string());

    if let Some(char_id) = char_id {
        println!("Attempting to select character: {}", char_id);

        let query = "
            SELECT p.*, c.sprite_id 
            FROM players p 
            LEFT JOIN classes c ON p.classes_id = c.id 
            WHERE p.id = $1
        ";

        if let Ok(character) = sqlx::query_as::<_, CharacterData>(query)
            .bind(&char_id)
            .fetch_optional(pool)
            .await
        {
            if let Some(char_data) = character {
                let player_id = char_data.id.clone();

                // Reply success
                let _ = tx.send(Message::Text(
                    serde_json::json!({
                        "type": "select_character_success",
                        "character_id": char_id,
                        "player_id": player_id
                    })
                    .to_string()
                    .into(),
                ));

                // Construct PlayerState
                let state = PlayerState {
                    id: player_id.clone(),
                    user_id: 0, // Placeholder
                    username: char_data.username.clone(),
                    character_id: 0,
                    map_id: char_data.map_id, // Use map_id from DB
                    x: char_data.x.clone(),   // Loaded from DB
                    y: char_data.y.clone(),   // Loaded from DB
                    hp: char_data.hp,
                    max_hp: char_data.max_hp,
                    mp: char_data.mp,
                    max_mp: char_data.max_mp,
                    level: char_data.level,
                    current_exp: char_data.current_exp,
                    exp: char_data.current_exp,
                    move_speed: char_data.move_speed, // Direct BigDecimal assignment
                    base_atk: char_data.str * 2,
                    str: char_data.str,
                    dex: char_data.dex,
                    agi: char_data.agi,
                    int: char_data.int,
                    luk: char_data.luk,
                    vit: char_data.vit,
                    stat_points: char_data.stat_points,
                    skill_points: char_data.skill_points,
                    crit_rate: BigDecimal::from_f32(0.05).unwrap_or_default(),
                    sprite_id: char_data.sprite_id.unwrap_or("1".to_string()),
                    ..Default::default()
                };

                // players.insert(player_id.clone(), state); // Inserted below after cloning for broadcast logic if needed
                active_connections
                    .insert(player_id.clone(), (tx.clone(), connection_id.to_string()));

                // Clone state for insertion, keep original for reading properties
                players.insert(player_id.clone(), state.clone());

                println!(
                    "Character selected: {} ({}) on Map {}",
                    char_data.username, player_id, state.map_id
                );

                // Broadcast join and sync existing players
                let current_map_id = state.map_id;

                // 1. Tell others about me
                let join_msg = serde_json::json!({
                    "type": "position_update",
                    "x": state.x.to_string().parse::<f64>().unwrap_or(0.0),
                    "y": state.y.to_string().parse::<f64>().unwrap_or(0.0),
                    "player_id": player_id,
                    "sprite_id": state.sprite_id
                })
                .to_string();

                // 2. See others
                // Iterate over all players to find those in the same map
                for entry in players.iter() {
                    if entry.key() != &player_id {
                        let other_p = entry.value();
                        if other_p.map_id == current_map_id {
                            // Send my pos to them
                            if let Some(entry) = active_connections.get(entry.key()) {
                                let (other_tx, _) = entry.value();
                                let _ = other_tx.send(Message::Text(join_msg.clone().into()));
                            }

                            // Send their pos to me
                            let other_pos_msg = serde_json::json!({
                                "type": "position_update",
                                "x": other_p.x.to_string().parse::<f64>().unwrap_or(0.0),
                                "y": other_p.y.to_string().parse::<f64>().unwrap_or(0.0),
                                "player_id": other_p.id,
                                "sprite_id": other_p.sprite_id
                            })
                            .to_string();
                            let _ = tx.send(Message::Text(other_pos_msg.into()));
                        }
                    }
                }

                return Some(player_id);
            } else {
                println!("Character not found in DB: {}", char_id);
            }
        } else {
            // println!("Query failed for character_id: {}", char_id);
        }
    } else {
        println!("Invalid character_id format in request");
    }

    // Error case
    let _ = tx.send(Message::Text(
        serde_json::json!({
            "type": "select_character_error",
            "message": "Character not found or invalid ID"
        })
        .to_string()
        .into(),
    ));

    None
}
