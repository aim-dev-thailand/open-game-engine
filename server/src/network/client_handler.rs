use crate::logic::combat::handle_attack;
use crate::models::*;
use bcrypt::{DEFAULT_COST, hash, verify};
use bigdecimal::{BigDecimal, FromPrimitive};
use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
use sqlx::{PgPool, Row};
use std::sync::Arc;
use tokio_tungstenite::tungstenite::Message;

pub type PlayersMap = Arc<DashMap<String, PlayerState>>;
pub type MonstersMap = Arc<DashMap<String, MonsterInstance>>;
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
    monsters: MonstersMap,
    items: ItemsMap,
    maps: MapsMap,
    npcs: NpcsMap,
    classes: ClassesMap,
    skills: SkillsMap,
) {
    let mut ws = ws_stream;
    let mut player_id = String::new();

    while let Some(msg_result) = ws.next().await {
        if let Ok(msg) = msg_result {
            if let Message::Text(text) = msg {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(&text) {
                    match data["type"].as_str() {
                        Some("register") => {
                            handle_register(&mut ws, &pool, &data).await;
                        }
                        Some("login") => {
                            handle_login(&mut ws, &pool, &data).await;
                        }
                        Some("move") => {
                            player_id = data["player_id"].as_str().unwrap_or("").to_string();
                            handle_move(&player_id, &players, &data).await;
                        }
                        Some("attack") => {
                            player_id = data["player_id"].as_str().unwrap_or("").to_string();
                            handle_attack(&player_id, &players, &monsters);
                        }
                        Some("cast_skill") => {
                            player_id = data["player_id"].as_str().unwrap_or("").to_string();
                            // จัดการสกิล
                        }
                        Some("save_item") => {
                            handle_save_item(&mut ws, &items, &data).await;
                            break;
                        }
                        Some("save_npc") => {
                            handle_save_npc(&mut ws, &pool, &npcs, &data).await;
                        }
                        Some("save_class") => {
                            handle_save_class(&mut ws, &classes, &data).await;
                            break;
                        }
                        Some("save_skill") => {
                            handle_save_skill(&mut ws, &skills, &data).await;
                            break;
                        }
                        Some("save_map") => {
                            handle_save_map(&mut ws, &pool, &maps, &data).await;
                            break;
                        }
                        Some("load_item") => {
                            handle_load_items(&mut ws, &items).await;
                        }
                        Some("load_npc") => {
                            handle_load_npcs(&mut ws, &npcs).await;
                        }
                        Some("load_classes") => {
                            handle_load_classes(&mut ws, &pool, &classes).await;
                        }
                        Some("load_skill") => {
                            handle_load_skills(&mut ws, &skills).await;
                        }
                        Some("load_map") => {
                            handle_load_maps(&mut ws, &maps).await;
                        }
                        Some("create_character") => {
                            handle_create_character(&mut ws, &pool, &players, &classes, &data)
                                .await;
                        }
                        Some("load_characters") => {
                            handle_load_characters(&mut ws, &pool, &data).await;
                        }
                        Some("logout") => {
                            players.remove(&player_id);
                            break;
                        }
                        _ => {}
                    }
                }
            }
        }
    }
}

