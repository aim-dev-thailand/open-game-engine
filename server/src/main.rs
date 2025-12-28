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

// --- ฐานข้อมูลและหน่วยความจำ (Database & Memory) ---
type PlayersMap = Arc<DashMap<String, PlayerState>>;
type MonstersMap = Arc<DashMap<String, MonsterInstance>>;

// --- ฟังก์ชันหลัก (Main Function) ---
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let database_url = "postgres://appadmin:A%24hi%24%40n%2301@10.8.0.1:25432/mmorpg_db";
    let pool = PgPool::connect(database_url).await?;

    // กำหนดข้อมูลในหน่วยความจำ (Init In-Memory Data)
    let players: PlayersMap = Arc::new(DashMap::new());
    let monsters: MonstersMap = Arc::new(DashMap::new());

    // สร้างงานพื้นหลัง (Spawn Background Tasks)
    let pool_clone = pool.clone();
    let players_clone = players.clone();
    tokio::spawn(async move {
        save_loop(pool_clone, players_clone).await;
    });

    let players_clone = players.clone();
    tokio::spawn(async move {
        status_effect_loop(players_clone).await;
    });

    let players_clone = players.clone();
    tokio::spawn(async move {
        admin_command_loop(players_clone).await;
    });

    // เซิร์ฟเวอร์ WebSocket (WebSocket Server)
    let listener = TcpListener::bind("0.0.0.0:8080").await?;
    println!("เซิร์ฟเวอร์ทำงานที่ ws://0.0.0.0:8080");

    while let Ok((stream, addr)) = listener.accept().await {
        let ws_stream = tokio_tungstenite::accept_async(stream).await?;
        let players_ref = players.clone();
        let monsters_ref = monsters.clone();
        
        tokio::spawn(async move {
            handle_client(ws_stream, players_ref, monsters_ref).await;
        });
    }
    Ok(())
}

// --- ตัวจัดการลูกค้า (Client Handler) ---
async fn handle_client(
    ws_stream: tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    players: PlayersMap,
    monsters: MonstersMap,
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
                            break;
                        }
                        Some("save_npc") => {
                            // บันทึก NPC (Handle save npc logic)
                            break;
                        }
                        Some("save_skill") => {
                            // บันทึกสกิล (Handle save skill logic)
                            break;
                        }
                        Some("save_map") => {
                            // บันทึกแผนที่ (Handle save map logic)
                            break;
                        }
                        Some("load_item") => {
                            // โหลดไอเทม (Handle load item logic)
                            break;
                        }
                        Some("load_npc") => {
                            // โหลด NPC (Handle load npc logic)
                            break;
                        }
                        Some("load_skill") => {
                            // โหลดสกิล (Handle load skill logic)
                            break;
                        }
                        Some("load_map") => {
                            // โหลดแผนที่ (Handle load map logic)
                            break;
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

async fn save_loop(pool: PgPool, players: PlayersMap) {
    let mut interval = tokio::time::interval(Duration::from_secs(300)); // 5 mins
    loop {
        interval.tick().await;
        println!("กำลังบันทึกข้อมูลผู้เล่นลงฐานข้อมูล...");
        // Implementation of SQL Update here
    }
}

async fn status_effect_loop(players: PlayersMap) {
    loop {
        tokio::time::sleep(Duration::from_secs(1)).await;
        // Logic to clear expired effects
    }
}

async fn admin_command_loop(players: PlayersMap) {
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