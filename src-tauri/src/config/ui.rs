use super::{default_false, default_true};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RestorableTab {
    pub title: String,
    pub session_type: String,
    pub connection_id: Option<String>,
}

/// Sidebar panel layout: which panels appear in which sidebar, in order.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PanelLayout {
    pub left: Vec<String>,
    pub right: Vec<String>,
}

impl Default for PanelLayout {
    fn default() -> Self {
        Self {
            left: vec!["fileExplorer".into(), "fileTransfer".into()],
            right: vec![
                "savedConnections".into(),
                "activeSessions".into(),
                "commandHistory".into(),
            ],
        }
    }
}

/// Layout and theme preferences.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiConfig {
    #[serde(default)]
    pub open_tabs: Vec<RestorableTab>,
    pub left_width: f64,
    pub right_width: f64,
    pub saved_conn_height: f64,
    pub history_height: f64,
    pub quick_cmd_height: f64,
    pub show_file_explorer: bool,
    #[serde(default = "default_true")]
    pub show_file_transfer: bool,
    pub show_saved_connections: bool,
    pub show_active_sessions: bool,
    pub show_command_history: bool,
    pub show_quick_commands: bool,
    pub zoom_level: f64,
    #[serde(default = "default_transfer_height")]
    pub file_transfer_height: f64,
    #[serde(default = "default_language")]
    pub language: Option<String>,
    #[serde(default)]
    pub panel_layout: PanelLayout,
    #[serde(default = "default_false")]
    pub show_remote_stats: bool,
}

fn default_transfer_height() -> f64 {
    240.0
}

fn default_language() -> Option<String> {
    Some("en".to_string())
}

impl Default for UiConfig {
    fn default() -> Self {
        Self {
            open_tabs: vec![],
            left_width: 300.0,
            right_width: 288.0,
            saved_conn_height: 423.0,
            history_height: 240.0,
            quick_cmd_height: 240.0,
            show_file_explorer: true,
            show_file_transfer: true,
            show_saved_connections: true,
            show_active_sessions: true,
            show_command_history: true,
            show_quick_commands: true,
            zoom_level: 1.0,
            file_transfer_height: 240.0,
            language: Some("en".to_string()),
            panel_layout: PanelLayout::default(),
            show_remote_stats: false,
        }
    }
}
