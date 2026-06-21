use std::collections::HashMap;
use std::io;
use std::sync::{Arc, OnceLock};
use std::time::Duration;

use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

use crate::error::{AppError, AppResult};

const GITHUB_GIST_CLIENT_ID: Option<&str> = option_env!("NYATERM_GITHUB_GIST_CLIENT_ID");
const GITHUB_DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const GITHUB_API_ENDPOINT: &str = "https://api.github.com";
const GITHUB_API_VERSION: &str = "2022-11-28";
const GITHUB_GIST_SCOPE: &str = "gist";
const GITHUB_FLOW_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Debug, Clone, Serialize)]
pub struct GithubGistDeviceFlowStart {
    pub flow_id: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct GithubGistDeviceFlowPoll {
    pub state: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub access_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub login: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gist_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interval: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Debug, Clone)]
struct GithubDeviceFlowState {
    device_code: String,
    interval: u64,
}

#[derive(Debug, Deserialize)]
struct GithubDeviceCodeResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: u64,
    interval: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct GithubAccessTokenResponse {
    #[serde(default)]
    access_token: Option<String>,
    #[serde(default)]
    scope: Option<String>,
    #[serde(default)]
    error: Option<String>,
    #[serde(default)]
    error_description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GithubUserResponse {
    login: String,
}

#[derive(Debug, Deserialize)]
struct GithubGistCreateResponse {
    id: String,
}

type FlowStore = Arc<Mutex<HashMap<String, GithubDeviceFlowState>>>;

static DEVICE_FLOWS: OnceLock<FlowStore> = OnceLock::new();

pub async fn begin_github_gist_device_flow() -> AppResult<GithubGistDeviceFlowStart> {
    let client = github_client()?;
    let client_id = github_gist_client_id()?;
    let response = client
        .post(GITHUB_DEVICE_CODE_URL)
        .header("Accept", "application/json")
        .form(&[("client_id", client_id), ("scope", GITHUB_GIST_SCOPE)])
        .send()
        .await
        .map_err(map_github_auth_client_error)?;
    let payload: GithubDeviceCodeResponse = decode_github_json_response(response).await?;
    let flow_id = uuid::Uuid::new_v4().to_string();
    let interval = payload.interval.unwrap_or(5).max(1);

    flow_store().lock().await.insert(
        flow_id.clone(),
        GithubDeviceFlowState {
            device_code: payload.device_code,
            interval,
        },
    );

    Ok(GithubGistDeviceFlowStart {
        flow_id,
        user_code: payload.user_code,
        verification_uri: payload.verification_uri,
        expires_in: payload.expires_in,
        interval,
    })
}

pub async fn poll_github_gist_device_flow(
    flow_id: &str,
    existing_gist_id: Option<String>,
) -> AppResult<GithubGistDeviceFlowPoll> {
    let flow = flow_store()
        .lock()
        .await
        .get(flow_id)
        .cloned()
        .ok_or_else(|| AppError::Config("GitHub device flow was not found".to_string()))?;

    let client = github_client()?;
    let client_id = github_gist_client_id()?;
    let response = client
        .post(GITHUB_ACCESS_TOKEN_URL)
        .header("Accept", "application/json")
        .form(&[
            ("client_id", client_id),
            ("device_code", flow.device_code.as_str()),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ])
        .send()
        .await
        .map_err(map_github_auth_client_error)?;
    let payload: GithubAccessTokenResponse = decode_github_json_response(response).await?;

    match payload.error.as_deref() {
        Some("authorization_pending") => {
            return Ok(GithubGistDeviceFlowPoll {
                state: "pending".to_string(),
                access_token: None,
                scope: None,
                login: None,
                gist_id: None,
                interval: Some(flow.interval),
                message: payload.error_description,
            });
        }
        Some("slow_down") => {
            let interval = flow.interval.saturating_add(5);
            if let Some(flow) = flow_store().lock().await.get_mut(flow_id) {
                flow.interval = interval;
            }
            return Ok(GithubGistDeviceFlowPoll {
                state: "slow_down".to_string(),
                access_token: None,
                scope: None,
                login: None,
                gist_id: None,
                interval: Some(interval),
                message: payload.error_description,
            });
        }
        Some("expired_token") => {
            cancel_github_gist_device_flow(flow_id).await;
            return Ok(GithubGistDeviceFlowPoll {
                state: "expired".to_string(),
                access_token: None,
                scope: None,
                login: None,
                gist_id: None,
                interval: None,
                message: payload.error_description,
            });
        }
        Some("access_denied") => {
            cancel_github_gist_device_flow(flow_id).await;
            return Ok(GithubGistDeviceFlowPoll {
                state: "denied".to_string(),
                access_token: None,
                scope: None,
                login: None,
                gist_id: None,
                interval: None,
                message: payload.error_description,
            });
        }
        Some(error) => {
            return Ok(GithubGistDeviceFlowPoll {
                state: "error".to_string(),
                access_token: None,
                scope: None,
                login: None,
                gist_id: None,
                interval: None,
                message: Some(
                    payload
                        .error_description
                        .unwrap_or_else(|| format!("GitHub OAuth error: {error}")),
                ),
            });
        }
        None => {}
    }

    let access_token = payload
        .access_token
        .clone()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| {
            AppError::Config("GitHub OAuth response did not include a token".to_string())
        })?;
    let scope = payload.scope.clone().unwrap_or_default();
    if !has_gist_scope(&scope) {
        return Ok(GithubGistDeviceFlowPoll {
            state: "error".to_string(),
            access_token: None,
            scope: Some(scope),
            login: None,
            gist_id: None,
            interval: None,
            message: Some("GitHub authorization did not grant the gist scope".to_string()),
        });
    }

    let login = fetch_github_login(&client, &access_token).await?;
    let gist_id = resolve_github_gist_id(&access_token, existing_gist_id).await?;

    cancel_github_gist_device_flow(flow_id).await;

    Ok(GithubGistDeviceFlowPoll {
        state: "success".to_string(),
        access_token: Some(access_token),
        scope: Some(scope),
        login: Some(login),
        gist_id: Some(gist_id),
        interval: None,
        message: None,
    })
}

