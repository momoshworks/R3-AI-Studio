import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from drive_sync import GoogleAuthDriveManager, ROOT_FOLDER_NAME, CATEGORY_FOLDERS

def main():
    print("=" * 60)
    print("  NexusHub - Stage 2 Verification: Google Auth & Drive Engine")
    print("=" * 60)

    mgr = GoogleAuthDriveManager()

    print("\n[1/3] Testing File Auto-Categorization Logic:")
    test_files = [
        ("report.csv", "Datasets"),
        ("model_train.py", "Scripts"),
        ("chart.png", "Visualizations"),
        ("requirements.txt", "Environments"),
        ("session.md", "Chat_Logs"),
    ]
    all_matched = True
    for fname, expected_cat in test_files:
        detected = mgr.detect_category(fname)
        matched = detected == expected_cat
        status = "[OK]" if matched else "[FAIL]"
        print(f"  {status} {fname} -> {detected} (Expected: {expected_cat})")
        if not matched:
            all_matched = False

    print(f"\n[2/3] Checking Google Authentication Status:")
    is_auth = mgr.is_authenticated()
    print(f"  -> Authenticated: {is_auth}")
    if is_auth:
        profile = mgr.get_user_profile()
        print(f"  -> Signed in as: {profile.get('name')} ({profile.get('email')})")
    else:
        print("  -> No local token found at ~/.nexushub/drive_token.json")
        print("  -> Google Sign-In can be triggered via UI or 'mgr.login_with_google()'")

    print("\n[3/3] Folder Mapping Structure Verification:")
    print(f"  Root: {ROOT_FOLDER_NAME}/")
    for cat in CATEGORY_FOLDERS:
        print(f"    |-- {cat}/")

    print("\n" + "=" * 60)
    if all_matched:
        print(">>> STAGE 2 CATEGORIZATION & ENGINE PASSED! <<<")
        return 0
    else:
        print(">>> STAGE 2 VERIFICATION FAILED <<<")
        return 1

if __name__ == "__main__":
    sys.exit(main())
