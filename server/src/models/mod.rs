// โมดูล Models - โครงสร้างข้อมูลทั้งหมด
pub mod class;
pub mod item;
pub mod map;
pub mod npc;
pub mod player;
pub mod skill;

pub use class::*;
pub use item::*;
pub use map::*;
pub use npc::*;
pub use player::*;
pub use skill::*;

use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;

pub type ActiveConnections = Arc<DashMap<String, (mpsc::UnboundedSender<Message>, String)>>;
