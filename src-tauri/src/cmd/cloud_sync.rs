use std::sync::Arc;

use crate::config::{CloudSyncHistoryEntry, CloudSyncStatus};
use crate::core::cloud_sync::{GithubGistDeviceFlowPoll, GithubGistDeviceFlowStart};
use crate::core::{self, CloudSyncManager};
use crate::error::AppResult;

#[tauri::command]
pub async fn test_cloud_sync_connection(
    manager: tauri::State<'_, Arc<CloudSyncManager>>,
) -> AppResult<()> {
    manager.test_connection().await
}

#[tauri::command]
pub async fn get_cloud_sync_status(
    manager: tauri::State<'_, Arc<CloudSyncManager>>,
) -> AppResult<CloudSyncStatus> {
    Ok(manager.get_status().await)
}

#[tauri::command]
pub async fn sync_push_now(manager: tauri::State<'_, Arc<CloudSyncManager>>) -> AppResult<()> {
    manager.inner().sync_push_now("manual_push").await
}

#[tauri::command]
pub async fn sync_pull_now(manager: tauri::State<'_, Arc<CloudSyncManager>>) -> AppResult<()> {
    manager.inner().sync_pull_now("manual_pull").await
}

#[tauri::command]
pub async fn resolve_cloud_sync_conflict(
    manager: tauri::State<'_, Arc<CloudSyncManager>>,
    action: String,
) -> AppResult<()> {
    manager.inner().resolve_cloud_sync_conflict(&action).await
}

#[tauri::command]
pub async fn list_cloud_sync_history(
    manager: tauri::State<'_, Arc<CloudSyncManager>>,
) -> AppResult<Vec<CloudSyncHistoryEntry>> {
    Ok(manager.list_history().await)
}

#[tauri::command]
pub async fn begin_github_gist_device_flow() -> AppResult<GithubGistDeviceFlowStart> {
    core::cloud_sync::begin_github_gist_device_flow().await
}

#[tauri::command]
pub async fn poll_github_gist_device_flow(
    flow_id: String,
    existing_gist_id: Option<String>,
) -> AppResult<GithubGistDeviceFlowPoll> {
    core::cloud_sync::poll_github_gist_device_flow(&flow_id, existing_gist_id).await
}

#[tauri::command]
pub async fn cancel_github_gist_device_flow(flow_id: String) -> AppResult<()> {
    core::cloud_sync::cancel_github_gist_device_flow(&flow_id).await;
    Ok(())
}
