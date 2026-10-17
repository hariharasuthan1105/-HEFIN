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

import type { SceneController, BrainMode } from './cinematic-healthcare-renderer';

type PowerNavigator = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
@Component({
  selector: 'h-cinematic-healthcare-scene',

  template: `
    <div class="cinematic-experience" [attr.data-mode]="mode()">
      <div
        #viewport
        class="cinematic-viewport"
        role="img"
        [attr.aria-label]="
          mode() === 'interactive'
            ? 'Interactive 3D HEFIN Trust Network featuring a central golden HEFIN shield on a cyber pedestal connected through luminous neon conduits to four service nodes: Smart Hospital, Neural AI Cloud, Financial Protection, and Verified Governance. Drag with a mouse or use orbit controls.'
            : 'Static render of the HEFIN Trust Network featuring the central golden shield and connected service nodes.'
        "
      >
        <div class="scene-grid" aria-hidden="true"></div>
        @if (mode() !== 'interactive') {
          <img
            class="cinematic-fallback"
            src="assets/images/cinematic-fallback.webp"
            alt="Static render of the HEFIN Trust Network, central golden shield, cyber pedestal, and connected service nodes"
            width="1600"
            height="850"
            loading="lazy"
          />
        }
      </div>
      <div class="scene-labels" aria-hidden="true">
        <span>01 / TRUST NETWORK</span><span>02 / CONNECTED CARE</span>
      </div>
      <div class="cinematic-caption" aria-live="polite">
        <span class="status-dot"></span>{{ status() }}
      </div>
      <div class="scene-controls cinematic-controls" aria-label="Cinematic scene controls">
        @if (mode() === 'interactive') {
          <button type="button" (click)="togglePause()" [attr.aria-pressed]="paused()">
            {{ paused() ? 'Resume motion' : 'Pause motion' }}
          </button>
          <button type="button" (click)="reset()">Reset view</button>
          <button type="button" (click)="orbit(-1)" aria-label="Orbit left">←</button>
          <button type="button" (click)="orbit(1)" aria-label="Orbit right">→</button>
          <div class="material-modes" role="group" aria-label="Brain material">
            @for (choice of modes; track choice) {
              <button
                type="button"
                [attr.aria-pressed]="materialMode() === choice"
                (click)="setMaterial(choice)"
              >
                {{ choice }}
              </button>
            }
          </div>
          <button type="button" (click)="useStatic()">Static view</button>
        } @else if (!reduced() && mode() !== 'loading' && !failed()) {
          <button type="button" (click)="enable3D()">Explore in 3D</button>
        }
        <a href="assets/models/ATTRIBUTION.txt" target="_blank" rel="noopener">Model credits ↗</a>
      </div>
    </div>
  `,
})
export class CinematicHealthcareScene {
  private viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private zone = inject(NgZone);
  private controller?: SceneController;
  private observer?: IntersectionObserver;
  private motion?: MediaQueryList;
  private destroyed = false;
  private request = 0;
  private abort?: AbortController;
  private visible = false;
  private staticChoice = false;
  private optedIn = false;
  private lowPower = false;
  mode = signal<'static' | 'loading' | 'interactive'>('static');
  status = signal('Static concept preview');
  reduced = signal(false);
  paused = signal(false);
  modes: BrainMode[] = ['Glass', 'Wireframe', 'Hybrid'];
  materialMode = signal<BrainMode>('Hybrid');
  setMaterial(value: BrainMode) {
    this.materialMode.set(value);
    this.controller?.setMode(value);
  }
  orbit(value: number) {
    this.controller?.orbit(value);
  }
  orbitPitch(value: number) {
    this.controller?.orbitPitch(value);
  }
  failed = signal(false);
  private onMotion = () => {
    this.reduced.set(this.motion?.matches ?? false);
    if (this.reduced()) {
      this.release();
      this.status.set('Reduced motion · static reference');
    } else {
      this.status.set('Static concept preview');
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
    this.status.set('Loading the care network…');
    try {
      const module = await import('./cinematic-healthcare-renderer');
      if (this.destroyed || request !== this.request) return;
      if (!this.visible) {
        this.mode.set('static');
        this.status.set('Static concept preview');
        return;
      }
      this.abort = new AbortController();
      const controller = await this.zone.runOutsideAngular(() =>
        module.createHealthcareScene(this.viewport().nativeElement, {
          lowPower: this.lowPower,
          signal: this.abort!.signal,
          onFailure: () => this.fallback(),
        }),
      );
      if (this.destroyed || request !== this.request) {
        controller.dispose();
        return;
      }
      this.controller = controller;
      this.controller.setVisible(this.visible);
      if (isDevMode())
        (window as unknown as Record<string, unknown>)['__hefinSceneMetrics'] = module.sceneMetrics;
      this.mode.set('interactive');
      this.status.set('Neural link active · concept simulation');
      this.paused.set(false);
      this.setMaterial('Hybrid');
    } catch (error) {
      if (isDevMode()) console.warn('HEFIN scene unavailable', error);
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
    this.abort?.abort();
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
    this.status.set('Static concept preview');
  }
  togglePause() {
    this.paused.update((v) => !v);
    this.controller?.setPaused(this.paused());
    this.status.set(
      this.paused()
        ? 'Motion paused · concept simulation'
        : 'Neural link active · concept simulation',
    );
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
