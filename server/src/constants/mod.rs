// โมดูล Constants - ค่าคงที่ต่างๆ

/// ค่าคงที่สำหรับเซิร์ฟเวอร์
pub const SERVER_HOST: &str = "0.0.0.0";
pub const SERVER_PORT: u16 = 8080;

/// ค่าคงที่สำหรับการบันทึกข้อมูล
pub const SAVE_INTERVAL_SECS: u64 = 300; // 5 นาที

/// ค่าคงที่สำหรับฐานข้อมูล
pub const DATABASE_URL: &str = "postgres://appadmin:A%24hi%24%40n%2301@10.8.0.1:25432/mmorpg_db";

/// ค่าคงที่สำหรับการต่อสู้
pub const CRIT_DAMAGE_MULTIPLIER: f32 = 1.5;

/// ค่าคงที่สำหรับผู้เล่นเริ่มต้น
pub const DEFAULT_PLAYER_HP: i32 = 100;
pub const DEFAULT_PLAYER_MAX_HP: i32 = 100;
pub const DEFAULT_PLAYER_ATK: i32 = 20;
pub const DEFAULT_PLAYER_DEF: i32 = 10;
pub const DEFAULT_PLAYER_MOVE_SPEED: f32 = 2.0;
pub const DEFAULT_PLAYER_ACCURACY: f32 = 0.9;
pub const DEFAULT_PLAYER_EVASION: f32 = 0.1;
pub const DEFAULT_PLAYER_CRIT_RATE: f32 = 0.05;
pub const DEFAULT_PLAYER_LEVEL: i32 = 1;
pub const DEFAULT_PLAYER_SPAWN_X: f32 = 100.0;
pub const DEFAULT_PLAYER_SPAWN_Y: f32 = 100.0;
