export interface HefinConfig {
  apiBaseUrl?: string;
  demoMode?: boolean;
}

declare global {
  interface Window {
    __HEFIN_CONFIG__?: HefinConfig;
  }
}

const isBrowser = typeof window !== 'undefined';
const isGitHubPages = isBrowser && window.location.hostname.includes('github.io');
const isRenderHost = isBrowser && window.location.hostname.includes('onrender.com');

export const environment = {
  production: isGitHubPages || isRenderHost,
  get apiBaseUrl(): string {
    if (isBrowser && window.__HEFIN_CONFIG__?.apiBaseUrl) {
      return window.__HEFIN_CONFIG__.apiBaseUrl;
    }
    if (isBrowser && localStorage.getItem('hefin_api_base_url')) {
      return localStorage.getItem('hefin_api_base_url')!;
    }
    // GitHub Pages production deployment points to Render backend
    if (isGitHubPages || isRenderHost) {
      return 'https://hefin-backend.onrender.com/api/v1';
    }
    return 'http://127.0.0.1:8000/api/v1';
  },
  demoMode: true,
  environmentName: isGitHubPages ? 'github-pages' : isRenderHost ? 'render' : 'development',
};

