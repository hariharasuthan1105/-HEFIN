import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly light = signal(false);
  constructor() {
    try {
      this.light.set(localStorage.getItem('hefin-theme') === 'light');
    } catch {}
    this.apply();
  }
  toggle() {
    this.light.update((value) => !value);
    this.apply();
    try {
      localStorage.setItem('hefin-theme', this.light() ? 'light' : 'dark');
    } catch {}
  }
  private apply() {
    document.documentElement.dataset['theme'] = this.light() ? 'light' : 'dark';
  }
}
