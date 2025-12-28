use serde::{Deserialize, Serialize};

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
