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
import type { BrainController, BrainView } from './brain-viewer';

@Component({
  selector: 'h-ai-brain-scene',
  styleUrl: './brain-viewer.css',
  template: `<div class="brain-experience" [attr.data-mode]="mode()">
    <div #viewport class="brain-viewport">
      @if (mode() !== 'interactive') {
        <img
          class="brain-fallback"
          src="assets/images/ai-brain.webp"
          alt="Realistic 3D anatomical human brain showing cerebrum gyri, cerebellum, and brainstem"
          width="819"
          height="965"
          fetchpriority="high"
        />
      }
    </div>
    <div class="brain-scene-caption" aria-live="polite">{{ status() }}</div>
    <div class="brain-controls" role="toolbar" aria-label="3D Brain controls">
      @if (mode() === 'interactive') {
        <button
          type="button"
          class="ctrl-btn"
          (click)="toggle()"
          [attr.aria-pressed]="paused()"
          [title]="paused() ? 'Resume rotation' : 'Pause rotation'"
          [attr.aria-label]="paused() ? 'Resume rotation' : 'Pause rotation'"
        >
          {{ paused() ? '▶' : '⏸' }}
        </button>
        <button
          type="button"
          class="ctrl-btn"
          (click)="reset()"
          title="Reset to anatomical view"
          aria-label="Reset to anatomical view"
        >
          ↺
        </button>
        <span class="divider" aria-hidden="true"></span>
        <button
          type="button"
          class="ctrl-btn"
          aria-label="Zoom in"
          title="Zoom in"
          (click)="controller?.zoom(0.85)"
        >
          ＋
        </button>
        <button
          type="button"
          class="ctrl-btn"
          aria-label="Zoom out"
          title="Zoom out"
          (click)="controller?.zoom(1.15)"
        >
          −
        </button>
        <span class="divider" aria-hidden="true"></span>
        @for (item of viewPresets; track item.id) {
          <button
            type="button"
            class="ctrl-btn view-btn"
            (click)="setView(item.id)"
            [attr.aria-label]="item.label + ' view'"
            [title]="item.label + ' view'"
          >
            {{ item.icon }}
          </button>
        }
        <span class="divider" aria-hidden="true"></span>
        <button
          type="button"
          class="ctrl-btn"
          (click)="staticView()"
          title="Switch to still preview"
          aria-label="Switch to still preview"
        >
          👁
        </button>
      } @else if (mode() !== 'loading') {
        <button type="button" class="opt-in-button" (click)="enable()">
          Explore brain in 3D
        </button>
      }
    </div>
  </div>`,
})
export class AIBrainScene {
  private viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private zone = inject(NgZone);
  private observer?: IntersectionObserver;
  private abort?: AbortController;
  private destroyed = false;
  private inView = true;
  private reduced?: MediaQueryList;

  controller?: BrainController;
  mode = signal<'static' | 'loading' | 'interactive'>('static');
  paused = signal(false);
  status = signal('Neural Anatomy · 3D Concept');
  viewPresets: { id: BrainView; label: string; icon: string }[] = [
    { id: 'Isometric', label: 'Isometric', icon: 'Iso' },
    { id: 'Front', label: 'Front (Anterior)', icon: 'F' },
    { id: 'Back', label: 'Back (Posterior)', icon: 'B' },
    { id: 'Left', label: 'Left lateral', icon: 'L' },
    { id: 'Right', label: 'Right lateral', icon: 'R' },
    { id: 'Top', label: 'Top (Superior)', icon: 'T' },
  ];

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
            !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData &&
            !this.abort
          ) {
            this.enable();
          }
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
    this.status.set('Loading anatomical brain…');

    try {
      const module = await import('./brain-viewer');
      if (request.signal.aborted) return;
      const controller = await this.zone.runOutsideAngular(() =>
        module.createBrainViewer(
          this.viewport().nativeElement,
          request.signal,
          () =>
            this.zone.run(() => {
              this.controller = undefined;
              this.mode.set('static');
              this.status.set('3D unavailable · anatomical reference shown');
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

      if (isDevMode()) {
        (window as unknown as { __hefinBrain: unknown }).__hefinBrain = module.brainMetrics;
      }
    } catch {
      if (!request.signal.aborted) {
        this.mode.set('static');
        this.status.set('3D unavailable · anatomical reference shown');
      }
    }
  }

  toggle() {
    this.paused.update((v) => !v);
    this.controller?.pause(this.paused());
  }

  reset() {
    this.paused.set(false);
    this.controller?.pause(false);
    this.controller?.reset();
  }

  setView(view: BrainView) {
    this.paused.set(true);
    this.controller?.pause(true);
    this.controller?.view(view);
  }

  staticView() {
    this.abort?.abort();
    this.controller?.dispose();
    this.controller = undefined;
    this.mode.set('static');
    this.status.set('Anatomical brain · motion off');
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.abort?.abort();
    this.observer?.disconnect();
    this.controller?.dispose();
    this.reduced?.removeEventListener('change', this.motion);
  }
}
