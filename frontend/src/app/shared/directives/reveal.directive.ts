import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';
/** Content stays visible without JS; the entrance animation starts only on intersection. */
@Directive({ selector: '[hReveal]' })
export class RevealDirective {
  private element = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;
  constructor() {
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            this.element.nativeElement.classList.add('section-revealed');
            this.observer?.disconnect();
          }
        },
        { threshold: 0.06 },
      );
      this.observer.observe(this.element.nativeElement);
    });
  }
  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
