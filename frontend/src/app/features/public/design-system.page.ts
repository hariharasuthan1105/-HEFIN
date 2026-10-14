import { Component, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  LogoComponent,
  GradientButtonComponent,
  GlassCardComponent,
  SectionHeadingComponent,
  StatusBadgeComponent,
  LoadingSpinnerComponent,
  SkeletonCardComponent,
  PageContainerComponent,
  AnimatedTextComponent,
} from '../../shared/components/ui';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle.component';
import { HEFINShieldScene } from '../../three-d/shield/hefin-shield-scene';
@Component({
  selector: 'h-design-system',
  imports: [
    A11yModule,
    MatProgressBarModule,
    LogoComponent,
    GradientButtonComponent,
    GlassCardComponent,
    SectionHeadingComponent,
    StatusBadgeComponent,
    LoadingSpinnerComponent,
    SkeletonCardComponent,
    PageContainerComponent,
    AnimatedTextComponent,
    ThemeToggleComponent,
    HEFINShieldScene,
  ],
  template: `<h-page-container
    ><section class="page-heading">
      <p class="eyebrow">DEVELOPMENT ONLY / DESIGN REFERENCE</p>
      <h1><h-animated-text>HEFIN Cybercare</h-animated-text></h1>
      <p>Spectral Intelligence · The shared language of care and confidence.</p>
      <h-theme-toggle />
    </section>
    <h-section-heading label="01 / BRAND" title="An identity worth protecting." />
    <div class="showcase-row"><h-logo /><h-logo [compact]="true" /><h-hefin-shield-scene /></div>
    <h-section-heading label="02 / PALETTE" title="Purposeful color." />
    <div class="swatch-grid">
      @for (color of colors; track color.token) {
        <div class="swatch">
          <div [style.background]="'var(' + color.token + ')'"></div>
          <strong>{{ color.label }}</strong
          ><code>{{ color.hex }}</code>
        </div>
      }
    </div>
    <section class="section">
      <h-section-heading label="03 / TYPOGRAPHY" title="Character. Clarity. Contrast." />
      <div class="font-list">
        @for (font of fonts; track font) {
          <div>
            <code>{{ font }}</code
            ><span [style.font-family]="font">Connecting care & confidence.</span>
          </div>
        }
      </div>
      <div class="type-h1">Heading one sample</div>
      <h2>Heading two</h2>
      <h3>Heading three</h3>
      <p>Body text with comfortable line height for readable healthcare information.</p>
      <small>Supporting text · 14px</small>
    </section>
    <h-section-heading label="04 / COMPONENTS" title="Made to work together." />
    <div class="button-row">
      <h-gradient-button>Primary action</h-gradient-button
      ><h-gradient-button to="/about" [secondary]="true">Secondary action</h-gradient-button
      ><h-status-badge>Ready</h-status-badge><h-status-badge tone="gold">Preview</h-status-badge>
    </div>
    <div class="info-grid">
      <h-glass-card
        ><h3>Glass surface</h3>
        <p>Subtle borders and restrained hover elevation.</p></h-glass-card
      ><h-skeleton-card />
    </div>
    <h-loading-spinner />
    <div class="material-progress">
      <span class="micro-label">MATERIAL INDETERMINATE LOADING SAMPLE</span
      ><mat-progress-bar mode="indeterminate" aria-label="Loading demonstration" />
    </div>
    <button class="button secondary" (click)="dialog.set(true)">
      Open accessible dialog example
    </button>
    @if (dialog()) {
      <div class="modal-backdrop" (keydown.escape)="dialog.set(false)">
        <section
          class="demo-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="true"
        >
          <h2 id="dialog-title">Focused on accessibility</h2>
          <p>Focus stays inside this dialog. Press Escape or close to return.</p>
          <button class="button" cdkFocusInitial (click)="dialog.set(false)">Close dialog</button>
        </section>
      </div>
    }
    <div class="page-bottom">
      <p>
        Motion uses a shared easing curve. Reduced-motion preferences disable nonessential
        animations.
      </p>
    </div></h-page-container
  >`,
})
export class DesignSystemPage {
  dialog = signal(false);
  colors = [
    { label: 'Background', token: '--bg', hex: '#080D1C' },
    { label: 'Midnight', token: '--midnight', hex: '#0B1020' },
    { label: 'Card', token: '--surface', hex: '#131B30' },
    { label: 'Elevated', token: '--elevated', hex: '#1A2540' },
    { label: 'Border', token: '--border', hex: '#303D58' },
    { label: 'Gold', token: '--gold', hex: '#E6B65D' },
    { label: 'Light gold', token: '--gold-light', hex: '#F5C96F' },
    { label: 'Indigo', token: '--indigo', hex: '#6366F1' },
    { label: 'Blue', token: '--blue', hex: '#318CFF' },
    { label: 'Cyan', token: '--cyan', hex: '#21C9F3' },
    { label: 'Emerald', token: '--emerald', hex: '#22D3A2' },
    { label: 'Magenta', token: '--magenta', hex: '#E94FAF' },
  ];
  fonts = [
    'Orbitron',
    'Audiowide',
    'Russo One',
    'Space Grotesk',
    'Plus Jakarta Sans',
    'JetBrains Mono',
    'Pixelify Sans',
  ];
}
