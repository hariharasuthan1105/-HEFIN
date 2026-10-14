import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ROLES } from '../../features/auth/login.page';
import { LogoComponent, StatusBadgeComponent, SkeletonCardComponent } from './ui';
import { IconComponent } from './icon.component';
@Component({
  selector: 'h-portal-placeholder',
  imports: [RouterLink, LogoComponent, StatusBadgeComponent, SkeletonCardComponent, IconComponent],
  template: `<div class="container portal-shell" [attr.data-role]="role().id">
    <aside class="portal-sidebar">
      <h-logo [compact]="true" /><span class="eyebrow">{{ role().name }} PORTAL</span
      ><span class="sidebar-active"><h-icon [name]="role().icon" /> Workspace overview</span
      ><a routerLink="/login" class="text-link">Switch preview <h-icon name="ArrowRight" /></a>
    </aside>
    <section class="portal-main page-enter">
      <h-status-badge tone="gold">FOUNDATION PREVIEW</h-status-badge>
      <h1>{{ role().name }} workspace</h1>
      <p>{{ role().description }}</p>
      <div class="notice">
        <h-icon name="Layers" />
        <div>
          <h3>A foundation for what comes next.</h3>
          <p>
            This route and layout are ready. Data, authentication, and actions will arrive in later
            phases. These placeholders do not represent live activity.
          </p>
        </div>
      </div>
      <div class="preview-grid">
        @for (feature of role().features; track feature) {
          <div>
            <h3>{{ feature }}</h3>
            <h-skeleton-card /><span class="micro-label">PLANNED MODULE · NO DATA LOADED</span>
          </div>
        }
      </div>
      <a routerLink="/roadmap" class="button secondary"
        >See the development roadmap <h-icon name="ArrowUpRight"
      /></a>
    </section>
  </div>`,
})
export class PortalPlaceholderPage {
  role = toSignal(
    inject(ActivatedRoute).data.pipe(
      map((data) => ROLES.find((r) => r.id === data['role']) ?? ROLES[0]!),
    ),
    { initialValue: ROLES[0]! },
  );
}
