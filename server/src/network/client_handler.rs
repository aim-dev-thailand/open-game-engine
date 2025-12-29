use crate::logic::combat::handle_attack;
use crate::models::*;
use bcrypt::{DEFAULT_COST, hash, verify};
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
                            handle_save_npc(&mut ws, &npcs, &data).await;
                            break;
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
                            handle_save_map(&mut ws, &maps, &data).await;
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
                            handle_create_character(&mut ws, &players, &classes, &data).await;
                        }
                        Some("load_characters") => {
                            handle_load_characters(&mut ws, &players, &data).await;
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

async fn handle_login(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    pool: &PgPool,
    data: &serde_json::Value,
) {
    let username = data["username"].as_str().unwrap_or("");
    let password = data["password"].as_str().unwrap_or("");

    println!(
        "พยายามเข้าสู่ระบบ: username={} password={}",
        username, password
    );

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
        p.x = data["x"].as_f64().unwrap() as f32;
        p.y = data["y"].as_f64().unwrap() as f32;
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

async fn handle_save_npc(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    npcs: &NpcsMap,
    data: &serde_json::Value,
) {
    if let Some(npc_data) = data.get("npc") {
        if let Ok(npc) = serde_json::from_value::<NpcData>(npc_data.clone()) {
            let id = npc.id.unwrap_or(npcs.len() as i32 + 1);
            let npc_name = npc.name.clone();
            npcs.insert(id, npc);
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

async fn handle_save_map(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    maps: &MapsMap,
    data: &serde_json::Value,
) {
    if let Some(map_data) = data.get("map") {
        if let Ok(map) = serde_json::from_value::<MapData>(map_data.clone()) {
            let id = map.id.unwrap_or(maps.len() as i32 + 1);
            let map_name = map.name.clone();
            maps.insert(id, map);
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
                        movespeed: row.get::<f64, _>("movespeed"),
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

    // สร้างตัวละครใหม่
    let character_id = uuid::Uuid::new_v4().to_string();
    let new_player = PlayerState {
        id: character_id.clone(),
        username: character_name.to_string(),
        x: 100.0,
        y: 100.0,
        hp: class_data.hp,
        max_hp: class_data.hp,
        mp: 50,
        max_mp: 50,

        // Base Stats จาก class
        base_atk: class_data.atk,
        base_def: class_data.def,
        move_speed: class_data.movespeed,
        accuracy: (class_data.accuracy as f32) / 100.0,
        evasion: (class_data.evasion as f32) / 100.0,
        crit_rate: (class_data.crit_rate as f32) / 100.0,

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

    players.insert(character_id.clone(), new_player);

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

/// จัดการการโหลดรายการตัวละคร
async fn handle_load_characters(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    players: &PlayersMap,
    data: &serde_json::Value,
) {
    let _username = data["username"].as_str().unwrap_or("");

    // TODO: ในระบบจริงควรดึงข้อมูลจากฐานข้อมูลโดยใช้ user_id
    // สำหรับตอนนี้เราจะส่งรายการตัวละครทั้งหมด (ในระบบจริงควรกรองตาม username หรือ user_id)

    let characters: Vec<serde_json::Value> = players
        .iter()
        .map(|entry| {
            let player = entry.value();
            serde_json::json!({
                "id": player.id,
                "character_name": player.username,
                "class_name": "นักพจญภัย", // TODO: ควรเก็บ class_name ใน PlayerState
                "level": player.level,
                "hp": player.hp,
                "max_hp": player.max_hp,
                "str": player.strength,
                "dex": player.dex,
                "agi": player.agi,
                "vit": player.vit,
                "int": player.intelligence,
                "luk": player.luk,
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
