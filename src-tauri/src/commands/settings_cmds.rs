use crate::config;
use crate::crypto;
use crate::error::AppResult;

#[tauri::command]
pub fn get_app_settings(app: tauri::AppHandle) -> AppResult<config::AppSettings> {
    let mut settings = config::load_app_settings(&app)?;
    // Never expose the actual password (ciphertext) to the frontend.
    // Replace with a sentinel so the frontend knows a password is set.
    if settings.security.lock_password.is_some() {
        settings.security.lock_password = Some("__SET__".to_string());
    }
    Ok(settings)
}

#[tauri::command]
pub fn save_app_settings(app: tauri::AppHandle, mut settings: config::AppSettings) -> AppResult<()> {
    // Encrypt lock_password if it's new plaintext (not the sentinel from get_app_settings).
    match settings.security.lock_password.as_deref() {
        Some("__SET__") => {
            // Frontend didn't change the password — preserve existing ciphertext.
            let existing = config::load_app_settings(&app)?;
            settings.security.lock_password = existing.security.lock_password;
        }
        Some("") | None => {
            settings.security.lock_password = None;
        }
        Some(plain) => {
            settings.security.lock_password = Some(crypto::encrypt(plain)?);
        }
    }
    config::save_app_settings(&app, &settings)
}

#[tauri::command]
pub fn verify_lock_password(app: tauri::AppHandle, password: String) -> AppResult<bool> {
    let settings = config::load_app_settings(&app)?;
    match settings.security.lock_password {
        Some(ref ct) => {
            let stored = crypto::decrypt(ct)?;
            Ok(stored == password)
        }
        None => Ok(true), // No password set — always pass
    }
}