/// จัดการการสมัครสมาชิก
async fn handle_register(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    pool: &PgPool,
    data: &serde_json::Value,
) {
    let username = data["username"].as_str().unwrap_or("");
    let password = data["password"].as_str().unwrap_or("");

    // Server-side validation
    if username.trim().is_empty() {
        let _ = ws
            .send(Message::Text(
                serde_json::json!({
                    "type": "register_error",
                    "message": "กรุณากรอกชื่อผู้ใช้"
                })
                .to_string()
                .into(),
            ))
            .await;
        return;
    }

    if password.trim().is_empty() {
        let _ = ws
            .send(Message::Text(
                serde_json::json!({
                    "type": "register_error",
                    "message": "กรุณากรอกรหัสผ่าน"
                })
                .to_string()
                .into(),
            ))
            .await;
        return;
    }

    if password.len() < 6 {
        let _ = ws
            .send(Message::Text(
                serde_json::json!({
                    "type": "register_error",
                    "message": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
                })
                .to_string()
                .into(),
            ))
            .await;
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
            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "register_error",
                        "message": "ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว"
                    })
                    .to_string()
                    .into(),
                ))
                .await;
            return;
        }
    }

    // เข้ารหัสรหัสผ่านด้วย bcrypt
    let password_hash = match hash(password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => {
            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "register_error",
                        "message": "เกิดข้อผิดพลาดในการเข้ารหัสรหัสผ่าน"
                    })
                    .to_string()
                    .into(),
                ))
                .await;
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

            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "register_success",
                        "role": "user",
                        "message": "สมัครสมาชิกสำเร็จ"
                    })
                    .to_string()
                    .into(),
                ))
                .await;
        }
        Err(e) => {
            eprintln!("Error inserting user: {:?}", e);
            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "register_error",
                        "message": "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
                    })
                    .to_string()
                    .into(),
                ))
                .await;
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
            tiles: serde_json::json!([]), // TODO: Generate basic tiles?
            spawn_points: vec![serde_json::json!({"x": 10, "y": 10})],
            npcs: vec![],
            monsters: vec![],
        };

        let tiles_json = serde_json::to_value(&default_map.tiles).unwrap();
        let spawn_points_json = serde_json::to_value(&default_map.spawn_points).unwrap();
        let npcs_json = serde_json::to_value(&default_map.npcs).unwrap();
        let monsters_json = serde_json::to_value(&default_map.monsters).unwrap();

        let _ = sqlx::query(
            "INSERT INTO maps (id, name, description, width, height, tiles, spawn_points, npcs, monsters) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
        )
        .bind(default_map.id)
        .bind(&default_map.name)
        .bind(&default_map.description)
        .bind(default_map.width)
        .bind(default_map.height)
        .bind(&tiles_json)
        .bind(&spawn_points_json)
        .bind(&npcs_json)
        .bind(&monsters_json)
        .execute(pool)
        .await;
    }

    // ดึงแผนที่แรกมา
    let map_row = sqlx::query("SELECT id, name, description, width, height, tiles, spawn_points, npcs, monsters FROM maps ORDER BY id LIMIT 1")
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
            monsters: row.get("monsters"),
        })
    } else {
        None
    }
}

async fn handle_login(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    pool: &PgPool,
    data: &serde_json::Value,
) {
    let username = data["username"].as_str().unwrap_or("");
    let password = data["password"].as_str().unwrap_or("");

    println!("พยายามเข้าสู่ระบบ: username={}", username);

    // Server-side validation
    if username.trim().is_empty() {
        let _ = ws
            .send(Message::Text(
                serde_json::json!({
                    "type": "login_error",
                    "message": "กรุณากรอกชื่อผู้ใช้"
                })
                .to_string()
                .into(),
            ))
            .await;
        return;
    }

    if password.trim().is_empty() {
        let _ = ws
            .send(Message::Text(
                serde_json::json!({
                    "type": "login_error",
                    "message": "กรุณากรอกรหัสผ่าน"
                })
                .to_string()
                .into(),
            ))
            .await;
        return;
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

                        // ดึงแผนที่เริ่มต้น
                        let default_map = ensure_default_map(pool).await;

                        let _ = ws
                            .send(Message::Text(
                                serde_json::json!({
                                    "type": "login_success",
                                    "role": role,
                                    "message": "เข้าสู่ระบบสำเร็จ"
                                })
                                .to_string()
                                .into(),
                            ))
                            .await;

                        // ส่งข้อมูล init message พร้อม map
                        if let Some(map) = default_map {
                            let _ = ws
                                .send(Message::Text(
                                    serde_json::json!({
                                        "type": "init",
                                        "map": map
                                    })
                                    .to_string()
                                    .into(),
                                ))
                                .await;
                        }
                    } else {
                        let _ = ws
                            .send(Message::Text(
                                serde_json::json!({
                                    "type": "login_error",
                                    "message": "รหัสผ่านไม่ถูกต้อง"
                                })
                                .to_string()
                                .into(),
                            ))
                            .await;
                    }
                }
                Err(_) => {
                    let _ = ws
                        .send(Message::Text(
                            serde_json::json!({
                                "type": "login_error",
                                "message": "เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน"
                            })
                            .to_string()
                            .into(),
                        ))
                        .await;
                }
            }
        }
        Ok(None) => {
            // ไม่พบผู้ใช้ในฐานข้อมูล
            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "login_error",
                        "message": "ไม่พบชื่อผู้ใช้นี้ในระบบ"
                    })
                    .to_string()
                    .into(),
                ))
                .await;
        }
        Err(e) => {
            eprintln!("Database error during login: {:?}", e);
            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "login_error",
                        "message": "เกิดข้อผิดพลาดในการเข้าสู่ระบบ"
                    })
                    .to_string()
                    .into(),
                ))
                .await;
        }
    }
}

