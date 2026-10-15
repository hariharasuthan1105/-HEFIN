export interface HefinConfig {
  apiBaseUrl?: string;
  demoMode?: boolean;
}

declare global {
  interface Window {
    __HEFIN_CONFIG__?: HefinConfig;
  }
}

/**
 * Strict validator for HEFIN API Base URL.
 * Rejects unsafe arbitrary schemes (e.g. javascript:, data:), credentials in URLs,
 * and insecure unencrypted remote connections, while allowing Render backend services and local dev hosts.
 */
export function sanitizeApiUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(trimmed);
    // Reject dangerous schemes
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    // Reject embedded credentials (user:pass@host)
    if (parsed.username || parsed.password) {
      return null;
    }
    // Only allow http on local loopback development interfaces
    if (parsed.protocol === 'http:') {
      const host = parsed.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
        return trimmed;
      }
      return null; // Reject plain http for remote hosts
    }
    // Remote connections require https and a valid host
    if (parsed.protocol === 'https:') {
      const host = parsed.hostname.toLowerCase();
      // Allow Render hosted services
      if (host.endsWith('.onrender.com') || host === 'hefin-backend-mofn.onrender.com') {
        return trimmed;
      }
      // Allow valid domain names with at least one dot
      if (host.includes('.')) {
        return trimmed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

const isBrowser = typeof window !== 'undefined';
const isGitHubPages = isBrowser && window.location.hostname.includes('github.io');
const isRenderHost = isBrowser && window.location.hostname.includes('onrender.com');

export const environment = {
  production: isGitHubPages || isRenderHost,
  get apiBaseUrl(): string {
    if (isBrowser && window.__HEFIN_CONFIG__?.apiBaseUrl) {
      const sanitized = sanitizeApiUrl(window.__HEFIN_CONFIG__.apiBaseUrl);
      if (sanitized) return sanitized;
    }
    if (isBrowser && localStorage.getItem('hefin_api_base_url')) {
      const sanitized = sanitizeApiUrl(localStorage.getItem('hefin_api_base_url'));
      if (sanitized) return sanitized;
    }
    // GitHub Pages production deployment points to Render backend
    if (isGitHubPages || isRenderHost) {
      return 'https://hefin-backend-mofn.onrender.com/api/v1';
    }
    return 'http://127.0.0.1:8000/api/v1';
  },
  demoMode: true,
  environmentName: isGitHubPages ? 'github-pages' : isRenderHost ? 'render' : 'development',
};


