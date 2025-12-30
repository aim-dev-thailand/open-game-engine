use crate::{models::{NpcData, PlayerState}};
use dashmap::DashMap;
use std::sync::Arc;

use bigdecimal::ToPrimitive;

pub type PlayersMap = Arc<DashMap<String, PlayerState>>;
pub type NpcsMap = Arc<DashMap<i32, NpcData>>;

/// จัดการการโจมตี
pub fn handle_attack(player_id: &str, players: &PlayersMap, npcs: &NpcsMap) {
    if let Some(attacker) = players.get(player_id) {
        // ค้นหามอนสเตอร์ที่ใกล้ที่สุด (Mock logic)
        if let Some(npc_ref) = npcs.iter().next() {
            let npc = npc_ref.value();
            // คำนวณดเมจ
            let is_crit = rand::random::<f32>() < attacker.crit_rate.to_f32().unwrap_or(0.0);
            let mut dmg = attacker.base_atk;
            if is_crit {
                dmg = (dmg as f32 * 1.75) as i32;
            }

            // ส่งผลลัพธ์กลับ (แอปพลิเคชันจริงจะส่งไปยังลูกค้า)
            println!("โจมตีมอนสเตอร์ {} ได้ {} ดาเมจ", npc.name, dmg);
        }
    }
}
