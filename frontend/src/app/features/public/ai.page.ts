import { Component } from '@angular/core';
import { AIBrainScene } from '../../three-d/ai-brain/ai-brain-scene';
import { StatusBadgeComponent, GradientButtonComponent } from '../../shared/components/ui';
@Component({
  selector: 'h-ai-page',
  imports: [AIBrainScene, StatusBadgeComponent, GradientButtonComponent],
  template: `<section class="container ai-page page-enter">
    <div>
      <p class="eyebrow">HEFIN AI / NEURAL INTELLIGENCE</p>
      <h1>Understanding<br />is a form of care.</h1>
      <p>
        A future assistant for clearer policy explanations, document summaries and guided
        information discovery.
      </p>
      <h-status-badge tone="gold">AI SERVICE NOT CONNECTED</h-status-badge>
      <div class="notice">
        <div>
          <h3>Grounded answers. Human decisions.</h3>
          <p>
            Planned retrieval will cite authorized source documents. AI will assist reviewers and
            will not approve claims or make medical decisions.
          </p>
        </div>
      </div>
      <h-gradient-button to="/roadmap" [secondary]="true"
        >Explore the development plan</h-gradient-button
      >
    </div>
    <h-ai-brain-scene />
  </section>`,
})
export class AIPage {}
