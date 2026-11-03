use serde::{Deserialize, Serialize};
use sysinfo::{CpuRefreshKind, Disks, MemoryRefreshKind, RefreshKind, System};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SystemMetrics {
    pub cpu_usage: f32,
    pub memory_used_mb: u64,
    pub memory_total_mb: u64,
    pub memory_percentage: f32,
    pub disk_free_gb: f64,
    pub disk_total_gb: f64,
}

#[tauri::command]
pub fn get_system_metrics() -> SystemMetrics {
    let mut sys = System::new_with_specifics(
        RefreshKind::new()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything()),
    );
    std::thread::sleep(std::time::Duration::from_millis(150));
    sys.refresh_cpu();
    sys.refresh_memory();

    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let memory_used_mb = sys.used_memory() / (1024 * 1024);
    let memory_total_mb = sys.total_memory() / (1024 * 1024);
    let memory_percentage = if memory_total_mb > 0 {
        (memory_used_mb as f32 / memory_total_mb as f32) * 100.0
    } else {
        0.0
    };

    let disks = Disks::new_with_refreshed_list();
    let mut total_space: u64 = 0;
    let mut available_space: u64 = 0;

    for disk in &disks {
        total_space += disk.total_space();
        available_space += disk.available_space();
    }

    let disk_total_gb = (total_space as f64) / (1024.0 * 1024.0 * 1024.0);
    let disk_free_gb = (available_space as f64) / (1024.0 * 1024.0 * 1024.0);

    SystemMetrics {
        cpu_usage,
        memory_used_mb,
        memory_total_mb,
        memory_percentage,
        disk_free_gb,
        disk_total_gb,
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ToolItem {
    pub name: String,
    pub path: String,
    pub size_mb: f64,
}

#[tauri::command]
pub fn list_local_tools() -> Result<Vec<ToolItem>, String> {
    let tools_dir = crate::download::get_tools_dir();
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
                    
                    // Simple recursive size calculator
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
