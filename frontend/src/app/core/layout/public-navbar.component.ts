import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { LogoComponent } from '../../shared/components/ui';
import { IconComponent } from '../../shared/components/icon.component';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle.component';
@Component({
  selector: 'h-public-navbar',
  imports: [RouterLink, RouterLinkActive, LogoComponent, IconComponent, ThemeToggleComponent],
  template: ` <header class="site-header">
    <div class="container nav-inner">
      <a routerLink="/" aria-label="HEFIN home" class="brand"
        ><h-logo /><span class="brand-divider"></span
        ><span class="brand-caption">CARE. COVERAGE.<br />CONFIDENCE.</span></a
      >
      <button
        #menuToggle
        class="icon-button menu-toggle"
        aria-controls="main-nav"
        [attr.aria-expanded]="open()"
        (click)="open.update(invert)"
        [attr.aria-label]="open() ? 'Close navigation' : 'Open navigation'"
      >
        <h-icon [name]="open() ? 'X' : 'Menu'" />
      </button>
      <nav
        id="main-nav"
        aria-label="Main navigation"
        [class.open]="open()"
        (keydown.escape)="open.set(false); menuToggle.focus()"
      >
        @for (link of links; track link.path) {
          <a
            [routerLink]="link.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            ariaCurrentWhenActive="page"
            >{{ link.label }}</a
          >
        }
      </nav>
      <div class="nav-actions">
        <h-theme-toggle /><a routerLink="/login" class="button small"
          >Explore portals <h-icon name="ArrowUpRight"
        /></a>
      </div>
    </div>
  </header>`,
})
export class PublicNavbarComponent {
  open = signal(false);
  invert = (v: boolean) => !v;
  links = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'Who we are' },
    { path: '/solution', label: 'Our solution' },
    { path: '/how-it-works', label: 'How it works' },
    { path: '/ai', label: 'HEFIN AI' },
  ];
  constructor() {
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.open.set(false));
  }
}
