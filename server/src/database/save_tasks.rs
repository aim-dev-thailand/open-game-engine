use crate::constants::SAVE_INTERVAL_SECS;
use crate::models::*;
use dashmap::DashMap;
use sqlx::PgPool;
use std::sync::Arc;
use std::time::Duration;

pub type PlayersMap = Arc<DashMap<String, PlayerState>>;
pub type ItemsMap = Arc<DashMap<i32, ItemData>>;
pub type MapsMap = Arc<DashMap<i32, MapData>>;
pub type NpcsMap = Arc<DashMap<i32, NpcData>>;
pub type SkillsMap = Arc<DashMap<i32, SkillData>>;

/// ลูปบันทึกข้อมูลลงฐานข้อมูลเป็นระยะ
pub async fn save_loop(
    pool: PgPool,
    players: PlayersMap,
    items: ItemsMap,
    maps: MapsMap,
    npcs: NpcsMap,
    skills: SkillsMap,
) {
    let mut interval = tokio::time::interval(Duration::from_secs(SAVE_INTERVAL_SECS));
    loop {
        interval.tick().await;
        println!("กำลังบันทึกข้อมูลลงฐานข้อมูล...");

        save_items(&pool, &items).await;
        save_maps(&pool, &maps).await;
        save_npcs(&pool, &npcs).await;
        save_skills(&pool, &skills).await;
    }
}

/// บันทึกไอเทมลงฐานข้อมูล
async fn save_items(pool: &PgPool, items: &ItemsMap) {
    for entry in items.iter() {
        let item = entry.value();
        let id = item.id.unwrap_or(0);
        let stats_json = serde_json::to_string(&item.stats).unwrap_or("{}".to_string());
        let result = sqlx::query(
            r#"
            INSERT INTO items (id, name, description, type, rarity, value, stackable, max_stack, stats)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                type = EXCLUDED.type,
                rarity = EXCLUDED.rarity,
                value = EXCLUDED.value,
                stackable = EXCLUDED.stackable,
                max_stack = EXCLUDED.max_stack,
                stats = EXCLUDED.stats
            "#,
        )
        .bind(id)
        .bind(&item.name)
        .bind(&item.description)
        .bind(&item.item_type)
        .bind(&item.rarity)
        .bind(item.value)
        .bind(item.stackable)
        .bind(item.max_stack)
        .bind(&stats_json)
        .execute(pool)
        .await;

        match result {
            Ok(_) => println!("บันทึกไอเทม: {}", item.name),
            Err(e) => println!("บันทึกไอเทมผิดพลาด {}: {}", item.name, e),
        }
    }
}

/// บันทึกแผนที่ลงฐานข้อมูล
async fn save_maps(pool: &PgPool, maps: &MapsMap) {
    for entry in maps.iter() {
        let map = entry.value();
        let id = map.id.unwrap_or(0);
        let tiles_json = serde_json::to_string(&map.tiles).unwrap_or("{}".to_string());
        let spawn_points_json =
            serde_json::to_string(&map.spawn_points).unwrap_or("[]".to_string());
        let npcs_json = serde_json::to_string(&map.npcs).unwrap_or("[]".to_string());
        let result = sqlx::query(
            r#"
            INSERT INTO maps (id, name, description, width, height, tiles, spawn_points, npcs)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                width = EXCLUDED.width,
                height = EXCLUDED.height,
                tiles = EXCLUDED.tiles,
                spawn_points = EXCLUDED.spawn_points,
                npcs = EXCLUDED.npcs,
                monsters = EXCLUDED.monsters
            "#,
        )
        .bind(id)
        .bind(&map.name)
        .bind(&map.description)
        .bind(map.width)
        .bind(map.height)
        .bind(&tiles_json)
        .bind(&spawn_points_json)
        .bind(&npcs_json)
        .execute(pool)
        .await;

        match result {
            Ok(_) => println!("บันทึกแผนที่: {}", map.name),
            Err(e) => println!("บันทึกแผนที่ผิดพลาด {}: {}", map.name, e),
        }
    }
}

