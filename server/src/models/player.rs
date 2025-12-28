use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerState {
    pub id: String,
    pub username: String,
    pub x: f32,
    pub y: f32,
    pub hp: i32,
    pub max_hp: i32,
    pub mp: i32,
    pub max_mp: i32,

    // Base Stats
    pub base_atk: i32,
    pub base_def: i32,
    pub move_speed: f32,
    pub accuracy: f32,
    pub evasion: f32,
    pub crit_rate: f32,

    // Primary Stats (สถานะหลัก)
    #[serde(rename = "str")]
    pub strength: i32,  // Strength - เพิ่มพลังโจมตีกายภาพ
    pub dex: i32,  // Dexterity - เพิ่มความแม่นยำและโจมตีทางไกล
    pub agi: i32,  // Agility - เพิ่มอัตราหลบหลีกและความเร็ว
    #[serde(rename = "int")]
    pub intelligence: i32,  // Intelligence - เพิ่มพลังโจมตีเวทย์และ MP
    pub luk: i32,  // Luck - เพิ่มอัตราคริติคอลและ drop rate
    pub vit: i32,  // Vitality - เพิ่มพลังชีวิตและป้องกัน

    // Leveling System
    pub level: i32,
    pub current_exp: i32,
    pub stat_points: i32,
    pub skill_points: i32,

    pub role: String,
    pub learned_skills: Vec<i32>,
    pub active_statuses: Vec<ActiveStatus>,
    pub equipment: EquipmentState,
}

impl PlayerState {
    /// คำนวณ stats จาก primary stats
    pub fn calculate_total_atk(&self) -> i32 {
        // ATK = base_atk + (STR * 2) + (DEX * 0.5)
        self.base_atk + (self.strength * 2) + (self.dex / 2)
    }

    pub fn calculate_total_def(&self) -> i32 {
        // DEF = base_def + (VIT * 1.5)
        self.base_def + (self.vit * 3 / 2)
    }

    pub fn calculate_total_hp(&self) -> i32 {
        // HP = max_hp + (VIT * 10)
        self.max_hp + (self.vit * 10)
    }

    pub fn calculate_total_mp(&self) -> i32 {
        // MP = max_mp + (INT * 5)
        self.max_mp + (self.intelligence * 5)
    }

    pub fn calculate_accuracy(&self) -> f32 {
        // Accuracy = base_accuracy + (DEX * 0.002)
        self.accuracy + (self.dex as f32 * 0.002)
    }

    pub fn calculate_evasion(&self) -> f32 {
        // Evasion = base_evasion + (AGI * 0.003)
        self.evasion + (self.agi as f32 * 0.003)
    }

    pub fn calculate_crit_rate(&self) -> f32 {
        // Crit Rate = base_crit_rate + (LUK * 0.001)
        self.crit_rate + (self.luk as f32 * 0.001)
    }

    pub fn calculate_move_speed(&self) -> f32 {
        // Move Speed = base_move_speed + (AGI * 0.01)
        self.move_speed + (self.agi as f32 * 0.01)
    }

    /// คำนวณ EXP ที่ต้องการเพื่อเลเวลอัพ
    pub fn exp_to_next_level(&self) -> i32 {
        // สูตร: EXP = 100 * level^1.5
        (100.0 * (self.level as f32).powf(1.5)) as i32
    }

    /// ตรวจสอบว่าได้ EXP พอเลเวลอัพหรือไม่
    pub fn can_level_up(&self) -> bool {
        self.current_exp >= self.exp_to_next_level()
    }

    /// เพิ่ม EXP และจัดการเลเวลอัพ
    pub fn add_exp(&mut self, exp: i32) {
        self.current_exp += exp;

        while self.can_level_up() {
            self.level_up();
        }
    }

    /// เลเวลอัพ
    fn level_up(&mut self) {
        self.current_exp -= self.exp_to_next_level();
        self.level += 1;
        self.stat_points += 5;  // ได้ 5 stat points ต่อ level
        self.skill_points += 1;  // ได้ 1 skill point ต่อ level

        // เติม HP/MP เต็ม
        self.hp = self.calculate_total_hp();
        self.max_hp = self.calculate_total_hp();
        self.mp = self.calculate_total_mp();
        self.max_mp = self.calculate_total_mp();
    }

    /// จัดสรร stat point
    pub fn allocate_stat(&mut self, stat_type: &str, amount: i32) -> Result<(), String> {
        if amount <= 0 {
            return Err("จำนวนต้องมากกว่า 0".to_string());
        }

        if self.stat_points < amount {
            return Err("Stat points ไม่พอ".to_string());
        }

        match stat_type.to_lowercase().as_str() {
            "str" => self.strength += amount,
            "dex" => self.dex += amount,
            "agi" => self.agi += amount,
            "int" => {
                self.intelligence += amount;
                // อัปเดต MP เมื่อเพิ่ม INT
                let new_max_mp = self.calculate_total_mp();
                let mp_diff = new_max_mp - self.max_mp;
                self.max_mp = new_max_mp;
                self.mp += mp_diff;
            }
            "luk" => self.luk += amount,
            "vit" => {
                self.vit += amount;
                // อัปเดต HP เมื่อเพิ่ม VIT
                let new_max_hp = self.calculate_total_hp();
                let hp_diff = new_max_hp - self.max_hp;
                self.max_hp = new_max_hp;
                self.hp += hp_diff;
            }
            _ => return Err(format!("ไม่รู้จัก stat type: {}", stat_type)),
        }

        self.stat_points -= amount;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EquipmentState {
    pub main_hand: Option<i32>,
    pub off_hand: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveStatus {
    pub status_type: String, // "blind", "stun", etc.
    #[serde(skip)]
    pub expiry: Option<Instant>,
}
