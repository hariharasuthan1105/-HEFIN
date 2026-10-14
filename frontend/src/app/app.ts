import { Component, DestroyRef, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { PublicNavbarComponent } from './core/layout/public-navbar.component';
import { FooterComponent } from './core/layout/footer.component';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PublicNavbarComponent, FooterComponent],
  templateUrl: './app.html',
})
export class App {
  constructor() {
    let initial = true;
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => {
        if (initial) {
          initial = false;
          return;
        }
        setTimeout(() => document.getElementById('main-content')?.focus({ preventScroll: true }));
      });
  }
}
