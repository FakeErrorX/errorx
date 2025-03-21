use anyhow::Result;
use crate::core::service;
use serde_json::json;

// Common result type used by command functions
pub type CmdResult<T = ()> = Result<T, String>;

// Command modules
pub mod app;
pub mod clash;
pub mod media_unlock_checker;
pub mod network;
pub mod profile;
pub mod proxy;
pub mod runtime;
pub mod save_profile;
pub mod system;
pub mod uwp;
pub mod validate;
pub mod verge;
pub mod webdav;

// Re-export all command functions for backwards compatibility
pub use app::*;
pub use clash::*;
pub use media_unlock_checker::*;
pub use network::*;
pub use profile::*;
pub use proxy::*;
pub use runtime::*;
pub use save_profile::*;
pub use system::*;
pub use uwp::*;
pub use validate::*;
pub use verge::*;
pub use webdav::*;

#[tauri::command]
pub async fn validate_license(key: String) -> CmdResult<bool> {
    service::validate_license(&key).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_license_info() -> CmdResult<serde_json::Value> {
    service::get_license_info()
        .await
        .map(|info| json!(info))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_server_list() -> CmdResult<serde_json::Value> {
    service::get_server_list()
        .await
        .map(|info| json!(info))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_proxy() -> CmdResult {
    service::start_proxy().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_proxy() -> CmdResult {
    service::stop_proxy().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_proxy_status() -> CmdResult<Vec<(i32, bool)>> {
    service::get_proxy_status().await.map_err(|e| e.to_string())
}
