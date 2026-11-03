use serde::{Deserialize, Serialize};
use sysinfo::{CpuRefreshKind, Disks, MemoryRefreshKind, RefreshKind, System};
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SystemTelemetry {
    pub cpu: String,
    pub ram: String,
    pub disk_free: String,
    pub cpu_usage: f32,
    pub memory_percentage: f32,
    pub disk_free_gb: f64,
    pub disk_total_gb: f64,
}

pub struct SystemMonitor;

impl SystemMonitor {
    /// Launches an asynchronous background worker that broadcasts telemetry every 1000ms
    pub fn start_telemetry_loop(app: AppHandle) {
        tauri::async_runtime::spawn(async move {
            let mut sys = System::new_with_specifics(
                RefreshKind::new()
                    .with_cpu(CpuRefreshKind::everything())
                    .with_memory(MemoryRefreshKind::everything()),
            );

            let mut disk_check_counter = 0;
            let mut cached_disk_total_gb = 0.0;
            let mut cached_disk_free_gb = 0.0;

            loop {
                tokio::time::sleep(tokio::time::Duration::from_millis(3000)).await;

                sys.refresh_cpu();
                sys.refresh_memory();

                let cpu_usage = sys.global_cpu_info().cpu_usage();
                let mem_used = sys.used_memory();
                let mem_total = sys.total_memory();
                let memory_percentage = if mem_total > 0 {
                    (mem_used as f32 / mem_total as f32) * 100.0
                } else {
                    0.0
                };

                // Refresh disk info only once every 10 iterations (~30 seconds) to eliminate continuous disk I/O
                if disk_check_counter == 0 || cached_disk_total_gb == 0.0 {
                    let disks = Disks::new_with_refreshed_list();
                    let mut total_space: u64 = 0;
                    let mut available_space: u64 = 0;

                    for disk in &disks {
                        total_space += disk.total_space();
                        available_space += disk.available_space();
                    }

                    cached_disk_total_gb = (total_space as f64) / (1024.0 * 1024.0 * 1024.0);
                    cached_disk_free_gb = (available_space as f64) / (1024.0 * 1024.0 * 1024.0);
                }
                disk_check_counter = (disk_check_counter + 1) % 10;

                let disk_total_gb = cached_disk_total_gb;
                let disk_free_gb = cached_disk_free_gb;

                let telemetry = SystemTelemetry {
                    cpu: format!("{:.1}%", cpu_usage),
                    ram: format!("{:.0}%", memory_percentage),
                    disk_free: format!("{:.0} GB", disk_free_gb),
                    cpu_usage,
                    memory_percentage,
                    disk_free_gb,
                    disk_total_gb,
                };

                let _ = app.emit("system://telemetry", &telemetry);
            }
        });
    }

    /// Single snapshot reader for immediate invoke queries
    pub fn read_snapshot() -> SystemTelemetry {
        let mut sys = System::new_with_specifics(
            RefreshKind::new()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        );
        sys.refresh_cpu();
        sys.refresh_memory();

        let cpu_usage = sys.global_cpu_info().cpu_usage();
        let mem_used = sys.used_memory();
        let mem_total = sys.total_memory();
        let memory_percentage = if mem_total > 0 {
            (mem_used as f32 / mem_total as f32) * 100.0
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

        SystemTelemetry {
            cpu: format!("{:.1}%", cpu_usage),
            ram: format!("{:.0}%", memory_percentage),
            disk_free: format!("{:.0} GB", disk_free_gb),
            cpu_usage,
            memory_percentage,
            disk_free_gb,
            disk_total_gb,
        }
    }
}

#[tauri::command]
pub fn get_system_telemetry() -> SystemTelemetry {
    SystemMonitor::read_snapshot()
}