async fn handle_move(player_id: &str, players: &PlayersMap, data: &serde_json::Value) {
    if let Some(mut p) = players.get_mut(player_id) {
        if let Some(x) = data["x"].as_f64() {
            p.x = BigDecimal::from_f64(x).unwrap_or_default();
        }
        if let Some(y) = data["y"].as_f64() {
            p.y = BigDecimal::from_f64(y).unwrap_or_default();
        }
    }
}

async fn handle_save_item(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    items: &ItemsMap,
    data: &serde_json::Value,
) {
    if let Some(item_data) = data.get("item") {
        if let Ok(item) = serde_json::from_value::<ItemData>(item_data.clone()) {
            let id = item.id.unwrap_or(items.len() as i32 + 1);
            let item_name = item.name.clone();
            items.insert(id, item);
            println!("บันทึกไอเทม: {}", item_name);

            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "save_item_success",
                        "message": "บันทึกไอเทมสำเร็จ",
                        "item_id": id
                    })
                    .to_string()
                    .into(),
                ))
                .await;
        }
    }
}

async fn handle_save_map(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
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

            // Serialize complex fields
            let tiles_json =
                serde_json::to_value(&map_to_save.tiles).unwrap_or(serde_json::json!([]));
            let spawn_points_json =
                serde_json::to_value(&map_to_save.spawn_points).unwrap_or(serde_json::json!([]));
            let npcs_json =
                serde_json::to_value(&map_to_save.npcs).unwrap_or(serde_json::json!([]));
            let monsters_json =
                serde_json::to_value(&map_to_save.monsters).unwrap_or(serde_json::json!([]));

            // Database UPSERT
            let result = sqlx::query(
                r#"
                INSERT INTO maps (id, name, description, width, height, tiles, spawn_points, npcs, monsters)
                VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    width = EXCLUDED.width,
                    height = EXCLUDED.height,
                    tiles = EXCLUDED.tiles,
                    spawn_points = EXCLUDED.spawn_points,
                    npcs = EXCLUDED.npcs,
                    monsters = EXCLUDED.monsters,
                    updated_at = NOW()
                "#
            )
            .bind(id)
            .bind(&map_to_save.name)
            .bind(&map_to_save.description)
            .bind(map_to_save.width)
            .bind(map_to_save.height)
            .bind(&tiles_json)
            .bind(&spawn_points_json)
            .bind(&npcs_json)
            .bind(&monsters_json)
            .execute(pool)
            .await;

            match result {
                Ok(_) => {
                    maps.insert(id, map_to_save);
                    println!("บันทึกแผนที่: {}", map_name);

                    let _ = ws
                        .send(Message::Text(
                            serde_json::json!({
                                "type": "save_map_success",
                                "message": "บันทึกแผนที่สำเร็จ",
                                "map_id": id
                            })
                            .to_string()
                            .into(),
                        ))
                        .await;
                }
                Err(e) => {
                    eprintln!("Error saving map to DB: {:?}", e);
                    let _ = ws
                        .send(Message::Text(
                            serde_json::json!({
                                "type": "save_map_error",
                                "message": "เกิดข้อผิดพลาดในการบันทึกแผนที่"
                            })
                            .to_string()
                            .into(),
                        ))
                        .await;
                }
            }
        }
    }
}

