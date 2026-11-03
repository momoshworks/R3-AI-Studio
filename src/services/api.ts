import { AttachedFile, ChatMessage, DriveStatus, SystemMetrics, Notebook, NotebookChunk, Citation, StudyGuideData } from '../types';

const API_BASE = 'http://127.0.0.1:8000';

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

export const api = {
  // Google OAuth 2.0 Loopback & Profile
  async loginWithGoogle(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/auth/google/login`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to login with Google');
    }
    return await res.json();
  },

  async saveGoogleCredentials(clientId: string, clientSecret: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/auth/google/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
    });
    return await res.json();
  },

  async getDetectedGoogleAccount(): Promise<{ account: { name: string; email: string; picture: string }; has_client_secret: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/google/detected`);
      return await res.json();
    } catch {
      return {
        account: { name: 'Mohamed Shabaan', email: 'momosh991@gmail.com', picture: 'https://api.dicebear.com/7.x/identicon/svg?seed=momosh991@gmail.com' },
        has_client_secret: false,
      };
    }
  },

  async linkGoogleAccount(email?: string, name?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/auth/google/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    return await res.json();
  },

  async uploadClientSecret(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/auth/google/upload-secret`, {
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
    const res = await fetch(`${API_BASE}/api/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || 'NexusHub User', email: email || 'user@nexushub.local' }),
    });
    return await res.json();
  },

  async getGoogleUser(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/user`);
      return await res.json();
    } catch {
      return { authenticated: false };
    }
  },

  async logoutGoogle(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
    return await res.json();
  },

  async getSystemStatus(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/api/system/status`);
      return await res.json();
    } catch {
      return null;
    }
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
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      return await res.json();
    } catch {
      return { has_api_key: false, api_key_masked: '', raw_key: '' };
    }
  },

  async saveSettings(settings: Record<string, any>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      return await res.json();
    } catch {
      return { status: 'saved_locally' };
    }
  },

  // File upload to backend for multimodal processing
  async uploadFile(file: File): Promise<AttachedFile> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Upload failed with status: ${res.statusText}`);
    }
    return await res.json();
  },

  // SSE Chat stream directly with Google Gemini
  streamChat(
    messages: ChatMessage[],
    model: string,
    onChunk: (delta: string) => void,
    onDone: () => void,
    onError: (err: any) => void
  ) {
    const controller = new AbortController();
    const storedApiKey = localStorage.getItem('NEXUSHUB_GEMINI_API_KEY') || '';

    fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments || [],
        })),
        model,
        api_key: storedApiKey,
        stream: true,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.body) {
          throw new Error('ReadableStream not supported by browser/backend.');
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
        if (err.name !== 'AbortError') {
          onError(err);
        }
      });

    return () => controller.abort();
  },

  // Google Drive Sync
  async getDriveStatus(): Promise<DriveStatus> {
    try {
      const res = await fetch(`${API_BASE}/api/drive/status`);
      return await res.json();
    } catch {
      return { authenticated: false };
    }
  },

  async authenticateDrive(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/drive/auth`, { method: 'POST' });
    return await res.json();
  },

  // System Metrics
  async getSystemMetrics(): Promise<SystemMetrics> {
    const tauriMetrics = await tauriInvoke<SystemMetrics>('get_system_telemetry');
    if (tauriMetrics) return tauriMetrics;

    try {
      const res = await fetch(`${API_BASE}/api/system/status`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    return {
      cpu_usage: 0.0,
      memory_used_mb: 8192,
      memory_total_mb: 16384,
      memory_percentage: 45.0,
      disk_free_gb: 245.8,
      disk_total_gb: 512.0,
    };
  },

  // Fast Gemini API Key Verification
  async verifyApiKey(apiKey: string): Promise<{ valid: boolean; message: string; detected_model?: string }> {
    const res = await fetch(`${API_BASE}/api/settings/verify-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    });
    return await res.json();
  },

  // Fast ChatGPT (OpenAI) API Key Verification
  async verifyOpenAIApiKey(apiKey: string): Promise<{ valid: boolean; message: string; detected_model?: string }> {
    const res = await fetch(`${API_BASE}/api/settings/verify-openai-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    });
    return await res.json();
  },

  // Multi-Account Management
  async getAccounts(): Promise<{ accounts: any[]; active: any | null }> {
    try {
      const res = await fetch(`${API_BASE}/api/accounts`);
      return await res.json();
    } catch {
      return { accounts: [], active: null };
    }
  },

  async addAccount(account: { name: string; email: string; picture?: string; api_key?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/api/accounts/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });
    return await res.json();
  },

  async switchAccount(accountId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/accounts/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: accountId }),
    });
    return await res.json();
  },

  async deleteAccount(accountId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/accounts/${accountId}`, {
      method: 'DELETE',
    });
    return await res.json();
  },

  // =========================================================================
  // Notebook Studio / RAG Engine APIs
  // =========================================================================
  async listNotebooks(): Promise<{ notebooks: Notebook[] }> {
    try {
      const res = await fetch(`${API_BASE}/api/notebooks`);
      return await res.json();
    } catch {
      return { notebooks: [] };
    }
  },

  async createNotebook(title: string, description?: string): Promise<Notebook> {
    const res = await fetch(`${API_BASE}/api/notebooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: description || '' }),
    });
    return await res.json();
  },

  async getNotebook(notebookId: string): Promise<Notebook> {
    const res = await fetch(`${API_BASE}/api/notebooks/${notebookId}`);
    return await res.json();
  },

  async deleteNotebook(notebookId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/notebooks/${notebookId}`, { method: 'DELETE' });
    return await res.json();
  },

  async uploadNotebookSources(notebookId: string, files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const res = await fetch(`${API_BASE}/api/notebooks/${notebookId}/upload`, {
      method: 'POST',
      body: formData,
    });
    return await res.json();
  },

  async deleteNotebookSource(notebookId: string, sourceId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/notebooks/${notebookId}/sources/${sourceId}`, {
      method: 'DELETE',
    });
    return await res.json();
  },

  async queryNotebook(notebookId: string, query: string, topK: number = 6, sourceIds?: string[]): Promise<{ chunks: NotebookChunk[] }> {
    const res = await fetch(`${API_BASE}/api/notebooks/${notebookId}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: topK, source_ids: sourceIds }),
    });
    return await res.json();
  },

  async chatWithNotebook(
    notebookId: string,
    query: string,
    sourceIds?: string[],
    enableWeb: boolean = false,
    mode: 'qa' | 'explain' | 'solve' = 'qa'
  ): Promise<{ answer: string; citations: Citation[]; web_results?: any[] }> {
    const res = await fetch(`${API_BASE}/api/notebooks/${notebookId}/chat`, {
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
  },

  async generateStudyTools(
    notebookId: string,
    type: string = 'all',
    forceRefresh: boolean = false
  ): Promise<StudyGuideData> {
    const res = await fetch(`${API_BASE}/api/notebooks/${notebookId}/study-tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, force_refresh: forceRefresh }),
    });
    return await res.json();
  },
};
