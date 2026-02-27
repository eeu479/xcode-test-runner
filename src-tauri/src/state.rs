use std::sync::Arc;
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;

pub struct AppState {
    pub active_run_id: Arc<Mutex<Option<String>>>,
    pub cancellation_token: Arc<Mutex<Option<CancellationToken>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            active_run_id: Arc::new(Mutex::new(None)),
            cancellation_token: Arc::new(Mutex::new(None)),
        }
    }
}
