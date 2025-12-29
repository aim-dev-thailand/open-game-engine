use crate::logic::combat::handle_attack;
use crate::models::*;
use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
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
                            handle_register(&mut ws, &data).await;
                        }
                        Some("login") => {
                            handle_login(&mut ws, &mut player_id, &players, &data).await;
                        }
                        Some("move") => {
                            handle_move(&player_id, &players, &data).await;
                        }
                        Some("attack") => {
                            handle_attack(&player_id, &players, &monsters);
                        }
                        Some("cast_skill") => {
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
                            handle_load_classes(&mut ws, &classes).await;
                        }
                        Some("load_skill") => {
                            handle_load_skills(&mut ws, &skills).await;
                        }
                        Some("load_map") => {
                            handle_load_maps(&mut ws, &maps).await;
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
    data: &serde_json::Value,
) {
    let username = data["username"].as_str().unwrap_or("");
    let email = data["email"].as_str().unwrap_or("");
    let password = data["password"].as_str().unwrap_or("");

    // Server-side validation
    if username.trim().is_empty() {
        let _ = ws
            .send(Message::Text(
                serde_json::json!({
                    "type": "register_error",
                    "message": "กรุณากรอกชื่อผู้ใช้"
                })
                .to_string(),
            ))
            .await;
        return;
    }

    if email.trim().is_empty() {
        let _ = ws
            .send(Message::Text(
                serde_json::json!({
                    "type": "register_error",
                    "message": "กรุณากรอกอีเมล"
                })
                .to_string(),
            ))
            .await;
        return;
    }

    if !email.contains('@') {
        let _ = ws
            .send(Message::Text(
                serde_json::json!({
                    "type": "register_error",
                    "message": "รูปแบบอีเมลไม่ถูกต้อง"
                })
                .to_string(),
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
                .to_string(),
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
                .to_string(),
            ))
            .await;
        return;
    }

    // TODO: ตรวจสอบว่าชื่อผู้ใช้หรืออีเมลซ้ำในฐานข้อมูลหรือไม่
    // TODO: เข้ารหัสรหัสผ่านด้วย bcrypt หรือ argon2
    // TODO: บันทึกข้อมูลผู้ใช้ลงฐานข้อมูล

    // สำหรับตอนนี้ ส่งสถานะสำเร็จกลับไป
    println!("ผู้ใช้ใหม่สมัครสมาชิก: username={}, email={}", username, email);

    let _ = ws
        .send(Message::Text(
            serde_json::json!({
                "type": "register_success",
                "role": "user",
                "message": "สมัครสมาชิกสำเร็จ"
            })
            .to_string(),
        ))
        .await;
}

async fn handle_login(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    player_id: &mut String,
    players: &PlayersMap,
    data: &serde_json::Value,
) {
    let username = data["username"].as_str().unwrap_or("Unknown");
    *player_id = uuid::Uuid::new_v4().to_string();

    let new_player = PlayerState {
        id: player_id.clone(),
        username: username.to_string(),
        x: 100.0,
        y: 100.0,
        hp: 100,
        max_hp: 100,
        mp: 50,
        max_mp: 50,

        // Base Stats
        base_atk: 20,
        base_def: 10,
        move_speed: 2.0,
        accuracy: 0.9,
        evasion: 0.1,
        crit_rate: 0.05,

        // Primary Stats (เริ่มต้น 5 ทุกอัน)
        strength: 5,
        dex: 5,
        agi: 5,
        intelligence: 5,
        luk: 5,
        vit: 5,

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
    players.insert(player_id.clone(), new_player);

    let _ = ws
        .send(Message::Text(
            serde_json::json!({"type": "init", "id": player_id}).to_string(),
        ))
        .await;
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
            .to_string(),
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
            .to_string(),
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
            .to_string(),
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
            .to_string(),
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
        } else {
            println!("Error parsing class data");
        }
    }
}

async fn handle_load_classes(
    ws: &mut tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    classes: &ClassesMap,
) {
    let classes_vec: Vec<ClassData> = classes.iter().map(|entry| entry.value().clone()).collect();
    let _ = ws
        .send(Message::Text(
            serde_json::json!({
                "type": "classes_loaded",
                "classes": classes_vec
            })
            .to_string(),
        ))
        .await;
}
