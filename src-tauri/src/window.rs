use tauri::{AppHandle, Manager, WebviewWindow};

pub fn show_capture(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("capture") {
        // Re-center on the currently focused monitor
        #[cfg(target_os = "macos")]
        let _ = window.center();

        window.show()?;
        window.set_focus()?;
        let _ = app.emit_to("capture", "capture-window-shown", ());
    }
    Ok(())
}

pub fn hide_capture(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("capture") {
        window.hide()?;
    }
    Ok(())
}

pub fn show_main(app: &AppHandle) -> tauri::Result<()> {
    if let Some(w) = app.get_webview_window("main") {
        w.show()?;
        w.set_focus()?;
        let _ = w.unminimize();
    }
    Ok(())
}

pub fn show_settings(app: &AppHandle) -> tauri::Result<()> {
    if let Some(w) = app.get_webview_window("settings") {
        w.show()?;
        w.set_focus()?;
        let _ = w.unminimize();
    }
    Ok(())
}

#[cfg(target_os = "macos")]
pub fn apply_capture_vibrancy(window: &WebviewWindow) {
    use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};
    let _ = apply_vibrancy(
        window,
        NSVisualEffectMaterial::HudWindow,
        Some(NSVisualEffectState::Active),
        Some(14.0),
    );
}

#[cfg(not(target_os = "macos"))]
pub fn apply_capture_vibrancy(_window: &WebviewWindow) {}

#[cfg(target_os = "macos")]
pub fn apply_main_vibrancy(window: &WebviewWindow) {
    use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};
    let _ = apply_vibrancy(
        window,
        NSVisualEffectMaterial::Sidebar,
        Some(NSVisualEffectState::FollowsWindowActiveState),
        None,
    );
}

#[cfg(not(target_os = "macos"))]
pub fn apply_main_vibrancy(_window: &WebviewWindow) {}

pub fn toggle_capture(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("capture") {
        if window.is_visible()? {
            hide_capture(app)
        } else {
            show_capture(app)
        }
    } else {
        Ok(())
    }
}