pub async fn cancel_github_gist_device_flow(flow_id: &str) {
    flow_store().lock().await.remove(flow_id);
}

async fn fetch_github_login(client: &reqwest::Client, access_token: &str) -> AppResult<String> {
    let response = client
        .get(format!("{GITHUB_API_ENDPOINT}/user"))
        .bearer_auth(access_token)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", GITHUB_API_VERSION)
        .send()
        .await
        .map_err(map_github_auth_client_error)?;
    let payload: GithubUserResponse = decode_github_json_response(response).await?;
    Ok(payload.login)
}

pub(super) async fn resolve_github_gist_id(
    access_token: &str,
    existing_gist_id: Option<String>,
) -> AppResult<String> {
    let client = github_client()?;
    if let Some(gist_id) = existing_gist_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        if github_gist_exists(&client, access_token, gist_id).await? {
            return Ok(gist_id.to_string());
        }
    }

    create_github_gist(&client, access_token).await
}

async fn github_gist_exists(
    client: &reqwest::Client,
    access_token: &str,
    gist_id: &str,
) -> AppResult<bool> {
    let response = client
        .get(format!("{GITHUB_API_ENDPOINT}/gists/{gist_id}"))
        .bearer_auth(access_token)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", GITHUB_API_VERSION)
        .send()
        .await
        .map_err(map_github_auth_client_error)?;
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(map_github_auth_client_error)?;

    if status.is_success() {
        return Ok(true);
    }
    if status == StatusCode::NOT_FOUND {
        return Ok(false);
    }

    Err(AppError::Config(format!(
        "GitHub Gist request failed ({status}): {}",
        text.trim()
    )))
}

async fn create_github_gist(client: &reqwest::Client, access_token: &str) -> AppResult<String> {
    let body = serde_json::json!({
        "description": "NyaTerm encrypted cloud sync storage",
        "public": false,
        "files": {
            "nyaterm-readme.txt": {
                "content": "This private gist stores encrypted NyaTerm cloud sync objects."
            }
        }
    });
    let response = client
        .post(format!("{GITHUB_API_ENDPOINT}/gists"))
        .bearer_auth(access_token)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", GITHUB_API_VERSION)
        .json(&body)
        .send()
        .await
        .map_err(map_github_auth_client_error)?;
    let payload: GithubGistCreateResponse = decode_github_json_response(response).await?;
    Ok(payload.id)
}

fn has_gist_scope(scope: &str) -> bool {
    scope
        .split([',', ' '])
        .map(str::trim)
        .any(|value| value == GITHUB_GIST_SCOPE)
}

async fn decode_github_json_response<T: serde::de::DeserializeOwned>(
    response: reqwest::Response,
) -> AppResult<T> {
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(map_github_auth_client_error)?;
    if !status.is_success() {
        return Err(AppError::Config(format!(
            "GitHub request failed ({status}): {}",
            text.trim()
        )));
    }
    serde_json::from_str(&text).map_err(Into::into)
}

fn github_client() -> AppResult<reqwest::Client> {
    reqwest::Client::builder()
        .timeout(GITHUB_FLOW_TIMEOUT)
        .user_agent("NyaTerm")
        .build()
        .map_err(map_github_auth_client_error)
}

fn github_gist_client_id() -> AppResult<&'static str> {
    GITHUB_GIST_CLIENT_ID
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            AppError::Config(
                "GitHub Gist OAuth Client ID is not configured at build time".to_string(),
            )
        })
}

fn map_github_auth_client_error(error: reqwest::Error) -> AppError {
    if error.is_timeout() {
        AppError::Io(io::Error::new(
            io::ErrorKind::TimedOut,
            format!("GitHub device flow operation timed out: {error}"),
        ))
    } else {
        AppError::Config(format!("GitHub device flow request failed: {error}"))
    }
}

fn flow_store() -> &'static FlowStore {
    DEVICE_FLOWS.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gist_scope_parser_accepts_space_or_comma_separated_values() {
        assert!(has_gist_scope("read:user gist"));
        assert!(has_gist_scope("read:user,gist"));
        assert!(!has_gist_scope("read:user repo"));
    }
}
