use serde::{Deserialize, Serialize};

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
