import urllib.request
import urllib.parse
import http.cookiejar
import ssl
import re
import json
import time
from datetime import datetime
from pathlib import Path

def fetch_delta_lms_announcements(username: str = "42510314", password: str = "plmoknijb55AA@") -> dict:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cj),
        urllib.request.HTTPSHandler(context=ctx)
    )

    # 1. GET login page & extract ASP.NET viewstate tokens
    login_url = "https://dulms.deltauniv.edu.eg/login.aspx"
    req = urllib.request.Request(login_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    res = opener.open(req, timeout=15)
    html = res.read().decode("utf-8", errors="ignore")

    vs_match = re.search(r'id="__VIEWSTATE"\s+value="([^"]+)"', html)
    vg_match = re.search(r'id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"', html)
    ev_match = re.search(r'id="__EVENTVALIDATION"\s+value="([^"]+)"', html)

    if not vs_match:
        raise RuntimeError("Failed to capture __VIEWSTATE token from Delta LMS.")

    viewstate = vs_match.group(1)
    viewgen = vg_match.group(1) if vg_match else "C2EE9ABB"
    eventval = ev_match.group(1) if ev_match else ""

    # 2. POST credentials
    post_data = {
        "__VIEWSTATE": viewstate,
        "__VIEWSTATEGENERATOR": viewgen,
        "__EVENTVALIDATION": eventval,
        "txtname": username,
        "txtPass": password,
        "type": "1",
        "Button1": "Login"
    }
    encoded_data = urllib.parse.urlencode(post_data).encode("utf-8")
    post_req = urllib.request.Request(
        login_url,
        data=encoded_data,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": login_url
        }
    )
    post_res = opener.open(post_req, timeout=20)
    final_url = post_res.geturl()

    if "login.aspx" in final_url.lower():
        raise RuntimeError("Authentication failed: invalid username or password.")

    # 3. Request Announcements API
    api_url = "https://dulms.deltauniv.edu.eg/Announcement/GetAnnouncement"
    payload = json.dumps({"DateFrom": "", "DateTo": "", "IsSeen": "All"}).encode("utf-8")
    ann_req = urllib.request.Request(
        api_url,
        data=payload,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Content-Type": "application/json; charset=utf-8",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://dulms.deltauniv.edu.eg/Announcement/AllAnnouncement"
        }
    )
    ann_res = opener.open(ann_req, timeout=20)
    data = json.loads(ann_res.read().decode("utf-8", errors="ignore"))

    announcements = []
    for item in data.get("AnnList", []):
        body_html = item.get("AnnouncementBody", "")
        imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', body_html)
        full_imgs = [("https://dulms.deltauniv.edu.eg/" + img.lstrip("./").lstrip("/")) if not img.startswith("http") else img for img in imgs]

        clean_body = re.sub(r'<[^>]+>', ' ', body_html)
        clean_body = re.sub(r'&nbsp;', ' ', clean_body)
        clean_body = re.sub(r'\s+', ' ', clean_body).strip()
        creator = (item.get("CreatedName") or "").lstrip("/").strip()

        announcements.append({
            "id": str(item.get("AnnouncementId")),
            "subject": item.get("AnnouncementSubject", "").strip(),
            "type": item.get("TypeName", "Announcement"),
            "instructor": creator,
            "date": f"{item.get('CreatedDate', '')} - {item.get('CreatedTime', '')}".strip(" -"),
            "body": clean_body,
            "images": full_imgs
        })

    return {
        "status": "success",
        "student_id": username,
        "total_count": len(announcements),
        "fetched_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "announcements": announcements
    }

if __name__ == "__main__":
    result = fetch_delta_lms_announcements()
    output_file = Path(__file__).resolve().parent / "delta_announcements_latest.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Successfully scraped {result['total_count']} announcements and saved to {output_file.name}")
