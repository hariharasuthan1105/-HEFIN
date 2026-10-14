import { Component, computed, inject } from '@angular/core';
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
      <h-status-badge tone="gold">SIMULATED WORKSPACE</h-status-badge>
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
      <div class="portal-metrics" aria-label="Simulated summary metrics">
        @for (metric of preview().metrics; track metric.label) {
          <article class="portal-metric">
            <span>{{ metric.label }}</span
            ><strong>{{ metric.value }}</strong
            ><span>Illustrative snapshot</span>
            <div class="segmented-bar" aria-hidden="true">
              @for (segment of segments; track segment) {
                <i></i>
              }
            </div>
          </article>
        }
      </div>
      <section class="portal-records" aria-labelledby="records-heading">
        <header>
          <h2 id="records-heading">{{ preview().heading }}</h2>
          <span class="micro-label">SYNTHETIC RECORDS / DEMO</span>
        </header>
        <div class="portal-table-wrap">
          <table>
            <caption class="sr-only">
              Fictional
              {{
                role().name
              }}
              preview records. No live activity.
            </caption>
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Demo activity</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (record of preview().records; track record.id) {
                <tr>
                  <td>{{ record.id }}</td>
                  <td>{{ record.label }}</td>
                  <td>
                    <span class="preview-status">{{ record.status }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <details>
          <summary>About this preview</summary>
          <p>
            These sample counts and records demonstrate information layout only. They do not
            represent patients, claims, payments, eligibility, partnerships, or government activity.
            No action is submitted.
          </p>
        </details>
      </section>
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
  segments = [0, 1, 2, 3, 4, 5, 6, 7];
  role = toSignal(
    inject(ActivatedRoute).data.pipe(
      map((data) => ROLES.find((r) => r.id === data['role']) ?? ROLES[0]!),
    ),
    { initialValue: ROLES[0]! },
  );
  preview = computed(() => {
    const data = {
      patient: {
        heading: 'Your care journey',
        metrics: [
          { label: 'Planned checkups', value: '03' },
          { label: 'Sample documents', value: '08' },
          { label: 'Care reminders', value: '02' },
        ],
        records: [
          { id: 'DEMO-01', label: 'Preventive care planning', status: 'Planned' },
          { id: 'DEMO-02', label: 'Coverage document checklist', status: 'Draft' },
          { id: 'DEMO-03', label: 'Follow-up reminder', status: 'Scheduled' },
        ],
      },
      hospital: {
        heading: 'Coordination queue',
        metrics: [
          { label: 'Sample care requests', value: '24' },
          { label: 'Documents to review', value: '06' },
          { label: 'Draft referrals', value: '04' },
        ],
        records: [
          { id: 'DEMO-11', label: 'Care coordination request', status: 'Review' },
          { id: 'DEMO-12', label: 'Documentation checklist', status: 'Draft' },
          { id: 'DEMO-13', label: 'Discharge planning', status: 'Planned' },
        ],
      },
      insurance: {
        heading: 'Review workspace',
        metrics: [
          { label: 'Sample submissions', value: '18' },
          { label: 'Review checklists', value: '05' },
          { label: 'Draft responses', value: '03' },
        ],
        records: [
          { id: 'DEMO-21', label: 'Policy document review', status: 'Review' },
          { id: 'DEMO-22', label: 'Information request', status: 'Draft' },
          { id: 'DEMO-23', label: 'Coverage explanation', status: 'Planned' },
        ],
      },
      government: {
        heading: 'Program overview',
        metrics: [
          { label: 'Illustrative programs', value: '04' },
          { label: 'Sample reports', value: '12' },
          { label: 'Review milestones', value: '03' },
        ],
        records: [
          { id: 'DEMO-31', label: 'Aggregate program summary', status: 'Draft' },
          { id: 'DEMO-32', label: 'Accessibility review', status: 'Review' },
          { id: 'DEMO-33', label: 'Reporting checklist', status: 'Planned' },
        ],
      },
    };
    return data[this.role().id as keyof typeof data] ?? data.patient;
  });
}
