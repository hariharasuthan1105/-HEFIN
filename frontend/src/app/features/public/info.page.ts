import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  PageContainerComponent,
  StatusBadgeComponent,
  GradientButtonComponent,
} from '../../shared/components/ui';
import { IconComponent } from '../../shared/components/icon.component';
const CONTENT: Record<
  string,
  { label: string; title: string; description: string; cards: { title: string; body: string }[] }
> = {
  about: {
    label: 'OUR PURPOSE',
    title: 'Care should build confidence.',
    description:
      'HEFIN explores a simple idea: healthcare and financial protection work better when they work together.',
    cards: [
      {
        title: 'Our mission',
        body: 'Make the journey between care, coverage and support easier to understand.',
      },
      {
        title: 'Our vision',
        body: 'A connected ecosystem where patients, hospitals, insurers and public programs can coordinate responsibly.',
      },
      {
        title: 'Our approach',
        body: 'Start with a focused prototype, validate with people, and build toward carefully governed pilots.',
      },
    ],
  },
  solution: {
    label: 'THE HEFIN APPROACH',
    title: 'One journey. Fewer gaps.',
    description:
      'A proposed connection between preventive care, hospital coordination and financial protection.',
    cards: [
      {
        title: 'Preventive care',
        body: 'Plan a clearer view of screening schedules, checkups and follow-up care.',
      },
      {
        title: 'Hospital coordination',
        body: 'Connect admissions, eligibility review and emergency assistance requests.',
      },
      {
        title: 'Insurance clarity',
        body: 'Make policy details, documents and human review decisions easier to follow.',
      },
      {
        title: 'Financial transparency',
        body: 'Show understandable claim timelines and simulated expenses.',
      },
      {
        title: 'AI assistance',
        body: 'Explain information with permission-aware retrieval and verifiable sources.',
      },
      {
        title: 'People in control',
        body: 'Keep final authorization decisions with qualified human reviewers.',
      },
    ],
  },
  'how-it-works': {
    label: 'THE CONNECTED JOURNEY',
    title: 'From care to confidence.',
    description: 'Explore the proposed emergency claim workflow. Select a step to see its role.',
    cards: [],
  },
  roadmap: {
    label: 'FROM VISION TO REALITY',
    title: 'Progress with purpose.',
    description:
      'A proposed roadmap. Every expansion depends on validation, partnerships and appropriate approvals.',
    cards: [
      {
        title: '01 / Prototype — current',
        body: 'Build the frontend foundation, then connect synthetic data and test one complete claim scenario.',
      },
      {
        title: '02 / Pilot — proposed',
        body: 'Validate usability and operational requirements with consenting participants and prospective partners.',
      },
      {
        title: '03 / Regional expansion — proposed',
        body: 'Adapt workflows based on pilot evidence and local requirements.',
      },
      {
        title: '04 / Nationwide integration — aspirational',
        body: 'Explore interoperable program connections. No government integration is currently active.',
      },
      {
        title: '05 / International expansion — aspirational',
        body: 'Evaluate different healthcare and insurance environments only after the earlier phases.',
      },
    ],
  },
  contact: {
    label: 'LET’S CONNECT',
    title: 'Better care starts with a conversation.',
    description:
      'The contact channel is being prepared. Message submission will be enabled when the Django backend is connected.',
    cards: [
      {
        title: 'Future collaboration',
        body: 'Hospital, insurance and public-program inquiries will have a dedicated contact workflow in a later phase.',
      },
      {
        title: 'Your information',
        body: 'No contact or health information is collected on this Day 1 preview.',
      },
    ],
  },
  'not-found': {
    label: '404 / ROUTE NOT FOUND',
    title: 'Let’s get you back on track.',
    description: 'This page is not part of the HEFIN prototype.',
    cards: [],
  },
};
@Component({
  selector: 'h-info-page',
  imports: [PageContainerComponent, StatusBadgeComponent, GradientButtonComponent, IconComponent],
  template: `<h-page-container
    ><section class="page-heading">
      <p class="eyebrow">{{ content().label }}</p>
      <h1>{{ content().title }}</h1>
      <p>{{ content().description }}</p>
      <h-status-badge tone="gold">PROTOTYPE · PROPOSED PLATFORM</h-status-badge>
    </section>
    @if (page() === 'how-it-works') {
      <div class="process-tabs" aria-label="Claim workflow steps">
        @for (step of steps; track step.title; let i = $index) {
          <button
            [class.selected]="selected() === i"
            [attr.aria-pressed]="selected() === i"
            (click)="selected.set(i)"
          >
            <span>0{{ i + 1 }}</span
            >{{ step.title }}<h-icon name="ChevronRight" />
          </button>
        }
      </div>
      <section class="process-detail" aria-live="polite">
        <p class="eyebrow">STEP 0{{ selected() + 1 }} / PROPOSED WORKFLOW</p>
        <h2>{{ steps[selected()]?.title }}</h2>
        <p>{{ steps[selected()]?.body }}</p>
      </section>
    }
    <div class="info-grid">
      @for (card of content().cards; track card.title) {
        <article class="glass-card">
          <h3>{{ card.title }}</h3>
          <p>{{ card.body }}</p>
        </article>
      }
    </div>
    <div class="page-bottom">
      <h-gradient-button [to]="page() === 'not-found' ? '/' : '/login'">{{
        page() === 'not-found' ? 'Back to home' : 'Explore the portal previews'
      }}</h-gradient-button>
    </div></h-page-container
  >`,
})
export class InfoPage {
  private data = inject(ActivatedRoute).data;
  page = toSignal(this.data.pipe(map((d) => String(d['page']))), { initialValue: 'about' });
  content = toSignal(
    this.data.pipe(map((d) => CONTENT[String(d['page'])] ?? CONTENT['not-found']!)),
    { initialValue: CONTENT['about']! },
  );
  selected = signal(0);
  steps = [
    {
      title: 'Citizen',
      body: 'A synthetic patient seeks care and shares the necessary information with consent.',
    },
    {
      title: 'Hospital',
      body: 'Hospital staff registers an admission and submits an emergency request.',
    },
    {
      title: 'HEFIN',
      body: 'The future backend checks eligibility and organizes relevant policy information for review.',
    },
    {
      title: 'Insurer',
      body: 'A human reviewer inspects the documents, considers the policy and records a decision.',
    },
    {
      title: 'Authorization',
      body: 'A simulated authorization and its reasons are recorded in an audit trail. No money is transferred.',
    },
    {
      title: 'Claim timeline',
      body: 'Patient and hospital portals reflect the same status while public analytics receive only aggregate metrics.',
    },
  ];
}
