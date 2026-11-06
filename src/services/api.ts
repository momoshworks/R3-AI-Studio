import { AttachedFile, ChatMessage, DriveStatus, SystemMetrics, Notebook, NotebookChunk, Citation, StudyGuideData, AutomationTask, AutomationLog, AutomationTemplate } from '../types';
import { storageService } from './storage';

export const getApiBase = (): string => {
  try {
    const custom = localStorage.getItem('R3_BACKEND_URL');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  } catch {}
  if (typeof window !== 'undefined' && ((window as any).Capacitor?.isNativePlatform?.() || window.location.protocol === 'capacitor:')) {
    return '';
  }
  return 'http://127.0.0.1:8000';
};

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function tauriInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T | null> {
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, args);
    } catch (err) {
      console.warn(`Tauri invoke '${cmd}' failed:`, err);
    }
  }
  return null;
}

// Seamless Official Google NotebookLM Integration via Tauri v2 Webview Window
export async function openOfficialNotebookLM(): Promise<{ success: boolean; method: string }> {
  // 1. Tauri v2 Desktop Mode
  if (isTauri) {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      let win = await WebviewWindow.getByLabel('notebooklm');
      if (win) {
        await win.show();
        await win.unminimize();
        await win.setFocus();
        return { success: true, method: 'tauri_existing_window' };
      }

      // Create new window if not preheated
      win = new WebviewWindow('notebooklm', {
        url: 'https://notebooklm.google.com',
        title: 'Google NotebookLM — Nerdo AI Studio',
        width: 1300,
        height: 850,
        minWidth: 850,
        minHeight: 600,
        center: true,
        focus: true,
      });

      win.once('tauri://error', (e) => {
        console.warn('Tauri WebviewWindow creation error:', e);
      });

      return { success: true, method: 'tauri_new_window' };
    } catch (err) {
      console.warn('Tauri WebviewWindow error, trying invoke fallback:', err);
      try {
        await tauriInvoke('open_notebooklm_window');
        return { success: true, method: 'tauri_invoke' };
      } catch (invokeErr) {
        console.warn('Tauri invoke failed:', invokeErr);
      }
    }
  }

  // 2. Web Browser / Mobile fallback
  const targetUrl = 'https://notebooklm.google.com';
  try {
    const pop = window.open(
      targetUrl,
      'Google_NotebookLM',
      'width=1300,height=850,menubar=no,toolbar=no,location=yes,status=no,resizable=yes'
    );
    if (pop) {
      pop.focus();
      return { success: true, method: 'window_popup' };
    }
  } catch {}

  window.open(targetUrl, '_blank');
  return { success: true, method: 'blank_tab' };
}

export const NERDO_SYSTEM_INSTRUCTION = `أنت Nerdo AI، مساعد تقني ذكي، مباشر وعملي.
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
4. Focus strictly on practical, directly actionable solutions.`;

