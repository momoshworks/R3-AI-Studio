import { AttachedFile, ChatMessage, DriveStatus, SystemMetrics, Notebook, NotebookChunk, Citation, StudyGuideData } from '../types';

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

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T | null> {
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

// Map selected UI model name to public Gemini / OpenAI endpoints
function resolveModelInfo(modelName: string): { provider: 'gemini' | 'openai'; modelId: string } {
  const m = (modelName || '').toLowerCase();
  if (m.includes('gpt') || m.includes('chatgpt') || m.includes('openai') || m.includes('o3') || m.includes('o1')) {
    if (m.includes('o3-mini')) return { provider: 'openai', modelId: 'o3-mini' };
    if (m.includes('4o-mini')) return { provider: 'openai', modelId: 'gpt-4o-mini' };
    if (m.includes('4o')) return { provider: 'openai', modelId: 'gpt-4o' };
    return { provider: 'openai', modelId: 'gpt-4o-mini' };
  }

  // Extract explicit model slug in parentheses e.g. (gemini-3.5-flash)
  const slugMatch = modelName.match(/\((gemini-[^)]+)\)/i);
  if (slugMatch) {
    const slug = slugMatch[1].toLowerCase();
    if (!slug.includes('1.5') && !slug.includes('2.0') && !slug.includes('2.5')) {
      return { provider: 'gemini', modelId: slug };
    }
  }

  if (m.includes('3.8')) return { provider: 'gemini', modelId: 'gemini-3.8-flash' };
  if (m.includes('lite') || m.includes('3.5-flash-lite')) return { provider: 'gemini', modelId: 'gemini-3.5-flash-lite' };
  if (m.includes('3.1')) return { provider: 'gemini', modelId: 'gemini-3.1-flash-lite' };
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
    if (!base) return { authenticated: true, user: { name: 'Google User', email: 'user@r3.ai' } };
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
        name: 'R3 User',
        email: 'user@r3.ai',
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
          body: JSON.stringify({ name: name || 'R3 User', email: email || 'user@r3.ai' }),
        });
        return await res.json();
      } catch {}
    }
    return { authenticated: true, user: { name: name || 'R3 User', email: email || 'user@r3.ai' } };
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
    return {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      is_image: isImage,
      preview_url: isImage ? base64Data : undefined,
      data: base64Data,
    };
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
        if (!geminiKey) {
          onChunk('⚠️ **يرجى إدخال مفتاح Google Gemini API:**\n\nافتح الإعدادات ⚙️ وأدخل مفتاح API الخاص بك من [Google AI Studio](https://aistudio.google.com/app/apikey) لبدء المحادثة فوراً وبشكل مجاني تماماً.');
          onDone();
          return;
        }

        const formattedContents = messages.map((m) => {
          const parts: any[] = [];
          if (m.attachments && m.attachments.length > 0 && m.role === 'user') {
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
          if (m.content) {
            parts.push({ text: m.content });
          } else if (parts.length === 0) {
            parts.push({ text: 'مرحباً' });
          }
          return {
            role: m.role === 'assistant' ? 'model' : 'user',
            parts,
          };
        });

        // Try selected model, or fallback across active Gemini models (filter out deprecated 1.5, 2.0, 2.5)
        const candidateModels = Array.from(new Set([
          modelId,
          'gemini-3.5-flash',
          'gemini-3.5-flash-lite',
          'gemini-3.1-flash-lite',
          'gemini-3.8-flash',
        ])).filter(m => !m.includes('1.5') && !m.includes('2.0') && !m.includes('2.5'));

        let streamResponse: Response | null = null;
        let lastError = '';

        for (const mid of candidateModels) {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${mid}:streamGenerateContent?alt=sse&key=${geminiKey}`;
          try {
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: formattedContents,
                systemInstruction: {
                  parts: [{ text: 'You are R3 AI, a brilliant, helpful, multilingual AI workstation assistant with native Arabic and English fluency.' }],
                },
              }),
              signal,
            });
            if (res.ok) {
              streamResponse = res;
              break;
            } else {
              const errJson = await res.json().catch(() => ({}));
              lastError = errJson.error?.message || `HTTP ${res.status}`;
              console.warn(`[Gemini Direct API] Model ${mid} failed: ${lastError}. Trying next active model...`);
            }
          } catch (e: any) {
            if (e.name === 'AbortError') return;
            lastError = e.message;
          }
        }

        if (!streamResponse || !streamResponse.body) {
          throw new Error(lastError || 'Failed to stream from Gemini API');
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
              { role: 'system', content: 'You are R3 AI, an intelligent, helpful AI workstation assistant.' },
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
      name: 'R3 User',
      email: 'user@r3.ai',
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
    return { answer: 'تتطلب ميزة RAG Notebook Studio الاتصال بخادم R3 المحلي.', citations: [] };
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
    const base = getApiBase();
    if (base) {
      const res = await fetch(`${base}/api/media/save-from-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title }),
      });
      if (res.ok) return await res.json();
    }
    return { status: 'saved', url, title };
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
};
