import { Component, inject } from '@angular/core';
import { ThemeService } from '../../core/services/theme.service';
import { IconComponent } from './icon.component';
@Component({
  selector: 'h-theme-toggle',
  imports: [IconComponent],
  template: `<button
    class="icon-button"
    (click)="theme.toggle()"
    [attr.aria-label]="theme.light() ? 'Switch to dark theme' : 'Switch to light theme'"
    [attr.aria-pressed]="theme.light()"
  >
    <h-icon [name]="theme.light() ? 'Moon' : 'Sun'" />
  </button>`,
})
export class ThemeToggleComponent {
  theme = inject(ThemeService);
}
