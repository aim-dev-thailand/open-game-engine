use crate::models::{PlayerState};
use dashmap::DashMap;
use std::sync::Arc;
use std::time::Duration;

pub type PlayersMap = Arc<DashMap<String, PlayerState>>;

/// ลูปจัดการ status effects
pub async fn status_effect_loop(players: PlayersMap) {
    loop {
        tokio::time::sleep(Duration::from_secs(1)).await;
        // Logic to clear expired effects
    }
}
