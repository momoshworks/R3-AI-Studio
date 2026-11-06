import { Session, AttachedFile, MediaItem } from '../types';

const DB_NAME = 'Nerdo_Offline_Database';
const DB_VERSION = 2;
const SESSIONS_STORE = 'sessions';
const ATTACHMENTS_STORE = 'attachments';
const MEDIA_STORE = 'media_vault';
const METADATA_STORE = 'metadata';

const CACHE_KEY_SESSIONS = 'NERDO_SESSIONS_CACHE';
const CACHE_KEY_ACTIVE = 'NERDO_ACTIVE_SESSION_ID';

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(ATTACHMENTS_STORE)) {
          db.createObjectStore(ATTACHMENTS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(MEDIA_STORE)) {
          db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to open Nerdo Offline IndexedDB:', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Synchronous cache for instantaneous 0ms bootstrap on app launch
   */
  getInitialSessions(): Session[] {
    try {
      const cached = localStorage.getItem(CACHE_KEY_SESSIONS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached sessions:', e);
    }
    return [
      {
        id: 'session-1',
        title: 'محادثة ذكية جديدة',
        timestamp: Date.now(),
        messages: [],
      },
    ];
  }

  getInitialActiveSessionId(): string {
    try {
      const saved = localStorage.getItem(CACHE_KEY_ACTIVE);
      if (saved) return saved;
    } catch {}
    return 'session-1';
  }

  /**
   * Loads full sessions with complete message history from local database
   * and automatically rehydrates any missing attachment binary data.
   */
  async loadSessions(): Promise<Session[]> {
    try {
      const db = await this.getDB();
      const sessions = await new Promise<Session[]>((resolve) => {
        const tx = db.transaction(SESSIONS_STORE, 'readonly');
        const store = tx.objectStore(SESSIONS_STORE);
        const req = store.getAll();

        req.onsuccess = () => {
          const list = req.result as Session[];
          if (list && list.length > 0) {
            list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            resolve(list);
          } else {
            resolve(this.getInitialSessions());
          }
        };

        req.onerror = () => {
          resolve(this.getInitialSessions());
        };
      });

      // Hydrate attachments from ATTACHMENTS_STORE if binary was stripped for cache
      for (const s of sessions) {
        for (const m of s.messages) {
          if (m.attachments && m.attachments.length > 0) {
            for (let i = 0; i < m.attachments.length; i++) {
              const att = m.attachments[i];
              if (!att.data && !att.preview_url) {
                const fullAtt = await this.getAttachment(att.id);
                if (fullAtt) {
                  m.attachments[i] = fullAtt;
                }
              }
            }
          }
        }
      }

      this.updateFastCache(sessions);
      return sessions;
    } catch (e) {
      console.warn('Error loading sessions from IndexedDB, falling back to cache:', e);
      return this.getInitialSessions();
    }
  }

  /**
   * Save a single session immediately
   */
  async saveSession(session: Session): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(SESSIONS_STORE, 'readwrite');
      const store = tx.objectStore(SESSIONS_STORE);
      store.put(session);
    } catch (e) {
      console.warn('Error saving session to IndexedDB:', e);
    }
  }

  /**
   * Save all sessions and update fast cache
   */
  async saveAllSessions(sessions: Session[]): Promise<void> {
    this.updateFastCache(sessions);

    try {
      const db = await this.getDB();
      const tx = db.transaction(SESSIONS_STORE, 'readwrite');
      const store = tx.objectStore(SESSIONS_STORE);
      for (const session of sessions) {
        store.put(session);
      }
    } catch (e) {
      console.warn('Error bulk-saving sessions to IndexedDB:', e);
    }
  }

  /**
   * Delete session permanently
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(SESSIONS_STORE, 'readwrite');
      const store = tx.objectStore(SESSIONS_STORE);
      store.delete(sessionId);
    } catch (e) {
      console.warn('Error deleting session from IndexedDB:', e);
    }
  }

  /**
   * Save active session ID
   */
  async saveActiveSessionId(id: string): Promise<void> {
    try {
      localStorage.setItem(CACHE_KEY_ACTIVE, id);
      const db = await this.getDB();
      const tx = db.transaction(METADATA_STORE, 'readwrite');
      const store = tx.objectStore(METADATA_STORE);
      store.put({ key: 'activeSessionId', value: id });
    } catch (e) {
      // ignore
    }
  }

  async loadActiveSessionId(): Promise<string | null> {
    try {
      const saved = localStorage.getItem(CACHE_KEY_ACTIVE);
      if (saved) return saved;
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(METADATA_STORE, 'readonly');
        const store = tx.objectStore(METADATA_STORE);
        const req = store.get('activeSessionId');
        req.onsuccess = () => {
          resolve(req.result ? req.result.value : null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Save attached file binary data permanently in offline database
   */
  async saveAttachment(file: AttachedFile): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(ATTACHMENTS_STORE, 'readwrite');
      const store = tx.objectStore(ATTACHMENTS_STORE);
      store.put({
        ...file,
        storedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Error storing attachment in IndexedDB:', e);
    }

    if (file.data && typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      try {
        await this.saveToTauriDisk(file.name, file.data);
      } catch (err) {
        console.warn('Tauri disk backup skipped:', err);
      }
    }
  }

  async getAttachment(id: string): Promise<AttachedFile | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(ATTACHMENTS_STORE, 'readonly');
        const store = tx.objectStore(ATTACHMENTS_STORE);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  // =========================================================================
  // OFFLINE MEDIA VAULT REPOSITORY (Persistent Photos, Videos & Audios)
  // =========================================================================

  /**
   * Retrieve all saved media items from local offline database
   */
  async getMediaItems(): Promise<MediaItem[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(MEDIA_STORE, 'readonly');
        const store = tx.objectStore(MEDIA_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = (req.result || []) as MediaItem[];
          items.sort((a, b) => (b.modified_at || 0) - (a.modified_at || 0));
          resolve(items);
        };
        req.onerror = () => resolve([]);
      });
    } catch (e) {
      console.warn('Failed to load media items from IndexedDB:', e);
      return [];
    }
  }

  /**
   * Save a media item permanently in offline database
   */
  async saveMediaItem(item: MediaItem): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(MEDIA_STORE, 'readwrite');
      const store = tx.objectStore(MEDIA_STORE);
      store.put(item);
    } catch (e) {
      console.warn('Failed to save media item in IndexedDB:', e);
    }
  }

  /**
   * Delete a media item from offline database
   */
  async deleteMediaItem(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(MEDIA_STORE, 'readwrite');
      const store = tx.objectStore(MEDIA_STORE);
      store.delete(id);
    } catch (e) {
      console.warn('Failed to delete media item from IndexedDB:', e);
    }
  }

  /**
   * Convert any media URL (data URL or external URL) and store it permanently
   */
  async saveMediaFromUrl(url: string, title?: string): Promise<MediaItem> {
    const filename = `${title || 'Media'}_${Date.now()}`;
    const extMatch = url.match(/\.(png|jpg|jpeg|gif|webp|mp4|webm|mp3|wav)($|\?)/i);
    const extension = extMatch ? extMatch[1].toLowerCase() : 'png';
    const isVideo = ['mp4', 'webm', 'mov', 'mkv'].includes(extension);
    const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension);
    const category = isVideo ? 'video' : isAudio ? 'audio' : 'image';

    const item: MediaItem = {
      id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: `${filename}.${extension}`,
      filename: `${filename}.${extension}`,
      extension,
      size_bytes: 250000,
      size_human: '250 KB',
      category,
      mime_type: isVideo ? `video/${extension}` : isAudio ? `audio/${extension}` : `image/${extension}`,
      url,
      modified_at: Date.now(),
    };

    await this.saveMediaItem(item);
    return item;
  }

  private async saveToTauriDisk(fileName: string, base64Data: string): Promise<string | null> {
    try {
      const { appDataDir, join } = await import('@tauri-apps/api/path');
      const { writeFile, mkdir, exists } = await import('@tauri-apps/plugin-fs');
      const base = await appDataDir();
      const attachmentsDir = await join(base, 'chat_attachments');
      if (!(await exists(attachmentsDir))) {
        await mkdir(attachmentsDir, { recursive: true });
      }
      const targetFile = await join(attachmentsDir, `${Date.now()}_${fileName}`);
      const pureBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const binary = atob(pureBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      await writeFile(targetFile, bytes);
      return targetFile;
    } catch (e) {
      return null;
    }
  }

  private updateFastCache(sessions: Session[]) {
    try {
      const lightweight = sessions.map((s) => ({
        ...s,
        messages: s.messages.slice(-80).map((m) => ({
          ...m,
          attachments: m.attachments?.map((a) => ({
            id: a.id,
            name: a.name,
            size: a.size,
            type: a.type,
            is_image: a.is_image,
            saved_path: a.saved_path,
            preview_url: a.is_image ? (a.preview_url && a.preview_url.length < 50000 ? a.preview_url : undefined) : undefined,
          })),
        })),
      }));
      localStorage.setItem(CACHE_KEY_SESSIONS, JSON.stringify(lightweight));
    } catch (e) {
      console.warn('LocalStorage quota limit reached, relying on IndexedDB:', e);
    }
  }
}

export const storageService = new StorageService();
