use serde::{Deserialize, Serialize};

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
