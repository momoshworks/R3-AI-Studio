import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from env_manager import PythonEnvManager
from code_runner import CodeRunner

async def main():
    print("=" * 60)
    print("  NexusHub - Stage 1 Verification: Engine & Sandboxed Runner")
    print("=" * 60)

    env_mgr = PythonEnvManager()
    runner = CodeRunner(env_mgr)

    test_env = "stage1_demo_env"
    print(f"\n[1/3] Creating virtual environment '{test_env}'...")
    env_res = await env_mgr.create_env(test_env, log_callback=lambda msg: print(msg, end=""))
    print(f" -> Env Path: {env_res.get('path')}")

    print(f"\n[2/3] Installing lightweight package 'colorama' in '{test_env}'...")
    install_res = await env_mgr.install_packages(test_env, ["colorama"], log_callback=lambda msg: print(msg, end=""))
    print(f" -> Install Status: {install_res.get('status')}")

    test_code = """
import sys
import colorama
from colorama import Fore, Style

colorama.init()
print(Fore.GREEN + '[SUCCESS] Hello from isolated Python ' + sys.version.split()[0] + '!' + Style.RESET_ALL)
data = [x ** 2 for x in range(1, 6)]
print(f'Computed squares: {data}')
"""

    print(f"\n[3/3] Executing sandboxed script in '{test_env}' (timeout: 30s)...")
    exec_res = await runner.execute_code(
        test_code,
        env_name=test_env,
        timeout_seconds=30.0,
        log_callback=lambda msg: print(msg, end="")
    )

    print("\n" + "=" * 60)
    print(f"Execution Result:")
    print(f"  Success: {exec_res['success']}")
    print(f"  Return Code: {exec_res['return_code']}")
    print(f"  Duration: {exec_res['duration_seconds']}s")
    print(f"  Stdout:\n{exec_res['stdout'].strip()}")
    print("=" * 60)

    if exec_res["success"] and "Computed squares: [1, 4, 9, 16, 25]" in exec_res["stdout"]:
        print("\n>>> STAGE 1 VERIFICATION PASSED SUCCESSFULLY! <<<\n")
        return 0
    else:
        print("\n>>> STAGE 1 VERIFICATION FAILED <<<\n")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