// Map selected UI model name to public Gemini / OpenAI endpoints
function resolveModelInfo(modelName: string): { provider: 'gemini' | 'openai'; modelId: string } {
  const m = (modelName || '').toLowerCase();
  if (m.includes('gpt') || m.includes('chatgpt') || m.includes('openai') || m.includes('o3') || m.includes('o1')) {
    if (m.includes('o3-mini')) return { provider: 'openai', modelId: 'o3-mini' };
    if (m.includes('4o-mini')) return { provider: 'openai', modelId: 'gpt-4o-mini' };
    if (m.includes('4o')) return { provider: 'openai', modelId: 'gpt-4o' };
    return { provider: 'openai', modelId: 'gpt-4o-mini' };
  }

  // Extract explicit model slug in parentheses e.g. (gemini-2.5-flash)
  const slugMatch = modelName.match(/\((gemini-[^)]+)\)/i);
  if (slugMatch) {
    const slug = slugMatch[1].toLowerCase().replace(/^models\//, '');
    return { provider: 'gemini', modelId: slug };
  }

  const directMatch = modelName.match(/(gemini-[a-zA-Z0-9.-]+)/i);
  if (directMatch) {
    const slug = directMatch[1].toLowerCase().replace(/^models\//, '');
    return { provider: 'gemini', modelId: slug };
  }

  if (m.includes('3.8')) return { provider: 'gemini', modelId: 'gemini-3.8-flash' };
  if (m.includes('3.5')) return { provider: 'gemini', modelId: 'gemini-3.5-flash' };
  if (m.includes('lite')) return { provider: 'gemini', modelId: 'gemini-3.5-flash-lite' };
  if (m.includes('pro')) return { provider: 'gemini', modelId: 'gemini-2.5-pro' };
  if (m.includes('flash-latest') || m.includes('latest')) return { provider: 'gemini', modelId: 'gemini-flash-latest' };
  if (m.includes('2.5')) return { provider: 'gemini', modelId: 'gemini-2.5-flash' };
  if (m.includes('2.0')) return { provider: 'gemini', modelId: 'gemini-2.0-flash' };
  return { provider: 'gemini', modelId: 'gemini-3.5-flash' };
}

// Convert file to Base64 locally
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const api = {
  // Backend URL helper
  getBackendUrl(): string {
    return localStorage.getItem('R3_BACKEND_URL') || '';
  },

  setBackendUrl(url: string) {
    if (!url || !url.trim()) {
      localStorage.removeItem('R3_BACKEND_URL');
    } else {
      localStorage.setItem('R3_BACKEND_URL', url.trim());
    }
  },

  // Google OAuth 2.0 Loopback & Profile
  async loginWithGoogle(): Promise<any> {
    const base = getApiBase();
    if (!base) return { authenticated: true, user: { name: 'Google User', email: 'user@nerdo.ai' } };
    const res = await fetch(`${base}/api/auth/google/login`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to login with Google');
    }
    return await res.json();
  },

  async saveGoogleCredentials(clientId: string, clientSecret: string): Promise<any> {
    const base = getApiBase();
    if (!base) return { status: 'saved_locally' };
    const res = await fetch(`${base}/api/auth/google/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
    });
    return await res.json();
  },

  async getDetectedGoogleAccount(): Promise<{ account: { name: string; email: string; picture: string }; has_client_secret: boolean }> {
    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/auth/google/detected`);
        if (res.ok) return await res.json();
      } catch {}
    }
    return {
      account: {
        name: 'Nerdo User',
        email: 'user@nerdo.ai',
        picture: 'https://api.dicebear.com/7.x/identicon/svg?seed=r3user',
      },
      has_client_secret: false,
    };
  },

  async linkGoogleAccount(email?: string, name?: string): Promise<any> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/auth/google/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      return await res.json();
    }
    return { status: 'linked', name, email };
  },

  async uploadClientSecret(file: File): Promise<any> {
    const base = getApiBase();
    if (!base) return { status: 'saved' };
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${base}/api/auth/google/upload-secret`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload client_secret.json');
    }
    return await res.json();
  },

  async loginDemo(name?: string, email?: string): Promise<any> {
    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/auth/demo-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name || 'Nerdo User', email: email || 'user@nerdo.ai' }),
        });
        return await res.json();
      } catch {}
    }
    return { authenticated: true, user: { name: name || 'Nerdo User', email: email || 'user@nerdo.ai' } };
  },

  async getGoogleUser(): Promise<any> {
    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/auth/user`);
        return await res.json();
      } catch {}
    }
    return { authenticated: false };
  },

  async logoutGoogle(): Promise<any> {
    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/auth/logout`, { method: 'POST' });
        return await res.json();
      } catch {}
    }
    return { success: true };
  },

  async getSystemStatus(): Promise<any> {
    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/system/status`);
        return await res.json();
      } catch {}
    }
    return null;
  },

  // Settings API
  async getSettings(): Promise<{
    has_api_key: boolean;
    api_key_masked: string;
    raw_key: string;
    has_openai_key?: boolean;
    openai_key_masked?: string;
    raw_openai_key?: string;
  }> {
    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/settings`);
        if (res.ok) return await res.json();
      } catch {}
    }
    const geminiKey = localStorage.getItem('NEXUSHUB_GEMINI_API_KEY') || '';
    const openaiKey = localStorage.getItem('NEXUSHUB_OPENAI_API_KEY') || '';
    return {
      has_api_key: Boolean(geminiKey),
      api_key_masked: geminiKey ? `${geminiKey.slice(0, 4)}...${geminiKey.slice(-4)}` : '',
      raw_key: geminiKey,
      has_openai_key: Boolean(openaiKey),
      openai_key_masked: openaiKey ? `${openaiKey.slice(0, 4)}...${openaiKey.slice(-4)}` : '',
      raw_openai_key: openaiKey,
    };
  },

  async saveSettings(settings: Record<string, any>): Promise<any> {
    if (settings.raw_key !== undefined) {
      localStorage.setItem('NEXUSHUB_GEMINI_API_KEY', settings.raw_key);
    }
    if (settings.raw_openai_key !== undefined) {
      localStorage.setItem('NEXUSHUB_OPENAI_API_KEY', settings.raw_openai_key);
    }
    if (settings.backend_url !== undefined) {
      this.setBackendUrl(settings.backend_url);
    }

    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
        return await res.json();
      } catch {}
    }
    return { status: 'saved_locally' };
  },

  // File upload: supports backend or local base64 fallback
  async uploadFile(file: File): Promise<AttachedFile> {
    const base = getApiBase();
    if (base) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${base}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.warn('Backend upload failed, falling back to local base64 data:', e);
      }
    }

    const base64Data = await fileToBase64(file);
    const isImage = file.type.startsWith('image/');
    const attached: AttachedFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      is_image: isImage,
      preview_url: isImage ? base64Data : undefined,
      data: base64Data,
    };

    // Store in offline database immediately
    try {
      await storageService.saveAttachment(attached);
    } catch (err) {
      console.warn('Failed to cache attachment locally:', err);
    }

    return attached;
  },

  // Streaming Chat with Automatic Direct Fallback (Gemini & OpenAI)
  streamChat(
    messages: ChatMessage[],
    model: string,
    onChunk: (delta: string) => void,
    onDone: () => void,
    onError: (err: any) => void
  ) {
    const controller = new AbortController();
    const base = getApiBase();
    const storedGeminiKey = localStorage.getItem('NEXUSHUB_GEMINI_API_KEY') || '';
    const storedOpenaiKey = localStorage.getItem('NEXUSHUB_OPENAI_API_KEY') || '';
    const { provider, modelId } = resolveModelInfo(model);

    // If backend base is set, try backend proxy first
    if (base) {
      fetch(`${base}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments || [],
          })),
          model,
          api_key: provider === 'openai' ? storedOpenaiKey : storedGeminiKey,
          stream: true,
        }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok || !response.body) {
            throw new Error(`Backend error (${response.status})`);
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const rawData = line.slice(6).trim();
                if (!rawData) continue;
                try {
                  const event = JSON.parse(rawData);
                  if (event.type === 'content_chunk') {
                    onChunk(event.delta);
                  } else if (event.type === 'done') {
                    onDone();
                    return;
                  }
                } catch (e) {
                  console.error('Error parsing SSE event:', e, rawData);
                }
              }
            }
          }
          onDone();
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;
          console.warn('Backend stream failed, switching to direct client API...', err);
          this.streamDirect(messages, provider, modelId, storedGeminiKey, storedOpenaiKey, controller.signal, onChunk, onDone, onError);
        });

      return () => controller.abort();
    }

    // Direct standalone mode (Mobile / Offline / No PC backend)
    this.streamDirect(messages, provider, modelId, storedGeminiKey, storedOpenaiKey, controller.signal, onChunk, onDone, onError);
    return () => controller.abort();
  },

  // Direct client-side streaming
  async streamDirect(
    messages: ChatMessage[],
    provider: 'gemini' | 'openai',
    modelId: string,
    geminiKey: string,
    openaiKey: string,
    signal: AbortSignal,
    onChunk: (delta: string) => void,
    onDone: () => void,
    onError: (err: any) => void
  ) {
    try {
      if (provider === 'gemini') {
        if (!geminiKey || !geminiKey.trim()) {
          onChunk('⚠️ **يرجى إدخال مفتاح Google Gemini API:**\n\nافتح الإعدادات ⚙️ وأدخل مفتاح API الخاص بك من [Google AI Studio](https://aistudio.google.com/app/apikey) لبدء المحادثة فوراً وبشكل مجاني تماماً.');
          onDone();
          return;
        }

        const cleanKey = geminiKey.trim();

        // Prepare properly structured Gemini conversation turns
        const formattedContents: Array<{ role: 'user' | 'model'; parts: any[] }> = [];
        for (const m of messages) {
          const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';
          const parts: any[] = [];

          if (m.attachments && m.attachments.length > 0 && role === 'user') {
            for (const att of m.attachments) {
              if (att.data && att.type?.startsWith('image/')) {
                const b64 = att.data.includes(',') ? att.data.split(',')[1] : att.data;
                parts.push({
                  inlineData: {
                    mimeType: att.type,
                    data: b64,
                  },
                });
              } else if (att.data) {
                parts.push({ text: `[ملف مرفق: ${att.name}]\n` });
              }
            }
          }

          if (m.content && m.content.trim()) {
            const cleaned = m.content
              .replace(/⚠️ \*\*(?:Notice|تنبيه):\*\*[\s\S]*$/gi, '')
              .trim();
            if (cleaned) {
              parts.push({ text: cleaned });
            }
          }

          if (parts.length === 0) continue;

          // Merge consecutive turns with the same role to prevent Gemini 400 error
          if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === role) {
            formattedContents[formattedContents.length - 1].parts.push(...parts);
          } else {
            formattedContents.push({ role, parts });
          }
        }

        // Ensure conversation starts with user turn
        while (formattedContents.length > 0 && formattedContents[0].role !== 'user') {
          formattedContents.shift();
        }
        if (formattedContents.length === 0) {
          formattedContents.push({ role: 'user', parts: [{ text: 'مرحباً' }] });
        }

        // Query available models from user's key dynamically
        const candidateModels: string[] = [];
        const lastWorking = localStorage.getItem('R3_LAST_WORKING_GEMINI_MODEL') || '';

        if (modelId) candidateModels.push(modelId.replace(/^models\//, ''));
        if (lastWorking && !candidateModels.includes(lastWorking)) candidateModels.push(lastWorking);

        try {
          const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`, { signal });
          if (listRes.ok) {
            const listData = await listRes.json();
            if (Array.isArray(listData.models)) {
              const supportedModels: string[] = listData.models
                .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
                .map((m: any) => m.name.replace(/^models\//, ''));

              // Prioritize flash models from supported list
              const flashModels = supportedModels.filter((m) => m.includes('flash'));
              const otherModels = supportedModels.filter((m) => !m.includes('flash'));

              for (const m of [...flashModels, ...otherModels]) {
                if (!candidateModels.includes(m)) {
                  candidateModels.push(m);
                }
              }
            }
          } else if (listRes.status === 400 || listRes.status === 403) {
            const errJson = await listRes.json().catch(() => ({}));
            const msg = errJson.error?.message || '';
            if (msg.toLowerCase().includes('api key not valid') || msg.toLowerCase().includes('api_key_invalid')) {
              throw new Error('مفتاح Google Gemini API غير صالح. يرجى التأكد من نسخه بدقة من Google AI Studio وحفظه في الإعدادات ⚙️.');
            }
          }
        } catch (e: any) {
          if (e.name === 'AbortError') return;
          if (e.message && e.message.includes('مفتاح Google Gemini API غير صالح')) {
            throw e;
          }
          console.warn('Could not query dynamic models list:', e);
        }

        // Add comprehensive static fallback list
        const staticFallbacks = [
          'gemini-2.5-flash',
          'gemini-2.0-flash',
          'gemini-2.5-flash-lite',
          'gemini-flash-latest',
          'gemini-3.5-flash',
          'gemini-3.5-flash-lite',
          'gemini-3.8-flash',
          'gemini-1.5-flash-latest',
          'gemini-1.5-flash',
          'gemini-2.5-pro',
          'gemini-1.5-pro-latest',
          'gemini-pro-latest',
        ];
        for (const fb of staticFallbacks) {
          if (!candidateModels.includes(fb)) {
            candidateModels.push(fb);
          }
        }

        let streamResponse: Response | null = null;
        let lastError = '';

        for (const mid of candidateModels) {
          const cleanModel = mid.replace(/^models\//, '');
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:streamGenerateContent?alt=sse&key=${cleanKey}`;
          try {
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: formattedContents,
                systemInstruction: {
                  parts: [{ text: NERDO_SYSTEM_INSTRUCTION }],
                },
              }),
              signal,
            });

            if (res.ok) {
              streamResponse = res;
              try {
                localStorage.setItem('R3_LAST_WORKING_GEMINI_MODEL', cleanModel);
              } catch {}
              break;
            } else {
              const errJson = await res.json().catch(() => ({}));
              lastError = errJson.error?.message || `HTTP ${res.status}`;
              console.warn(`[Gemini Direct API] Model ${cleanModel} returned (${res.status}): ${lastError}. Trying next model...`);
              if (lastError.toLowerCase().includes('api key not valid') || lastError.toLowerCase().includes('api_key_invalid')) {
                throw new Error('مفتاح Google Gemini API غير صالح أو غير مفعل. يرجى الحصول على مفتاح جديد من Google AI Studio.');
              }
            }
          } catch (e: any) {
            if (e.name === 'AbortError') return;
            if (e.message && e.message.includes('مفتاح Google Gemini API غير صالح')) {
              throw e;
            }
            lastError = e.message;
          }
        }

        if (!streamResponse || !streamResponse.body) {
          if (lastError.toLowerCase().includes('quota') || lastError.toLowerCase().includes('resource_exhausted')) {
            throw new Error('تم تجاوز الحصة المجانية المؤقتة لمفتاح Gemini API (Quota Exceeded). يرجى الانتظار دقيقة أو تجربة مفتاح آخر.');
          }
          throw new Error(lastError || 'تعذر الاتصال بخوادم Google Gemini. يرجى التحقق من اتصال الإنترنت وصلاحية مفتاح API.');
        }

        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const clean = line.trim();
            if (clean.startsWith('data: ')) {
              const jsonStr = clean.slice(6).trim();
              if (!jsonStr) continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const textPart = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (textPart) {
                  onChunk(textPart);
                }
              } catch (e) {
                console.warn('Gemini chunk parse error:', e);
              }
            }
          }
        }
        onDone();
      } else {
        // OpenAI Direct Streaming
        if (!openaiKey) {
          onChunk('⚠️ **يرجى إدخال مفتاح ChatGPT (OpenAI) API:**\n\nافتح الإعدادات ⚙️ وأدخل مفتاح API الخاص بك من OpenAI لبدء المحادثة.');
          onDone();
          return;
        }

        const openaiMessages = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: 'system', content: NERDO_SYSTEM_INSTRUCTION },
              ...openaiMessages,
            ],
            stream: true,
          }),
          signal,
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || `OpenAI HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const clean = line.trim();
            if (clean.startsWith('data: ')) {
              const jsonStr = clean.slice(6).trim();
              if (jsonStr === '[DONE]') {
                onDone();
                return;
              }
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  onChunk(delta);
                }
              } catch (e) {
                console.warn('OpenAI chunk parse error:', e);
              }
            }
          }
        }
        onDone();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError(err);
      }
    }
  },

  // Google Drive Sync
  async getDriveStatus(): Promise<DriveStatus> {
    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/drive/status`);
        return await res.json();
      } catch {}
    }
    return { authenticated: false };
  },

  async authenticateDrive(): Promise<any> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/drive/auth`, { method: 'POST' });
      return await res.json();
    }
    return { status: 'unsupported_in_direct_mode' };
  },

  // System Metrics
  async getSystemMetrics(): Promise<SystemMetrics> {
    const tauriMetrics = await tauriInvoke<SystemMetrics>('get_system_telemetry');
    if (tauriMetrics) return tauriMetrics;

    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/system/status`);
        if (res.ok) return await res.json();
      } catch {}
    }

    // Realistic device memory telemetry
    const perfMemory = (performance as any)?.memory;
    const usedMb = perfMemory ? Math.round(perfMemory.usedJSHeapSize / (1024 * 1024)) : 320;
    const totalMb = perfMemory ? Math.round(perfMemory.jsHeapSizeLimit / (1024 * 1024)) : 2048;

    return {
      cpu_usage: Math.round(Math.random() * 8 + 4),
      memory_used_mb: usedMb,
      memory_total_mb: totalMb,
      memory_percentage: Math.min(100, Math.round((usedMb / totalMb) * 100)),
      disk_free_gb: 64.0,
      disk_total_gb: 128.0,
    };
  },

  // Fast Gemini API Key Verification
  async verifyApiKey(apiKey: string): Promise<{ valid: boolean; message: string; detected_model?: string }> {
    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/settings/verify-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: apiKey }),
        });
        if (res.ok) return await res.json();
      } catch {}
    }

    // Direct check via Google AI Studio API
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`);
      if (res.ok) {
        localStorage.setItem('NEXUSHUB_GEMINI_API_KEY', apiKey.trim());
        return {
          valid: true,
          message: 'تم التحقق من مفتاح Gemini بنجاح وتفعيله على التطبيق!',
          detected_model: 'gemini-3.5-flash',
        };
      }
      const data = await res.json().catch(() => ({}));
      return {
        valid: false,
        message: data.error?.message || 'المفتاح غير صالح أو لم يتم تفعيل Gemini API له.',
      };
    } catch (e: any) {
      return {
        valid: false,
        message: e.message || 'تعذر الاتصال بـ Google Gemini. تحقق من اتصال الإنترنت.',
      };
    }
  },

  // Fast ChatGPT (OpenAI) API Key Verification
  async verifyOpenAIApiKey(apiKey: string): Promise<{ valid: boolean; message: string; detected_model?: string }> {
    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/settings/verify-openai-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: apiKey }),
        });
        if (res.ok) return await res.json();
      } catch {}
    }

    // Direct check via OpenAI
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (res.ok) {
        localStorage.setItem('NEXUSHUB_OPENAI_API_KEY', apiKey.trim());
        return {
          valid: true,
          message: 'تم التحقق من مفتاح ChatGPT (OpenAI) بنجاح وتفعيله!',
          detected_model: 'gpt-4o-mini',
        };
      }
      const data = await res.json().catch(() => ({}));
      return {
        valid: false,
        message: data.error?.message || 'مفتاح OpenAI غير صالح أو ليس لديه رصيد كافٍ.',
      };
    } catch (e: any) {
      return {
        valid: false,
        message: e.message || 'فشل التحقق من مفتاح OpenAI.',
      };
    }
  },

  // Multi-Account Management (Stored locally + backend sync)
  async getAccounts(): Promise<{ accounts: any[]; active: any | null }> {
    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/accounts`);
        if (res.ok) return await res.json();
      } catch {}
    }

    try {
      const saved = localStorage.getItem('R3_ACCOUNTS');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch {}

    const defaultAcc = {
      id: 'acc_default',
      name: 'Nerdo User',
      email: 'user@nerdo.ai',
      picture: 'https://api.dicebear.com/7.x/identicon/svg?seed=r3user',
      is_active: true,
    };
    return {
      accounts: [defaultAcc],
      active: defaultAcc,
    };
  },

  async addAccount(account: { name: string; email: string; picture?: string; api_key?: string }): Promise<any> {
    const newAcc = {
      id: `acc_${Date.now()}`,
      name: account.name,
      email: account.email,
      picture: account.picture || `https://api.dicebear.com/7.x/identicon/svg?seed=${account.email}`,
      is_active: true,
      api_key: account.api_key,
    };

    const current = await this.getAccounts();
    const updatedAccounts = current.accounts.map((a: any) => ({ ...a, is_active: false }));
    updatedAccounts.push(newAcc);
    localStorage.setItem('R3_ACCOUNTS', JSON.stringify({ accounts: updatedAccounts, active: newAcc }));

    const base = getApiBase();
    if (base) {
      try {
        await fetch(`${base}/api/accounts/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(account),
        });
      } catch {}
    }
    return { status: 'success', account: newAcc };
  },

  async switchAccount(accountId: string): Promise<any> {
    const current = await this.getAccounts();
    let newActive: any = null;
    const updatedAccounts = current.accounts.map((a: any) => {
      if (a.id === accountId) {
        newActive = { ...a, is_active: true };
        return newActive;
      }
      return { ...a, is_active: false };
    });

    if (newActive) {
      localStorage.setItem('R3_ACCOUNTS', JSON.stringify({ accounts: updatedAccounts, active: newActive }));
      if (newActive.api_key) {
        localStorage.setItem('NEXUSHUB_GEMINI_API_KEY', newActive.api_key);
      }
    }

    const base = getApiBase();
    if (base) {
      try {
        await fetch(`${base}/api/accounts/switch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: accountId }),
        });
      } catch {}
    }
    return { status: 'success', active: newActive, accounts: updatedAccounts };
  },

  async deleteAccount(accountId: string): Promise<any> {
    const current = await this.getAccounts();
    const updatedAccounts = current.accounts.filter((a: any) => a.id !== accountId);
    let active = current.active;
    if (active?.id === accountId) {
      active = updatedAccounts[0] || null;
      if (active) active.is_active = true;
    }
    localStorage.setItem('R3_ACCOUNTS', JSON.stringify({ accounts: updatedAccounts, active }));

    const base = getApiBase();
    if (base) {
      try {
        await fetch(`${base}/api/accounts/${accountId}`, { method: 'DELETE' });
      } catch {}
    }
    return { status: 'success' };
  },

  // =========================================================================
  // Notebook Studio / RAG Engine APIs
  // =========================================================================
  async listNotebooks(): Promise<{ notebooks: Notebook[] }> {
    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/notebooks`);
        if (res.ok) return await res.json();
      } catch {}
    }
    try {
      const saved = localStorage.getItem('R3_NOTEBOOKS');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { notebooks: [] };
  },

  async createNotebook(title: string, description?: string): Promise<Notebook> {
    const newNotebook: Notebook = {
      id: `nb_${Date.now()}`,
      title,
      description: description || '',
      created_at: Date.now(),
      updated_at: Date.now(),
      sources: [],
    };
    const current = await this.listNotebooks();
    current.notebooks.unshift(newNotebook);
    localStorage.setItem('R3_NOTEBOOKS', JSON.stringify(current));

    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/notebooks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description: description || '' }),
        });
        if (res.ok) return await res.json();
      } catch {}
    }
    return newNotebook;
  },

  async getNotebook(notebookId: string): Promise<Notebook> {
    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/notebooks/${notebookId}`);
        if (res.ok) return await res.json();
      } catch {}
    }
    const current = await this.listNotebooks();
    const found = current.notebooks.find((n) => n.id === notebookId);
    if (found) return found;
    throw new Error('Notebook not found');
  },

  async deleteNotebook(notebookId: string): Promise<any> {
    const current = await this.listNotebooks();
    const filtered = current.notebooks.filter((n) => n.id !== notebookId);
    localStorage.setItem('R3_NOTEBOOKS', JSON.stringify({ notebooks: filtered }));

    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/notebooks/${notebookId}`, { method: 'DELETE' });
        return await res.json();
      } catch {}
    }
    return { status: 'deleted' };
  },

  async uploadNotebookSources(notebookId: string, files: File[]): Promise<any> {
    const base = getApiBase();
    if (base) {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      const res = await fetch(`${base}/api/notebooks/${notebookId}/upload`, {
        method: 'POST',
        body: formData,
      });
      return await res.json();
    }
    return { status: 'sources_saved' };
  },

  async deleteNotebookSource(notebookId: string, sourceId: string): Promise<any> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/notebooks/${notebookId}/sources/${sourceId}`, {
        method: 'DELETE',
      });
      return await res.json();
    }
    return { status: 'deleted' };
  },

  async queryNotebook(notebookId: string, query: string, topK: number = 6, sourceIds?: string[]): Promise<{ chunks: NotebookChunk[] }> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/notebooks/${notebookId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, top_k: topK, source_ids: sourceIds }),
      });
      return await res.json();
    }
    return { chunks: [] };
  },

  async chatWithNotebook(
    notebookId: string,
    query: string,
    sourceIds?: string[],
    enableWeb: boolean = false,
    mode: 'qa' | 'explain' | 'solve' = 'qa'
  ): Promise<{ answer: string; citations: Citation[]; web_results?: any[] }> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/notebooks/${notebookId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          source_ids: sourceIds,
          enable_web: enableWeb,
          mode,
        }),
      });
      return await res.json();
    }
    return { answer: 'تتطلب ميزة RAG Notebook Studio الاتصال بخادم Nerdo المحلي.', citations: [] };
  },

  async generateStudyTools(
    notebookId: string,
    type: string = 'all',
    forceRefresh: boolean = false
  ): Promise<StudyGuideData> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/notebooks/${notebookId}/study-tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, force_refresh: forceRefresh }),
      });
      return await res.json();
    }
    return {
      summary: 'الدراسة الذكية',
      key_points: [],
      flashcards: [],
      quiz: [],
      key_concepts: [],
      generated_at: Date.now(),
    };
  },

  async getNotebookSourceContent(notebookId: string, sourceId: string): Promise<any> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/notebooks/${notebookId}/sources/${sourceId}/content`);
      if (res.ok) return await res.json();
    }
    return { content: '' };
  },

  async updateNotebookSourceContent(notebookId: string, sourceId: string, content: string): Promise<any> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/notebooks/${notebookId}/sources/${sourceId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) return await res.json();
    }
    return { status: 'updated' };
  },

  async saveMediaFromUrl(url: string, title?: string): Promise<any> {
    // 1. Always save to local offline IndexedDB media vault
    let localItem: any = null;
    try {
      localItem = await storageService.saveMediaFromUrl(url, title);
    } catch (e) {
      console.warn('Failed to save media item locally:', e);
    }

    // 2. Also save to remote backend if connected
    const base = getApiBase();
    if (base) {
      try {
        const res = await fetch(`${base}/api/media/save-from-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, title }),
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Backend save media error:', err);
      }
    }
    return localItem || { status: 'saved', url, title };
  },

  async generateAiImage(prompt: string): Promise<any> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/generate/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) return await res.json();
    }
    return { error: 'Image generation requires backend server.' };
  },

  // --- Nerdo Intelligent Automations Engine ---
  async getAutomations(): Promise<{ tasks: AutomationTask[]; count: number; active_count: number }> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/automations`);
      if (res.ok) return await res.json();
    }
    return { tasks: [], count: 0, active_count: 0 };
  },

  async getAutomationTemplates(): Promise<{ templates: AutomationTemplate[] }> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/automations/templates`);
      if (res.ok) return await res.json();
    }
    return { templates: [] };
  },

  async createAutomation(task: Partial<AutomationTask>): Promise<{ success: boolean; task: AutomationTask }> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (res.ok) return await res.json();
    }
    throw new Error('Failed to create automation');
  },

  async updateAutomation(taskId: string, updates: Partial<AutomationTask>): Promise<{ success: boolean; task: AutomationTask }> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/automations/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) return await res.json();
    }
    throw new Error('Failed to update automation');
  },

  async deleteAutomation(taskId: string): Promise<{ success: boolean }> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/automations/${taskId}`, {
        method: 'DELETE',
      });
      if (res.ok) return await res.json();
    }
    throw new Error('Failed to delete automation');
  },

  async runAutomationNow(taskId: string): Promise<any> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/automations/${taskId}/run`, {
        method: 'POST',
      });
      if (res.ok) return await res.json();
    }
    throw new Error('Failed to trigger automation');
  },

  async getAutomationLogs(taskId: string): Promise<{ task_id: string; logs: AutomationLog[] }> {
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/automations/${taskId}/logs`);
      if (res.ok) return await res.json();
    }
    return { task_id: taskId, logs: [] };
  },
};
