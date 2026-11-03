use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;
const DEFAULT_PORT: u16 = 8000;

pub struct SidecarManager {
    child: Arc<Mutex<Option<Child>>>,
    port: u16,
}

impl SidecarManager {
    pub fn new() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            port: DEFAULT_PORT,
        }
    }

    pub fn get_port(&self) -> u16 {
        self.port
    }

    /// Resolves the optimal Python executable in order of priority:
    /// 1. Bundled runtime in app resources: <exe_dir>/backend/runtime/python.exe
    /// 2. Standalone distribution in user home: ~/.nexushub/bin/python.exe
    /// 3. Local project virtual environment: ./python-backend/venv/Scripts/python.exe
    /// 4. Global system python or python3 on PATH
    fn resolve_python_path() -> PathBuf {
        let current_exe = std::env::current_exe().unwrap_or_default();
        let exe_dir = current_exe.parent().unwrap_or(Path::new(""));

        // 1. Check embedded runtime in app bundle
        #[cfg(target_os = "windows")]
        let bundled = exe_dir.join("backend").join("runtime").join("python.exe");
        #[cfg(not(target_os = "windows"))]
        let bundled = exe_dir.join("backend").join("runtime").join("bin").join("python3");

        if bundled.exists() {
            return bundled;
        }

        // 2. Check ~/.nexushub/bin/python
        if let Some(home) = dirs::home_dir() {
            #[cfg(target_os = "windows")]
            let user_py = home.join(".nexushub").join("bin").join("python.exe");
            #[cfg(not(target_os = "windows"))]
            let user_py = home.join(".nexushub").join("bin").join("python3");

            if user_py.exists() {
                return user_py;
            }
        }

        // 3. Check workspace development virtual environments
        let dev_venv = PathBuf::from("python-backend").join("venv").join("Scripts").join("python.exe");
        if dev_venv.exists() {
            return dev_venv;
        }

        let dev_venv_alt = PathBuf::from("..").join("python-backend").join("venv").join("Scripts").join("python.exe");
        if dev_venv_alt.exists() {
            return dev_venv_alt;
        }

        // 4. Fallback to system executable
        #[cfg(target_os = "windows")]
        return PathBuf::from("python.exe");
        #[cfg(not(target_os = "windows"))]
        return PathBuf::from("python3");
    }

    /// Locates the backend entrypoint (server.py)
    fn resolve_server_script() -> (PathBuf, PathBuf) {
        let candidates = [
            PathBuf::from("python-backend").join("server.py"),
            PathBuf::from("..").join("python-backend").join("server.py"),
            PathBuf::from("backend").join("server.py"),
        ];

        for candidate in &candidates {
            if candidate.exists() {
                let working_dir = candidate.parent().unwrap_or(Path::new(".")).to_path_buf();
                return (candidate.clone(), working_dir);
            }
        }

        // In production installer, check next to exe
        if let Ok(exe) = std::env::current_exe() {
            if let Some(parent) = exe.parent() {
                let prod_path = parent.join("backend").join("server.py");
                if prod_path.exists() {
                    return (prod_path, parent.join("backend"));
                }
            }
        }

        (PathBuf::from("server.py"), PathBuf::from("."))
    }

    /// Spawns the internal Python engine silently without opening any console window.
    /// Bridges stdio into real-time Tauri events (terminal://stdout, terminal://stderr).
    pub fn start(&self, app: AppHandle) {
        let python_bin = Self::resolve_python_path();
        let (server_script, working_dir) = Self::resolve_server_script();
        let child_lock = self.child.clone();
        let port = self.port;

        std::thread::spawn(move || {
            let mut cmd = Command::new(&python_bin);
            cmd.arg(&server_script);
            cmd.arg("--port");
            cmd.arg(port.to_string());
            cmd.current_dir(&working_dir);
            cmd.stdout(Stdio::piped());
            cmd.stderr(Stdio::piped());

            // Silently suppress console window on Windows
            #[cfg(target_os = "windows")]
            cmd.creation_flags(CREATE_NO_WINDOW);

            match cmd.spawn() {
                Ok(mut child) => {
                    let stdout = child.stdout.take();
                    let stderr = child.stderr.take();

                    // Store child process handle for graceful shutdown
                    {
                        let mut lock = child_lock.lock().unwrap();
                        *lock = Some(child);
                    }

                    // Bridge stdout stream to Tauri event
                    if let Some(out) = stdout {
                        let app_clone = app.clone();
                        std::thread::spawn(move || {
                            let reader = BufReader::new(out);
                            for line in reader.lines().map_while(Result::ok) {
                                let _ = app_clone.emit("terminal://stdout", serde_json::json!({ "line": line }));
                            }
                        });
                    }

                    // Bridge stderr stream to Tauri event
                    if let Some(err) = stderr {
                        let app_clone = app.clone();
                        std::thread::spawn(move || {
                            let reader = BufReader::new(err);
                            for line in reader.lines().map_while(Result::ok) {
                                let _ = app_clone.emit("terminal://stderr", serde_json::json!({ "line": line }));
                            }
                        });
                    }
                }
                Err(e) => {
                    let _ = app.emit(
                        "terminal://stderr",
                        serde_json::json!({
                            "line": format!("[Sidecar Error] Failed to start Python backend ({}): {}", python_bin.display(), e)
                        }),
                    );
                }
            }
        });

        // Health-check loop: wait until port is active and responding
        let app_handle = app.clone();
        tauri::async_runtime::spawn(async move {
            let client = reqwest::Client::builder()
                .timeout(Duration::from_millis(300))
                .build()
                .unwrap_or_default();

            let url = format!("http://127.0.0.1:{}/api/system/status", port);
            let mut ready = false;

            for _ in 0..60 {
                tokio::time::sleep(Duration::from_millis(150)).await;
                if let Ok(resp) = client.get(&url).send().await {
                    if resp.status().is_success() {
                        ready = true;
                        break;
                    }
                }
            }

            let _ = app_handle.emit(
                "sidecar://status",
                serde_json::json!({
                    "ready": ready,
                    "port": port,
                    "url": format!("http://127.0.0.1:{}", port)
                }),
            );
        });
    }

    /// Gracefully terminates the Python child process upon application exit.
    pub fn shutdown(&self) {
        let mut lock = self.child.lock().unwrap();
        if let Some(mut child) = lock.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}