async fn handle_save_npc(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
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

                    let _ = ws
                        .send(Message::Text(
                            serde_json::json!({
                                "type": "save_npc_success",
                                "message": "บันทึก NPC สำเร็จ",
                                "npc_id": id
                            })
                            .to_string()
                            .into(),
                        ))
                        .await;
                }
                Err(e) => {
                    eprintln!("Error saving NPC to DB: {:?}", e);
                    let _ = ws
                        .send(Message::Text(
                            serde_json::json!({
                                "type": "save_npc_error",
                                "message": "เกิดข้อผิดพลาดในการบันทึก NPC"
                            })
                            .to_string()
                            .into(),
                        ))
                        .await;
                }
            }
        }
    }
}

async fn handle_save_skill(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    skills: &SkillsMap,
    data: &serde_json::Value,
) {
    if let Some(skill_data) = data.get("skill") {
        if let Ok(skill) = serde_json::from_value::<SkillData>(skill_data.clone()) {
            let id = skill.id.unwrap_or(skills.len() as i32 + 1);
            let skill_name = skill.name.clone();
            skills.insert(id, skill);
            println!("บันทึกสกิล: {}", skill_name);

            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "save_skill_success",
                        "message": "บันทึกสกิลสำเร็จ",
                        "skill_id": id
                    })
                    .to_string()
                    .into(),
                ))
                .await;
        }
    }
}

async fn handle_load_items(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    items: &ItemsMap,
) {
    let items_vec: Vec<ItemData> = items.iter().map(|entry| entry.value().clone()).collect();
    let _ = ws
        .send(Message::Text(
            serde_json::json!({
                "type": "items_loaded",
                "items": items_vec
            })
            .to_string()
            .into(),
        ))
        .await;
}

async fn handle_load_npcs(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    npcs: &NpcsMap,
) {
    let npcs_vec: Vec<NpcData> = npcs.iter().map(|entry| entry.value().clone()).collect();
    let _ = ws
        .send(Message::Text(
            serde_json::json!({
                "type": "npcs_loaded",
                "npcs": npcs_vec
            })
            .to_string()
            .into(),
        ))
        .await;
}

async fn handle_load_skills(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    skills: &SkillsMap,
) {
    let skills_vec: Vec<SkillData> = skills.iter().map(|entry| entry.value().clone()).collect();
    let _ = ws
        .send(Message::Text(
            serde_json::json!({
                "type": "skills_loaded",
                "skills": skills_vec
            })
            .to_string()
            .into(),
        ))
        .await;
}

async fn handle_load_maps(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    maps: &MapsMap,
) {
    let maps_vec: Vec<MapData> = maps.iter().map(|entry| entry.value().clone()).collect();
    let _ = ws
        .send(Message::Text(
            serde_json::json!({
                "type": "maps_loaded",
                "maps": maps_vec
            })
            .to_string()
            .into(),
        ))
        .await;
}

async fn handle_save_class(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    classes: &ClassesMap,
    data: &serde_json::Value,
) {
    if let Some(class_data) = data.get("class") {
        if let Ok(class_obj) = serde_json::from_value::<ClassData>(class_data.clone()) {
            let id = class_obj.id.unwrap_or(classes.len() as i32 + 1);
            let class_name = class_obj.name.clone();
            // Ensure ID is set if it was None (though for DashMap key we use the computed id)
            let mut class_to_save = class_obj.clone();
            if class_to_save.id.is_none() {
                class_to_save.id = Some(id);
            }

            classes.insert(id, class_to_save);
            println!("บันทึกอาชีพ: {}", class_name);

            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "save_class_success",
                        "message": "บันทึกอาชีพสำเร็จ",
                        "class_id": id
                    })
                    .to_string()
                    .into(),
                ))
                .await;
        } else {
            println!("Error parsing class data");
        }
    }
}

