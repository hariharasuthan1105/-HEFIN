import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, delay, of, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { PatientApiService } from './patient-api.service';
import { AssistantCard, AssistantResponse, ChatMessageItem } from '../models/patient.models';

export const DEFAULT_SUGGESTED_QUESTIONS = [
  'What is the status of my claim?',
  'Show my unpaid bills',
  'How much coverage is remaining?',
  'When is my next appointment?',
  'Show my latest medical records',
  'Show my care journey',
];

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private api = inject(PatientApiService);
  private auth = inject(AuthService);

  readonly isOpen = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly messages = signal<ChatMessageItem[]>([]);
  readonly suggestedQuestions = signal<string[]>(DEFAULT_SUGGESTED_QUESTIONS);
  readonly activeTabNav = signal<string | null>(null);

  constructor() {
    this.initWelcomeMessage();
  }

  initWelcomeMessage(): void {
    const user = this.auth.currentUser();
    const name = user.first_name || 'Patient';
    this.messages.set([
      {
        id: 'welcome-0',
        role: 'assistant',
        content: `Hello ${name}. I am the HEFIN Care Assistant, grounded in your authenticated synthetic records. You can ask me to track your claims, explain hospital bills and patient responsibility, review insurance coverage, check upcoming appointments, or summarize your care journey.`,
        intent: 'welcome',
        cards: [],
        suggested_actions: [
          'What is the status of my claim?',
          'Show my unpaid bills',
          'How much coverage is remaining?',
          'When is my next appointment?',
        ],
        simulation: true,
        disclaimer: 'DEMO — SIMULATED HEALTHCARE AND INSURANCE DATA',
        created_at: new Date().toISOString(),
      },
    ]);
  }

  toggleChat(): void {
    this.isOpen.update((v) => !v);
  }

  openChat(): void {
    this.isOpen.set(true);
  }

  closeChat(): void {
    this.isOpen.set(false);
  }

  clearChat(): void {
    const mode = this.api.apiMode();
    if (mode === 'live') {
      this.api.clearAssistantMessages().subscribe({
        next: () => {
          this.initWelcomeMessage();
        },
        error: () => {
          this.initWelcomeMessage();
        },
      });
    } else {
      this.initWelcomeMessage();
    }
  }

  sendMessage(text: string): void {
    const trimmed = text.trim();
    if (!trimmed || this.isLoading()) return;

    // 1. Append user message
    const userMsg: ChatMessageItem = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    this.messages.update((list) => [...list, userMsg]);
    this.isLoading.set(true);
    this.error.set('');

    const mode = this.api.apiMode();

    if (mode === 'live') {
      this.api.sendAssistantMessage(trimmed).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          const assistantMsg: ChatMessageItem = {
            id: res.id || `ast-${Date.now()}`,
            role: 'assistant',
            content: res.message,
            intent: res.intent,
            cards: res.cards || [],
            suggested_actions: res.suggested_actions || [],
            navigation_target: res.navigation_target || '',
            simulation: true,
            disclaimer: res.disclaimer || 'DEMO — SIMULATED HEALTHCARE AND INSURANCE DATA',
            created_at: res.created_at || new Date().toISOString(),
          };
          this.messages.update((list) => [...list, assistantMsg]);
          if (res.navigation_target) {
            this.activeTabNav.set(res.navigation_target);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          const errorMsg: ChatMessageItem = {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `Backend service is temporarily unreachable at ${this.api.baseUrl}. Please verify your network connection or backend deployment status, or switch to simulated demo mode.`,
            error: true,
            suggested_actions: ['Use Simulated Demo Mode', 'Retry Question'],
            simulation: true,
            disclaimer: 'DEMO — SIMULATED HEALTHCARE AND INSURANCE DATA',
            created_at: new Date().toISOString(),
          };
          this.messages.update((list) => [...list, errorMsg]);
        },
      });
    } else {
      // Deterministic synthetic fallback for static preview / GitHub Pages
      const username = this.auth.currentUser().username;
      const res = this.api.generateSimulatedAssistantResponse(trimmed, username);

      setTimeout(() => {
        this.isLoading.set(false);
        const assistantMsg: ChatMessageItem = {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          content: res.message,
          intent: res.intent,
          cards: res.cards || [],
          suggested_actions: res.suggested_actions || [],
          navigation_target: res.navigation_target || '',
          simulation: true,
          disclaimer: res.disclaimer || 'DEMO — SIMULATED HEALTHCARE AND INSURANCE DATA',
          created_at: new Date().toISOString(),
        };
        this.messages.update((list) => [...list, assistantMsg]);
        if (res.navigation_target) {
          this.activeTabNav.set(res.navigation_target);
        }
      }, 350);
    }
  }

  onQuickAction(question: string): void {
    if (question === 'Use Simulated Demo Mode') {
      this.api.setMode('simulated');
      this.sendMessage('Show my latest claim status');
      return;
    }
    this.sendMessage(question);
  }

  navigateTo(target: string): void {
    if (target) {
      this.activeTabNav.set(target);
    }
  }

  clearNav(): void {
    this.activeTabNav.set(null);
  }
}
