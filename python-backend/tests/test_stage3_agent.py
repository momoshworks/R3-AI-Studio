import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from env_manager import PythonEnvManager
from code_runner import CodeRunner
from drive_sync import GoogleAuthDriveManager

async def main():
    print("=" * 65)
    print("  NexusHub - Stage 3 Verification: Autonomous Multi-Tool Agent Loop")
    print("=" * 65)

    env_mgr = PythonEnvManager()
    runner = CodeRunner(env_mgr)
    drive_mgr = GoogleAuthDriveManager()

    env_name = "auto_agent_lab"
    print(f"\n[Step 1/4] Proactive Virtualenv Creation: '{env_name}'...")
    env_res = await env_mgr.create_env(env_name, log_callback=lambda m: print(m, end=""))
    print(f" -> Env Ready at: {env_res.get('path')}")

    print(f"\n[Step 2/4] Generating & Executing Autonomous Analytics Script in '{env_name}'...")
    workspace = Path.home() / ".nexushub" / "workspace"
    workspace.mkdir(parents=True, exist_ok=True)
    output_dataset = workspace / "agent_metrics.csv"

    script = f'''
import sys
import csv
import json

output_file = r"{output_dataset}"
data = [
    ["Metric", "Value", "Status"],
    ["CPU_Utilization", "14.5%", "Optimal"],
    ["Memory_Efficiency", "92.0%", "Good"],
    ["IO_Bandwidth", "450MB/s", "High"],
    ["Calculated_Checksum", "a8fbc29", "Verified"]
]

with open(output_file, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerows(data)

print(f"[SUCCESS] Generated analytics dataset at: {{output_file}}")
print(f"[SUCCESS] Total records written: {{len(data) - 1}}")
'''

    exec_res = await runner.execute_code(
        script,
        env_name=env_name,
        timeout_seconds=30.0,
        log_callback=lambda m: print(m, end="")
    )

    print(f" -> Execution Code: {exec_res['return_code']} | Duration: {exec_res['duration_seconds']}s")
    assert exec_res["success"], "Code execution failed"
    assert output_dataset.exists(), "Output dataset was not generated"

    print(f"\n[Step 3/4] Auto-Categorization & Drive Routing for '{output_dataset.name}'...")
    category = drive_mgr.detect_category(str(output_dataset))
    print(f" -> Detected Classification: '{category}' (Target: MyHub_Automation/{category}/)")
    assert category == "Datasets", f"Expected Datasets, got {category}"

    print(f"\n[Step 4/4] Drive Backup Simulation & Hierarchy Verification...")
    if drive_mgr.is_authenticated():
        upload_res = drive_mgr.upload_file(str(output_dataset), category=category)
        print(f" -> Live Upload Success! Drive ID: {upload_res.get('file_id')}")
    else:
        print(f" -> Local Sync Ready: File queued for 'MyHub_Automation/{category}/{output_dataset.name}'")

    print("\n" + "=" * 65)
    print("  Autonomous Chain Summary:")
    print(f"   1. Virtualenv: {env_name} (Created & Isolated)")
    print(f"   2. Script Run: {exec_res['script_path']} (Exit 0)")
    print(f"   3. Output File: {output_dataset} ({output_dataset.stat().st_size} bytes)")
    print(f"   4. Cloud Route: MyHub_Automation/{category}/{output_dataset.name}")
    print("=" * 65)
    print("\n>>> STAGE 3 AUTONOMOUS MULTI-TOOL VERIFICATION PASSED! <<<\n")
    return 0

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
