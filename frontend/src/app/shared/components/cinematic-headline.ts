import { Component, computed, input } from '@angular/core';
import { RevealDirective } from '../directives/reveal.directive';
@Component({
  selector: 'h-cinematic-headline',
  hostDirectives: [RevealDirective],
  template: `<span class="sr-only">{{ text() }}</span
    ><span aria-hidden="true" class="headline-words">
      @for (word of words(); track $index) {
        <span class="headline-mask"
          ><span
            [style.--word-index]="$index"
            [class.accent-word]="word.toLowerCase().includes(accent().toLowerCase()) && !!accent()"
            >{{ word }}</span
          ></span
        >
      }
    </span>`,
})
export class CinematicHeadline {
  text = input.required<string>();
  accent = input('');
  words = computed(() => this.text().split(/\s+/));
}
