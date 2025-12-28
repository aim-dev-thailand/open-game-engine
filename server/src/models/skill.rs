use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillData {
    pub id: Option<i32>,
    pub name: String,
    pub description: String,
    pub icon_id: Option<String>,
    #[serde(rename = "type")]
    pub skill_type: String,
    pub element: String,
    pub level_required: i32,
    pub mp_cost: i32,
    pub cooldown: i32,
    pub cast_time: f32,
    pub range: f32,
    #[serde(rename = "area_of_effect")]
    pub area_of_effect: f32,
    pub effects: Vec<serde_json::Value>,
    pub learnable_by: Vec<String>,
}
