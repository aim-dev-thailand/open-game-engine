use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemData {
    pub id: Option<i32>,
    pub name: String,
    pub description: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub rarity: String,
    pub value: i32,
    pub stackable: bool,
    pub max_stack: Option<i32>,
    pub stats: Option<serde_json::Value>,
}
