import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon.component';
@Component({
  selector: 'h-logo',
  template: `<img
    [src]="compact() ? 'assets/logo/hefin-shield.png' : 'assets/logo/hefin-logo.png'"
    [class.compact]="compact()"
    alt="HEFIN gold H shield"
    width="294"
    height="274"
  />`,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }
    img {
      width: 65px;
      height: auto;
      object-fit: contain;
    }
    .compact {
      width: 42px;
    }
  `,
})
export class LogoComponent {
  compact = input(false);
}
@Component({
  selector: 'h-gradient-button',
  imports: [RouterLink, IconComponent],
  template: `<a class="button" [class.secondary]="secondary()" [routerLink]="to()"
    ><ng-content /><h-icon name="ArrowUpRight"
  /></a>`,
})
export class GradientButtonComponent {
  to = input('/login');
  secondary = input(false);
}
@Component({ selector: 'h-glass-card', template: `<ng-content />`, host: { class: 'glass-card' } })
export class GlassCardComponent {}
@Component({
  selector: 'h-section-heading',
  template: `<p class="eyebrow">{{ label() }}</p>
    <h2>{{ title() }}</h2>
    <p class="section-description"><ng-content /></p>`,
})
export class SectionHeadingComponent {
  label = input('HEFIN CYBERCARE');
  title = input('');
}
@Component({
  selector: 'h-status-badge',
  template: `<span class="status-badge" [class.gold]="tone() === 'gold'"
    ><span class="status-dot"></span><ng-content
  /></span>`,
})
export class StatusBadgeComponent {
  tone = input('cyan');
}
@Component({
  selector: 'h-loading-spinner',
  template: `<span class="spinner" aria-hidden="true"></span><span>{{ label() }}</span>`,
  host: { role: 'status', class: 'loading-state' },
})
export class LoadingSpinnerComponent {
  label = input('Initializing HEFIN workspace…');
}
@Component({
  selector: 'h-skeleton-card',
  template: `<span class="sr-only">Loading preview</span>
    <div class="skeleton w-1/3"></div>
    <div class="skeleton"></div>
    <div class="skeleton w-2/3"></div>`,
  host: { class: 'glass-card skeleton-card', 'aria-busy': 'true' },
})
export class SkeletonCardComponent {}
@Component({
  selector: 'h-page-container',
  template: `<div class="container page-enter"><ng-content /></div>`,
})
export class PageContainerComponent {}
@Component({
  selector: 'h-animated-text',
  template: `<span class="text-mask"
    ><span><ng-content /></span
  ></span>`,
})
export class AnimatedTextComponent {}
