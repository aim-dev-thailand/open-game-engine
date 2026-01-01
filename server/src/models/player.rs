use bigdecimal::{BigDecimal, FromPrimitive, ToPrimitive};
use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerState {
    pub id: String,
    pub user_id: i32,
    pub username: String,
    pub character_id: i32, // Added to track which character is loaded
    pub map_id: i32,
    pub x: BigDecimal,
    pub y: BigDecimal,
    pub hp: i32,
    pub max_hp: i32,
    pub mp: i32,
    pub max_mp: i32,

    // Base Stats
    pub base_atk: i32,
    pub base_def: i32,
    pub move_speed: BigDecimal,
    pub accuracy: BigDecimal,
    pub evasion: BigDecimal,
    pub crit_rate: BigDecimal,

    // Primary Stats (สถานะหลัก)
    pub str: i32, // Strength - เพิ่มพลังโจมตีกายภาพ
    pub dex: i32, // Dexterity - เพิ่มความแม่นยำและโจมตีทางไกล
    pub agi: i32, // Agility - เพิ่มอัตราหลบหลีกและความเร็ว
    pub int: i32, // Intelligence - เพิ่มพลังโจมตีเวทย์และ MP
    pub luk: i32, // Luck - เพิ่มอัตราคริติคอลและ drop rate
    pub vit: i32, // Vitality - เพิ่มพลังชีวิตและป้องกัน

    // Leveling System
    pub level: i32,
    pub current_exp: i32,
    pub stat_points: i32,
    pub skill_points: i32,
    pub exp: i32, // Added for compatibility/alias if needed, but logic uses current_exp

    pub role: String,
    pub sprite_id: String, // Added sprite_id
    pub learned_skills: Vec<i32>,
    pub active_statuses: Vec<ActiveStatus>,
    pub equipment: EquipmentState,
}

impl Default for PlayerState {
    fn default() -> Self {
        Self {
            id: "".to_string(),
            user_id: 0,
            username: "".to_string(),
            character_id: 0,
            map_id: 0,
            x: BigDecimal::from(0),
            y: BigDecimal::from(0),
            hp: 100,
            max_hp: 100,
            mp: 50,
            max_mp: 50,
            base_atk: 10,
            base_def: 5,
            move_speed: BigDecimal::from(4),
            accuracy: BigDecimal::from(20),
            evasion: BigDecimal::from(5),
            crit_rate: BigDecimal::from_f32(0.05).unwrap(),
            str: 5,
            dex: 5,
            agi: 5,
            int: 5,
            luk: 5,
            vit: 5,
            level: 1,
            current_exp: 0,
            stat_points: 0,
            skill_points: 0,
            exp: 0,
            role: "player".to_string(),
            sprite_id: "1".to_string(), // Default sprite
            learned_skills: vec![],
            active_statuses: vec![],
            equipment: EquipmentState {
                main_hand: None,
                off_hand: None,
            },
        }
    }
}

// ... existing impl PlayerState ...
impl PlayerState {
    /// คำนวณ stats จาก primary stats
    pub fn calculate_total_atk(&self) -> i32 {
        // ATK = base_atk + (STR * 2) + (DEX * 0.5)
        self.base_atk + (self.str * 2) + (self.dex / 2)
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
        self.max_mp + (self.int * 5)
    }

    pub fn calculate_accuracy(&self) -> BigDecimal {
        // Accuracy = base_accuracy + (DEX * 0.002)
        // Note: 0.002 might be too small for BigDecimal visual if not scaled properly, but we'll stick to logic.
        // Or if DEX * 0.002 is meant to be a Flat or Percent value.
        // Assuming base_accuracy is around 20 (from schema default).
        let dex_bonus =
            BigDecimal::from_i32(self.dex).unwrap() * BigDecimal::from_f32(0.002).unwrap();
        &self.accuracy + dex_bonus
    }

    pub fn calculate_evasion(&self) -> BigDecimal {
        // Evasion = base_evasion + (AGI * 0.003)
        let agi_bonus =
            BigDecimal::from_i32(self.agi).unwrap() * BigDecimal::from_f32(0.003).unwrap();
        &self.evasion + agi_bonus
    }

    pub fn calculate_crit_rate(&self) -> BigDecimal {
        // Crit Rate = base_crit_rate + (LUK * 0.001)
        let luk_bonus =
            BigDecimal::from_i32(self.luk).unwrap() * BigDecimal::from_f32(0.001).unwrap();
        &self.crit_rate + luk_bonus
    }

    pub fn calculate_move_speed(&self) -> BigDecimal {
        // Move Speed = base_move_speed + (AGI * 0.01)
        let agi_bonus =
            BigDecimal::from_i32(self.agi).unwrap() * BigDecimal::from_f32(0.01).unwrap();
        &self.move_speed + agi_bonus
    }

    /// คำนวณ EXP ที่ต้องการเพื่อเลเวลอัพ
    pub fn exp_to_next_level(&self) -> i32 {
        // สูตร: EXP = 100 * level^1.5
        // Using f64 for power calculation then converting to i32 as the result is an integer
        (100.0 * (self.level as f64).powf(1.5)) as i32
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
        self.stat_points += 5; // ได้ 5 stat points ต่อ level
        self.skill_points += 1; // ได้ 1 skill point ต่อ level

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
            "str" => self.str += amount,
            "dex" => self.dex += amount,
            "agi" => self.agi += amount,
            "int" => {
                self.int += amount;
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

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CharacterData {
    pub id: String, // Changed from Option<i32> to String
    pub username: String,
    pub level: i32,
    pub current_exp: i32, // Changed from exp to match DB
    #[sqlx(default)]
    pub x: BigDecimal,
    #[sqlx(default)]
    pub y: BigDecimal,
    #[sqlx(default)]
    pub hp: i32,
    #[sqlx(default)]
    pub max_hp: i32,
    #[sqlx(default)]
    pub mp: i32,
    #[sqlx(default)]
    pub max_mp: i32,
    pub str: i32,
    #[sqlx(default)]
    pub dex: i32,
    #[sqlx(default)]
    pub agi: i32,
    pub int: i32,
    #[sqlx(default)]
    pub luk: i32,
    #[sqlx(default)]
    pub vit: i32,
    #[sqlx(default)]
    pub move_speed: BigDecimal, // DB is NUMERIC
    #[sqlx(default)]
    pub map_id: i32,
    #[sqlx(default)] // DB doesn't have sprite_id in players??
    // Check schema again.
    // players table does NOT have sprite_id.
    // classes table has sprite_id.
    // players has classes_id.
    // So we need to JOIN classes to get sprite_id?
    // Or maybe sprite_id is in players but I missed it?
    // checking schema...
    // players table: lines 69-107.
    // No sprite_id.
    // It has classes_id.
    // classes table: line 38: sprite_id VARCHAR(5).

    // So I need a JOIN query to get sprite_id!
    // For now I will set it as default in struct and handle logic later or add to struct as field that won't be filled by simple SELECT *.
    // But since I use FromRow, I can aliases in query.
    pub sprite_id: Option<String>,

    pub stat_points: i32,
    pub skill_points: i32,
}
