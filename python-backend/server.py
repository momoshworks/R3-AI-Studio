import gc
import os
import sys
import json
import asyncio
import uuid
import mimetypes
import shutil
import time
import base64
import subprocess
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional

if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

from fastapi import FastAPI, HTTPException, UploadFile, File, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import httpx
import aiofiles
import psutil

# Local Google Auth & Drive Module
from drive_sync import GoogleAuthDriveManager

# Official Google GenAI SDK
from google import genai
from google.genai import types

app = FastAPI(title="R3 Core Orchestrator", version="0.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base Directories & Config
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
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_DIR = BASE_DIR / "media_vault"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
CONFIG_FILE = BASE_DIR / "config.json"
CLIENT_SECRETS_FILE = BASE_DIR / "client_secret.json"

def get_persisted_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}

def save_persisted_config(data: dict):
    existing = get_persisted_config()
    existing.update(data)
    CONFIG_FILE.write_text(json.dumps(existing, indent=2, ensure_ascii=False), encoding="utf-8")
    if "api_key" in data and data["api_key"]:
        os.environ["GEMINI_API_KEY"] = data["api_key"]
    if "openai_api_key" in data and data["openai_api_key"]:
        os.environ["OPENAI_API_KEY"] = data["openai_api_key"]

def get_gemini_api_key(client_provided_key: Optional[str] = None) -> Optional[str]:
    if client_provided_key and client_provided_key.strip():
        return client_provided_key.strip()
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ.get("GEMINI_API_KEY").strip()
    config = get_persisted_config()
    if config.get("api_key"):
        return config.get("api_key").strip()
    return None

def get_openai_api_key(client_provided_key: Optional[str] = None) -> Optional[str]:
    if client_provided_key and client_provided_key.strip():
        return client_provided_key.strip()
    if os.environ.get("OPENAI_API_KEY"):
        return os.environ.get("OPENAI_API_KEY").strip()
    config = get_persisted_config()
    if config.get("openai_api_key"):
        return config.get("openai_api_key").strip()
    return None

ACCOUNTS_FILE = BASE_DIR / "accounts.json"

