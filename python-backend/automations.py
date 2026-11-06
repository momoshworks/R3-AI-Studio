import os
import sys
import json
import time
import uuid
import asyncio
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
import httpx
import psutil

# Official Google GenAI SDK
from google import genai
from google.genai import types

# ----------------------------------------------------
# Directory & Storage Setup
# ----------------------------------------------------
def _resolve_base_dir() -> Path:
    candidate = Path.home() / ".nexushub"
    try:
        candidate.mkdir(parents=True, exist_ok=True)
        probe = candidate / ".probe"
        probe.write_text("probe")
        probe.unlink(missing_ok=True)
        return candidate
    except (PermissionError, OSError):
        local_dir = Path(__file__).resolve().parent.parent / ".nexushub"
        local_dir.mkdir(parents=True, exist_ok=True)
        return local_dir

BASE_DIR = _resolve_base_dir()
MEDIA_DIR = BASE_DIR / "media_vault"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
AUTOMATIONS_FILE = BASE_DIR / "automations.json"
AUTOMATION_LOGS_DIR = BASE_DIR / "automation_logs"
AUTOMATION_LOGS_DIR.mkdir(parents=True, exist_ok=True)
CONFIG_FILE = BASE_DIR / "config.json"

def get_persisted_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}

def get_gemini_api_key() -> Optional[str]:
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ.get("GEMINI_API_KEY").strip()
    cfg = get_persisted_config()
    if cfg.get("api_key"):
        return cfg.get("api_key").strip()
    return None

def get_openai_api_key() -> Optional[str]:
    if os.environ.get("OPENAI_API_KEY"):
        return os.environ.get("OPENAI_API_KEY").strip()
    cfg = get_persisted_config()
    if cfg.get("openai_api_key"):
        return cfg.get("openai_api_key").strip()
    return None

# Direct instruction for automations
AUTOMATION_SYSTEM_PROMPT = """أنت Nerdo AI، مساعد تقني ذكي مباشر وعملي.
عند تشغيل مهمة أتمتة مجدولة:
1. ادخل في صلب التقرير والنتائج مباشرة بدون مقدمات ترحيبية أو تمهيد.
2. نسق الإجابة بأسلوب Markdown نظيف وطبيعي:
   - استخدم العناوين (###) للتنقل المنطقي.
   - استخدم القوائم النقطية (*) للملاحظات والتفاصيل.
   - استخدم القوائم الرقمية (1. 2. 3.) للتوصيات والخطوات التنفيذية.
   - استخدم الخط العريض (**Bold**) للكلمات المفتاحية والملفات فقط.
3. ركز على تقديم نتائج عملية دقيقة وتوصيات جاهزة للتنفيذ الفوري."""

# ----------------------------------------------------
# Pre-built Industry Templates
# ----------------------------------------------------
DEFAULT_WATCH_DIR = str(Path.home() / "Desktop" / "Nerdo_Watch")

