import {
  Component,
  ElementRef,
  NgZone,
  afterNextRender,
  inject,
  isDevMode,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { HospitalController } from './hospital-renderer';

type PowerNavigator = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
@Component({
  selector: 'h-smart-hospital-scene',
  imports: [RouterLink],
  template: `
    <div class="hospital-experience" [attr.data-mode]="mode()">
      <div
        #viewport
        class="hospital-viewport"
        role="img"
        [attr.aria-label]="
          mode() === 'interactive'
            ? 'Procedural 3D concept hospital with two glass wings, a central atrium, rooftop helipad, medical cross and cyan connection nodes. Move the pointer to orbit, or use the controls below. This is not a real connected hospital.'
            : 'Static architectural reference of the proposed Smart Hospital.'
        "
      >
        <div class="scene-grid" aria-hidden="true"></div>
        @if (mode() !== 'interactive') {
          <img
            class="hospital-fallback"
            src="/assets/images/smart-hospital.webp"
            alt="Supplied static architectural reference for the Smart Hospital"
            width="810"
            height="965"
            fetchpriority="high"
          />
        }
      </div>
      <div class="hospital-scene-caption" aria-live="polite">
        <span class="status-dot"></span>{{ status() }}
      </div>
      <div class="scene-controls" aria-label="Hospital visualization controls">
        @if (mode() === 'interactive') {
          <button type="button" (click)="togglePause()" [attr.aria-pressed]="paused()">
            {{ paused() ? 'Resume motion' : 'Pause motion' }}
          </button>
          <button type="button" (click)="reset()">Reset view</button>
          <button type="button" (click)="useStatic()">Static view</button>
        } @else if (!reduced() && mode() !== 'loading' && !failed()) {
          <button type="button" (click)="enable3D()">Load 3D preview</button>
        }
        <a routerLink="/hospital/dashboard">Hospital portal ↗</a>
      </div>
    </div>
  `,
})
export class SmartHospitalScene {
  private viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private zone = inject(NgZone);
  private controller?: HospitalController;
  private observer?: IntersectionObserver;
  private motion?: MediaQueryList;
  private destroyed = false;
  private request = 0;
  private visible = false;
  private staticChoice = false;
  private optedIn = false;
  private lowPower = false;
  mode = signal<'static' | 'loading' | 'interactive'>('static');
  status = signal('Static architectural reference');
  reduced = signal(false);
  paused = signal(false);
  failed = signal(false);
  private onMotion = () => {
    this.reduced.set(this.motion?.matches ?? false);
    if (this.reduced()) {
      this.release();
      this.status.set('Reduced motion · static reference');
    } else {
      this.status.set('Static architectural reference');
      this.maybeLoad();
    }
  };
  constructor() {
    afterNextRender(() => {
      const nav = navigator as PowerNavigator;
      this.lowPower =
        window.innerWidth <= 600 ||
        (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
        (nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) ||
        !!nav.connection?.saveData;
      this.motion = matchMedia('(prefers-reduced-motion: reduce)');
      this.motion.addEventListener('change', this.onMotion);
      this.onMotion();
      if (this.lowPower && !this.reduced()) this.status.set('Low-power preview · static reference');
      this.zone.runOutsideAngular(() => {
        this.observer = new IntersectionObserver(
          (entries) => {
            this.visible = entries[0]?.isIntersecting ?? false;
            this.controller?.setVisible(this.visible);
            this.maybeLoad();
          },
          { threshold: 0.08 },
        );
        this.observer.observe(this.viewport().nativeElement);
      });
    });
  }
  private async maybeLoad() {
    if (
      !this.visible ||
      this.destroyed ||
      this.controller ||
      this.mode() === 'loading' ||
      this.reduced() ||
      this.staticChoice ||
      this.failed() ||
      (this.lowPower && !this.optedIn)
    )
      return;
    const request = ++this.request;
    this.mode.set('loading');
    this.status.set('Preparing hospital visualization…');
    try {
      const module = await import('./hospital-renderer');
      if (this.destroyed || request !== this.request) return;
      if (!this.visible) {
        this.mode.set('static');
        this.status.set('Static architectural reference');
        return;
      }
      this.zone.runOutsideAngular(() => {
        this.controller = module.createHospitalScene(this.viewport().nativeElement, {
          lowPower: this.lowPower,
          onFailure: () => this.fallback(),
        });
        this.controller.setVisible(this.visible);
      });
      if (isDevMode())
        (window as unknown as Record<string, unknown>)['__hefinHospitalMetrics'] =
          module.hospitalMetrics;
      this.mode.set('interactive');
      this.status.set('Interactive 3D · procedural concept');
      this.paused.set(false);
    } catch {
      if (!this.destroyed && request === this.request) this.fallback();
    }
  }
  private fallback() {
    this.failed.set(true);
    this.release();
    this.status.set('3D unavailable · static reference');
  }
  private release() {
    ++this.request;
    this.controller?.dispose();
    this.controller = undefined;
    this.mode.set('static');
    this.paused.set(false);
  }
  enable3D() {
    this.staticChoice = false;
    this.optedIn = true;
    this.maybeLoad();
  }
  useStatic() {
    this.staticChoice = true;
    this.release();
    this.status.set('Static architectural reference');
  }
  togglePause() {
    this.paused.update((v) => !v);
    this.controller?.setPaused(this.paused());
  }
  reset() {
    this.controller?.reset();
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.observer?.disconnect();
    this.motion?.removeEventListener('change', this.onMotion);
    this.release();
  }
}