def get_persisted_accounts() -> List[Dict[str, Any]]:
    if ACCOUNTS_FILE.exists():
        try:
            return json.loads(ACCOUNTS_FILE.read_text(encoding="utf-8"))
        except Exception:
            return []
    profile = drive_sync.get_user_profile()
    default_acc = {
        "id": "acc-default",
        "name": profile.get("name", "Mohamed Shabaan"),
        "email": profile.get("email", "momosh991@gmail.com"),
        "picture": profile.get("picture", "https://api.dicebear.com/7.x/identicon/svg?seed=momosh991@gmail.com"),
        "is_active": True,
        "api_key": ""
    }
    try:
        ACCOUNTS_FILE.write_text(json.dumps([default_acc], indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass
    return [default_acc]

def save_persisted_accounts(accounts: List[Dict[str, Any]]):
    try:
        ACCOUNTS_FILE.write_text(json.dumps(accounts, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception as e:
        print(f"[Accounts Save Error] {e}")

# Google Drive Manager
drive_sync = GoogleAuthDriveManager()

class AttachedFileModel(BaseModel):
    id: str
    name: str
    size: int
    type: str
    saved_path: Optional[str] = None
    preview_url: Optional[str] = None
    is_image: Optional[bool] = False

class ChatMessage(BaseModel):
    role: str
    content: str
    attachments: Optional[List[AttachedFileModel]] = None

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: str = "Google Gemini (gemini-3.5-flash)"
    api_key: Optional[str] = None
    stream: bool = True

# File Upload Endpoint
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}_{file.filename}"
    target_path = UPLOADS_DIR / safe_filename

    async with aiofiles.open(target_path, "wb") as out_file:
        while content := await file.read(1024 * 1024):
            await out_file.write(content)

    file_size = target_path.stat().st_size
    mime_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
    is_image = mime_type.startswith("image/")

    return {
        "id": file_id,
        "name": file.filename,
        "size": file_size,
        "type": mime_type,
        "saved_path": str(target_path),
        "is_image": is_image,
        "preview_url": f"/api/files/{safe_filename}"
    }

@app.get("/api/files/{filename}")
async def get_uploaded_file(filename: str):
    target = UPLOADS_DIR / filename
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    mime_type, _ = mimetypes.guess_type(str(target))
    return FileResponse(str(target), media_type=mime_type or "application/octet-stream")

# Master Genius Lecturer Teaching System Prompt & Dynamic CoT
TEACHING_SYSTEM_PROMPT = """أنت Nerdo AI، مساعد تقني ذكي، مباشر وعملي.
التزم دائماً بالقواعد الصارمة التالية في كل إجاباتك:
1. ادخل في صلب الإجابة من أول سطر بدون مقدمات ترحيبية أو تمهيد (ممنوع تماماً البدء بعبارات مثل: "أهلاً بك"، "مرحباً يا صديقي"، "إليك الشرح خطوة بخطوة"، "بالتأكيد"، "يسعدني مساعدتك").
2. لا تستخدم قوالب تصنيف مصطنعة أو عناوين فرعية متكررة (مثل "الفكرة في جملة واحدة"، "تشبيه واقعي"، "لماذا نستخدمه؟"، "Data Flow Diagram"، "Minimal Working Example") إلا إذا طلب المستخدم ذلك صراحة.
3. اعتمد أسلوب Markdown الطبيعي والصريح:
   - استخدم العناوين (###) للتنقل المنطقي بين الأفكار والأقسام.
   - استخدم القوائم النقطية (*) للتفاصيل، والقوائم الرقمية (1. 2. 3.) للخطوات العملية.
   - استخدم الخط العريض (**Bold**) لإبراز الكلمات المفتاحية فقط دون تلوين مفرط.
   - لا تضع كل فقرة أو جملة داخل صندوق أو إطار مستقل؛ اترك النص يتدفق بسلاسة.
4. ركز على تقديم الحل العملي المباشر، والخطوات القابلة للتنفيذ فوراً.
5. أجب بنفس لغة المستخدم (العربية أو الإنجليزية) بطلاقة تامة ودقة تقنية متناهية.

You are Nerdo AI, an ultra-direct, highly practical, and brilliant AI workstation assistant.
Strict response guidelines:
1. Begin immediately with the core technical solution from line 1 without greetings, pleasantries, or preamble.
2. Do not use rigid artificial template categories (such as "The Core Idea", "Real-world Analogy", "The Why", "Data Flow Diagram") unless explicitly asked by the user.
3. Use natural Markdown: ### for logical headers, * for bullet details, 1. 2. 3. for action steps, **bold** strictly for key terms, with continuous flowing text without boxing every paragraph.
4. Focus strictly on practical, directly actionable solutions."""

def get_dynamic_generation_params(messages: list) -> dict:
    """Dynamically set temperature and top-p:
    - 0.45 for coding, mathematical, syntax, and debugging questions (precision & deterministic code).
    - 0.7 for general concepts, explanations, design, analogies, and theory.
    """
    last_user_content = ""
    for m in reversed(messages):
        role = getattr(m, "role", "") if hasattr(m, "role") else (m.get("role", "") if isinstance(m, dict) else "")
        if role == "user":
            content = getattr(m, "content", "") if hasattr(m, "content") else (m.get("content", "") if isinstance(m, dict) else "")
            last_user_content = (content or "").lower()
            break
            
    code_indicators = [
        "كود", "code", "برمج", "error", "خطأ", "bug", "debug", "python", "javascript",
        "typescript", "react", "fastapi", "sql", "function", "class", "دالة", "algorithm",
        "خوارزم", "معادلة", "math", "حساب", "api", "syntax", "fix", "حل المشكلة"
    ]
    
    is_code_or_math = any(kw in last_user_content for kw in code_indicators)
    
    if is_code_or_math:
        return {"temperature": 0.45, "top_p": 0.9}
    else:
        return {"temperature": 0.7, "top_p": 0.95}

GEMINI_SYSTEM_INSTRUCTION = TEACHING_SYSTEM_PROMPT
OPENAI_SYSTEM_INSTRUCTION = TEACHING_SYSTEM_PROMPT

async def stream_gemini(chat_request: ChatRequest, queue: asyncio.Queue):
    resolved_api_key = get_gemini_api_key(chat_request.api_key)
    if not resolved_api_key:
        await queue.put({
            "type": "content_chunk",
            "delta": "⚠️ **تنبيه مفتاح تشغيل Google Gemini API:**\n\nلم يتم العثور على مفتاح API نشط. يرجى الحصول على مفتاح مجاني من [Google AI Studio](https://aistudio.google.com/app/apikey) وتفعيله في نافذة الإعدادات (أيقونة الترس بالأسفل) لبدء الاستجابة فوراً."
        })
        await queue.put({"type": "done"})
        return

    client = genai.Client(api_key=resolved_api_key)

    contents = []
    for msg in chat_request.messages:
        role = "user" if msg.role == "user" else "model"
        parts = []

        if msg.attachments and role == "user":
            for att in msg.attachments:
                file_path = Path(att.saved_path) if att.saved_path else None
                if file_path and file_path.exists():
                    file_mime = att.type or "application/octet-stream"
                    file_bytes = file_path.read_bytes()
                    if file_mime.startswith("image/") or file_mime == "application/pdf" or file_mime.startswith("audio/") or file_mime.startswith("video/"): 
                        parts.append(types.Part.from_bytes(data=file_bytes, mime_type=file_mime))
                    else:
                        snippet = file_bytes[:100000].decode("utf-8", errors="replace")
                        parts.append(types.Part.from_text(text=f"[ملف مرفق: {att.name}]\n```\n{snippet}\n```"))

        if msg.content:
            parts.append(types.Part.from_text(text=msg.content))
        elif not parts:
            parts.append(types.Part.from_text(text="مرحباً"))

        contents.append(types.Content(role=role, parts=parts))

    gen_params = get_dynamic_generation_params(chat_request.messages)
    config = types.GenerateContentConfig(
        system_instruction=TEACHING_SYSTEM_PROMPT,
        temperature=gen_params["temperature"],
        top_p=gen_params["top_p"],
    )

    import re
    raw_model = chat_request.model or ""
    match = re.search(r'\((gemini-[^)]+)\)', raw_model, re.IGNORECASE)
    requested_slug = match.group(1) if match else None
    if not requested_slug:
        match_direct = re.search(r'(gemini-[a-zA-Z0-9.-]+)', raw_model, re.IGNORECASE)
        requested_slug = match_direct.group(1) if match_direct else None

    candidate_models = []
    if requested_slug and True:
        candidate_models.append(requested_slug)
    for default_m in [
        "gemini-2.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash"
    ]:
        if default_m not in candidate_models:
            candidate_models.append(default_m)
    stream_success = False

    for model_name in candidate_models:
        try:
            response_stream = await client.aio.models.generate_content_stream(
                model=model_name,
                contents=contents,
                config=config,
            )

            async for chunk in response_stream:
                if chunk.text:
                    await queue.put({"type": "content_chunk", "delta": chunk.text})

            stream_success = True
            break
        except Exception as e:
            print(f"[Gemini Stream Notice] Trying fallback, error on {model_name}: {e}")
            continue

    if not stream_success:
        await queue.put({
            "type": "content_chunk",
            "delta": "\n\n⚠️ تم استنفاد حصة Google Gemini مؤقتاً لجميع النماذج المتاحة. يرجى المحاولة بعد قليل."
        })

    await queue.put({"type": "done"}

)

async def stream_openai(chat_request: ChatRequest, queue: asyncio.Queue):
    api_key = get_openai_api_key(chat_request.api_key)
    if not api_key:
        await queue.put({
            "type": "content_chunk",
            "delta": "⚠️ **يرجى إدخال مفتاح ChatGPT (OpenAI) API:**\n\nلم يتم العثور على مفتاح OpenAI محفوظ. يمكنك الحصول على مفتاحك من [OpenAI Platform](https://platform.openai.com/api-keys) وإدخاله في نافذة الإعدادات (أيقونة المفتاح العلوي) لبدء المحادثة فوراً."
        })
        await queue.put({"type": "done"})
        return

    raw_model = chat_request.model.lower()
    target_model = "gpt-4o-mini"
    if "gpt-4o-mini" in raw_model:
        target_model = "gpt-4o-mini"
    elif "gpt-4o" in raw_model:
        target_model = "gpt-4o"
    elif "o3" in raw_model:
        target_model = "o3-mini"
    elif "gpt-4" in raw_model:
        target_model = "gpt-4-turbo"

    gen_params = get_dynamic_generation_params(chat_request.messages)
    messages = [{"role": "system", "content": TEACHING_SYSTEM_PROMPT}]

    for msg in chat_request.messages:
        role = "user" if msg.role == "user" else "assistant"
        content_items = []
        has_images = False

        if msg.attachments and role == "user":
            for att in msg.attachments:
                file_path = Path(att.saved_path) if att.saved_path else None
                if file_path and file_path.exists():
                    file_mime = att.type or "application/octet-stream"
                    file_bytes = file_path.read_bytes()
                    if file_mime.startswith("image/"):
                        has_images = True
                        b64_img = base64.b64encode(file_bytes).decode("utf-8")
                        content_items.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:{file_mime};base64,{b64_img}"}
                        })
                    else:
                        snippet = file_bytes[:100000].decode("utf-8", errors="replace")
                        content_items.append({
                            "type": "text",
                            "text": f"[ملف مرفق: {att.name}]\n```\n{snippet}\n```"
                        })

        if msg.content:
            content_items.append({"type": "text", "text": msg.content})

        if has_images or any(item.get("type") == "image_url" for item in content_items):
            messages.append({"role": role, "content": content_items})
        else:
            text_combined = "\n\n".join(item["text"] for item in content_items if "text" in item) or msg.content or "مرحباً"
            messages.append({"role": role, "content": text_combined})

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": target_model,
        "messages": messages,
        "stream": True,
        "temperature": gen_params["temperature"],
        "top_p": gen_params["top_p"],
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as resp:
                if resp.status_code != 200:
                    err_bytes = await resp.aread()
                    try:
                        err_json = json.loads(err_bytes.decode())
                        raw_msg = err_json.get("error", {}).get("message", f"HTTP {resp.status_code}")
                    except Exception:
                        raw_msg = err_bytes.decode()[:250] or f"HTTP {resp.status_code}"

                    if "credits remaining" in raw_msg.lower() or "quota" in raw_msg.lower():
                        fallback_banner = (
                            "> 💡 **ملاحظة ذكية من R3 AI / Smart Notice:**\n"
                            "> مفتاح OpenAI الخاص بك رصيده الحالي **$0.00** في منصة OpenAI. قام R3 **تلقائياً بالإجابة فوراً عبر Google Gemini** مجاناً وبأعلى سرعة حتى لا تتوقف محادثتك:\n\n---\n\n"
                        )
                        await queue.put({
                            "type": "content_chunk",
                            "delta": fallback_banner
                        })
                        # Stream the answer via Gemini so user is never blocked!
                        await stream_gemini(chat_request, queue)
                        return
                    else:
                        err_display = f"⚠️ **خطأ في الاتصال بـ OpenAI API:** {raw_msg}"

                    await queue.put({
                        "type": "content_chunk",
                        "delta": f"\n\n{err_display}"
                    })
                    await queue.put({"type": "done"})
                    return

                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        data_part = line[6:].strip()
                        if data_part == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_part)
                            delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if delta:
                                await queue.put({"type": "content_chunk", "delta": delta})
                        except Exception:
                            continue

    except httpx.TimeoutException:
        await queue.put({
            "type": "content_chunk",
            "delta": "\n\n⚠️ **انتهت مهلة الاتصال بخوادم OpenAI (ChatGPT).** يرجى التحقق من اتصالك والمحاولة مجدداً."
        })
    except Exception as e:
        await queue.put({
            "type": "content_chunk",
            "delta": f"\n\n⚠️ **حدث خطأ أثناء المحادثة مع ChatGPT:** {str(e)}"
        })

    await queue.put({"type": "done"})

