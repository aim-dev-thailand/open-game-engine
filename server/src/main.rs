// โมดูลต่างๆ ที่จัดระเบียบแล้ว
mod constants;
mod database;
mod logic;
mod models;
mod network;

use constants::*;
use database::save_loop;
use logic::{admin_command_loop, status_effect_loop};
use models::*;
use network::handle_client;

use dashmap::DashMap;
use sqlx::PgPool;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;

// Type aliases สำหรับ shared state
type PlayersMap = Arc<DashMap<String, PlayerState>>;
type ItemsMap = Arc<DashMap<i32, ItemData>>;
type MapsMap = Arc<DashMap<i32, MapData>>;
type NpcsMap = Arc<DashMap<i32, NpcData>>;
type ClassesMap = Arc<DashMap<i32, ClassData>>;
type SkillsMap = Arc<DashMap<i32, SkillData>>;

// --- ฟังก์ชันหลัก (Main Function) ---
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // เชื่อมต่อฐานข้อมูล
    let pool = PgPool::connect(DATABASE_URL).await?;

    // กำหนดข้อมูลในหน่วยความจำ
    let players: PlayersMap = Arc::new(DashMap::new());
    let items: ItemsMap = Arc::new(DashMap::new());
    let maps: MapsMap = Arc::new(DashMap::new());
    let npcs: NpcsMap = Arc::new(DashMap::new());
    let classes: ClassesMap = Arc::new(DashMap::new());
    let skills: SkillsMap = Arc::new(DashMap::new());
    let active_connections: ActiveConnections = Arc::new(DashMap::new());

    // สร้างงานพื้นหลัง - บันทึกข้อมูล
    let pool_clone = pool.clone();
    let players_clone = players.clone();
    let items_clone = items.clone();
    let maps_clone = maps.clone();
    let npcs_clone = npcs.clone();
    let skills_clone = skills.clone();
    tokio::spawn(async move {
        save_loop(
            pool_clone,
            players_clone,
            items_clone,
            maps_clone,
            npcs_clone,
            skills_clone,
        )
        .await;
    });

    // สร้างงานพื้นหลัง - จัดการ status effects
    let players_clone = players.clone();
    tokio::spawn(async move {
        status_effect_loop(players_clone).await;
    });

    // สร้างงานพื้นหลัง - คำสั่งผู้ดูแล
    let pool_clone = pool.clone();
    let players_clone = players.clone();
    let items_clone = items.clone();
    let maps_clone = maps.clone();
    let npcs_clone = npcs.clone();
    let skills_clone = skills.clone();
    tokio::spawn(async move {
        admin_command_loop(
            pool_clone,
            players_clone,
            items_clone,
            maps_clone,
            npcs_clone,
            skills_clone,
        )
        .await;
    });

    // เซิร์ฟเวอร์ WebSocket
    let addr = format!("{}:{}", SERVER_HOST, SERVER_PORT);
    let listener = TcpListener::bind(&addr).await?;
    println!("เซิร์ฟเวอร์ทำงานที่ ws://{}", addr);

    while let Ok((stream, _addr)) = listener.accept().await {
        let ws_stream = tokio_tungstenite::accept_async(stream).await?;
        let pool_ref = pool.clone();
        let players_ref = players.clone();
        let items_ref = items.clone();
        let maps_ref = maps.clone();
        let npcs_ref = npcs.clone();
        let classes_ref = classes.clone();
        let skills_ref = skills.clone();
        let active_connections_ref = active_connections.clone();

        tokio::spawn(async move {
            handle_client(
                ws_stream,
                pool_ref,
                players_ref,
                items_ref,
                maps_ref,
                npcs_ref,
                classes_ref,
                skills_ref,
                active_connections_ref,
            )
            .await;
        });
    }
    Ok(())
}
