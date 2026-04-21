use crate::config::{self, QuickCommand, QuickCommandCategory, QuickCommandsConfig};
use crate::error::AppResult;
use std::sync::RwLock;
use tauri::AppHandle;

/// In-memory quick-command cache used by both management UI and suggestion search.
pub struct QuickCommandsStore {
    config: RwLock<QuickCommandsConfig>,
}

impl QuickCommandsStore {
    pub fn new() -> Self {
        Self {
            config: RwLock::new(QuickCommandsConfig::default()),
        }
    }

    pub fn load_from_disk(&self, app: &AppHandle) -> AppResult<()> {
        let config = config::load_quick_commands(app)?;
        self.replace(config);
        Ok(())
    }

    pub fn snapshot(&self) -> QuickCommandsConfig {
        self.config.read().unwrap().clone()
    }

    pub fn save_all(&self, app: &AppHandle, config: QuickCommandsConfig) -> AppResult<()> {
        config::save_quick_commands(app, &config)?;
        self.replace(config);
        Ok(())
    }

    pub fn upsert(
        &self,
        app: &AppHandle,
        command: QuickCommand,
        new_category: Option<QuickCommandCategory>,
    ) -> AppResult<QuickCommandsConfig> {
        let mut config = self.snapshot();

        if let Some(category) = new_category {
            if !config.categories.iter().any(|item| item.id == category.id) {
                config.categories.push(category);
            }
        }

        if let Some(existing) = config
            .commands
            .iter_mut()
            .find(|item| item.id == command.id)
        {
            *existing = command;
        } else {
            config.commands.push(command);
        }

        self.save_all(app, config.clone())?;
        Ok(config)
    }

    fn replace(&self, config: QuickCommandsConfig) {
        *self.config.write().unwrap() = config;
    }
}
