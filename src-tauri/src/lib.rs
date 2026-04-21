mod anthropic;
mod commands;
mod db;
mod error;
mod keychain;
mod window;

use tauri::{Manager, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            let _ = window::show_main(app);
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let _ = window::toggle_capture(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            // DB path -> ~/Library/Application Support/cz.fellaship.brain/brain.db
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("brain.db");
            let db = db::Db::open(&db_path).expect("failed to open database");
            app.manage(db);

            // Register default global shortcut: ⌘+⇧+Space
            let shortcut =
                Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::Space);
            let gs = app.global_shortcut();
            if !gs.is_registered(shortcut) {
                let _ = gs.register(shortcut);
            }

            // Apply vibrancy and hide-on-blur for capture window
            if let Some(capture_win) = app.get_webview_window("capture") {
                window::apply_capture_vibrancy(&capture_win);
                let handle = app.handle().clone();
                capture_win.on_window_event(move |event| {
                    if matches!(event, WindowEvent::Focused(false)) {
                        let _ = window::hide_capture(&handle);
                    }
                });
            }

            if let Some(main_win) = app.get_webview_window("main") {
                window::apply_main_vibrancy(&main_win);
                main_win.show().ok();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::capture_thought,
            commands::list_thoughts,
            commands::mark_done,
            commands::mark_consulted,
            commands::delete_thought,
            commands::get_api_key,
            commands::set_api_key,
            commands::show_capture_window,
            commands::hide_capture_window,
            commands::show_main_window,
            commands::show_settings_window,
            commands::get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
