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
import type { HospitalController, HospitalView } from './hospital-viewer';
@Component({
  selector: 'h-smart-hospital-scene',
  imports: [RouterLink],
  styleUrl: './hospital-viewer.css',
  template: `<div class="hospital-experience" [attr.data-mode]="mode()">
    <div #viewport class="hospital-viewport">
      @if (mode() !== 'interactive') {
        <img
          class="hospital-fallback"
          src="assets/images/hospital-model.webp"
          alt="Rendered pearl and glass hospital model with a golden spiral atrium and roof helipad"
          width="1000"
          height="1000"
          fetchpriority="high"
        />
      }
    </div>
    <div class="hospital-scene-caption" aria-live="polite">{{ status() }}</div>
    <div class="scene-controls" aria-label="Hospital model controls">
      @if (mode() === 'interactive') {
        <button type="button" (click)="toggle()" [attr.aria-pressed]="paused()">
          {{ paused() ? 'Rotate hospital' : 'Pause hospital' }}
        </button>
        <button type="button" (click)="reset()">Reset hospital</button>
        <button type="button" aria-label="Rotate hospital left" (click)="controller?.orbit(-0.35)">
          ↶
        </button>
        <button type="button" aria-label="Rotate hospital right" (click)="controller?.orbit(0.35)">
          ↷
        </button>
        <button type="button" aria-label="Zoom into hospital" (click)="controller?.zoom(0.85)">
          +
        </button>
        <button type="button" aria-label="Zoom out of hospital" (click)="controller?.zoom(1.15)">
          −
        </button>
        @for (view of views; track view) {
          <button type="button" (click)="setView(view)">{{ view }}</button>
        }
        <button type="button" (click)="staticView()">Hospital still view</button>
      } @else if (mode() !== 'loading') {
        <button type="button" (click)="enable()">Explore hospital in 3D</button>
      }
      <a routerLink="/" fragment="care-network">Explore the cinematic scene ↓</a>
      <a routerLink="/hospital/dashboard">Hospital portal ↗</a>
    </div>
  </div>`,
})
export class SmartHospitalScene {
  private viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private zone = inject(NgZone);
  private observer?: IntersectionObserver;
  private abort?: AbortController;
  private destroyed = false;
  private inView = true;
  private reduced?: MediaQueryList;
  controller?: HospitalController;
  mode = signal<'static' | 'loading' | 'interactive'>('static');
  paused = signal(false);
  status = signal('Hospital architecture · 3D concept');
  views: HospitalView[] = ['Front', 'Side', 'Top'];
  private motion = () => {
    if (this.reduced?.matches) {
      this.paused.set(true);
      this.controller?.pause(true);
    }
  };
  constructor() {
    afterNextRender(() => {
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
      this.reduced.addEventListener('change', this.motion);
      this.observer = new IntersectionObserver(
        (entries) => {
          this.inView = !!entries[0]?.isIntersecting;
          this.controller?.visible(this.inView);
          if (
            this.inView &&
            this.mode() === 'static' &&
            !this.reduced?.matches &&
            innerWidth > 600 &&
            !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection
              ?.saveData &&
            !this.abort
          )
            this.enable();
        },
        { threshold: 0.05 },
      );
      this.observer.observe(this.viewport().nativeElement);
    });
  }
  async enable() {
    if (this.destroyed || this.mode() === 'loading' || this.controller) return;
    const request = new AbortController();
    this.abort = request;
    this.mode.set('loading');
    this.status.set('Loading hospital geometry…');
    try {
      const module = await import('./hospital-viewer');
      if (request.signal.aborted) return;
      const controller = await this.zone.runOutsideAngular(() =>
        module.createHospitalViewer(
          this.viewport().nativeElement,
          request.signal,
          () =>
            this.zone.run(() => {
              this.controller = undefined;
              this.mode.set('static');
              this.status.set('3D unavailable · rendered model shown');
            }),
          () => this.zone.run(() => this.paused.set(true)),
        ),
      );
      if (this.destroyed || request.signal.aborted) {
        controller.dispose();
        return;
      }
      this.controller = controller;
      this.paused.set(!!this.reduced?.matches);
      controller.pause(this.paused());
      controller.visible(this.inView);
      this.mode.set('interactive');
      this.status.set('Drag to orbit 360° · pinch or scroll to zoom');
      if (isDevMode())
        (window as unknown as { __hefinHospital: unknown }).__hefinHospital =
          module.hospitalMetrics;
    } catch {
      if (!request.signal.aborted) {
        this.mode.set('static');
        this.status.set('3D unavailable · rendered model shown');
      }
    }
  }
  toggle() {
    this.paused.update((v) => !v);
    this.controller?.pause(this.paused());
  }
  reset() {
    this.paused.set(true);
    this.controller?.pause(true);
    this.controller?.view('Isometric');
  }
  setView(view: HospitalView) {
    this.paused.set(true);
    this.controller?.pause(true);
    this.controller?.view(view);
  }
  staticView() {
    this.abort?.abort();
    this.controller?.dispose();
    this.controller = undefined;
    this.mode.set('static');
    this.status.set('Rendered hospital model · motion off');
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.abort?.abort();
    this.observer?.disconnect();
    this.controller?.dispose();
    this.reduced?.removeEventListener('change', this.motion);
  }
}