@app.post("/api/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    queue: asyncio.Queue = asyncio.Queue()
    m_lower = request.model.lower()
    if any(k in m_lower for k in ["gpt", "chatgpt", "openai", "o1", "o3"]):
        asyncio.create_task(stream_openai(request, queue))
    else:
        asyncio.create_task(stream_gemini(request, queue))

    async def event_generator():
        while True:
            event = await queue.get()
            yield f"data: {json.dumps(event)}\n\n"
            if event.get("type") == "done":
                gc.collect()
                break

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Auth & User Profile Endpoints
@app.get("/api/auth/user")
async def get_current_user():
    return drive_sync.get_user_profile()

@app.get("/api/auth/google/detected")
async def get_detected_google_account():
    account = drive_sync.discover_system_google_account()
    has_client_secret = CLIENT_SECRETS_FILE.exists()
    return {
        "account": account,
        "has_client_secret": has_client_secret,
        "message": "Connected to Google Workspace session"
    }

@app.api_route("/api/auth/google/link", methods=["GET", "POST"])
async def link_google_account(request: Request):
    data = {}
    try:
        data = await request.json()
    except Exception:
        pass
    email = data.get("email") or "momosh991@gmail.com"
    name = data.get("name") or "Mohamed Shabaan"
    result = {"status": "success", "email": email, "name": name}
    if hasattr(drive_sync, "link_google_account"):
        result = drive_sync.link_google_account(email=email, name=name)
    return result

@app.post("/api/auth/google/login")
async def google_oauth_login():
    try:
        res = await asyncio.to_thread(drive_sync.login_with_google)
        return res
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth error: {str(e)}")

@app.post("/api/auth/google/upload-secret")
async def upload_client_secret(file: UploadFile = File(...)):
    try:
        content = await file.read()
        parsed = json.loads(content.decode("utf-8"))
        if "installed" not in parsed and "web" not in parsed:
            raise HTTPException(status_code=400, detail="Invalid client_secret.json format.")
        CLIENT_SECRETS_FILE.write_bytes(content)
        return {"status": "success", "message": "Saved client_secret.json successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")

@app.post("/api/auth/logout")
async def logout_google():
    drive_sync.logout()
    return {"status": "success", "authenticated": False}

@app.get("/api/drive/status")
async def get_drive_status():
    return drive_sync.get_drive_status()

@app.post("/api/drive/auth")
async def authenticate_drive():
    try:
        res = await asyncio.to_thread(drive_sync.login_with_google)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Settings Endpoints
@app.get("/api/settings")
async def get_settings():
    config = get_persisted_config()
    key = config.get("api_key", os.environ.get("GEMINI_API_KEY", ""))
    masked = f"{key[:6]}...{key[-4:]}" if len(key) > 10 else ("***" if key else "")

    openai_key = config.get("openai_api_key", os.environ.get("OPENAI_API_KEY", ""))
    openai_masked = f"{openai_key[:7]}...{openai_key[-4:]}" if len(openai_key) > 12 else ("***" if openai_key else "")

    return {
        "has_api_key": bool(key),
        "api_key_masked": masked,
        "raw_key": key,
        "has_openai_key": bool(openai_key),
        "openai_key_masked": openai_masked,
        "raw_openai_key": openai_key
    }

@app.post("/api/settings")
async def save_settings(payload: Dict[str, Any] = Body(...)):
    save_persisted_config(payload)
    return {"status": "success", "message": "Settings saved successfully."}

@app.post("/api/settings/verify-key")
async def verify_and_save_api_key(payload: Dict[str, Any] = Body(...)):
    raw_key = payload.get("api_key", "").strip()
    if not raw_key:
        raise HTTPException(status_code=400, detail="يرجى إدخال مفتاح API صحيح")

    test_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={raw_key}"
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            resp = await client.get(test_url)
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name", "").replace("models/", "") for m in data.get("models", [])]
                active_flash = [m for m in models if "flash" in m and True]
                detected_model = active_flash[0] if active_flash else ("gemini-2.5-flash" if "gemini-2.5-flash" in models else (models[0] if models else "gemini-2.5-flash"))

                save_persisted_config({"api_key": raw_key})
                os.environ["GEMINI_API_KEY"] = raw_key

                accounts = get_persisted_accounts()
                for acc in accounts:
                    if acc.get("is_active"):
                        acc["api_key"] = raw_key
                save_persisted_accounts(accounts)

                return {
                    "valid": True,
                    "message": "تم التحقق من مفتاح Gemini API بنجاح وتفعيله فوراً!",
                    "detected_model": detected_model,
                    "available_models_count": len(models)
                }
            else:
                err_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                err_msg = err_json.get("error", {}).get("message", "المفتاح غير صالح أو لم يتم تفعيل Gemini API له.")
                return {
                    "valid": False,
                    "message": f"فشل التحقق: {err_msg}"
                }
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="انتهت مهلة الاتصال بخوادم Google Gemini")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"خطأ أثناء التحقق: {str(e)}")

