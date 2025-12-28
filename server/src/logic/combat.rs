use crate::models::{PlayerState, MonsterInstance};
use dashmap::DashMap;
use std::sync::Arc;

pub type PlayersMap = Arc<DashMap<String, PlayerState>>;
pub type MonstersMap = Arc<DashMap<String, MonsterInstance>>;

/// จัดการการโจมตี
pub fn handle_attack(player_id: &str, players: &PlayersMap, monsters: &MonstersMap) {
    if let Some(attacker) = players.get(player_id) {
        // ค้นหามอนสเตอร์ที่ใกล้ที่สุด (Mock logic)
        if let Some(monster_ref) = monsters.iter().next() {
            let monster = monster_ref.value();
            // คำนวณดเมจ
            let is_crit = rand::random::<f32>() < attacker.crit_rate;
            let mut dmg = attacker.base_atk;
            if is_crit {
                dmg = (dmg as f32 * 1.5) as i32;
            }

            // ส่งผลลัพธ์กลับ (แอปพลิเคชันจริงจะส่งไปยังลูกค้า)
            println!("โจมตีมอนสเตอร์ {} ได้ {} ดเมจ", monster.uuid, dmg);
        }
    }
}
