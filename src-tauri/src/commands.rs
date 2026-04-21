use crate::anthropic;
use crate::db::{Db, Thought};
use crate::error::{AppError, Result};
use crate::keychain;
use crate::window;
use chrono::Utc;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub async fn capture_thought(
    raw_text: String,
    db: State<'_, Db>,
) -> Result<Thought> {
    let text = raw_text.trim();
    if text.is_empty() {
        return Err(AppError::Other("raw_text is empty".into()));
    }

    let api_key = keychain::get_api_key()?.ok_or(AppError::ApiKeyMissing)?;

    let classified = anthropic::classify(&api_key, text).await?;
    let now = Utc::now().to_rfc3339();

    let thought = db.insert(
        text,
        &classified.title,
        &classified.description,
        &classified.category,
        &classified.tag,
        &classified.consult_prompt,
        &now,
    )?;
    Ok(thought)
}

#[tauri::command]
pub fn list_thoughts(
    category: Option<String>,
    status: Option<String>,
    consulted: Option<bool>,
    search: Option<String>,
    limit: Option<i64>,
    db: State<'_, Db>,
) -> Result<Vec<Thought>> {
    db.list(
        category.as_deref(),
        status.as_deref(),
        consulted,
        search.as_deref(),
        limit.unwrap_or(200),
    )
}

#[tauri::command]
pub fn mark_done(id: i64, db: State<'_, Db>) -> Result<()> {
    db.mark_done(id)
}

#[tauri::command]
pub fn mark_consulted(id: i64, db: State<'_, Db>) -> Result<()> {
    db.mark_consulted(id)
}

#[tauri::command]
pub fn delete_thought(id: i64, db: State<'_, Db>) -> Result<()> {
    db.delete(id)
}

#[tauri::command]
pub fn get_api_key() -> Result<Option<String>> {
    keychain::get_api_key()
}

#[tauri::command]
pub fn set_api_key(key: String) -> Result<()> {
    keychain::set_api_key(&key)
}

#[tauri::command]
pub fn show_capture_window(app: AppHandle) -> Result<()> {
    window::show_capture(&app).map_err(Into::into)
}

#[tauri::command]
pub fn hide_capture_window(app: AppHandle) -> Result<()> {
    window::hide_capture(&app).map_err(Into::into)
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) -> Result<()> {
    window::show_main(&app).map_err(Into::into)
}

#[tauri::command]
pub fn show_settings_window(app: AppHandle) -> Result<()> {
    window::show_settings(&app).map_err(Into::into)
}

#[tauri::command]
pub fn get_app_version(app: AppHandle) -> Result<String> {
    Ok(app.package_info().version.to_string())
}