@app.post("/api/settings/verify-openai-key")
async def verify_and_save_openai_key(payload: Dict[str, Any] = Body(...)):
    raw_key = payload.get("api_key", "").strip()
    if not raw_key:
        raise HTTPException(status_code=400, detail="يرجى إدخال مفتاح OpenAI API صحيح")

    test_url = "https://api.openai.com/v1/models"
    headers = {"Authorization": f"Bearer {raw_key}"}
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            resp = await client.get(test_url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                model_ids = [m.get("id", "") for m in data.get("data", [])]
                chat_models = [m for m in model_ids if any(k in m for k in ["gpt-4o", "gpt-4", "o3", "o1"])]
                preferred = "gpt-4o-mini" if "gpt-4o-mini" in chat_models else (chat_models[0] if chat_models else "gpt-4o")

                save_persisted_config({"openai_api_key": raw_key})
                os.environ["OPENAI_API_KEY"] = raw_key

                # Also probe quota with a 1-token test call
                has_quota = True
                quota_warning = ""
                try:
                    probe = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers=headers,
                        json={"model": preferred, "messages": [{"role": "user", "content": "1"}], "max_tokens": 1},
                        timeout=5.0
                    )
                    if probe.status_code == 429:
                        p_data = probe.json()
                        p_msg = p_data.get("error", {}).get("message", "")
                        if "credit" in p_msg.lower() or "quota" in p_msg.lower():
                            has_quota = False
                            quota_warning = " (ملاحظة: رصيد الحساب 0$ في OpenAI - يلزم الشحن لبدء الردود)"
                except Exception:
                    pass

                return {
                    "valid": True,
                    "has_quota": has_quota,
                    "message": f"تم التحقق من مفتاح ChatGPT بنجاح!{quota_warning}",
                    "detected_model": preferred,
                    "available_models_count": len(chat_models)
                }
            else:
                err_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                err_msg = err_json.get("error", {}).get("message", "المفتاح غير صالح أو ليس لديه رصيد كافٍ في OpenAI.")
                return {
                    "valid": False,
                    "message": f"فشل التحقق: {err_msg}"
                }
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="انتهت مهلة الاتصال بخوادم OpenAI")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"خطأ أثناء التحقق من OpenAI: {str(e)}")

# Multi-Account Endpoints
@app.get("/api/accounts")
async def list_accounts():
    accounts = get_persisted_accounts()
    active = next((a for a in accounts if a.get("is_active")), accounts[0] if accounts else None)
    return {"accounts": accounts, "active": active}

