export interface HefinConfig {
  apiBaseUrl?: string;
  demoMode?: boolean;
}

declare global {
  interface Window {
    __HEFIN_CONFIG__?: HefinConfig;
  }
}

export const environment = {
  production: false,
  get apiBaseUrl(): string {
    return (
      (typeof window !== 'undefined' && window.__HEFIN_CONFIG__?.apiBaseUrl) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('hefin_api_base_url')) ||
      'http://127.0.0.1:8000/api/v1'
    );
  },
  demoMode: true,
  environmentName: 'development',
};
