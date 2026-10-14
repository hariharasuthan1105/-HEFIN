import { Component, isDevMode } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../shared/components/ui';
@Component({
  selector: 'h-footer',
  imports: [RouterLink, LogoComponent],
  template: `<footer>
    <div class="container footer-top">
      <a routerLink="/" aria-label="HEFIN home"><h-logo /></a>
      <p>Connecting care, coverage<br />and confidence.</p>
      <div class="footer-links">
        <a routerLink="/about">Our mission</a><a routerLink="/roadmap">Roadmap</a
        ><a routerLink="/contact">Contact</a>
        @if (dev) {
          <a routerLink="/design-system">Design system</a>
        }
      </div>
    </div>
    <div class="container footer-bottom">
      <span>© 2026 HEFIN · A healthcare & insurance prototype</span
      ><span>Built around people. Designed for trust.</span>
    </div>
  </footer>`,
})
export class FooterComponent {
  dev = isDevMode();
}
