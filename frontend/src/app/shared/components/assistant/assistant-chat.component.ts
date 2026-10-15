import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
  afterRenderEffect,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../core/services/chat.service';
import { IconComponent } from '../icon.component';
import { AssistantCard } from '../../../core/models/patient.models';

@Component({
  selector: 'h-assistant-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <!-- 1. Floating Launcher Button (when not embedded inline) -->
    @if (!inline) {
      <button
        type="button"
        class="assistant-floating-launcher"
        [class.active]="chat.isOpen()"
        (click)="chat.toggleChat()"
        aria-label="Open HEFIN Care Assistant"
        title="Open HEFIN Care Assistant"
        id="assistant-launcher-btn"
      >
        <span class="pulse-ring"></span>
        <h-icon [name]="chat.isOpen() ? 'X' : 'Sparkles'" />
        <span class="launcher-label">{{ chat.isOpen() ? 'Close' : 'Care Assistant' }}</span>
      </button>
    }

    <!-- 2. Chat Panel (shown if inline OR if chat.isOpen()) -->
    @if (inline || chat.isOpen()) {
      <div
        class="assistant-panel"
        [class.inline-mode]="inline"
        [class.floating-mode]="!inline"
        role="region"
        aria-label="HEFIN Care Assistant Chat Interface"
        (keydown.escape)="onEscape()"
      >
        <!-- Header -->
        <header class="assistant-header">
          <div class="header-info">
            <div class="assistant-avatar" aria-hidden="true">
              <h-icon name="Sparkles" />
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 class="assistant-title">HEFIN Care Assistant</h3>
                <span class="mode-tag">SYNTHETIC INQUIRY</span>
              </div>
              <span class="assistant-status">
                <span class="status-indicator-dot"></span>
                Grounded in authenticated synthetic records
              </span>
            </div>
          </div>
          <div class="header-controls">
            <button
              type="button"
              class="icon-action-btn"
              (click)="chat.clearChat()"
              title="Clear active conversation history"
              aria-label="Clear chat session"
              id="assistant-clear-btn"
            >
              <h-icon name="RotateCcw" />
            </button>
            @if (!inline) {
              <button
                type="button"
                class="icon-action-btn"
                (click)="chat.closeChat()"
                title="Close Care Assistant"
                aria-label="Close Care Assistant"
                id="assistant-close-btn"
              >
                <h-icon name="X" />
              </button>
            }
          </div>
        </header>

        <!-- Obvious Demo Notice Banner -->
        <div class="assistant-banner" role="note">
          <span class="banner-badge">DEMO</span>
          <span>SIMULATED HEALTHCARE & INSURANCE DATA — No live medical advice</span>
        </div>

        <!-- Messages Scroll Container -->
        <div
          class="assistant-body"
          #scrollContainer
          aria-live="polite"
          aria-atomic="false"
        >
          @for (msg of chat.messages(); track msg.id || $index) {
            <div
              class="chat-row"
              [class.user]="msg.role === 'user'"
              [class.assistant]="msg.role === 'assistant'"
            >
              @if (msg.role === 'assistant') {
                <div class="msg-avatar" aria-hidden="true">
                  <h-icon name="Bot" />
                </div>
              }
              <div class="msg-bubble" [class.has-error]="msg.error">
                <p class="msg-text">{{ msg.content }}</p>

                <!-- Structured Response Cards -->
                @if (msg.cards && msg.cards.length > 0) {
                  <div class="msg-cards">
                    @for (card of msg.cards; track $index) {
                      <!-- A. Claim Card -->
                      @if (card.type === 'claim') {
                        <div class="assistant-card claim-card" role="article" aria-label="Claim Progress Summary">
                          <div class="card-header">
                            <span class="card-chip violet">Claim Progress</span>
                            <span class="card-id">{{ card.claim_id }}</span>
                          </div>
                          <h4 class="card-title">{{ card.treatment }}</h4>
                          <div class="card-meta">{{ card.hospital }} · Filed {{ card.claim_date }}</div>
                          <div class="card-metrics-grid">
                            <div class="metric-item">
                              <span class="label">CLAIMED</span>
                              <span class="value">{{ card.claimed_amount_formatted || ('₹' + card.claimed_amount) }}</span>
                            </div>
                            <div class="metric-item">
                              <span class="label">APPROVED</span>
                              <span class="value success">{{ card.approved_amount_formatted || ('₹' + card.approved_amount) }}</span>
                            </div>
                            <div class="metric-item">
                              <span class="label">STATUS</span>
                              <span class="value highlight">{{ card.status_display }}</span>
                            </div>
                          </div>
                          <div class="card-status-info">
                            <div><strong>Current Stage:</strong> {{ card.current_stage }}</div>
                            <div><strong>Missing Documents:</strong> {{ card.missing_documents }}</div>
                            <div><strong>Next Action:</strong> {{ card.next_action }}</div>
                          </div>

                          @if (card.timeline_steps && card.timeline_steps.length > 0) {
                            <div class="card-steps-summary">
                              <span class="steps-heading">Verified Processing Steps:</span>
                              @for (step of card.timeline_steps; track step.step) {
                                <div class="step-trace-row">
                                  <span class="step-dot"></span>
                                  <div class="step-content">
                                    <strong>{{ step.step }}</strong> ({{ step.timestamp }})
                                    <div class="step-note">{{ step.note }}</div>
                                  </div>
                                </div>
                              }
                            </div>
                          }

                          <div class="card-actions">
                            <button
                              type="button"
                              class="card-action-btn"
                              (click)="onCardNavigate('insurance')"
                            >
                              Open Claims in Workspace <h-icon name="ArrowRight" />
                            </button>
                          </div>
                        </div>
                      }

                      <!-- B. Medical Bill Card -->
                      @if (card.type === 'bill') {
                        <div class="assistant-card bill-card" role="article" aria-label="Medical Bill Summary">
                          <div class="card-header">
                            <span class="card-chip gold">Medical Bill</span>
                            <span class="card-id">{{ card.invoice_number }}</span>
                          </div>
                          <div class="card-meta">{{ card.hospital }} · Due {{ card.due_date }}</div>
                          <div class="card-metrics-grid">
                            <div class="metric-item">
                              <span class="label">TOTAL BILLED</span>
                              <span class="value">{{ card.total_amount_formatted }}</span>
                            </div>
                            <div class="metric-item">
                              <span class="label">COVERED</span>
                              <span class="value success">{{ card.simulated_coverage_amount_formatted }}</span>
                            </div>
                            <div class="metric-item">
                              <span class="label">PATIENT SHARE</span>
                              <span class="value gold">{{ card.estimated_patient_responsibility_formatted }}</span>
                            </div>
                          </div>

                          @if (card.line_items && card.line_items.length > 0) {
                            <div class="card-line-items">
                              <span class="items-heading">Itemized Hospital Services:</span>
                              @for (item of card.line_items; track item.service_code || $index) {
                                <div class="line-item-row">
                                  <span class="item-name">{{ item.description }}</span>
                                  <span class="item-cost">{{ item.patient_share_formatted }}</span>
                                </div>
                              }
                            </div>
                          }

                          <div class="card-actions">
                            <button
                              type="button"
                              class="card-action-btn"
                              (click)="onCardNavigate('bills')"
                            >
                              View Itemized Invoices <h-icon name="ArrowRight" />
                            </button>
                          </div>
                        </div>
                      }

                      <!-- C. Insurance Coverage Card -->
                      @if (card.type === 'insurance') {
                        <div class="assistant-card insurance-card" role="article" aria-label="Insurance Policy Coverage">
                          <div class="card-header">
                            <span class="card-chip cyan">Insurance Coverage</span>
                            <span class="card-id">{{ card.policy_number }}</span>
                          </div>
                          <h4 class="card-title">{{ card.plan_name }}</h4>
                          <div class="card-meta">{{ card.fictional_insurer }}</div>
                          <div class="card-metrics-grid">
                            <div class="metric-item">
                              <span class="label">ANNUAL LIMIT</span>
                              <span class="value">{{ card.coverage_limit_formatted }}</span>
                            </div>
                            <div class="metric-item">
                              <span class="label">REMAINING</span>
                              <span class="value success">{{ card.remaining_coverage_formatted }}</span>
                            </div>
                            <div class="metric-item">
                              <span class="label">CO-PAY</span>
                              <span class="value">{{ card.co_pay_percentage }}%</span>
                            </div>
                          </div>
                          <div class="card-exclusions">
                            <strong>Policy Exclusions:</strong> {{ card.exclusions }}
                          </div>
                          <div class="card-actions">
                            <button
                              type="button"
                              class="card-action-btn"
                              (click)="onCardNavigate('insurance')"
                            >
                              View Insurance Workspace <h-icon name="ArrowRight" />
                            </button>
                          </div>
                        </div>
                      }

                      <!-- D. Appointment Card -->
                      @if (card.type === 'appointment') {
                        <div class="assistant-card appointment-card" role="article" aria-label="Appointment Details">
                          <div class="card-header">
                            <span class="card-chip cyan">Consultation</span>
                            <span class="card-id">{{ card.appointment_id }}</span>
                          </div>
                          <h4 class="card-title">{{ card.clinician }}</h4>
                          <div class="card-meta">{{ card.department }} · {{ card.facility }}</div>
                          <div class="card-datetime">
                            <h-icon name="Calendar" />
                            <span>{{ card.datetime_formatted || card.datetime }}</span>
                          </div>
                          <div class="card-instructions">
                            <strong>Instructions:</strong> {{ card.instructions }}
                          </div>
                          <div class="card-actions">
                            <button
                              type="button"
                              class="card-action-btn"
                              (click)="onCardNavigate('timeline')"
                            >
                              View Care Timeline <h-icon name="ArrowRight" />
                            </button>
                          </div>
                        </div>
                      }

                      <!-- E. Medical Record Card -->
                      @if (card.type === 'record') {
                        <div class="assistant-card record-card" role="article" aria-label="Health Record Summary">
                          <div class="card-header">
                            <span class="card-chip emerald">{{ card.record_type_display || 'Report' }}</span>
                            <span class="card-id">{{ card.record_id }}</span>
                          </div>
                          <h4 class="card-title">{{ card.title }}</h4>
                          <div class="card-meta">{{ card.facility }} · {{ card.record_date_formatted }}</div>
                          <p class="card-summary">{{ card.summary }}</p>
                          @if (card.vitals && objectKeys(card.vitals).length > 0) {
                            <div class="card-vitals-row">
                              @for (k of objectKeys(card.vitals); track k) {
                                <span class="vital-pill">{{ k }}: {{ card.vitals[k] }}</span>
                              }
                            </div>
                          }
                          <div class="card-actions">
                            <button
                              type="button"
                              class="card-action-btn"
                              (click)="onCardNavigate('records')"
                            >
                              Open Health Records <h-icon name="ArrowRight" />
                            </button>
                          </div>
                        </div>
                      }

                      <!-- F. Care Journey Timeline Card -->
                      @if (card.type === 'timeline') {
                        <div class="assistant-card timeline-card" role="article" aria-label="Care Journey Timeline">
                          <div class="card-header">
                            <span class="card-chip violet">Care Journey</span>
                          </div>
                          <div class="timeline-list">
                            @for (ev of card.events; track ev.id) {
                              <div class="timeline-mini-item">
                                <span class="dot" [class]="ev.badge_tone || 'cyan'"></span>
                                <div class="info">
                                  <strong>{{ ev.title }}</strong>
                                  <span>{{ ev.facility }} · {{ ev.date }}</span>
                                </div>
                              </div>
                            }
                          </div>
                          <div class="card-actions">
                            <button
                              type="button"
                              class="card-action-btn"
                              (click)="onCardNavigate('timeline')"
                            >
                              Open Care Timeline <h-icon name="ArrowRight" />
                            </button>
                          </div>
                        </div>
                      }

                      <!-- G. Navigation Card -->
                      @if (card.type === 'navigation') {
                        <div class="assistant-card navigation-card" role="article" aria-label="Quick Navigation">
                          <div class="card-header">
                            <span class="card-chip gold">Quick Navigation</span>
                          </div>
                          <p style="margin: 4px 0 10px; font-size: 0.82rem; color: var(--text);">
                            {{ card.description }}
                          </p>
                          <div class="card-actions">
                            <button
                              type="button"
                              class="card-action-btn"
                              (click)="onCardNavigate(card.target || 'dashboard')"
                            >
                              {{ card.label }} <h-icon name="ArrowRight" />
                            </button>
                          </div>
                        </div>
                      }
                    }
                  </div>
                }

                <!-- Suggested Actions Chips -->
                @if (msg.suggested_actions && msg.suggested_actions.length > 0) {
                  <div class="msg-suggested-actions">
                    @for (action of msg.suggested_actions; track action) {
                      <button
                        type="button"
                        class="action-chip"
                        (click)="chat.onQuickAction(action)"
                      >
                        {{ action }}
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- Typing Indicator -->
          @if (chat.isLoading()) {
            <div class="chat-row assistant loading-row" aria-live="assertive">
              <div class="msg-avatar" aria-hidden="true">
                <h-icon name="Bot" />
              </div>
              <div class="msg-bubble typing-bubble">
                <div class="spectral-dots">
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                </div>
                <span class="loading-label">Grounding response in synthetic database...</span>
              </div>
            </div>
          }
        </div>

        <!-- Quick Questions Chips -->
        <div class="assistant-quick-prompts">
          <span class="prompts-label">SUGGESTED QUESTIONS:</span>
          <div class="chips-scroll">
            @for (q of chat.suggestedQuestions(); track q) {
              <button
                type="button"
                class="quick-prompt-chip"
                (click)="chat.onQuickAction(q)"
              >
                {{ q }}
              </button>
            }
          </div>
        </div>

        <!-- Message Input Footer -->
        <footer class="assistant-footer">
          <form class="assistant-input-form" (ngSubmit)="submitMessage()">
            <input
              type="text"
              class="assistant-input"
              placeholder="Ask about claims, bills, coverage, appointments..."
              [(ngModel)]="userInput"
              name="assistantInput"
              [disabled]="chat.isLoading()"
              autocomplete="off"
              id="assistant-query-input"
              aria-label="Ask HEFIN Care Assistant"
            />
            <button
              type="submit"
              class="assistant-send-btn"
              [disabled]="!userInput.trim() || chat.isLoading()"
              aria-label="Send message to assistant"
              id="assistant-send-btn"
            >
              <h-icon name="ArrowRight" />
            </button>
          </form>
        </footer>
      </div>
    }
  `,
})
export class AssistantChatComponent {
  chat = inject(ChatService);

  @Input() inline = false;
  @Output() navigateTab = new EventEmitter<string>();

  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

  userInput = '';

  constructor() {
    afterRenderEffect(() => {
      // Auto scroll to bottom when messages update
      const msgs = this.chat.messages();
      if (msgs.length && this.scrollContainer) {
        const el = this.scrollContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    });
  }

  submitMessage(): void {
    const text = this.userInput.trim();
    if (!text) return;
    this.userInput = '';
    this.chat.sendMessage(text);
  }

  onCardNavigate(target: string): void {
    if (!target) return;
    this.navigateTab.emit(target);
    this.chat.navigateTo(target);
    if (!this.inline) {
      // Keep chat accessible or minimized as desired
    }
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (!this.inline && this.chat.isOpen()) {
      this.chat.closeChat();
    }
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