/// บันทึก NPC ลงฐานข้อมูล
async fn save_npcs(pool: &PgPool, npcs: &NpcsMap) {
    for entry in npcs.iter() {
        let npc = entry.value();
        let id = npc.id.unwrap_or(0);
        let dialogue_json = serde_json::to_string(&npc.dialogue).unwrap_or("[]".to_string());
        let shop_items_json = npc
            .shop_items
            .as_ref()
            .map(|v| serde_json::to_string(v).ok())
            .flatten()
            .unwrap_or("[]".to_string());
        let quests_json = npc
            .quests
            .as_ref()
            .map(|v| serde_json::to_string(v).ok())
            .flatten()
            .unwrap_or("[]".to_string());
        let position_json = serde_json::to_string(&npc.position).unwrap_or("{}".to_string());
        let result = sqlx::query(
            r#"
            INSERT INTO npcs (id, name, description, sprite_id, level, hp, max_hp, attack, defense, move_speed, is_hostile, can_trade, can_quest, dialogue, shop_items, quests, position, map_id, npc_type, crit_rate, evasion, accuracy, is_attack_first)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                sprite_id = EXCLUDED.sprite_id,
                level = EXCLUDED.level,
                hp = EXCLUDED.hp,
                max_hp = EXCLUDED.max_hp,
                attack = EXCLUDED.attack,
                defense = EXCLUDED.defense,
                move_speed = EXCLUDED.move_speed,
                is_hostile = EXCLUDED.is_hostile,
                can_trade = EXCLUDED.can_trade,
                can_quest = EXCLUDED.can_quest,
                dialogue = EXCLUDED.dialogue,
                shop_items = EXCLUDED.shop_items,
                quests = EXCLUDED.quests,
                position = EXCLUDED.position,
                map_id = EXCLUDED.map_id,
                npc_type = EXCLUDED.npc_type,
                crit_rate = EXCLUDED.crit_rate,
                evasion = EXCLUDED.evasion,
                accuracy = EXCLUDED.accuracy,
                is_attack_first = EXCLUDED.is_attack_first
            "#,
        )
        .bind(id)
        .bind(&npc.name)
        .bind(&npc.description)
        .bind(&npc.sprite_id)
        .bind(npc.level)
        .bind(npc.hp)
        .bind(npc.max_hp)
        .bind(npc.attack)
        .bind(npc.defense)
        .bind(&npc.move_speed)
        .bind(npc.is_hostile)
        .bind(npc.can_trade)
        .bind(npc.can_quest)
        .bind(&dialogue_json)
        .bind(&shop_items_json)
        .bind(&quests_json)
        .bind(&position_json)
        .bind(npc.map_id)
        .bind(&npc.npc_type)
        .bind(&npc.crit_rate)
        .bind(&npc.evasion)
        .bind(&npc.accuracy)
        .bind(npc.is_attack_first)
        .execute(pool)
        .await;

        match result {
            Ok(_) => println!("บันทึก NPC: {}", npc.name),
            Err(e) => println!("บันทึก NPC ผิดพลาด {}: {}", npc.name, e),
        }
    }
}

/// บันทึกสกิลลงฐานข้อมูล
async fn save_skills(pool: &PgPool, skills: &SkillsMap) {
    for entry in skills.iter() {
        let skill = entry.value();
        let id = skill.id.unwrap_or(0);
        let effects_json = serde_json::to_string(&skill.effects).unwrap_or("[]".to_string());
        let learnable_by_json =
            serde_json::to_string(&skill.learnable_by).unwrap_or("[]".to_string());
        let result = sqlx::query(
            r#"
            INSERT INTO skills (id, name, description, icon_id, type, element, level_required, mp_cost, cooldown, cast_time, range, area_of_effect, effects, learnable_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                icon_id = EXCLUDED.icon_id,
                type = EXCLUDED.type,
                element = EXCLUDED.element,
                level_required = EXCLUDED.level_required,
                mp_cost = EXCLUDED.mp_cost,
                cooldown = EXCLUDED.cooldown,
                cast_time = EXCLUDED.cast_time,
                range = EXCLUDED.range,
                area_of_effect = EXCLUDED.area_of_effect,
                effects = EXCLUDED.effects,
                learnable_by = EXCLUDED.learnable_by
            "#,
        )
        .bind(id)
        .bind(&skill.name)
        .bind(&skill.description)
        .bind(&skill.icon_id)
        .bind(&skill.skill_type)
        .bind(&skill.element)
        .bind(skill.level_required)
        .bind(skill.mp_cost)
        .bind(skill.cooldown)
        .bind(&skill.cast_time)
        .bind(&skill.range)
        .bind(&skill.area_of_effect)
        .bind(&effects_json)
        .bind(&learnable_by_json)
        .execute(pool)
        .await;

        match result {
            Ok(_) => println!("บันทึกสกิล: {}", skill.name),
            Err(e) => println!("บันทึกสกิลผิดพลาด {}: {}", skill.name, e),
        }
    }
}
