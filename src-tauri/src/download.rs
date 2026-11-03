use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufReader, Write};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};
use sha2::{Digest, Sha256};
use futures_util::StreamExt;

#[derive(Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub tool_name: String,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub percentage: f32,
    pub status: String,
}

pub fn get_nexushub_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".nexushub")
}

pub fn get_tools_dir() -> PathBuf {
    get_nexushub_dir().join("tools")
}

#[tauri::command]
pub async fn download_tool(
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

    // Determine temporary archive path
    let filename = url.split('/').last().unwrap_or("download.archive");
    let temp_file_path = target_dir.join(filename);

    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Download failed with status: {}", res.status()));
    }

    let total_bytes = res.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut file = File::create(&temp_file_path).map_err(|e| format!("File creation failed: {}", e))?;
    let mut stream = res.bytes_stream();
    let mut hasher = Sha256::new();

    let _ = app.emit(
        "download-progress",
        DownloadProgress {
            tool_name: tool_name.clone(),
            bytes_downloaded: 0,
            total_bytes,
            percentage: 0.0,
            status: "Downloading...".to_string(),
        },
    );

    while let Some(chunk_res) = stream.next().await {
        let chunk = chunk_res.map_err(|e| format!("Error while downloading chunk: {}", e))?;
        file.write_all(&chunk).map_err(|e| format!("Error writing chunk: {}", e))?;
        hasher.update(&chunk);
        downloaded += chunk.len() as u64;

        let percentage = if total_bytes > 0 {
            (downloaded as f32 / total_bytes as f32) * 100.0
        } else {
            0.0
        };

        let _ = app.emit(
            "download-progress",
            DownloadProgress {
                tool_name: tool_name.clone(),
                bytes_downloaded: downloaded,
                total_bytes,
                percentage,
                status: "Downloading...".to_string(),
            },
        );
    }

    file.flush().map_err(|e| format!("Failed to flush file: {}", e))?;

    // Verify SHA-256
    let calculated_hash = hex::encode(hasher.finalize());
    if let Some(expected) = expected_sha256 {
        if !expected.is_empty() && !calculated_hash.eq_ignore_ascii_case(&expected) {
            let _ = tokio::fs::remove_file(&temp_file_path).await;
            return Err(format!(
                "Checksum verification failed! Expected: {}, Computed: {}",
                expected, calculated_hash
            ));
        }
    }

    // Auto-extract if it's a zip archive
    if filename.ends_with(".zip") {
        let _ = app.emit(
            "download-progress",
            DownloadProgress {
                tool_name: tool_name.clone(),
                bytes_downloaded: downloaded,
                total_bytes,
                percentage: 100.0,
                status: "Extracting archive...".to_string(),
            },
        );

        let zip_file = File::open(&temp_file_path).map_err(|e| format!("Cannot open zip: {}", e))?;
        let mut archive = zip::ZipArchive::new(BufReader::new(zip_file))
            .map_err(|e| format!("Invalid zip archive: {}", e))?;

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
        "download-progress",
        DownloadProgress {
            tool_name: tool_name.clone(),
            bytes_downloaded: downloaded,
            total_bytes,
            percentage: 100.0,
            status: "Complete".to_string(),
        },
    );

    Ok(format!(
        "Tool '{}' installed successfully at {} (SHA-256: {})",
        tool_name,
        target_dir.display(),
        calculated_hash
    ))
}