DEFAULT_TEMPLATES = [
    {
        "id": "auto_delta_lms",
        "name": "مراقب إعلانات وكويزات جامعة الدلتا (Delta LMS Monitor)",
        "description": "تسجيل دخول دوري تلقائي لبوابة جامعة الدلتا (42510314) واستخراج أحدث الإعلانات ومواعيد الكويزات وتحليلها وتنبيهك بها فوراً.",
        "type": "interval",
        "interval_minutes": 60,
        "prompt": "أنت المساعد الأكاديمي الذكي لطالب جامعة الدلتا. حلل أحدث إعلانات وتكليفات نظام إدارة التعلم (Delta LMS) المسحوبة للتو، واستخرج أهم المواعيد والتنبيهات العاجلة (الكويزات، التكليفات، ومحاضرات الأونلاين)، مع تحديد الموعد والإجراء المطلوب لكل إعلان.",
        "model": "Google Gemini (gemini-2.5-flash)",
        "enabled": True,
        "action_type": "notify_and_vault"
    },
    {
        "id": "tpl_code_reviewer",
        "name": "مراقب ومراجع الأكواد الذكي (Code Reviewer)",
        "description": "يرصد أي تعديل أو إضافة في ملفات الكود بمجلد المشروع، ويراجع الأكواد لاكتشاف الثغرات وتحسين الأداء فوراً.",
        "type": "folder_watch",
        "prompt": "أنت مدقق جودة وكود خبير. راجع الملفات البرمجية التالية بدقة: اكتشف أي ثغرات أمنية (Security vulnerabilities)، مشاكل في الأداء (Performance bottlenecks)، أو عدم توافق مع أفضل الممارسات، واقترح التحسينات البرمجية المباشرة فوراً.",
        "model": "Google Gemini (gemini-2.5-flash)",
        "enabled": False,
        "interval_minutes": 10,
        "watch_folder": DEFAULT_WATCH_DIR,
        "file_extensions": [".py", ".js", ".ts", ".tsx", ".html", ".css", ".json", ".sql"],
        "action_type": "notify_and_vault"
    },
    {
        "id": "tpl_morning_brief",
        "name": "الملخص الصباحي وأولويات العمل (Daily Briefing)",
        "description": "يولد تقريراً صباحياً يومياً في ساعة محددة يشمل أهم النصائح الإنتاجية، ملخص أخبار التقنية، وأولويات التطوير اليومية.",
        "type": "daily",
        "daily_time": "09:00",
        "prompt": "اكتب لي تقريراً صباحياً ذكياً وموجزاً: أهم 3 نصائح إنتاجية وتطويرية لمهندس البرمجيات، ملخص سريع لأهم اتجاهات الذكاء الاصطناعي وتقنيات الويب اليوم، وخطة تركيز سريعة لليوم.",
        "model": "Google Gemini (gemini-2.5-flash)",
        "enabled": False,
        "interval_minutes": 1440,
        "action_type": "notify_and_vault"
    },
    {
        "id": "tpl_pdf_summarizer",
        "name": "ملخص المستندات والأبحاث (PDF & Doc Analyzer)",
        "description": "يراقب مجلد التنزيلات أو المستندات، ويستخرج الأفكار الجوهرية والقرارات من أي ملف PDF أو مستند جديد يُضاف.",
        "type": "folder_watch",
        "prompt": "لخص المستندات الجديدة الملتقطة بشكل مباشر: استخرج النقاط الجوهرية، الإحصائيات أو القرارات المهمة، والخطوات العملية في نقاط محددة.",
        "model": "Google Gemini (gemini-2.5-flash)",
        "enabled": False,
        "interval_minutes": 15,
        "watch_folder": str(Path.home() / "Downloads"),
        "file_extensions": [".pdf", ".txt", ".md"],
        "action_type": "notify_and_vault"
    },
    {
        "id": "tpl_system_health",
        "name": "فاحص صحة وأمان النظام (System Health Check)",
        "description": "فحص دوري كل عدة ساعات لحالة المعالج والذاكرة والمساحة وإصدار توصيات للصيانة والأمان.",
        "type": "interval",
        "interval_minutes": 180,
        "prompt": "حلل حالة النظام التالية: استهلاك المعالج {cpu}%، استهلاك الذاكرة {memory}%، المساحة المتبقية على القرص {disk_free} GB. أعطِ تقييماً سريعاً ونصائح للصيانة إذا لزم الأمر.",
        "model": "Google Gemini (gemini-2.5-flash)",
        "enabled": False,
        "action_type": "notify_and_vault"
    }
]