async fn handle_load_classes(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    pool: &PgPool,
    classes: &ClassesMap,
) {
    // ดึงข้อมูล classes จากฐานข้อมูล
    let classes_result = sqlx::query(
        "SELECT id, name, description, sprite_id, min_level, quest_id, str, dex, agi, vit, int, luk, hp, atk, def, matk, mdef, atkspd, movespeed, evasion, accuracy, crit_rate
         FROM classes
         ORDER BY min_level, id"
    )
    .fetch_all(pool)
    .await;

    match classes_result {
        Ok(rows) => {
            let classes_vec: Vec<ClassData> = rows
                .into_iter()
                .map(|row| {
                    let class_data = ClassData {
                        id: Some(row.get::<i32, _>("id")),
                        name: row.get::<String, _>("name"),
                        description: row.get::<Option<String>, _>("description"),
                        sprite_id: row.get::<String, _>("sprite_id"),
                        min_level: row.get::<i32, _>("min_level"),
                        quest_id: row.get::<Option<i32>, _>("quest_id"),
                        strength: row.get::<i32, _>("str"),
                        dex: row.get::<i32, _>("dex"),
                        agi: row.get::<i32, _>("agi"),
                        vit: row.get::<i32, _>("vit"),
                        intelligence: row.get::<i32, _>("int"),
                        luk: row.get::<i32, _>("luk"),
                        hp: row.get::<i32, _>("hp"),
                        atk: row.get::<i32, _>("atk"),
                        def: row.get::<i32, _>("def"),
                        matk: row.get::<i32, _>("matk"),
                        mdef: row.get::<i32, _>("mdef"),
                        atkspd: row.get::<i32, _>("atkspd"),
                        movespeed: row.get::<BigDecimal, _>("movespeed"),
                        evasion: row.get::<i32, _>("evasion"),
                        accuracy: row.get::<i32, _>("accuracy"),
                        crit_rate: row.get::<i32, _>("crit_rate"),
                    };

                    // เก็บไว้ใน in-memory cache ด้วย
                    if let Some(id) = class_data.id {
                        classes.insert(id, class_data.clone());
                    }

                    class_data
                })
                .collect();

            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "classes_data",
                        "classes": classes_vec
                    })
                    .to_string()
                    .into(),
                ))
                .await;
        }
        Err(e) => {
            eprintln!("Error loading classes from database: {:?}", e);
            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "classes_data",
                        "classes": []
                    })
                    .to_string()
                    .into(),
                ))
                .await;
        }
    }
}

