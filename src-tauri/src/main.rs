// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod downloader;
mod local_llm;
mod sidecar;
mod system_monitor;

use std::sync::Arc;
use downloader::{download_binary_tool, list_installed_tools};
use local_llm::{check_local_llm_status, query_local_llm};
use sidecar::SidecarManager;
use system_monitor::{get_system_telemetry, SystemMonitor};
use tauri::{Manager, RunEvent, WindowEvent};

#[tauri::command]
async fn open_notebooklm_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("notebooklm") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        return Ok(());
    }

    Ok(())
}

fn main() {
    let sidecar_manager = Arc::new(SidecarManager::new());
    let sidecar_for_setup = sidecar_manager.clone();
    let sidecar_for_exit = sidecar_manager.clone();

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            download_binary_tool,
            list_installed_tools,
            get_system_telemetry,
            open_notebooklm_window,
            check_local_llm_status,
            query_local_llm,
        ])
        .setup(move |app| {
            let handle = app.handle().clone();

            // 1. Launch Python backend sidecar silently with stdio bridging
            sidecar_for_setup.start(handle.clone());

            // 2. Start real-time hardware telemetry loop (1000ms broadcasts)
            SystemMonitor::start_telemetry_loop(handle);

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building NexusHub desktop application");

    app.run(move |_app_handle, event| match event {
        RunEvent::WindowEvent {
            label,
            event: WindowEvent::CloseRequested { api, .. },
            ..
        } => {
            if label == "notebooklm" {
                api.prevent_close();
                if let Some(w) = _app_handle.get_webview_window("notebooklm") {
                    let _ = w.hide();
                }
            } else if label == "main" {
                sidecar_for_exit.shutdown();
            }
        }
        RunEvent::Exit => {
            sidecar_for_exit.shutdown();
        }
        _ => {}
    });
}
