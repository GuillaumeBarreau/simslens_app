use std::time::Duration;

use anyhow::{anyhow, Result};
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};

/// Thin HTTP client that targets a configurable server URL.
pub struct ApiClient {
    http: Client,
    base_url: String,
}

impl ApiClient {
    pub fn new(base_url: String) -> Result<Self> {
        let http = Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent(concat!("SimTrackingCompanion/", env!("CARGO_PKG_VERSION")))
            .build()?;
        Ok(Self { http, base_url })
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url.trim_end_matches('/'), path)
    }

    pub async fn request_device_code(
        &self,
        device_name: &str,
    ) -> Result<DeviceCodeResponse> {
        let r = self
            .http
            .post(self.url("/1/auth/device/code"))
            .json(&serde_json::json!({ "deviceName": device_name }))
            .send()
            .await?;
        if !r.status().is_success() {
            return Err(anyhow!("device code request failed: {}", r.status()));
        }
        Ok(r.json().await?)
    }

    /// Poll for an access token. Returns `Pending` while the user hasn't
    /// approved, `Granted` once a token is issued, and `Expired` if the
    /// underlying request died.
    pub async fn exchange_device_code(&self, device_code: &str) -> Result<PollOutcome> {
        let r = self
            .http
            .post(self.url("/1/auth/device/token"))
            .json(&serde_json::json!({ "deviceCode": device_code }))
            .send()
            .await?;
        match r.status() {
            StatusCode::OK => Ok(PollOutcome::Granted(r.json().await?)),
            StatusCode::PRECONDITION_REQUIRED => Ok(PollOutcome::Pending),
            StatusCode::GONE | StatusCode::NOT_FOUND => Ok(PollOutcome::Expired),
            s => Err(anyhow!("unexpected poll status: {s}")),
        }
    }

    /// Sanity check: fetch the caller's tokens. Used to confirm the saved
    /// token still works on startup.
    pub async fn list_tokens(&self, bearer: &str) -> Result<Vec<TokenSummary>> {
        let r = self
            .http
            .get(self.url("/1/auth/tokens"))
            .bearer_auth(bearer)
            .send()
            .await?;
        if r.status() == StatusCode::UNAUTHORIZED {
            return Err(anyhow!("unauthorized"));
        }
        Ok(r.json().await?)
    }

    /// Push a batch of RCLootCouncil entries to the server. The server is the
    /// dedup authority via the unique (player, date, time, itemID) key.
    pub async fn post_loot(
        &self,
        bearer: &str,
        payload: &SyncLootRequest<'_>,
    ) -> Result<SyncLootResponse> {
        let r = self
            .http
            .post(self.url("/1/sync/loot"))
            .bearer_auth(bearer)
            .json(payload)
            .send()
            .await?;
        if r.status() == StatusCode::UNAUTHORIZED {
            return Err(anyhow!("unauthorized"));
        }
        if !r.status().is_success() {
            let status = r.status();
            let body = r.text().await.unwrap_or_default();
            return Err(anyhow!("sync/loot failed: {status} — {body}"));
        }
        Ok(r.json().await?)
    }
}

// ── DTOs (match the server payloads) ────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GrantedToken {
    pub access_token: String,
    pub token_type: String,
    pub expires_at: Option<String>,
    pub scopes: Vec<String>,
}

#[derive(Debug)]
pub enum PollOutcome {
    Pending,
    Granted(GrantedToken),
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenSummary {
    pub id: i64,
    pub name: String,
    pub scopes: Vec<String>,
}

// ── Sync loot DTOs ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncLootRequest<'a> {
    pub realm_id: i64,
    pub source: &'a str,
    pub entries: &'a [SyncLootEntry<'a>],
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncLootEntry<'a> {
    pub player: &'a str,
    pub date: &'a str,
    pub time: &'a str,
    pub item_id: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instance: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub boss: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub difficulty: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub class: Option<&'a str>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncLootResponse {
    pub import_id: Option<i64>,
    pub inserted: u64,
    pub duplicates: u64,
    pub unmatched: Vec<String>,
}
