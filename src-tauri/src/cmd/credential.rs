use crate::config;
use crate::config::SavedCredential;
use crate::error::AppResult;
use tauri::Emitter;

fn schedule_cloud_sync_notify(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        crate::core::cloud_sync::notify_config_changed(&app).await;
    });
}

#[tauri::command]
pub fn get_saved_credentials(app: tauri::AppHandle) -> AppResult<Vec<SavedCredential>> {
    let mut cfg = config::load_credentials(&app)?;
    for credential in &mut cfg.credentials {
        credential.password = None;
    }
    Ok(cfg.credentials)
}

#[tauri::command]
pub fn get_saved_credential_password(
    app: tauri::AppHandle,
    id: String,
) -> AppResult<Option<String>> {
    Ok(config::load_credential_by_id(&app, &id)?.password)
}

#[tauri::command]
pub fn save_credential(app: tauri::AppHandle, entry: SavedCredential) -> AppResult<String> {
    let mut cfg = config::load_credentials(&app)?;
    let target_id = config::upsert_credential(&mut cfg, entry)?;
    config::save_credentials(&app, &cfg)?;
    let _ = app.emit("credentials-changed", ());
    schedule_cloud_sync_notify(app.clone());
    Ok(target_id)
}

#[tauri::command]
pub fn delete_credential(app: tauri::AppHandle, id: String) -> AppResult<()> {
    let mut cfg = config::load_credentials(&app)?;
    cfg.credentials.retain(|credential| credential.id != id);
    config::save_credentials(&app, &cfg)?;
    let _ = app.emit("credentials-changed", ());
    schedule_cloud_sync_notify(app.clone());
    Ok(())
}

#[derive(serde::Deserialize)]
pub struct CredentialSortOrderUpdate {
    pub id: String,
    pub sort_order: i32,
}

#[tauri::command]
pub fn reorder_credentials(
    app: tauri::AppHandle,
    updates: Vec<CredentialSortOrderUpdate>,
) -> AppResult<()> {
    let mut cfg = config::load_credentials(&app)?;
    let updates = updates
        .into_iter()
        .map(|update| (update.id, update.sort_order))
        .collect::<Vec<_>>();
    config::reorder_credentials(&mut cfg, &updates);
    config::save_credentials(&app, &cfg)?;
    let _ = app.emit("credentials-changed", ());
    schedule_cloud_sync_notify(app.clone());
    Ok(())
}