# ----------------------------------------------------
# Models & Data Persistence
# ----------------------------------------------------
class AutomationTaskModel(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = ""
    type: str  # "interval" | "daily" | "folder_watch" | "manual"
    prompt: str
    model: Optional[str] = "Google Gemini (gemini-2.5-flash)"
    enabled: Optional[bool] = True
    interval_minutes: Optional[int] = 60
    daily_time: Optional[str] = "09:00"
    watch_folder: Optional[str] = ""
    file_extensions: Optional[List[str]] = [".py", ".js", ".ts", ".tsx", ".md", ".txt", ".json", ".pdf"]
    action_type: Optional[str] = "notify_and_vault"  # "notify" | "vault" | "notify_and_vault"
    last_run: Optional[float] = None
    last_status: Optional[str] = "idle"  # "idle" | "running" | "success" | "error"
    last_output: Optional[str] = None
    run_count: Optional[int] = 0
    created_at: Optional[float] = None

def load_automations() -> List[dict]:
    if not AUTOMATIONS_FILE.exists():
        initial_tasks = []
        for tpl in DEFAULT_TEMPLATES:
            t = dict(tpl)
            t["id"] = f"auto_{uuid.uuid4().hex[:8]}"
            t["created_at"] = time.time()
            t["last_status"] = "idle"
            t["run_count"] = 0
            initial_tasks.append(t)
        save_automations(initial_tasks)
        return initial_tasks

    try:
        data = json.loads(AUTOMATIONS_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []

def save_automations(tasks: List[dict]):
    AUTOMATIONS_FILE.write_text(json.dumps(tasks, ensure_ascii=False, indent=2), encoding="utf-8")

def get_task_by_id(task_id: str) -> Optional[dict]:
    tasks = load_automations()
    for t in tasks:
        if t.get("id") == task_id:
            return t
    return None

def update_task_in_storage(task_id: str, updates: dict) -> Optional[dict]:
    tasks = load_automations()
    found = None
    for i, t in enumerate(tasks):
        if t.get("id") == task_id:
            tasks[i].update(updates)
            found = tasks[i]
            break
    if found:
        save_automations(tasks)
    return found

# ----------------------------------------------------
# Task Execution Engine
# ----------------------------------------------------
async def execute_automation_task(task_id: str) -> dict:
    task = get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Automation task not found")

    update_task_in_storage(task_id, {"last_status": "running"})

    t_type = task.get("type", "interval")
    raw_prompt = task.get("prompt", "")
    model_name = task.get("model", "gemini-2.5-flash")
    watch_folder = task.get("watch_folder") or DEFAULT_WATCH_DIR
    extensions = task.get("file_extensions") or [".py", ".js", ".ts", ".tsx", ".md", ".txt", ".json", ".pdf"]

    final_prompt = raw_prompt
    context_details = []

    # 1. Gather context for folder_watch
    if t_type == "folder_watch":
        folder_p = Path(watch_folder)
        if not folder_p.exists():
            try:
                folder_p.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                err_msg = f"تعذر الوصول إلى المجلد المرصود: {watch_folder} ({e})"
                update_task_in_storage(task_id, {"last_status": "error", "last_output": err_msg})
                return {"success": False, "error": err_msg}

        last_run_time = task.get("last_run") or (time.time() - 86400 * 2)  # Last 2 days on first run
        changed_files = []
        try:
            for item in folder_p.rglob("*"):
                if item.is_file() and any(item.name.lower().endswith(ext.lower()) for ext in extensions):
                    try:
                        mtime = item.stat().st_mtime
                        if mtime > last_run_time:
                            changed_files.append((item, mtime))
                    except Exception:
                        pass
        except Exception as e:
            print(f"[Folder Watch Scan Error] {e}")

        if not changed_files:
            idle_msg = f"فحص المجلد مكتمل ({datetime.datetime.now().strftime('%H:%M:%S')}): لا توجد ملفات جديدة أو معدلة منذ آخر فحص في: {watch_folder}"
            update_task_in_storage(task_id, {
                "last_run": time.time(),
                "last_status": "idle",
                "last_output": idle_msg
            })
            return {"success": True, "status": "idle", "output": idle_msg}

        # Sort newest first, take up to 4 files
        changed_files.sort(key=lambda x: x[1], reverse=True)
        selected_files = changed_files[:4]

        files_content_block = []
        for file_path, _ in selected_files:
            try:
                rel_name = file_path.name
                content = ""
                if file_path.suffix.lower() == ".pdf":
                    content = f"[ملف PDF: {rel_name} بحجم {file_path.stat().st_size} بايت - تم التقاطه للفحص]"
                else:
                    text = file_path.read_text(encoding="utf-8", errors="replace")
                    # Limit to 4000 chars per file to stay fast
                    content = text[:4000] if len(text) > 4000 else text

                files_content_block.append(f"#### ملف: `{rel_name}`\n```\n{content}\n```")
            except Exception as read_err:
                files_content_block.append(f"#### ملف: `{file_path.name}` (تعذر القراءة: {read_err})")

        final_prompt = f"{raw_prompt}\n\n### الملفات المرصودة حديثاً ({len(selected_files)} ملف):\n" + "\n\n".join(files_content_block)
        context_details.append(f"تم رصد {len(selected_files)} ملفات معدلة حديثاً في: {watch_folder}")

    # 1.5 Special Integration: Delta LMS Live Portal Scraper
    is_delta = (
        task.get("type") == "delta_lms"
        or "delta" in task.get("id", "").lower()
        or "delta" in task.get("name", "").lower()
        or "دلتا" in task.get("name", "")
        or "dulms" in raw_prompt.lower()
    )
    if is_delta:
        try:
            from delta_lms_scraper import fetch_delta_lms_announcements
            delta_data = fetch_delta_lms_announcements()
            ann_lines = []
            for a in delta_data.get("announcements", [])[:15]:
                img_str = f" [مرفق صورة: {a['images'][0]}]" if a.get("images") else ""
                ann_lines.append(f"- **{a['subject']}** ({a['type']}) | المحاضر: {a['instructor']} | التاريخ: {a['date']}{img_str}\n  المحتوى: {a['body']}")
            final_prompt = f"{raw_prompt}\n\n### أحدث إعلانات وتكليفات جامعة الدلتا المستخرجة الآن (إجمالي {delta_data.get('total_count')} إعلان):\n" + "\n\n".join(ann_lines)
            context_details.append(f"تم سحب {delta_data.get('total_count')} إعلاناً بنجاح من بوابة Delta LMS للطالب {delta_data.get('student_id')}")
        except Exception as d_err:
            print(f"[Delta LMS Auto Scrape Warning] {d_err}")
            context_details.append(f"تنبيه فحص Delta LMS: {d_err}")

    # 2. System metrics interpolation
    try:
        cpu = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage(str(BASE_DIR))
        final_prompt = final_prompt.replace("{cpu}", str(round(cpu, 1)))
        final_prompt = final_prompt.replace("{memory}", str(round(mem.percent, 1)))
        final_prompt = final_prompt.replace("{disk_free}", str(round(disk.free / (1024**3), 1)))
        final_prompt = final_prompt.replace("{date}", datetime.datetime.now().strftime("%Y-%m-%d"))
        final_prompt = final_prompt.replace("{time}", datetime.datetime.now().strftime("%H:%M:%S"))
    except Exception:
        pass

    # 3. Model Inference (Gemini or OpenAI)
    ai_result = ""
    is_openai = "gpt" in model_name.lower() or "o3" in model_name.lower()

    if is_openai:
        api_key = get_openai_api_key()
        if not api_key:
            err = "لم يتم العثور على مفتاح OpenAI API مفعل لتشغيل الأتمتة."
            update_task_in_storage(task_id, {"last_status": "error", "last_output": err})
            return {"success": False, "error": err}

        target_model = "gpt-4o-mini"
        if "gpt-4o" in model_name.lower():
            target_model = "gpt-4o"
        elif "o3" in model_name.lower():
            target_model = "o3-mini"

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": target_model,
                        "messages": [
                            {"role": "system", "content": AUTOMATION_SYSTEM_PROMPT},
                            {"role": "user", "content": final_prompt}
                        ],
                        "temperature": 0.4
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    ai_result = data["choices"][0]["message"]["content"]
                else:
                    err = f"OpenAI API Error ({res.status_code}): {res.text}"
                    update_task_in_storage(task_id, {"last_status": "error", "last_output": err})
                    return {"success": False, "error": err}
        except Exception as e:
            err = f"فشل الاتصال بـ OpenAI: {e}"
            update_task_in_storage(task_id, {"last_status": "error", "last_output": err})
            return {"success": False, "error": err}

    else:
        # Default: Google Gemini
        api_key = get_gemini_api_key()
        if not api_key:
            err = "لم يتم العثور على مفتاح Google Gemini API مفعل لتشغيل الأتمتة."
            update_task_in_storage(task_id, {"last_status": "error", "last_output": err})
            return {"success": False, "error": err}

        # Slug match
        target_slug = "gemini-2.5-flash"
        for candidate in ["gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"]:
            if candidate in model_name.lower():
                target_slug = candidate
                break

        try:
            client = genai.Client(api_key=api_key)
            config = types.GenerateContentConfig(
                system_instruction=AUTOMATION_SYSTEM_PROMPT,
                temperature=0.4,
            )
            response = await client.aio.models.generate_content(
                model=target_slug,
                contents=final_prompt,
                config=config,
            )
            ai_result = response.text or "تمت معالجة المهمة بنجاح دون مخرجات نصية."
        except Exception as e:
            # Fallback to flash-lite if error
            try:
                client = genai.Client(api_key=api_key)
                response = await client.aio.models.generate_content(
                    model="gemini-3.5-flash-lite",
                    contents=final_prompt,
                    config=types.GenerateContentConfig(system_instruction=AUTOMATION_SYSTEM_PROMPT),
                )
                ai_result = response.text or "تمت المعالجة بنجاح."
            except Exception as fb_err:
                err = f"خطأ أثناء توليد الأتمتة عبر Gemini: {e} (Fallback: {fb_err})"
                update_task_in_storage(task_id, {"last_status": "error", "last_output": err})
                return {"success": False, "error": err}

    # 4. Save Logs & Vault Media Report
    timestamp_now = time.time()
    dt_str = datetime.datetime.fromtimestamp(timestamp_now).strftime("%Y-%m-%d %H:%M:%S")
    safe_task_name = "".join(c for c in task.get("name", "Automation") if c.isalnum() or c in ("-", "_", " ")).strip().replace(" ", "_")

    log_entry = {
        "id": f"log_{uuid.uuid4().hex[:8]}",
        "task_id": task_id,
        "task_name": task.get("name"),
        "timestamp": timestamp_now,
        "date_str": dt_str,
        "model": model_name,
        "status": "success",
        "output": ai_result,
        "prompt_used": final_prompt[:300] + "..." if len(final_prompt) > 300 else final_prompt,
        "context_details": context_details
    }

    # Save to disk log file
    log_file = AUTOMATION_LOGS_DIR / f"{task_id}_{int(timestamp_now)}.json"
    try:
        log_file.write_text(json.dumps(log_entry, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[Automation Log Save Error] {e}")

    # Save to Media Vault as Markdown Report if requested
    action_type = task.get("action_type", "notify_and_vault")
    if action_type in ("vault", "notify_and_vault"):
        try:
            report_filename = f"Nerdo_Auto_{safe_task_name}_{int(timestamp_now)}.md"
            report_file = MEDIA_DIR / report_filename
            report_content = f"""# تقرير أتمتة Nerdo AI: {task.get('name')}
**تاريخ التوليد:** {dt_str}  
**النموذج:** {model_name}  
**نوع المهمة:** {t_type}  

---

{ai_result}
"""
            report_file.write_text(report_content, encoding="utf-8")
        except Exception as vault_err:
            print(f"[Automation Vault Save Error] {vault_err}")

    # Update Task Status
    update_task_in_storage(task_id, {
        "last_run": timestamp_now,
        "last_status": "success",
        "last_output": ai_result,
        "run_count": (task.get("run_count") or 0) + 1
    })

    return {
        "success": True,
        "status": "success",
        "output": ai_result,
        "timestamp": timestamp_now,
        "task_name": task.get("name")
    }

# ----------------------------------------------------
# Background Scheduler Loop
# ----------------------------------------------------
_scheduler_task: Optional[asyncio.Task] = None

async def automation_scheduler_loop():
    print("[Nerdo Automations] Background scheduler loop started successfully.")
    while True:
        try:
            await asyncio.sleep(25)  # Check every 25 seconds
            tasks = load_automations()
            now = time.time()
            now_dt = datetime.datetime.now()
            current_hh_mm = now_dt.strftime("%H:%M")
            today_str = now_dt.strftime("%Y-%m-%d")

            for task in tasks:
                if not task.get("enabled"):
                    continue

                t_type = task.get("type", "interval")
                last_run = task.get("last_run") or 0
                should_run = False

                if t_type == "interval":
                    interval_sec = (task.get("interval_minutes") or 60) * 60
                    if now - last_run >= interval_sec:
                        should_run = True

                elif t_type == "daily":
                    target_time = task.get("daily_time") or "09:00"
                    last_run_day = datetime.datetime.fromtimestamp(last_run).strftime("%Y-%m-%d") if last_run else ""
                    if current_hh_mm == target_time and last_run_day != today_str:
                        should_run = True

                elif t_type == "folder_watch":
                    interval_sec = (task.get("interval_minutes") or 10) * 60
                    if now - last_run >= interval_sec:
                        should_run = True

                if should_run:
                    print(f"[Nerdo Automations] Triggering scheduled task: {task.get('name')} ({task.get('id')})")
                    try:
                        asyncio.create_task(execute_automation_task(task.get("id")))
                    except Exception as run_err:
                        print(f"[Nerdo Automations] Execution launch error: {run_err}")

        except asyncio.CancelledError:
            print("[Nerdo Automations] Scheduler cancelled.")
            break
        except Exception as loop_err:
            print(f"[Nerdo Automations Loop Error]: {loop_err}")
            await asyncio.sleep(15)

def start_automation_scheduler():
    global _scheduler_task
    if _scheduler_task is None or _scheduler_task.done():
        try:
            loop = asyncio.get_event_loop()
            _scheduler_task = loop.create_task(automation_scheduler_loop())
        except Exception as e:
            print(f"[Nerdo Automations Scheduler Start Warning]: {e}")

# ----------------------------------------------------
# FastAPI Endpoints Router
# ----------------------------------------------------
automations_router = APIRouter(prefix="/api/automations", tags=["Automations"])

@automations_router.get("")
async def list_automations():
    tasks = load_automations()
    return {"tasks": tasks, "count": len(tasks), "active_count": sum(1 for t in tasks if t.get("enabled"))}

@automations_router.get("/templates")
async def get_templates():
    return {"templates": DEFAULT_TEMPLATES}

@automations_router.post("")
async def create_automation(task: AutomationTaskModel):
    tasks = load_automations()
    new_task = task.dict()
    new_task["id"] = f"auto_{uuid.uuid4().hex[:8]}"
    new_task["created_at"] = time.time()
    new_task["last_status"] = "idle"
    new_task["run_count"] = 0
    tasks.insert(0, new_task)
    save_automations(tasks)
    return {"success": True, "task": new_task}

@automations_router.put("/{task_id}")
async def update_automation(task_id: str, updates: dict = Body(...)):
    updated = update_task_in_storage(task_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True, "task": updated}

@automations_router.delete("/{task_id}")
async def delete_automation(task_id: str):
    tasks = load_automations()
    new_list = [t for t in tasks if t.get("id") != task_id]
    if len(new_list) == len(tasks):
        raise HTTPException(status_code=404, detail="Task not found")
    save_automations(new_list)
    return {"success": True, "deleted_id": task_id}

@automations_router.post("/{task_id}/run")
async def run_automation_now(task_id: str):
    res = await execute_automation_task(task_id)
    return res

@automations_router.get("/{task_id}/logs")
async def get_task_logs(task_id: str):
    logs = []
    try:
        matching_files = sorted(AUTOMATION_LOGS_DIR.glob(f"{task_id}_*.json"), key=os.path.getmtime, reverse=True)
        for lf in matching_files[:20]:
            try:
                entry = json.loads(lf.read_text(encoding="utf-8"))
                logs.append(entry)
            except Exception:
                pass
    except Exception as e:
        print(f"[Logs Read Error] {e}")
    return {"task_id": task_id, "logs": logs}
