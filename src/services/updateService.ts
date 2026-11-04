export interface ReleaseAsset {
  name: string;
  size: number;
  download_url: string;
  download_count?: number;
  created_at?: string;
}

export interface ReleaseInfo {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: ReleaseAsset[];
  has_update: boolean;
  current_version: string;
}

export const CURRENT_APP_VERSION = 'v1.0.0';
export const GITHUB_REPO = 'momoshworks/R3-AI-Studio';

/**
 * Compare two semver-like strings (e.g. "v1.1.0" > "v1.0.0", "1.0.1" > "1.0.0-standard")
 */
export function isVersionNewer(latest: string, current: string): boolean {
  const clean = (v: string) => {
    const base = (v || '').replace(/^v/i, '').split('-')[0];
    return base.split('.').map((n) => parseInt(n, 10) || 0);
  };

  const lParts = clean(latest);
  const cParts = clean(current);

  const len = Math.max(lParts.length, cParts.length);
  for (let i = 0; i < len; i++) {
    const l = lParts[i] || 0;
    const c = cParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }

  // If numeric parts are equal, check if latest has a newer tag string
  if (latest.trim().toLowerCase() !== current.trim().toLowerCase()) {
    // If different tag string but same major.minor.patch, consider it an update
    return false;
  }

  return false;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function checkGitHubRelease(forceRefresh = false): Promise<ReleaseInfo | null> {
  const CACHE_KEY = 'R3_LATEST_RELEASE_CACHE';
  const CACHE_TIME_KEY = 'R3_LATEST_RELEASE_TIMESTAMP';
  const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache to avoid GitHub rate limits

  if (!forceRefresh) {
    try {
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedTime && cachedData && Date.now() - parseInt(cachedTime, 10) < CACHE_TTL_MS) {
        const parsed = JSON.parse(cachedData);
        parsed.has_update = isVersionNewer(parsed.tag_name, CURRENT_APP_VERSION);
        parsed.current_version = CURRENT_APP_VERSION;
        return parsed;
      }
    } catch {}
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      console.warn(`GitHub Releases API responded with status ${res.status}`);
      return null;
    }

    const data = await res.json();
    const assets: ReleaseAsset[] = (data.assets || []).map((a: any) => ({
      name: a.name,
      size: a.size || 0,
      download_url: a.browser_download_url,
      download_count: a.download_count,
      created_at: a.created_at,
    }));

    const releaseInfo: ReleaseInfo = {
      tag_name: data.tag_name || 'v1.0.0',
      name: data.name || data.tag_name || 'Latest Release',
      body: data.body || '',
      published_at: data.published_at || new Date().toISOString(),
      html_url: data.html_url || `https://github.com/${GITHUB_REPO}/releases`,
      assets,
      has_update: isVersionNewer(data.tag_name || '', CURRENT_APP_VERSION),
      current_version: CURRENT_APP_VERSION,
    };

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(releaseInfo));
      localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
    } catch {}

    return releaseInfo;
  } catch (err) {
    console.warn('Failed to check for GitHub release updates:', err);
    return null;
  }
}
