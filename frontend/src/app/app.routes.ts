import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';
const info = () => import('./features/public/info.page').then((m) => m.InfoPage);
const dashboard = () =>
  import('./shared/components/portal-placeholder.page').then((m) => m.PortalPlaceholderPage);
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/public/home.page').then((m) => m.HomePage) },
  ...['about', 'solution', 'how-it-works', 'roadmap', 'contact'].map((path) => ({
    path,
    loadComponent: info,
    data: { page: path },
  })),
  { path: 'ai', loadComponent: () => import('./features/public/ai.page').then((m) => m.AIPage) },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  ...['patient', 'hospital', 'insurance', 'government'].map((role) => ({
    path: role + '/dashboard',
    loadComponent: dashboard,
    data: { role },
  })),
  ...(isDevMode()
    ? [
        {
          path: 'design-system',
          loadComponent: () =>
            import('./features/public/design-system.page').then((m) => m.DesignSystemPage),
        },
      ]
    : []),
  { path: '**', loadComponent: info, data: { page: 'not-found' } },
];
