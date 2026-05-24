use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use base64::Engine;
use tauri::Manager;
use tauri::Emitter;

#[tauri::command]
fn set_always_on_top(window: tauri::Window, on_top: bool) {
    let _ = window.set_always_on_top(on_top);
}

#[tauri::command]
fn get_window_position(window: tauri::Window) -> Result<(i32, i32), String> {
    window.outer_position().map(|p| (p.x, p.y)).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_window_position(window: tauri::Window, x: i32, y: i32) {
    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
}

#[tauri::command]
fn set_ignore_cursor_events(window: tauri::Window, ignore: bool) {
    let _ = window.set_ignore_cursor_events(ignore);
}

#[tauri::command]
fn minimize_window(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn hide_window(window: tauri::Window) {
    let _ = window.hide();
}

#[tauri::command]
fn load_image_data_url(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))?;
    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "webp" => "image/webp",
        _ => "image/png",
    };
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let cursor_ignored = Arc::new(AtomicBool::new(false));

            // Build tray menu
            use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
            use tauri::menu::{MenuBuilder, MenuItemBuilder};

            let show_item = MenuItemBuilder::with_id("show", "显示/隐藏")
                .build(app)?;
            let clickthrough_item = MenuItemBuilder::with_id("clickthrough", "切换鼠标穿透")
                .build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "退出")
                .build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&show_item)
                .item(&clickthrough_item)
                .item(&quit_item)
                .build()?;

            let ci_tray = cursor_ignored.clone();
            let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))?;
            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(icon)
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    "clickthrough" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let current = ci_tray.load(Ordering::Relaxed);
                            let next = !current;
                            ci_tray.store(next, Ordering::Relaxed);
                            let _ = window.set_ignore_cursor_events(next);
                            let _ = app.emit("tray-toggle-clickthrough", next);
                        }
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // Window event listeners
            if let Some(window) = app.get_webview_window("main") {
                let w = window.clone();
                let ci_events = cursor_ignored.clone();

                window.on_window_event(move |event| {
                    use tauri::WindowEvent;
                    match event {
                        WindowEvent::Focused(focused) => {
                            if *focused {
                                if ci_events.load(Ordering::Relaxed) {
                                    let _ = w.set_ignore_cursor_events(false);
                                    ci_events.store(false, Ordering::Relaxed);
                                    let _ = w.app_handle().emit("focus-disable-clickthrough", ());
                                }
                                let _ = w.app_handle().emit("window-focused", ());
                            }
                        }
                        WindowEvent::Moved(position) => {
                            // Simple edge snapping: align to monitor edge when within 20px
                            if let Ok(Some(monitor)) = w.current_monitor() {
                                let mpos = monitor.position();
                                let msize = monitor.size();
                                let snap = 20i32;

                                let wsize = w.outer_size().unwrap_or(tauri::PhysicalSize { width: 480, height: 820 });
                                let ww = wsize.width as i32;
                                let wh = wsize.height as i32;

                                let left_edge = mpos.x;
                                let top_edge = mpos.y;
                                let right_edge = mpos.x + msize.width as i32 - ww;
                                let bottom_edge = mpos.y + msize.height as i32 - wh;

                                let mut nx = position.x;
                                let mut ny = position.y;

                                // Snap to nearest edge within threshold
                                let dl = (position.x - left_edge).abs();
                                let dr = (position.x - right_edge).abs();
                                let dt = (position.y - top_edge).abs();
                                let db = (position.y - bottom_edge).abs();

                                if dl < snap && dl <= dr { nx = left_edge; }
                                else if dr < snap { nx = right_edge; }

                                if dt < snap && dt <= db { ny = top_edge; }
                                else if db < snap { ny = bottom_edge; }

                                if nx != position.x || ny != position.y {
                                    let _ = w.set_position(tauri::Position::Physical(
                                        tauri::PhysicalPosition { x: nx, y: ny }
                                    ));
                                }
                            }
                        }
                        _ => {}
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_always_on_top,
            get_window_position,
            set_window_position,
            set_ignore_cursor_events,
            minimize_window,
            hide_window,
            load_image_data_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