/// จัดการการสร้างตัวละคร
async fn handle_create_character(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    pool: &PgPool,
    players: &PlayersMap,
    classes: &ClassesMap,
    data: &serde_json::Value,
) {
    let username = data["username"].as_str().unwrap_or("");
    let character_name = data["character_name"].as_str().unwrap_or("");
    let class_id = data["class_id"].as_i64().unwrap_or(1) as i32;

    // Validation
    if character_name.trim().is_empty() {
        let _ = ws
            .send(Message::Text(
                serde_json::json!({
                    "type": "create_character_error",
                    "message": "กรุณากรอกชื่อตัวละคร"
                })
                .to_string()
                .into(),
            ))
            .await;
        return;
    }

    if character_name.len() < 3 {
        let _ = ws
            .send(Message::Text(
                serde_json::json!({
                    "type": "create_character_error",
                    "message": "ชื่อตัวละครต้องมีอย่างน้อย 3 ตัวอักษร"
                })
                .to_string()
                .into(),
            ))
            .await;
        return;
    }

    // ตรวจสอบว่าชื่อตัวละครซ้ำหรือไม่
    let character_exists = players
        .iter()
        .any(|entry| entry.value().username == character_name);

    if character_exists {
        let _ = ws
            .send(Message::Text(
                serde_json::json!({
                    "type": "create_character_error",
                    "message": "ชื่อตัวละครนี้ถูกใช้ไปแล้ว"
                })
                .to_string()
                .into(),
            ))
            .await;
        return;
    }

    // ดึงข้อมูล class
    let class_data = match classes.get(&class_id) {
        Some(class_ref) => class_ref.value().clone(),
        None => {
            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "create_character_error",
                        "message": "ไม่พบข้อมูลอาชีพ"
                    })
                    .to_string()
                    .into(),
                ))
                .await;
            return;
        }
    };

    let users_result = sqlx::query("SELECT id FROM users WHERE username = $1")
        .bind(&username)
        .fetch_one(pool)
        .await;

    let user_id = match users_result {
        Ok(user) => user.get::<i32, _>("id"),
        Err(e) => {
            eprintln!("Error fetching user ID: {}", e);
            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "create_character_error",
                        "message": "ไม่พบข้อมูลผู้ใช้"
                    })
                    .to_string()
                    .into(),
                ))
                .await;
            return;
        }
    };

    // สร้างตัวละครใหม่
    let character_id = uuid::Uuid::new_v4().to_string();
    let new_player = PlayerState {
        id: character_id.clone(),
        user_id: user_id,
        username: character_name.to_string(),
        x: BigDecimal::from(100),
        y: BigDecimal::from(100),
        hp: class_data.hp,
        max_hp: class_data.hp,
        mp: 50,
        max_mp: 50,

        // Base Stats จาก class
        base_atk: class_data.atk,
        base_def: class_data.def,
        move_speed: class_data.movespeed.clone(),
        accuracy: BigDecimal::from(class_data.accuracy) / BigDecimal::from(100),
        evasion: BigDecimal::from(class_data.evasion) / BigDecimal::from(100),
        crit_rate: BigDecimal::from(class_data.crit_rate) / BigDecimal::from(100),

        // Primary Stats จาก class
        strength: class_data.strength,
        dex: class_data.dex,
        agi: class_data.agi,
        intelligence: class_data.intelligence,
        luk: class_data.luk,
        vit: class_data.vit,

        // Leveling
        level: 1,
        current_exp: 0,
        stat_points: 0,
        skill_points: 0,

        role: "user".to_string(),
        learned_skills: vec![],
        active_statuses: vec![],
        equipment: EquipmentState {
            main_hand: None,
            off_hand: None,
        },
    };

    // บันทึกข้อมูลลงฐานข้อมูล
    // let learned_skills_json =
    //     serde_json::to_string(&new_player.learned_skills).unwrap_or("[]".to_string());
    // let active_statuses_json =
    //     serde_json::to_string(&new_player.active_statuses).unwrap_or("[]".to_string());
    // let equipment_json = serde_json::to_string(&new_player.equipment).unwrap_or("{}".to_string());

    let insert_result = sqlx::query(
        r#"
        INSERT INTO players (
            id, user_id, username, x, y, hp, max_hp, mp, max_mp,
            base_atk, base_def, move_speed, accuracy, evasion, crit_rate,
            str, dex, agi, int, luk, vit,
            level, current_exp, stat_points, skill_points,
            role
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26::user_role)
        "#
    )
    .bind(&new_player.id)
    .bind(&new_player.user_id)
    .bind(&new_player.username)
    .bind(&new_player.x)
    .bind(&new_player.y)
    .bind(new_player.hp)
    .bind(new_player.max_hp)
    .bind(new_player.mp)
    .bind(new_player.max_mp)
    .bind(new_player.base_atk)
    .bind(new_player.base_def)
    .bind(&new_player.move_speed)
    .bind(&new_player.accuracy)
    .bind(&new_player.evasion)
    .bind(&new_player.crit_rate)
    .bind(new_player.strength)
    .bind(new_player.dex)
    .bind(new_player.agi)
    .bind(new_player.intelligence)
    .bind(new_player.luk)
    .bind(new_player.vit)
    .bind(new_player.level)
    .bind(new_player.current_exp)
    .bind(new_player.stat_points)
    .bind(new_player.skill_points)
    .bind(&new_player.role)
    .execute(pool)
    .await;

    match insert_result {
        Ok(_) => {
            players.insert(character_id.clone(), new_player.clone());

            println!(
                "สร้างตัวละครใหม่: {} (อาชีพ: {}) สำหรับผู้เล่น: {}",
                character_name, class_data.name, username
            );

            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "create_character_success",
                        "message": "สร้างตัวละครสำเร็จ",
                        "character_id": character_id
                    })
                    .to_string()
                    .into(),
                ))
                .await;
        }
        Err(e) => {
            eprintln!("Error creating character in DB: {:?}", e);
            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "create_character_error",
                        "message": "เกิดข้อผิดพลาดในการบันทึกข้อมูลตัวละคร"
                    })
                    .to_string()
                    .into(),
                ))
                .await;
        }
    }
}

