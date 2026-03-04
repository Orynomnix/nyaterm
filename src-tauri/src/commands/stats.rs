use crate::error::{AppError, AppResult};
use crate::session::SessionManager;
use crate::ssh;
use std::sync::Arc;

#[derive(serde::Serialize)]
pub struct RemoteStats {
    pub cpu_percent: f64,
    pub mem_used_mb: u64,
    pub mem_total_mb: u64,
}

#[tauri::command]
pub async fn get_remote_stats(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<SessionManager>>,
    session_id: String,
) -> AppResult<RemoteStats> {
    use russh::ChannelMsg;

    let config = {
        let sessions = state.sessions.lock().await;
        let session = sessions
            .get(&session_id)
            .ok_or_else(|| AppError::SessionNotFound(format!("Session '{}' not found", session_id)))?;
        session
            .ssh_config
            .as_ref()
            .ok_or_else(|| AppError::Config("Not an SSH session".to_string()))?
            .clone()
            .downcast::<ssh::SshConfig>()
            .map_err(|_| AppError::Config("Failed to get SSH config".to_string()))?
    };

    let ssh_cfg = Arc::new(russh::client::Config::default());
    let mut handle = ssh::connect_with_proxy(
        &app,
        &config,
        ssh_cfg,
        ssh::SshHandler::new(app.clone(), config.host.clone(), config.port),
    )
    .await?;

    match &config.auth {
        ssh::SshAuth::Password { password } => {
            let ok = handle
                .authenticate_password(&config.username, password)
                .await
                .map_err(|e| AppError::Auth(format!("Auth failed: {}", e)))?;
            if !ok.success() {
                return Err(AppError::Auth("Authentication failed".to_string()));
            }
        }
        ssh::SshAuth::Key { key_data, passphrase } => {
            let key = russh::keys::decode_secret_key(key_data, passphrase.as_deref())?;
            let hash_alg = handle.best_supported_rsa_hash().await.ok().flatten().flatten();
            let ok = handle
                .authenticate_publickey(
                    &config.username,
                    russh::keys::PrivateKeyWithHashAlg::new(Arc::new(key), hash_alg),
                )
                .await
                .map_err(|e| AppError::Auth(format!("Key auth failed: {}", e)))?;
            if !ok.success() {
                return Err(AppError::Auth("Key authentication failed".to_string()));
            }
        }
    }

    let mut channel = handle
        .channel_open_session()
        .await
        .map_err(|e| AppError::Channel(format!("Failed to open channel: {}", e)))?;

    // Read CPU idle ratio from /proc/stat; read MemTotal and MemAvailable from /proc/meminfo.
    let cmd = "awk '/^cpu /{idle=$5;total=0;for(i=2;i<=NF;i++)total+=$i;printf \"%.1f\",(1-idle/total)*100}' /proc/stat; \
               awk '/MemTotal/{t=$2}/MemAvailable/{a=$2}END{printf \" %d %d\",(t-a)/1024,t/1024}' /proc/meminfo";

    channel
        .exec(true, cmd)
        .await
        .map_err(|e| AppError::Channel(format!("Failed to execute stats command: {}", e)))?;

    let mut output = String::new();
    loop {
        match channel.wait().await {
            Some(ChannelMsg::Data { ref data }) => {
                output.push_str(&String::from_utf8_lossy(data));
            }
            Some(ChannelMsg::Eof) | None => break,
            _ => {}
        }
    }

    let parts: Vec<&str> = output.trim().split_whitespace().collect();
    if parts.len() < 3 {
        return Err(AppError::Config(format!(
            "Unexpected stats output: '{}'",
            output.trim()
        )));
    }

    Ok(RemoteStats {
        cpu_percent: parts[0].parse::<f64>().unwrap_or(0.0),
        mem_used_mb: parts[1].parse::<u64>().unwrap_or(0),
        mem_total_mb: parts[2].parse::<u64>().unwrap_or(0),
    })
}

#[tauri::command]
pub fn get_system_fonts() -> Vec<String> {
    use font_kit::source::SystemSource;
    if let Ok(mut families) = SystemSource::new().all_families() {
        families.sort();
        families.dedup();
        return families;
    }
    Vec::new()
}
