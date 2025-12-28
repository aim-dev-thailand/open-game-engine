use dashmap::DashMap;
use futures_util::{StreamExt, SinkExt};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::net::TcpListener;
use tokio_tungstenite::tungstenite::Message;

// --- Structures ---
// โครงสร้าง (Structures)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerState {
    pub id: String,
    pub username: String,
    pub x: f32,
    pub y: f32,
    pub hp: i32,
    pub max_hp: i32,
    pub base_atk: i32,
    pub base_def: i32,
    pub move_speed: f32,
    pub accuracy: f32,
    pub evasion: f32,
    pub crit_rate: f32,
    pub level: i32,
    pub skill_points: i32,
    pub role: String,
    pub learned_skills: Vec<i32>,
    pub active_statuses: Vec<ActiveStatus>,
    pub equipment: EquipmentState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EquipmentState {
    pub main_hand: Option<i32>,
    pub off_hand: Option<i32>,
    // ... other slots omitted for brevity ...
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveStatus {
    pub status_type: String, // "blind", "stun", etc.
    #[serde(skip)]
    pub expiry: Option<Instant>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonsterInstance {
    pub uuid: String,
    pub template_id: i32,
    pub sprite_id: String,
    pub x: f32,
    pub y: f32,
    pub current_hp: i32,
    pub max_hp: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemData {
    pub id: Option<i32>,
    pub name: String,
    pub description: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub rarity: String,
    pub value: i32,
    pub stackable: bool,
    pub max_stack: Option<i32>,
    pub stats: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapData {
    pub id: Option<i32>,
    pub name: String,
    pub description: String,
    pub width: i32,
    pub height: i32,
    pub tiles: serde_json::Value,
    pub spawn_points: Vec<serde_json::Value>,
    pub npcs: Vec<serde_json::Value>,
    pub monsters: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NpcData {
    pub id: Option<i32>,
    pub name: String,
    pub description: String,
    pub sprite_id: String,
    pub level: i32,
    pub hp: i32,
    pub max_hp: i32,
    pub attack: i32,
    pub defense: i32,
    pub move_speed: f32,
    pub is_hostile: bool,
    pub can_trade: bool,
    pub can_quest: bool,
    pub dialogue: Vec<serde_json::Value>,
    pub shop_items: Option<Vec<i32>>,
    pub quests: Option<Vec<i32>>,
    pub position: serde_json::Value,
    pub map_id: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillData {
    pub id: Option<i32>,
    pub name: String,
    pub description: String,
    pub icon_id: Option<String>,
    #[serde(rename = "type")]
    pub skill_type: String,
    pub element: String,
    pub level_required: i32,
    pub mp_cost: i32,
    pub cooldown: i32,
    pub cast_time: f32,
    pub range: f32,
    #[serde(rename = "area_of_effect")]
    pub area_of_effect: f32,
    pub effects: Vec<serde_json::Value>,
    pub learnable_by: Vec<String>,
}

// --- ฐานข้อมูลและหน่วยความจำ (Database & Memory) ---
type PlayersMap = Arc<DashMap<String, PlayerState>>;
type MonstersMap = Arc<DashMap<String, MonsterInstance>>;
type ItemsMap = Arc<DashMap<i32, ItemData>>;
type MapsMap = Arc<DashMap<i32, MapData>>;
type NpcsMap = Arc<DashMap<i32, NpcData>>;
type SkillsMap = Arc<DashMap<i32, SkillData>>;

// --- ฟังก์ชันหลัก (Main Function) ---
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let database_url = "postgres://appadmin:A%24hi%24%40n%2301@10.8.0.1:25432/mmorpg_db";
    let pool = PgPool::connect(database_url).await?;

    // กำหนดข้อมูลในหน่วยความจำ (Init In-Memory Data)
    let players: PlayersMap = Arc::new(DashMap::new());
    let monsters: MonstersMap = Arc::new(DashMap::new());
    let items: ItemsMap = Arc::new(DashMap::new());
    let maps: MapsMap = Arc::new(DashMap::new());
    let npcs: NpcsMap = Arc::new(DashMap::new());
    let skills: SkillsMap = Arc::new(DashMap::new());

    // สร้างงานพื้นหลัง (Spawn Background Tasks)
    let pool_clone = pool.clone();
    let players_clone = players.clone();
    let items_clone = items.clone();
    let maps_clone = maps.clone();
    let npcs_clone = npcs.clone();
    let skills_clone = skills.clone();
    tokio::spawn(async move {
        save_loop(pool_clone, players_clone, items_clone, maps_clone, npcs_clone, skills_clone).await;
    });

    let players_clone = players.clone();
    tokio::spawn(async move {
        status_effect_loop(players_clone).await;
    });

    let players_clone = players.clone();
    let items_clone = items.clone();
    let maps_clone = maps.clone();
    let npcs_clone = npcs.clone();
    let skills_clone = skills.clone();
    tokio::spawn(async move {
        admin_command_loop(players_clone, items_clone, maps_clone, npcs_clone, skills_clone).await;
    });

    // เซิร์ฟเวอร์ WebSocket (WebSocket Server)
    let listener = TcpListener::bind("0.0.0.0:8080").await?;
    println!("เซิร์ฟเวอร์ทำงานที่ ws://0.0.0.0:8080");

    while let Ok((stream, addr)) = listener.accept().await {
        let ws_stream = tokio_tungstenite::accept_async(stream).await?;
        let players_ref = players.clone();
        let monsters_ref = monsters.clone();
        let items_ref = items.clone();
        let maps_ref = maps.clone();
        let npcs_ref = npcs.clone();
        let skills_ref = skills.clone();
        
        tokio::spawn(async move {
            handle_client(ws_stream, players_ref, monsters_ref, items_ref, maps_ref, npcs_ref, skills_ref).await;
        });
    }
    Ok(())
}

// --- ตัวจัดการลูกค้า (Client Handler) ---
async fn handle_client(
    ws_stream: tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    players: PlayersMap,
    monsters: MonstersMap,
    items: ItemsMap,
    maps: MapsMap,
    npcs: NpcsMap,
    skills: SkillsMap,
) {
    let mut ws = ws_stream;
    let mut player_id = String::new();

    while let Some(msg_result) = ws.next().await {
        if let Ok(msg) = msg_result {
            if let Message::Text(text) = msg {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(&text) {
                    match data["type"].as_str() {
                        Some("login") => {
                            // ตรวจสอบผู้ใช้และสร้าง PlayerState (Logic: Validate User, Create PlayerState)
                            let username = data["username"].as_str().unwrap_or("Unknown");
                            player_id = uuid::Uuid::new_v4().to_string();
                            
                            let new_player = PlayerState {
                                id: player_id.clone(),
                                username: username.to_string(),
                                x: 100.0, y: 100.0,
                                hp: 100, max_hp: 100,
                                base_atk: 20, base_def: 10,
                                move_speed: 2.0, accuracy: 0.9, evasion: 0.1, crit_rate: 0.05,
                                level: 1, skill_points: 0, role: "user".to_string(),
                                learned_skills: vec![],
                                active_statuses: vec![],
                                equipment: EquipmentState { main_hand: None, off_hand: None },
                            };
                            players.insert(player_id.clone(), new_player);
                            
                            // ส่งข้อมูลเริ่มต้นกลับ (Send Init Data back)
                            let _ = ws.send(Message::Text(serde_json::json!({"type": "init", "id": player_id}).to_string()));
                        }
                        Some("move") => {
                            // อัปเดตตำแหน่งในหน่วยความจำ (Update Position in memory)
                            if let Some(mut p) = players.get_mut(&player_id) {
                                p.x = data["x"].as_f64().unwrap() as f32;
                                p.y = data["y"].as_f64().unwrap() as f32;
                            }
                        }
                        Some("attack") => {
                            // โจมตี (Attack)
                            handle_attack(&player_id, &players, &monsters);
                        }
                        Some("cast_skill") => {
                            // จัดการสกิล (Handle Skill Logic)
                        }
                        Some("save_item") => {
                            // บันทึกไอเทม (Handle save item logic)
                            if let Some(item_data) = data.get("item") {
                                if let Ok(item) = serde_json::from_value::<ItemData>(item_data.clone()) {
                                    let id = item.id.unwrap_or(items.len() as i32 + 1);
                                    let item_name = item.name.clone();
                                    items.insert(id, item);
                                    println!("บันทึกไอเทม: {}", item_name);
                                }
                            }
                            break;
                        }
                        Some("save_npc") => {
                            // บันทึก NPC (Handle save npc logic)
                            if let Some(npc_data) = data.get("npc") {
                                if let Ok(npc) = serde_json::from_value::<NpcData>(npc_data.clone()) {
                                    let id = npc.id.unwrap_or(npcs.len() as i32 + 1);
                                    let npc_name = npc.name.clone();
                                    npcs.insert(id, npc);
                                    println!("บันทึก NPC: {}", npc_name);
                                }
                            }
                            break;
                        }
                        Some("save_skill") => {
                            // บันทึกสกิล (Handle save skill logic)
                            if let Some(skill_data) = data.get("skill") {
                                if let Ok(skill) = serde_json::from_value::<SkillData>(skill_data.clone()) {
                                    let id = skill.id.unwrap_or(skills.len() as i32 + 1);
                                    let skill_name = skill.name.clone();
                                    skills.insert(id, skill);
                                    println!("บันทึกสกิล: {}", skill_name);
                                }
                            }
                            break;
                        }
                        Some("save_map") => {
                            // บันทึกแผนที่ (Handle save map logic)
                            if let Some(map_data) = data.get("map") {
                                if let Ok(map) = serde_json::from_value::<MapData>(map_data.clone()) {
                                    let id = map.id.unwrap_or(maps.len() as i32 + 1);
                                    let map_name = map.name.clone();
                                    maps.insert(id, map);
                                    println!("บันทึกแผนที่: {}", map_name);
                                }
                            }
                            break;
                        }
                        Some("load_item") => {
                            // โหลดไอเทม (Handle load item logic)
                            let items_vec: Vec<ItemData> = items.iter().map(|entry| entry.value().clone()).collect();
                            let _ = ws.send(Message::Text(serde_json::json!({
                                "type": "items_loaded",
                                "items": items_vec
                            }).to_string()));
                        }
                        Some("load_npc") => {
                            // โหลด NPC (Handle load npc logic)
                            let npcs_vec: Vec<NpcData> = npcs.iter().map(|entry| entry.value().clone()).collect();
                            let _ = ws.send(Message::Text(serde_json::json!({
                                "type": "npcs_loaded",
                                "npcs": npcs_vec
                            }).to_string()));
                        }
                        Some("load_skill") => {
                            // โหลดสกิล (Handle load skill logic)
                            let skills_vec: Vec<SkillData> = skills.iter().map(|entry| entry.value().clone()).collect();
                            let _ = ws.send(Message::Text(serde_json::json!({
                                "type": "skills_loaded",
                                "skills": skills_vec
                            }).to_string()));
                        }
                        Some("load_map") => {
                            // โหลดแผนที่ (Handle load map logic)
                            let maps_vec: Vec<MapData> = maps.iter().map(|entry| entry.value().clone()).collect();
                            let _ = ws.send(Message::Text(serde_json::json!({
                                "type": "maps_loaded",
                                "maps": maps_vec
                            }).to_string()));
                        }
                        Some("logout") => {
                            // ออกจากระบบ (Logout)
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

// --- ฟังก์ชันตรรกะ (Logic Functions) ---

fn handle_attack(player_id: &str, players: &PlayersMap, monsters: &MonstersMap) {
    if let Some(attacker) = players.get(player_id) {
        // ค้นหามอนสเตอร์ที่ใกล้ที่สุด (Mock logic) (Find nearest monster)
        if let Some(monster_ref) = monsters.iter().next() {
            let monster = monster_ref.value();
            // คำนวณดเมจ (Calc Damage)
            let is_crit = rand::random::<f32>() < attacker.crit_rate;
            let mut dmg = attacker.base_atk;
            if is_crit { dmg = (dmg as f32 * 1.5) as i32; }
            
            // ส่งผลลัพธ์กลับ (แอปพลิเคชันจริงจะส่งไปยังลูกค้า) (Send result back)
            // ที่นี่เราแค่พิมพ์ออก (Here we just mock print)
            println!("โจมตีมอนสเตอร์ {} ได้ {} ดเมจ", monster.uuid, dmg);
        }
    }
}

// --- ลูปพื้นหลัง (Background Loops) ---

async fn save_loop(pool: PgPool, players: PlayersMap, items: ItemsMap, maps: MapsMap, npcs: NpcsMap, skills: SkillsMap) {
    let mut interval = tokio::time::interval(Duration::from_secs(300)); // 5 mins
    loop {
        interval.tick().await;
        println!("กำลังบันทึกข้อมูลลงฐานข้อมูล...");
        
        // บันทึกไอเทม
        for entry in items.iter() {
            let item = entry.value();
            let id = item.id.unwrap_or(0);
            let stats_json = serde_json::to_string(&item.stats).unwrap_or("{}".to_string());
            let result = sqlx::query(
                r#"
                INSERT INTO items (id, name, description, type, rarity, value, stackable, max_stack, stats)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    type = EXCLUDED.type,
                    rarity = EXCLUDED.rarity,
                    value = EXCLUDED.value,
                    stackable = EXCLUDED.stackable,
                    max_stack = EXCLUDED.max_stack,
                    stats = EXCLUDED.stats
                "#
            )
            .bind(id)
            .bind(&item.name)
            .bind(&item.description)
            .bind(&item.item_type)
            .bind(&item.rarity)
            .bind(item.value)
            .bind(item.stackable)
            .bind(item.max_stack)
            .bind(&stats_json)
            .execute(&pool)
            .await;
            
            match result {
                Ok(_) => println!("บันทึกไอเทม: {}", item.name),
                Err(e) => println!("บันทึกไอเทมผิดพลาด {}: {}", item.name, e),
            }
        }
        
        // บันทึกแผนที่
        for entry in maps.iter() {
            let map = entry.value();
            let id = map.id.unwrap_or(0);
            let tiles_json = serde_json::to_string(&map.tiles).unwrap_or("{}".to_string());
            let spawn_points_json = serde_json::to_string(&map.spawn_points).unwrap_or("[]".to_string());
            let npcs_json = serde_json::to_string(&map.npcs).unwrap_or("[]".to_string());
            let monsters_json = serde_json::to_string(&map.monsters).unwrap_or("[]".to_string());
            let result = sqlx::query(
                r#"
                INSERT INTO maps (id, name, description, width, height, tiles, spawn_points, npcs, monsters)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    width = EXCLUDED.width,
                    height = EXCLUDED.height,
                    tiles = EXCLUDED.tiles,
                    spawn_points = EXCLUDED.spawn_points,
                    npcs = EXCLUDED.npcs,
                    monsters = EXCLUDED.monsters
                "#
            )
            .bind(id)
            .bind(&map.name)
            .bind(&map.description)
            .bind(map.width)
            .bind(map.height)
            .bind(&tiles_json)
            .bind(&spawn_points_json)
            .bind(&npcs_json)
            .bind(&monsters_json)
            .execute(&pool)
            .await;
            
            match result {
                Ok(_) => println!("บันทึกแผนที่: {}", map.name),
                Err(e) => println!("บันทึกแผนที่ผิดพลาด {}: {}", map.name, e),
            }
        }
        
        // บันทึก NPC
        for entry in npcs.iter() {
            let npc = entry.value();
            let id = npc.id.unwrap_or(0);
            let dialogue_json = serde_json::to_string(&npc.dialogue).unwrap_or("[]".to_string());
            let shop_items_json = npc.shop_items.as_ref().map(|v| serde_json::to_string(v).ok()).flatten().unwrap_or("[]".to_string());
            let quests_json = npc.quests.as_ref().map(|v| serde_json::to_string(v).ok()).flatten().unwrap_or("[]".to_string());
            let position_json = serde_json::to_string(&npc.position).unwrap_or("{}".to_string());
            let result = sqlx::query(
                r#"
                INSERT INTO npcs (id, name, description, sprite_id, level, hp, max_hp, attack, defense, move_speed, is_hostile, can_trade, can_quest, dialogue, shop_items, quests, position, map_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
                    map_id = EXCLUDED.map_id
                "#
            )
            .bind(id)
            .bind(&npc.name)
            .bind(&npc.description)
            .bind(&npc.sprite_id)
            .bind(npc.level)
            .bind(npc.hp)
            .bind(npc.max_hp)
            .bind(npc.attack)
            .bind(npc.defense)
            .bind(npc.move_speed)
            .bind(npc.is_hostile)
            .bind(npc.can_trade)
            .bind(npc.can_quest)
            .bind(&dialogue_json)
            .bind(&shop_items_json)
            .bind(&quests_json)
            .bind(&position_json)
            .bind(npc.map_id)
            .execute(&pool)
            .await;
            
            match result {
                Ok(_) => println!("บันทึก NPC: {}", npc.name),
                Err(e) => println!("บันทึก NPC ผิดพลาด {}: {}", npc.name, e),
            }
        }
        
        // บันทึกสกิล
        for entry in skills.iter() {
            let skill = entry.value();
            let id = skill.id.unwrap_or(0);
            let effects_json = serde_json::to_string(&skill.effects).unwrap_or("[]".to_string());
            let learnable_by_json = serde_json::to_string(&skill.learnable_by).unwrap_or("[]".to_string());
            let result = sqlx::query(
                r#"
                INSERT INTO skills (id, name, description, icon_id, type, element, level_required, mp_cost, cooldown, cast_time, range, area_of_effect, effects, learnable_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    icon_id = EXCLUDED.icon_id,
                    type = EXCLUDED.type,
                    element = EXCLUDED.element,
                    level_required = EXCLUDED.level_required,
                    mp_cost = EXCLUDED.mp_cost,
                    cooldown = EXCLUDED.cooldown,
                    cast_time = EXCLUDED.cast_time,
                    range = EXCLUDED.range,
                    area_of_effect = EXCLUDED.area_of_effect,
                    effects = EXCLUDED.effects,
                    learnable_by = EXCLUDED.learnable_by
                "#
            )
            .bind(id)
            .bind(&skill.name)
            .bind(&skill.description)
            .bind(&skill.icon_id)
            .bind(&skill.skill_type)
            .bind(&skill.element)
            .bind(skill.level_required)
            .bind(skill.mp_cost)
            .bind(skill.cooldown)
            .bind(skill.cast_time)
            .bind(skill.range)
            .bind(skill.area_of_effect)
            .bind(&effects_json)
            .bind(&learnable_by_json)
            .execute(&pool)
            .await;
            
            match result {
                Ok(_) => println!("บันทึกสกิล: {}", skill.name),
                Err(e) => println!("บันทึกสกิลผิดพลาด {}: {}", skill.name, e),
            }
        }
    }
}

async fn status_effect_loop(players: PlayersMap) {
    loop {
        tokio::time::sleep(Duration::from_secs(1)).await;
        // Logic to clear expired effects
    }
}

async fn admin_command_loop(players: PlayersMap, items: ItemsMap, maps: MapsMap, npcs: NpcsMap, skills: SkillsMap) {
    // ลูปคำสั่งผู้ดูแล (Admin command loop)
    let stdin = tokio::io::stdin();
    let mut reader = BufReader::new(stdin).lines();
    
    while let Ok(Some(line)) = reader.next_line().await {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.is_empty() { continue; }
        
        match parts[0] {
            "promote" => {
                if parts.len() == 3 {
                    let username = parts[1];
                    let role = parts[2];
                    println!("กำลังเลื่อนขั้นบทบาท {} เป็น {}", username, role);
                    // ค้นหาผู้เล่นตามชื่อและอัปเดตบทบาท (Find player by username and update role)
                } else {
                    println!("วิธีใช้: promote <username> <role>");
                }
            }
            "warp" => {
                // ตรรกะ: วาร์ปผู้เล่นไปยังตำแหน่ง x, y (Logic: Warp player to x, y)
                if parts.len() == 5 {
                    let username = parts[1];
                    let mapId = parts[2].parse::<i32>().unwrap_or(0);
                    let x = parts[3].parse::<f32>().unwrap_or(0.0);
                    let y = parts[4].parse::<f32>().unwrap_or(0.0);
                    println!("กำลังวาร์ป {} ไปยังแผนที่ {} ({}, {})", username, mapId, x, y);
                    // ค้นหาผู้เล่นตามชื่อและอัปเดตตำแหน่ง (Find player by username and update position)
                } else {
                    println!("วิธีใช้: warp <username> <mapId> <x> <y>");
                }
            }
            _ => println!("คำสั่งผู้ดูแลไม่รู้จัก"),
        }
    }
}