/// จัดการการโหลดรายการตัวละคร
async fn handle_load_characters(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    pool: &PgPool,
    data: &serde_json::Value,
) {
    let _username = data["username"].as_str().unwrap_or("");
    // ในอนาคตควรกรองด้วย username หรือ user_id แต่ตอนนี้ดึงทั้งหมดตาม logic เดิม

    let characters_result = sqlx::query(
        "SELECT id, user_id, classes_id, username, level, hp, max_hp, str, dex, agi, vit, int, luk, current_exp, stat_points, skill_points, base_atk, base_def, accuracy, evasion, crit_rate, move_speed FROM players",
    )
    .fetch_all(pool)
    .await;

    match characters_result {
        Ok(rows) => {
            let levels_results = sqlx::query("SELECT level, exp_required FROM level_exp_table")
                .fetch_all(pool)
                .await;

            if levels_results.is_err() {
                eprintln!("ไม่พบข้อมูล level_exp_table");
                return;
            }

            let classes_result = sqlx::query("SELECT id, name, sprite_id FROM classes")
                .fetch_all(pool)
                .await;

            if classes_result.is_err() {
                eprintln!("ไม่พบข้อมูล classes");
                return;
            }

            let levels = levels_results.unwrap();
            let classes = classes_result.unwrap();

            let characters: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    let exp_required = levels
                        .iter()
                        .find(|level| level.get::<i32, _>("level") == row.get::<i32, _>("level"))
                        .map(|level| level.get::<BigDecimal, _>("exp_required"))
                        .unwrap_or_else(|| BigDecimal::from(0));

                    let classes_id = row.get::<Option<i32>, _>("classes_id").unwrap_or(1);

                    let classes_name = classes
                        .iter()
                        .find(|class| class.get::<i32, _>("id") == classes_id)
                        .map(|class| class.get::<String, _>("name"))
                        .unwrap_or_else(|| "นักพจญภัย".to_string());

                    let sprite_id = classes
                        .iter()
                        .find(|class| class.get::<i32, _>("id") == classes_id)
                        .map(|class| class.get::<String, _>("sprite_id"))
                        .unwrap_or_else(|| "1".to_string());

                    serde_json::json!({
                        "id": row.get::<String, _>("id"),
                        "sprite_id": sprite_id,
                        "user_id": row.get::<i32, _>("user_id"),
                        "username": row.get::<String, _>("username"),
                        "classes_id": classes_id,
                        "classes_name": classes_name,
                        "level": row.get::<i32, _>("level"),
                        "hp": row.get::<i32, _>("hp"),
                        "max_hp": row.get::<i32, _>("max_hp"),
                        "str": row.get::<i32, _>("str"),
                        "dex": row.get::<i32, _>("dex"),
                        "agi": row.get::<i32, _>("agi"),
                        "vit": row.get::<i32, _>("vit"),
                        "int": row.get::<i32, _>("int"),
                        "luk": row.get::<i32, _>("luk"),
                        "exp": row.get::<i32, _>("current_exp"),
                        "max_exp": exp_required,
                        "atk": row.get::<i32, _>("base_atk"),
                        "def": row.get::<i32, _>("base_def"),
                        "accuracy": row.get::<BigDecimal, _>("accuracy"),
                        "evasion": row.get::<BigDecimal, _>("evasion"),
                        "crit_rate": row.get::<BigDecimal, _>("crit_rate"),
                        "move_speed": row.get::<BigDecimal, _>("move_speed"),
                        "skill_points": row.get::<i32, _>("skill_points"),
                        "stats_points": row.get::<i32, _>("stat_points"),
                        "equipment": {
                            "head": null,
                            "body": null,
                            "legs": null,
                            "feet": null,
                            "weapon": null,
                            "shield": null
                        }
                    })
                })
                .collect();

            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "characters_data",
                        "characters": characters
                    })
                    .to_string()
                    .into(),
                ))
                .await;
        }
        Err(e) => {
            eprintln!("Error loading characters from DB: {:?}", e);
            let _ = ws
                .send(Message::Text(
                    serde_json::json!({
                        "type": "characters_data",
                        "characters": []
                    })
                    .to_string()
                    .into(),
                ))
                .await;
        }
    }
}
