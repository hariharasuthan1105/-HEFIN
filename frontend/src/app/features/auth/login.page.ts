import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LogoComponent,
  PageContainerComponent,
  StatusBadgeComponent,
} from '../../shared/components/ui';
import { IconComponent, IconName } from '../../shared/components/icon.component';
export const ROLES: {
  id: string;
  name: string;
  icon: IconName;
  description: string;
  features: string[];
}[] = [
  {
    id: 'patient',
    name: 'Patient',
    icon: 'HeartPulse',
    description: 'Your health journey, with a clearer view of your protection.',
    features: ['Health & checkups', 'Coverage & claims', 'Personal care overview'],
  },
  {
    id: 'hospital',
    name: 'Hospital',
    icon: 'Building2',
    description: 'Coordinate care and connect the steps that follow.',
    features: ['Patient coordination', 'Emergency requests', 'Authorization tracking'],
  },
  {
    id: 'insurance',
    name: 'Insurance company',
    icon: 'ShieldCheck',
    description: 'Bring clarity and human oversight to every review.',
    features: ['Policy validation', 'Human claim review', 'Settlement visibility'],
  },
  {
    id: 'government',
    name: 'Government',
    icon: 'Landmark',
    description: 'Understand program impact through aggregate insights.',
    features: ['Screening participation', 'Regional analytics', 'Funding simulations'],
  },
];
@Component({
  selector: 'h-login-page',
  imports: [RouterLink, LogoComponent, PageContainerComponent, StatusBadgeComponent, IconComponent],
  template: `<h-page-container
    ><section class="page-heading centered">
      <h-logo />
      <p class="eyebrow">FOUR PERSPECTIVES. ONE CONNECTED PLATFORM.</p>
      <h1>Your world of care<br />starts here.</h1>
      <p>Choose a portal to explore its workspace foundation.</p>
      <h-status-badge tone="gold">DAY 1 · UI PREVIEW ONLY</h-status-badge>
    </section>
    <div class="portal-grid">
      @for (role of roles; track role.id) {
        <a
          [routerLink]="'/' + role.id + '/dashboard'"
          class="portal-card"
          [attr.data-role]="role.id"
          ><div class="portal-icon"><h-icon [name]="role.icon" /></div>
          <h2>{{ role.name }}</h2>
          <p>{{ role.description }}</p>
          <ul>
            @for (feature of role.features; track feature) {
              <li><h-icon name="Check" />{{ feature }}</li>
            }
          </ul>
          <span class="text-link">Preview portal <h-icon name="ArrowUpRight" /></span
        ></a>
      }
    </div>
    <p class="scope-note">
      <h-icon name="LockKeyhole" /> This is a public interface preview. Authentication and
      role-based access will be added with Django. No patient records are available.
    </p></h-page-container
  >`,
})
export class LoginPage {
  roles = ROLES;
}
