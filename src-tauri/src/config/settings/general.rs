use super::super::default_true;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PortableUpdateDownloadSource {
    #[default]
    Github,
    Ghfast,
    GhProxy,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralSettings {
    #[serde(default = "default_true")]
    pub startup_restore: bool,
    #[serde(default = "default_true")]
    pub startup_restore_window_layout: bool,
    #[serde(default)]
    pub minimize_to_tray: bool,
    #[serde(default)]
    pub boss_key: Option<String>,
    #[serde(default = "default_true")]
    pub confirm_on_close: bool,
    #[serde(default)]
    pub portable_update_download_source: PortableUpdateDownloadSource,
    #[serde(default)]
    pub portable_update_custom_mirror: String,
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            startup_restore: false,
            startup_restore_window_layout: true,
            minimize_to_tray: false,
            boss_key: None,
            confirm_on_close: true,
            portable_update_download_source: PortableUpdateDownloadSource::default(),
            portable_update_custom_mirror: String::new(),
        }
    }
}
