use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ClassData {
    pub id: Option<i32>,
    pub name: String,
    pub description: Option<String>,
    pub sprite_id: String,

    // เงื่อนไขการเปลี่ยนอาชีพ
    pub min_level: i32,
    pub quest_id: Option<i32>,

    // Base Stats
    pub str: i32,
    pub dex: i32,
    pub agi: i32,
    pub vit: i32,
    pub int: i32,
    pub luk: i32,

    // Combat Stats
    pub hp: i32,
    pub atk: i32,
    pub def: i32,
    pub matk: i32,             // Renamed from magic_atk
    pub mdef: i32,             // Renamed from magic_def
    pub atkspd: i32,           // New field
    pub movespeed: BigDecimal, // New field, float
    pub evasion: i32,
    pub accuracy: i32,
    pub crit_rate: i32,
}
