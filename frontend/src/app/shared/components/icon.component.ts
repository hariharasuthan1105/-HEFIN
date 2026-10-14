import { Component, ElementRef, afterRenderEffect, inject, input } from '@angular/core';
import {
  createElement,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Activity,
  Building2,
  Landmark,
  HeartPulse,
  BrainCircuit,
  Menu,
  X,
  Sun,
  Moon,
  Check,
  ChevronRight,
  Layers,
  LockKeyhole,
  CircleHelp,
} from 'lucide';
const icons = {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Activity,
  Building2,
  Landmark,
  HeartPulse,
  BrainCircuit,
  Menu,
  X,
  Sun,
  Moon,
  Check,
  ChevronRight,
  Layers,
  LockKeyhole,
  CircleHelp,
};
export type IconName = keyof typeof icons;
@Component({ selector: 'h-icon', template: '', host: { 'aria-hidden': 'true', class: 'icon' } })
export class IconComponent {
  name = input<IconName>('ArrowRight');
  private host = inject(ElementRef<HTMLElement>);
  constructor() {
    afterRenderEffect(() => {
      this.host.nativeElement.replaceChildren(
        createElement(icons[this.name()], { width: 20, height: 20, 'stroke-width': 1.6 }),
      );
    });
  }
}
