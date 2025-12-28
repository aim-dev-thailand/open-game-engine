use crate::models::*;
use dashmap::DashMap;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};

pub type PlayersMap = Arc<DashMap<String, PlayerState>>;
pub type ItemsMap = Arc<DashMap<i32, ItemData>>;
pub type MapsMap = Arc<DashMap<i32, MapData>>;
pub type NpcsMap = Arc<DashMap<i32, NpcData>>;
pub type SkillsMap = Arc<DashMap<i32, SkillData>>;

/// ลูปคำสั่งผู้ดูแลระบบ
pub async fn admin_command_loop(
    players: PlayersMap,
    items: ItemsMap,
    maps: MapsMap,
    npcs: NpcsMap,
    skills: SkillsMap,
) {
    let stdin = tokio::io::stdin();
    let mut reader = BufReader::new(stdin).lines();

    while let Ok(Some(line)) = reader.next_line().await {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        match parts[0] {
            "promote" => {
                if parts.len() == 3 {
                    let username = parts[1];
                    let role = parts[2];
                    println!("กำลังเลื่อนขั้นบทบาท {} เป็น {}", username, role);
                    // ค้นหาผู้เล่นตามชื่อและอัปเดตบทบาท
                } else {
                    println!("วิธีใช้: promote <username> <role>");
                }
            }
            "warp" => {
                if parts.len() == 5 {
                    let username = parts[1];
                    let map_id = parts[2].parse::<i32>().unwrap_or(0);
                    let x = parts[3].parse::<f32>().unwrap_or(0.0);
                    let y = parts[4].parse::<f32>().unwrap_or(0.0);
                    println!(
                        "กำลังวาร์ป {} ไปยังแผนที่ {} ({}, {})",
                        username, map_id, x, y
                    );
                    // ค้นหาผู้เล่นตามชื่อและอัปเดตตำแหน่ง
                } else {
                    println!("วิธีใช้: warp <username> <mapId> <x> <y>");
                }
            }
            _ => println!("คำสั่งผู้ดูแลไม่รู้จัก"),
        }
    }
}
