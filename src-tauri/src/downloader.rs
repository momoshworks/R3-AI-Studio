use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{BufReader, Write};
use std::path::PathBuf;
use std::time::Instant;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct DownloadProgress {
    pub tool_name: String,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub percentage: f32,
    pub speed_mb_s: f64,
    pub eta_seconds: u64,
    pub status: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ToolItem {
    pub name: String,
    pub path: String,
    pub size_mb: f64,
}

pub fn get_nexushub_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".nexushub")
}

pub fn get_tools_dir() -> PathBuf {
    get_nexushub_dir().join("tools")
}

#[tauri::command]
pub async fn download_binary_tool(
    app: AppHandle,
    tool_name: String,
    url: String,
    expected_sha256: Option<String>,
) -> Result<String, String> {
    let tools_dir = get_tools_dir();
    tokio::fs::create_dir_all(&tools_dir)
        .await
        .map_err(|e| format!("Failed to create tools dir: {}", e))?;

    let target_dir = tools_dir.join(&tool_name);
    tokio::fs::create_dir_all(&target_dir)
        .await
        .map_err(|e| format!("Failed to create tool target dir: {}", e))?;

    let filename = url.split('/').last().unwrap_or("download.archive");
    let temp_file_path = target_dir.join(filename);

    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Download failed with status code: {}", res.status()));
    }

    let total_bytes = res.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut file = File::create(&temp_file_path).map_err(|e| format!("File creation failed: {}", e))?;
    let mut stream = res.bytes_stream();
    let mut hasher = Sha256::new();

    let start_time = Instant::now();
    let mut last_emit = Instant::now();

    let _ = app.emit(
        "download://progress",
        DownloadProgress {
            tool_name: tool_name.clone(),
            bytes_downloaded: 0,
            total_bytes,
            percentage: 0.0,
            speed_mb_s: 0.0,
            eta_seconds: 0,
            status: "Starting download...".to_string(),
        },
    );

    while let Some(chunk_res) = stream.next().await {
        let chunk = chunk_res.map_err(|e| format!("Error while receiving chunk: {}", e))?;
        file.write_all(&chunk).map_err(|e| format!("Error writing chunk to disk: {}", e))?;
        hasher.update(&chunk);
        downloaded += chunk.len() as u64;

        if last_emit.elapsed().as_millis() >= 200 {
            let elapsed_sec = start_time.elapsed().as_secs_f64();
            let speed_mb_s = if elapsed_sec > 0.0 {
                ((downloaded as f64) / (1024.0 * 1024.0)) / elapsed_sec
            } else {
                0.0
            };

            let remaining_bytes = if total_bytes > downloaded { total_bytes - downloaded } else { 0 };
            let eta_seconds = if speed_mb_s > 0.0 {
                (remaining_bytes as f64 / (speed_mb_s * 1024.0 * 1024.0)) as u64
            } else {
                0
            };

            let percentage = if total_bytes > 0 {
                (downloaded as f32 / total_bytes as f32) * 100.0
            } else {
                0.0
            };

            let _ = app.emit(
                "download://progress",
                DownloadProgress {
                    tool_name: tool_name.clone(),
                    bytes_downloaded: downloaded,
                    total_bytes,
                    percentage,
                    speed_mb_s: (speed_mb_s * 100.0).round() / 100.0,
                    eta_seconds,
                    status: "Downloading...".to_string(),
                },
            );
            last_emit = Instant::now();
        }
    }

    file.flush().map_err(|e| format!("Failed to flush file: {}", e))?;

    // Verify SHA-256
    let calculated_hash = hex::encode(hasher.finalize());
    if let Some(expected) = expected_sha256 {
        if !expected.is_empty() && !calculated_hash.eq_ignore_ascii_case(&expected) {
            let _ = tokio::fs::remove_file(&temp_file_path).await;
            return Err(format!(
                "Checksum verification mismatch! Expected: {}, Computed: {}",
                expected, calculated_hash
            ));
        }
    }

    // Auto-extract if zip archive
    if filename.ends_with(".zip") {
        let _ = app.emit(
            "download://progress",
            DownloadProgress {
                tool_name: tool_name.clone(),
                bytes_downloaded: downloaded,
                total_bytes,
                percentage: 100.0,
                speed_mb_s: 0.0,
                eta_seconds: 0,
                status: "Extracting archive...".to_string(),
            },
        );

        let zip_file = File::open(&temp_file_path).map_err(|e| format!("Cannot open zip: {}", e))?;
        let mut archive = zip::ZipArchive::new(BufReader::new(zip_file))
            .map_err(|e| format!("Corrupted or unsupported zip archive: {}", e))?;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| format!("Zip read error: {}", e))?;
            let outpath = match file.enclosed_name() {
                Some(path) => target_dir.join(path),
                None => continue,
            };

            if file.name().ends_with('/') {
                std::fs::create_dir_all(&outpath).map_err(|e| format!("Dir create error: {}", e))?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        std::fs::create_dir_all(p).map_err(|e| format!("Dir create error: {}", e))?;
                    }
                }
                let mut outfile = File::create(&outpath).map_err(|e| format!("File extract error: {}", e))?;
                std::io::copy(&mut file, &mut outfile).map_err(|e| format!("File write error: {}", e))?;
            }
        }
    }

    let _ = app.emit(
        "download://progress",
        DownloadProgress {
            tool_name: tool_name.clone(),
            bytes_downloaded: downloaded,
            total_bytes,
            percentage: 100.0,
            speed_mb_s: 0.0,
            eta_seconds: 0,
            status: "Complete".to_string(),
        },
    );

    Ok(format!(
        "Tool '{}' successfully installed at {} (SHA-256: {})",
        tool_name,
        target_dir.display(),
        calculated_hash
    ))
}

#[tauri::command]
pub fn list_installed_tools() -> Result<Vec<ToolItem>, String> {
    let tools_dir = get_tools_dir();
    if !tools_dir.exists() {
        return Ok(Vec::new());
    }

    let mut list = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&tools_dir) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_dir() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    let path = entry.path().to_string_lossy().to_string();
                    let size_bytes = dir_size(&entry.path()).unwrap_or(0);
                    let size_mb = (size_bytes as f64) / (1024.0 * 1024.0);

                    list.push(ToolItem {
                        name,
                        path,
                        size_mb: (size_mb * 100.0).round() / 100.0,
                    });
                }
            }
        }
    }
    Ok(list)
}

fn dir_size(path: &std::path::Path) -> std::io::Result<u64> {
    let mut total = 0;
    if path.is_dir() {
        for entry in std::fs::read_dir(path)? {
            let entry = entry?;
            let ft = entry.file_type()?;
            if ft.is_dir() {
                total += dir_size(&entry.path())?;
            } else {
                total += entry.metadata()?.len();
            }
        }
    }
    Ok(total)
}