@app.post("/api/accounts/add")
async def add_account(payload: Dict[str, Any] = Body(...)):
    name = payload.get("name", "").strip() or "Google User"
    email = payload.get("email", "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="يرجى إدخال البريد الإلكتروني للحساب")

    api_key = payload.get("api_key", "").strip()
    picture = payload.get("picture") or f"https://api.dicebear.com/7.x/identicon/svg?seed={email}"

    accounts = get_persisted_accounts()
    existing = next((a for a in accounts if a.get("email", "").lower() == email.lower()), None)
    if existing:
        existing["name"] = name
        existing["picture"] = picture
        if api_key:
            existing["api_key"] = api_key
        for a in accounts:
            a["is_active"] = (a["id"] == existing["id"])
        target_account = existing
    else:
        new_id = f"acc-{uuid.uuid4().hex[:8]}"
        for a in accounts:
            a["is_active"] = False
        target_account = {
            "id": new_id,
            "name": name,
            "email": email,
            "picture": picture,
            "is_active": True,
            "api_key": api_key
        }
        accounts.append(target_account)

    save_persisted_accounts(accounts)
    if hasattr(drive_sync, "link_google_account"):
        drive_sync.link_google_account(email=email, name=name)

    if api_key:
        save_persisted_config({"api_key": api_key})
        os.environ["GEMINI_API_KEY"] = api_key

    return {"status": "success", "account": target_account, "accounts": accounts}

@app.post("/api/accounts/switch")
async def switch_account(payload: Dict[str, Any] = Body(...)):
    account_id = payload.get("id")
    accounts = get_persisted_accounts()
    target = next((a for a in accounts if a.get("id") == account_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="الحساب غير موجود")

    for a in accounts:
        a["is_active"] = (a["id"] == account_id)
    save_persisted_accounts(accounts)

    if hasattr(drive_sync, "link_google_account"):
        drive_sync.link_google_account(email=target.get("email", ""), name=target.get("name", ""))

    if target.get("api_key"):
        save_persisted_config({"api_key": target["api_key"]})
        os.environ["GEMINI_API_KEY"] = target["api_key"]

    return {"status": "success", "active": target, "accounts": accounts}

@app.delete("/api/accounts/{account_id}")
async def delete_account(account_id: str):
    accounts = get_persisted_accounts()
    filtered = [a for a in accounts if a.get("id") != account_id]
    if len(filtered) == len(accounts):
        raise HTTPException(status_code=404, detail="الحساب غير موجود")

    if not any(a.get("is_active") for a in filtered) and filtered:
        filtered[0]["is_active"] = True

    save_persisted_accounts(filtered)
    active = next((a for a in filtered if a.get("is_active")), None)
    return {"status": "success", "accounts": filtered, "active": active}

# System Status Telemetry (30s Disk I/O Cached)
_cached_disk_stats = {"time": 0.0, "free": 0.0, "total": 0.0}

@app.get("/api/system/status")
async def get_system_status():
    global _cached_disk_stats
    now = time.time()
    if now - _cached_disk_stats["time"] > 30.0 or _cached_disk_stats["total"] == 0.0:
        try:
            disk = shutil.disk_usage(Path.home())
            _cached_disk_stats = {
                "time": now,
                "free": round(disk.free / (1024 ** 3), 2),
                "total": round(disk.total / (1024 ** 3), 2),
            }
        except Exception:
            pass

    cpu = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    user_info = drive_sync.get_user_profile()

    return {
        "cpu_usage": cpu,
        "memory_used_mb": int(mem.used / (1024 * 1024)),
        "memory_total_mb": int(mem.total / (1024 * 1024)),
        "memory_percentage": mem.percent,
        "disk_free_gb": _cached_disk_stats.get("free", 0.0),
        "disk_total_gb": _cached_disk_stats.get("total", 0.0),
        "user": user_info
    }

# ==============================================================================
# Native High-Precision Vector PDF Generation Engine
# ==============================================================================
class PDFExportPayload(BaseModel):
    content: str
    title: Optional[str] = "NexusHub AI Report"
    model_name: Optional[str] = "NexusHub AI"
    filename: Optional[str] = "NexusHub_Report.pdf"
    save_to_downloads: Optional[bool] = False

def render_html_to_pdf_sync(html_content: str, title: str, model_name: str) -> str:
    is_arabic = any("\u0600" <= c <= "\u06ff" for c in html_content)
    direction = "rtl" if is_arabic else "ltr"
    lang = "ar" if is_arabic else "en"

    # Wrap in high-resolution printable stylesheet
    full_html = f"""<!DOCTYPE html>
<html lang="{lang}" dir="{direction}">
<head>
  <meta charset="UTF-8">
  <title>{title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    @page {{
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }}
    * {{
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }}
    body {{
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      color: #1e1f20;
      background: #ffffff;
      line-height: 1.7;
      font-size: 13px;
      margin: 0;
      padding: 0;
    }}
    .header-banner {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }}
    .brand-title {{
      font-size: 17px;
      font-weight: 700;
      color: #1d4ed8;
      display: flex;
      align-items: center;
      gap: 6px;
    }}
    .meta-box {{
      font-size: 11px;
      color: #64748b;
      text-align: {"left" if is_arabic else "right"};
      line-height: 1.4;
    }}
    h1, h2, h3, h4 {{
      color: #0f172a;
      margin-top: 18px;
      margin-bottom: 8px;
      font-weight: 700;
    }}
    h1 {{ font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }}
    h2 {{ font-size: 15px; }}
    h3 {{ font-size: 13px; }}
    p {{ margin: 6px 0 10px 0; text-align: justify; }}
    pre {{
      direction: ltr !important;
      text-align: left !important;
      background: #18191a !important;
      color: #f1f5f9 !important;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 11px;
      line-height: 1.5;
      overflow-x: auto;
      margin: 12px 0;
      border: 1px solid #334155;
      page-break-inside: avoid;
    }}
    code {{
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 11px;
    }}
    p code {{
      background: #f1f5f9;
      color: #2563eb;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }}
    blockquote {{
      border-{"right" if is_arabic else "left"}: 4px solid #3b82f6;
      background: #f8fafc;
      margin: 12px 0;
      padding: 8px 14px;
      color: #475569;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      page-break-inside: avoid;
    }}
    th, td {{
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: {"right" if is_arabic else "left"};
      font-size: 12px;
    }}
    th {{ background: #f1f5f9; font-weight: 700; }}
    .footer-bar {{
      margin-top: 32px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
    }}
  </style>
</head>
<body>
  <div class="header-banner">
    <div class="brand-title">✨ R3 AI &nbsp;|&nbsp; {title}</div>
    <div class="meta-box">
      <div><strong>Model / النموذج:</strong> {model_name}</div>
      <div><strong>Date / التاريخ:</strong> {time.strftime('%Y-%m-%d %H:%M')}</div>
    </div>
  </div>
  <div class="content-body">
    {html_content}
  </div>
  <div class="footer-bar">
    <span>Generated by R3 AI Workstation</span>
    <span>Certified Digital Document</span>
  </div>
</body>
</html>"""

    edge_candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    edge_exe = next((p for p in edge_candidates if os.path.exists(p)), None)
    if not edge_exe:
        raise RuntimeError("Microsoft Edge executable is not available on this system.")

    with tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w", encoding="utf-8") as f_html:
        f_html.write(full_html)
        html_path = f_html.name

    pdf_path = html_path.replace(".html", ".pdf")

    cmd = [
        edge_exe,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        html_path,
    ]
    res = subprocess.run(cmd, capture_output=True, timeout=20)
    try:
        os.remove(html_path)
    except Exception:
        pass

    if res.returncode != 0 or not os.path.exists(pdf_path):
        raise RuntimeError("Failed to generate PDF document via headless renderer.")

    return pdf_path

@app.post("/api/export/pdf")
async def export_pdf_endpoint(payload: PDFExportPayload):
    try:
        pdf_path = await asyncio.to_thread(
            render_html_to_pdf_sync,
            html_content=payload.content,
            title=payload.title or "R3 AI Report",
            model_name=payload.model_name or "R3 AI",
        )

        downloads_dest = ""
        if payload.save_to_downloads:
            try:
                dl_folder = Path.home() / "Downloads"
                if dl_folder.exists():
                    safe_name = payload.filename or f"R3_Report_{int(time.time())}.pdf"
                    dest_file = dl_folder / safe_name
                    shutil.copyfile(pdf_path, str(dest_file))
                    downloads_dest = str(dest_file)
            except Exception as ex:
                print(f"[PDF] Save to downloads note: {ex}")

        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=payload.filename or "R3_Report.pdf",
            headers={
                "X-Downloaded-Path": downloads_dest,
                "Access-Control-Expose-Headers": "Content-Disposition, X-Downloaded-Path"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# رع (Ra) Local Media Vault & High-Performance Streaming Media Engine
# ==============================================================================
def stream_media_file(file_path: Path, range_header: Optional[str] = None):
    file_size = file_path.stat().st_size
    mime_type, _ = mimetypes.guess_type(str(file_path))
    mime_type = mime_type or "application/octet-stream"

    start = 0
    end = file_size - 1

    if range_header:
        try:
            h = range_header.strip().lower()
            if h.startswith("bytes="):
                parts = h[6:].split("-")
                start = int(parts[0]) if parts[0] else 0
                if len(parts) > 1 and parts[1]:
                    end = int(parts[1])
        except Exception:
            start = 0
            end = file_size - 1

    start = max(0, start)
    end = min(file_size - 1, end)
    chunk_size = (end - start) + 1

    def iter_file():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = chunk_size
            buffer_size = 1024 * 1024  # 1MB chunks
            while remaining > 0:
                read_len = min(buffer_size, remaining)
                data = f.read(read_len)
                if not data:
                    break
                remaining -= len(data)
                yield data

    status_code = 206 if range_header else 200
    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_size),
        "Content-Type": mime_type,
    }
    return StreamingResponse(iter_file(), status_code=status_code, headers=headers)

@app.get("/api/media/items")
async def list_media_items():
    items = []
    video_exts = {".mp4", ".webm", ".mkv", ".mov", ".avi", ".m4v"}
    audio_exts = {".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"}
    image_exts = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"}

    total_bytes = 0
    if MEDIA_DIR.exists():
        for p in sorted(MEDIA_DIR.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
            if not p.is_file():
                continue
            ext = p.suffix.lower()
            cat = "other"
            if ext in video_exts:
                cat = "video"
            elif ext in audio_exts:
                cat = "audio"
            elif ext in image_exts:
                cat = "image"
            else:
                continue

            size = p.stat().st_size
            total_bytes += size
            if size > 1024 * 1024 * 1024:
                human_size = f"{size / (1024**3):.1f} GB"
            elif size > 1024 * 1024:
                human_size = f"{size / (1024**2):.1f} MB"
            else:
                human_size = f"{size / 1024:.0f} KB"

            mime, _ = mimetypes.guess_type(str(p))
            items.append({
                "id": p.name,
                "name": p.stem,
                "filename": p.name,
                "extension": ext.lstrip("."),
                "size_bytes": size,
                "size_human": human_size,
                "category": cat,
                "mime_type": mime or "application/octet-stream",
                "url": f"/api/media/stream/{p.name}",
                "modified_at": int(p.stat().st_mtime * 1000)
            })

    total_human = f"{total_bytes / (1024**2):.1f} MB" if total_bytes < 1024**3 else f"{total_bytes / (1024**3):.2f} GB"
    return {
        "status": "success",
        "items": items,
        "count": len(items),
        "total_bytes": total_bytes,
        "total_human": total_human,
        "vault_path": str(MEDIA_DIR)
    }

@app.api_route("/api/media/stream/{filename}", methods=["GET", "HEAD"])
async def stream_media(filename: str, request: Request):
    safe_name = Path(filename).name
    target = MEDIA_DIR / safe_name
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="الملف غير موجود في مخزن الوسائط")
    range_header = request.headers.get("range")
    return stream_media_file(target, range_header)

@app.post("/api/media/upload")
async def upload_media_files(files: List[UploadFile] = File(...)):
    saved = []
    for f in files:
        safe_name = Path(f.filename or f"media_{uuid.uuid4().hex[:6]}").name
        dest = MEDIA_DIR / safe_name
        if dest.exists():
            stem = dest.stem
            suffix = dest.suffix
            safe_name = f"{stem}_{int(time.time())}{suffix}"
            dest = MEDIA_DIR / safe_name

        async with aiofiles.open(dest, "wb") as out:
            while chunk := await f.read(1024 * 1024):
                await out.write(chunk)
        saved.append(safe_name)
    return {"status": "success", "saved": saved, "count": len(saved)}

@app.delete("/api/media/{filename}")
async def delete_media_file(filename: str):
    safe_name = Path(filename).name
    target = MEDIA_DIR / safe_name
    if target.exists() and target.is_file():
        target.unlink(missing_ok=True)
        return {"status": "success", "deleted": safe_name}
    raise HTTPException(status_code=404, detail="الملف غير موجود")

# ==============================================================================
# NotebookLM / R3 Research Notebook & Offline-First RAG Engine
# ==============================================================================
from notebook_engine import NotebookEngine, search_web_knowledge

notebook_engine = NotebookEngine(base_storage_dir=BASE_DIR / "notebooks")

def generate_gemini_fallback(prompt: str, client: genai.Client) -> Optional[str]:
    """Smart fallback across active Gemini models to bypass 429 quota or 503 load spikes."""
    models_to_try = [
        "gemini-2.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-3.1-pro-preview"
    ]
    for m in models_to_try:
        try:
            resp = client.models.generate_content(model=m, contents=prompt)
            if resp and resp.text:
                return resp.text
        except Exception:
            continue
    return None

@app.get("/api/notebooks")
async def list_notebooks_endpoint():
    return {"notebooks": notebook_engine.list_notebooks()}

@app.post("/api/notebooks")
async def create_notebook_endpoint(payload: Dict[str, Any] = Body(...)):
    title = payload.get("title", "")
    description = payload.get("description", "")
    created = notebook_engine.create_notebook(title, description)
    return created

@app.get("/api/notebooks/{notebook_id}")
async def get_notebook_endpoint(notebook_id: str):
    nb = notebook_engine.get_notebook(notebook_id)
    if not nb:
        raise HTTPException(status_code=404, detail="الدفتر غير موجود")
    return nb

@app.delete("/api/notebooks/{notebook_id}")
async def delete_notebook_endpoint(notebook_id: str):
    success = notebook_engine.delete_notebook(notebook_id)
    if not success:
        raise HTTPException(status_code=404, detail="الدفتر غير موجود")
    return {"status": "success", "deleted": notebook_id}

@app.post("/api/notebooks/{notebook_id}/upload")
async def upload_notebook_source(notebook_id: str, files: List[UploadFile] = File(...)):
    nb = notebook_engine.get_notebook(notebook_id)
    if not nb:
        raise HTTPException(status_code=404, detail="الدفتر غير موجود")
    
    results = []
    for f in files:
        content = await f.read()
        res = await asyncio.to_thread(notebook_engine.add_source_file, notebook_id, f.filename, content)
        results.append(res)
    
    return {"status": "success", "sources": results, "count": len(results)}

@app.delete("/api/notebooks/{notebook_id}/sources/{source_id}")
async def delete_notebook_source_endpoint(notebook_id: str, source_id: str):
    success = notebook_engine.delete_source(notebook_id, source_id)
    if not success:
        raise HTTPException(status_code=404, detail="المصدر غير موجود")
    return {"status": "success", "deleted": source_id}

@app.get("/api/notebooks/{notebook_id}/sources/{source_id}/content")
async def get_notebook_source_content_endpoint(notebook_id: str, source_id: str):
    try:
        data = await asyncio.to_thread(notebook_engine.get_source_content, notebook_id, source_id)
        return data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/notebooks/{notebook_id}/sources/{source_id}/content")
async def update_notebook_source_content_endpoint(notebook_id: str, source_id: str, payload: Dict[str, Any] = Body(...)):
    new_content = payload.get("content", "")
    try:
        res = await asyncio.to_thread(notebook_engine.update_source_content, notebook_id, source_id, new_content)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/media/save-from-url")
async def save_media_from_url_endpoint(payload: Dict[str, Any] = Body(...)):
    url = payload.get("url", "").strip()
    title = payload.get("title", "media").strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "R3-AI-Studio/1.0"})
        with urllib.request.urlopen(req, timeout=25) as resp:
            content = resp.read()
            content_type = resp.headers.get_content_type()
            
        ext = mimetypes.guess_extension(content_type) or ".png"
        clean_title = re.sub(r'[^a-zA-Z0-9_-]', '_', title)[:25]
        filename = f"{uuid.uuid4().hex[:8]}_{clean_title}{ext}"
        
        target = MEDIA_VAULT_DIR / filename
        target.write_bytes(content)
        
        chat_target = UPLOADS_DIR / filename
        chat_target.write_bytes(content)
        
        return {
            "status": "success",
            "filename": filename,
            "url": f"/api/media/stream/{filename}",
            "chat_url": f"/api/files/{filename}",
            "size": len(content),
            "type": content_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch media: {e}")

@app.post("/api/generate/image")
async def generate_image_endpoint(payload: Dict[str, Any] = Body(...)):
    prompt = payload.get("prompt", "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
        
    encoded_prompt = urllib.parse.quote(prompt)
    pollinations_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true"
    
    try:
        req = urllib.request.Request(pollinations_url, headers={"User-Agent": "R3-AI-Studio/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            img_bytes = resp.read()
            
        filename = f"gen_{uuid.uuid4().hex[:8]}.png"
        target = MEDIA_VAULT_DIR / filename
        target.write_bytes(img_bytes)
        
        chat_target = UPLOADS_DIR / filename
        chat_target.write_bytes(img_bytes)
        
        return {
            "status": "success",
            "filename": filename,
            "url": f"/api/media/stream/{filename}",
            "chat_url": f"/api/files/{filename}",
            "prompt": prompt
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {e}")


@app.post("/api/notebooks/{notebook_id}/query")
async def query_notebook_endpoint(notebook_id: str, payload: Dict[str, Any] = Body(...)):
    query_text = payload.get("query", "").strip()
    top_k = int(payload.get("top_k", 8))
    source_ids = payload.get("source_ids", None)
    if not query_text:
        return {"chunks": []}
    
    chunks = await asyncio.to_thread(notebook_engine.query_notebook, notebook_id, query_text, top_k, source_ids)
    return {"chunks": chunks}

@app.post("/api/notebooks/{notebook_id}/chat")
async def notebook_chat_endpoint(notebook_id: str, payload: Dict[str, Any] = Body(...)):
    query = payload.get("query", "").strip()
    source_ids = payload.get("source_ids", None)
    enable_web = payload.get("enable_web", False)
    mode = payload.get("mode", "qa")  # "qa" | "explain" | "solve"
    if not query:
        raise HTTPException(status_code=400, detail="الرجاء كتابة سؤال")
    
    # 1. Retrieve local relevant chunks
    chunks = await asyncio.to_thread(notebook_engine.query_notebook, notebook_id, query, top_k=8, source_ids=source_ids)
    
    # 2. Live Web Knowledge Search if enabled or requested
    web_results = []
    if enable_web:
        try:
            web_results = await asyncio.to_thread(search_web_knowledge, query, max_results=4)
        except Exception as ex:
            print(f"[Notebook Web Search Note] {ex}")

    citations = []
    for c in chunks:
        citations.append({
            "source_id": c.get("source_id", ""),
            "source_name": c.get("source_name", ""),
            "page": c.get("page", 1),
            "excerpt": c.get("text", "")[:300] + "..."
        })
    
    # Add web citations
    for w in web_results:
        citations.append({
            "source_id": "web",
            "source_name": f"🌐 {w.get('title', 'الويب')}",
            "page": 1,
            "excerpt": w.get("snippet", "")[:280] + "..."
        })
    
    # If both local chunks and web are empty
    if not chunks and not web_results:
        return {
            "answer": "لم أجد أي معلومات متعلقة بهذا السؤال في المستندات المرفوعة. يمكنك تفعيل خيار 'البحث في الويب' للبحث عن حلول إضافية على الإنترنت.",
            "citations": []
        }
    
    # 3. Build comprehensive prompt
    grounded_prompt = notebook_engine.build_grounded_context_prompt(query, chunks, web_results)
    if mode == "explain":
        grounded_prompt += "\nملاحظة: المطلوب شرح أكاديمي مفصل وتبسيط عميق للموضوع من الصفر مع أمثلة توضيحية وقوانين."
    elif mode == "solve":
        grounded_prompt += "\nملاحظة: المطلوب حل وتوضيح المسألة أو التمرين خطوة بخطوة مع توضيح القوانين والمعادلات."

    answer_text = ""
    gemini_key = get_gemini_api_key()
    
    # Call Gemini with multi-model fallback (gemini-3.5-flash-lite, gemini-3.1-flash-lite, etc.)
    if gemini_key:
        try:
            client = genai.Client(api_key=gemini_key)
            answer_text = await asyncio.to_thread(generate_gemini_fallback, grounded_prompt, client)
        except Exception as e:
            print(f"[Notebook Gemini Error] {e}")

    # Fallback to local synthesis if no key or offline
    if not answer_text:
        top_chunks_summary = []
        for i, c in enumerate(chunks[:4], 1):
            top_chunks_summary.append(
                f"**المقطع {i}** من [{c['source_name']} - ص {c['page']}]:\n"
                f"> \"{c['text'][:350]}...\"\n"
            )
        if web_results:
            for w in web_results[:2]:
                top_chunks_summary.append(
                    f"**معلومة من الويب** [{w['title']}]:\n"
                    f"> \"{w['snippet']}...\"\n"
                )
        answer_text = (
            f"### 📚 نتائج الاسترجاع والبحث (وضع Offline / Fallback):\n\n"
            + "\n".join(top_chunks_summary)
        )
    
    return {
        "answer": answer_text,
        "citations": citations,
        "web_results": web_results
    }

@app.post("/api/notebooks/{notebook_id}/study-tools")
async def notebook_study_tools_endpoint(notebook_id: str, payload: Dict[str, Any] = Body(...)):
    tool_type = payload.get("type", "all")
    force_refresh = payload.get("force_refresh", False)
    
    nb = notebook_engine.get_notebook(notebook_id)
    if not nb:
        raise HTTPException(status_code=404, detail="الدفتر غير موجود")
    
    # Generate base study data
    study_data = await asyncio.to_thread(notebook_engine.generate_offline_study_tools, notebook_id, tool_type)
    
    gemini_key = get_gemini_api_key()
    if gemini_key and (force_refresh or not study_data.get("ai_enhanced")):
        try:
            chunks = notebook_engine.query_notebook(notebook_id, "summary key concepts terms definitions formulas", top_k=15)
            if chunks:
                joined_text = "\n".join([f"[{c['source_name']} ص{c['page']}]: {c['text'][:350]}" for c in chunks[:8]])
                ai_prompt = (
                    f"أنت أستاذ ومصمم مناهج أكاديمي ذكي. بناءً على محتوى المستندات المرفقة أدناه، أنشئ دليلاً دراسياً فائق الذكاء بصيغة JSON حصراً.\n\n"
                    f"المستندات المرفقة:\n{joined_text}\n\n"
                    f"يجب أن تكون الإجابة عبارة عن كود JSON صالح فقط بدون أي علامات ماركداون إضافية بالهيكل التالي:\n"
                    f"{{\n"
                    f'  "summary": "ملخص تنفيذي وأكاديمي عميق يشرح موضوع المادة وقوانينها بالتفصيل مع الاستشهادات",\n'
                    f'  "key_points": ["نقطة رئيسية 1", "نقطة رئيسية 2", "نقطة رئيسية 3", "نقطة رئيسية 4", "نقطة رئيسية 5"],\n'
                    f'  "flashcards": [\n'
                    f'    {{"question": "سؤال استذكار عميق حول مفهوم أو قانون؟", "answer": "الإجابة العلمية الوافية", "source_name": "المصدر", "page": 1}}\n'
                    f'  ],\n'
                    f'  "quiz": [\n'
                    f'    {{"question": "سؤال امتحانات اختياري دقيق؟", "options": [{{"key": "A", "text": "خيار 1"}}, {{"key": "B", "text": "خيار 2"}}, {{"key": "C", "text": "خيار 3"}}, {{"key": "D", "text": "خيار 4"}}], "correct_option": "A", "explanation": "تفسير أكاديمي مع التعليل", "source_name": "المصدر", "page": 1}}\n'
                    f'  ],\n'
                    f'  "key_concepts": [\n'
                    f'    {{"term": "المصطلح أو المفهوم", "definition": "التعريف والصيغة الرياضية أو العلمية", "source_name": "المصدر", "page": 1}}\n'
                    f'  ]\n'
                    f"}}"
                )
                client = genai.Client(api_key=gemini_key)
                resp_text = await asyncio.to_thread(generate_gemini_fallback, ai_prompt, client)
                if resp_text:
                    # Clean json tags if present
                    clean_json = resp_text.strip()
                    if clean_json.startswith("```"):
                        clean_json = re.sub(r"^```(?:json)?\n?", "", clean_json)
                        clean_json = re.sub(r"\n?```$", "", clean_json)
                    parsed = json.loads(clean_json)
                    if "summary" in parsed:
                        study_data["summary"] = parsed["summary"]
                    if "key_points" in parsed and parsed["key_points"]:
                        study_data["key_points"] = parsed["key_points"]
                    if "flashcards" in parsed and parsed["flashcards"]:
                        study_data["flashcards"] = parsed["flashcards"]
                    if "quiz" in parsed and parsed["quiz"]:
                        study_data["quiz"] = parsed["quiz"]
                    if "key_concepts" in parsed and parsed["key_concepts"]:
                        study_data["key_concepts"] = parsed["key_concepts"]
                    study_data["ai_enhanced"] = True
                    notebook_engine._study_file(notebook_id).write_text(json.dumps(study_data, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as ex:
            print(f"[Study tools AI enhancement note] {ex}")

    return study_data

@app.get("/api/notebooks/{notebook_id}/files/{filename}")
async def serve_notebook_file(notebook_id: str, filename: str):
    safe_name = Path(filename).name
    files_dir = notebook_engine._notebook_dir(notebook_id) / "files"
    target = files_dir / safe_name
    if not target.exists() or not target.is_file():
        candidates = list(files_dir.glob(f"*_{safe_name}")) or list(files_dir.glob(f"*{safe_name}"))
        if candidates and candidates[0].is_file():
            target = candidates[0]
        else:
            raise HTTPException(status_code=404, detail="الملف غير موجود")
    mime_type, _ = mimetypes.guess_type(str(target))
    return FileResponse(
        str(target),
        media_type=mime_type or "application/octet-stream",
        content_disposition_type="inline",
        filename=safe_name
    )

@app.get("/api/notebooks/{notebook_id}/sources/{source_id}/file")
async def serve_notebook_source_file(notebook_id: str, source_id: str):
    nb = notebook_engine.get_notebook(notebook_id)
    if not nb:
        raise HTTPException(status_code=404, detail="الدفتر غير موجود")
    source = next((s for s in nb.get("sources", []) if s["id"] == source_id), None)
    if not source:
        raise HTTPException(status_code=404, detail="المصدر غير موجود")

    files_dir = notebook_engine._notebook_dir(notebook_id) / "files"
    filename = source["name"]
    target = files_dir / f"{source_id}_{filename}"
    if not target.exists():
        target = files_dir / filename
    if not target.exists() or not target.is_file():
        candidates = list(files_dir.glob(f"{source_id}_*")) or list(files_dir.glob(f"*{filename}*"))
        if candidates and candidates[0].is_file():
            target = candidates[0]
        else:
            raise HTTPException(status_code=404, detail="الملف غير موجود على القرص")

    mime_type, _ = mimetypes.guess_type(str(target))
    return FileResponse(
        str(target),
        media_type=mime_type or "application/octet-stream",
        content_disposition_type="inline",
        filename=filename
    )

# Serve Frontend Production Distribution (Single Process Desktop Mode)
DIST_DIR = Path(__file__).resolve().parent.parent / "dist"
if DIST_DIR.exists() and (DIST_DIR / "index.html").exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir), html=True), name="assets")

    MEDIA_MAP = {
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".ico": "image/x-icon",
        ".html": "text/html; charset=utf-8",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".ttf": "font/ttf",
    }

    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            raise HTTPException(status_code=404, detail="Not Found")

        # 1. Root or index requests
        if not full_path or full_path == "/":
            return FileResponse(
                str(DIST_DIR / "index.html"),
                media_type="text/html; charset=utf-8",
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            )

        # 2. Check if file exists directly under DIST_DIR
        target = DIST_DIR / full_path
        if target.exists() and target.is_file():
            media_type = MEDIA_MAP.get(target.suffix.lower(), "application/octet-stream")
            return FileResponse(str(target), media_type=media_type)

        # 3. Check inside DIST_DIR/assets
        asset_target = DIST_DIR / "assets" / full_path
        if asset_target.exists() and asset_target.is_file():
            media_type = MEDIA_MAP.get(asset_target.suffix.lower(), "application/octet-stream")
            return FileResponse(str(asset_target), media_type=media_type)

        # 4. If request has a file extension (e.g. .js, .css, .png), NEVER return index.html!
        # Returning HTML for a JS or CSS file crashes browser module loader!
        if "." in Path(full_path).name:
            raise HTTPException(status_code=404, detail=f"Asset not found: {full_path}")

        # 5. SPA Route Fallback (clean URLs like /chat, /tools) -> index.html
        return FileResponse(
            str(DIST_DIR / "index.html"),
            media_type="text/html; charset=utf-8",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )

if __name__ == "__main__":
    import argparse
    import uvicorn

    parser = argparse.ArgumentParser(description="R3 Core Orchestrator")
    parser.add_argument("--host", default="127.0.0.1", help="Host address to bind")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    args = parser.parse_args()

    uvicorn.run(app, host=args.host, port=args.port, reload=False, log_level="warning")
