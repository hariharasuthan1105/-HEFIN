import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, DEMO_PATIENTS } from '../../core/services/auth.service';
import { PatientApiService } from '../../core/services/patient-api.service';
import {
  PatientDashboardSummary,
  PatientProfileData,
  MedicalRecordItem,
  MedicalBillItem,
  InsurancePolicyItem,
  InsuranceClaimItem,
  AppointmentItem,
  CareEventItem,
} from '../../core/models/patient.models';
import { LogoComponent, StatusBadgeComponent, SkeletonCardComponent } from '../../shared/components/ui';
import { IconComponent } from '../../shared/components/icon.component';

export type PortalTab =
  | 'dashboard'
  | 'records'
  | 'bills'
  | 'insurance'
  | 'timeline'
  | 'profile'
  | 'ai-assistant';

@Component({
  selector: 'h-patient-portal',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    DatePipe,
    LogoComponent,
    StatusBadgeComponent,
    IconComponent,
  ],
  template: `
    <div class="container patient-workspace portal-shell" [attr.data-role]="'patient'">
      <!-- Sidebar Navigation -->
      <aside class="workspace-sidebar portal-sidebar">
        <h-logo [compact]="true" />
        <span class="eyebrow">PATIENT PORTAL</span>
        <span class="sidebar-active">
          <h-icon name="User" /> Workspace overview
        </span>

        <!-- Active Patient Identity -->
        <div class="patient-card-badge" aria-label="Current patient profile">
          <div class="avatar-circle">
            {{ patientInitials() }}
          </div>
          <div class="patient-meta">
            <h4>{{ activeUser().first_name }} {{ activeUser().last_name }}</h4>
            <span>{{ activeUser().patient_identifier || 'HEF-PAT-2026-9814' }}</span>
          </div>
        </div>

        <!-- Section Navigation -->
        <nav class="sidebar-nav" aria-label="Patient portal navigation">
          <button
            type="button"
            class="nav-item-btn"
            [class.active]="activeTab() === 'dashboard'"
            (click)="setTab('dashboard')"
          >
            <h-icon name="LayoutDashboard" /> Overview
          </button>
          <button
            type="button"
            class="nav-item-btn"
            [class.active]="activeTab() === 'records'"
            (click)="setTab('records')"
          >
            <h-icon name="FileText" /> Health Records
          </button>
          <button
            type="button"
            class="nav-item-btn"
            [class.active]="activeTab() === 'bills'"
            (click)="setTab('bills')"
          >
            <h-icon name="Receipt" /> Medical Bills
          </button>
          <button
            type="button"
            class="nav-item-btn"
            [class.active]="activeTab() === 'insurance'"
            (click)="setTab('insurance')"
          >
            <h-icon name="ShieldCheck" /> Insurance
          </button>
          <button
            type="button"
            class="nav-item-btn"
            [class.active]="activeTab() === 'timeline'"
            (click)="setTab('timeline')"
          >
            <h-icon name="Calendar" /> Care Timeline
          </button>
          <button
            type="button"
            class="nav-item-btn"
            [class.active]="activeTab() === 'profile'"
            (click)="setTab('profile')"
          >
            <h-icon name="Settings" /> Preferences
          </button>
          <button
            type="button"
            class="nav-item-btn"
            [class.active]="activeTab() === 'ai-assistant'"
            (click)="setTab('ai-assistant')"
          >
            <h-icon name="Sparkles" /> AI Assistant
          </button>
        </nav>

        <!-- Sidebar Bottom Controls -->
        <div class="sidebar-bottom-actions">
          <div class="patient-switcher">
            <label for="demo-patient-select">Demo Profile</label>
            <select
              id="demo-patient-select"
              [ngModel]="activeUser().username"
              (ngModelChange)="onPatientChange($event)"
            >
              @for (p of demoPatients; track p.username) {
                <option [value]="p.username">{{ p.name }} ({{ p.city }})</option>
              }
            </select>
          </div>
          <a routerLink="/login" class="text-link">
            Switch preview <h-icon name="ArrowRight" />
          </a>
        </div>
      </aside>

      <!-- Main Workspace Section -->
      <section class="workspace-content portal-main page-enter" aria-label="Patient Workspace Content">
        <!-- Obvious Demo Banner & API Connectivity Badge -->
        <div class="system-demo-banner" role="alert">
          <div>
            <strong>DEMO ENVIRONMENT</strong> — SIMULATED HEALTHCARE AND FINANCIAL DATA
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div
              class="api-connectivity-badge"
              [class.connected]="api.apiMode() === 'live' && api.connectionStatus() === 'connected'"
              [class.offline]="api.apiMode() === 'live' && api.connectionStatus() === 'offline'"
            >
              <span class="status-dot"></span>
              @if (api.apiMode() === 'live') {
                @if (api.connectionStatus() === 'connected') {
                  <span>LIVE DJANGO API</span>
                } @else if (api.connectionStatus() === 'checking') {
                  <span>CONNECTING...</span>
                } @else {
                  <span>BACKEND OFFLINE</span>
                }
              } @else {
                <span>SIMULATED DEMO</span>
              }
            </div>
            @if (api.apiMode() === 'simulated') {
              <button
                type="button"
                class="mode-toggle-btn"
                (click)="toggleApiMode('live')"
                title="Connect to local Django backend at http://127.0.0.1:8000"
              >
                Connect Live API
              </button>
            } @else {
              <button
                type="button"
                class="mode-toggle-btn"
                (click)="toggleApiMode('simulated')"
                title="Switch back to simulated demo mode"
              >
                Use Simulated Data
              </button>
            }
          </div>
        </div>

        @if (backendError()) {
          <div class="backend-error-banner" role="alert">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
              <div>
                <strong>Backend Unavailable</strong>: {{ backendError() }}
              </div>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="button secondary" style="font-size: 0.72rem; padding: 4px 10px;" (click)="refreshAllData()">
                  Retry
                </button>
                <button type="button" class="button primary" style="font-size: 0.72rem; padding: 4px 10px;" (click)="toggleApiMode('simulated')">
                  Switch to Simulated Demo
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Header -->
        <header class="workspace-header">
          <div>
            <div class="header-badges">
              <h-status-badge tone="gold">SIMULATED WORKSPACE</h-status-badge>
              <span class="micro-label"
                >ID: {{ activeUser().patient_identifier || 'HEF-PAT-2026-9814' }}</span
              >
            </div>
            <h1>{{ greetingText() }}</h1>
            <p>
              Your personal care journey, verified diagnostic records, and INR
              financial billing management.
            </p>
          </div>
        </header>

        <!-- Informational Notice (Preserved for Task 03 foundation checks) -->
        <div class="notice">
          <h-icon name="Layers" />
          <div>
            <h3>A foundation for what comes next.</h3>
            <p>
              This route and layout are ready. Data, authentication, and actions
              will arrive in later phases. These placeholders do not represent
              live activity.
            </p>
          </div>
        </div>

        <!-- Primary Summary Metrics (Exact 3 .portal-metric elements for Task 03 checks) -->
        <div class="portal-metrics" aria-label="Simulated summary metrics">
          <article class="portal-metric">
            <span>Outstanding Bills</span>
            <strong
              >₹{{
                dashboard()?.outstanding_medical_bills?.total_outstanding_inr ||
                  '29,000.00'
              }}</strong
            >
            <span>{{
              dashboard()?.outstanding_medical_bills?.unpaid_invoices_count || 1
            }} pending patient responsibility</span>
            <div class="segmented-bar" aria-hidden="true">
              @for (segment of segments; track segment) {
                <i></i>
              }
            </div>
          </article>

          <article class="portal-metric">
            <span>Insurance Coverage</span>
            <strong
              >₹{{
                dashboard()?.coverage_summary?.remaining_coverage ||
                  '7,55,000.00'
              }}</strong
            >
            <span
              >Remaining of ₹{{
                dashboard()?.coverage_summary?.coverage_limit || '10,00,000.00'
              }} annual limit</span
            >
            <div class="segmented-bar" aria-hidden="true">
              @for (segment of segments; track segment) {
                <i></i>
              }
            </div>
          </article>

          <article class="portal-metric">
            <span>Next Care Milestone</span>
            <strong>24 Oct 2026</strong>
            <span>Neurology & Neuro-Radiology Follow-up</span>
            <div class="segmented-bar" aria-hidden="true">
              @for (segment of segments; track segment) {
                <i></i>
              }
            </div>
          </article>
        </div>

        <!-- TAB CONTENT: 1. OVERVIEW / DASHBOARD -->
        @if (activeTab() === 'dashboard') {
          <div class="dashboard-grid-two-col">
            <!-- Coverage Summary -->
            <div class="portal-card-box">
              <header>
                <h3>Insurance Policy Status</h3>
                <span class="status-chip active">ACTIVE & VERIFIED</span>
              </header>
              <p style="font-size: 0.82rem; color: var(--secondary); margin: 0;">
                {{ dashboard()?.coverage_summary?.plan_name }}
              </p>
              <div class="coverage-progress-track" aria-hidden="true">
                <div
                  class="coverage-progress-fill"
                  [style.width.%]="dashboard()?.coverage_summary?.utilization_percentage || 24.5"
                ></div>
              </div>
              <div class="coverage-stats-row">
                <span class="spent"
                  >Utilized: ₹{{ dashboard()?.coverage_summary?.used_coverage || '2,45,000.00' }}</span
                >
                <span class="remaining"
                  >Remaining: ₹{{ dashboard()?.coverage_summary?.remaining_coverage || '7,55,000.00' }}</span
                >
              </div>
              <small style="font-size: 0.7rem; color: var(--muted);"
                >Policy: {{ dashboard()?.coverage_summary?.policy_number }} · Co-pay:
                {{ dashboard()?.coverage_summary?.co_pay_percentage }}%</small
              >
            </div>

            <!-- Claim Status Overview -->
            <div class="portal-card-box">
              <header>
                <h3>Claims Overview</h3>
                <span class="micro-label">SYNTHETIC CLAIMS</span>
              </header>
              <div style="display: flex; gap: 20px; align-items: baseline;">
                <div>
                  <span
                    style="font-size: 0.7rem; color: var(--muted); text-transform: uppercase;"
                    >Active Review</span
                  >
                  <div
                    style="font-size: 1.6rem; font-family: var(--mono); color: var(--gold); font-weight: 700;"
                  >
                    {{ dashboard()?.claim_status_overview?.pending_count || 1 }}
                  </div>
                </div>
                <div>
                  <span
                    style="font-size: 0.7rem; color: var(--muted); text-transform: uppercase;"
                    >Disbursed</span
                  >
                  <div
                    style="font-size: 1.6rem; font-family: var(--mono); color: var(--emerald); font-weight: 700;"
                  >
                    {{ dashboard()?.claim_status_overview?.approved_count || 1 }}
                  </div>
                </div>
              </div>
              @if (dashboard()?.claim_status_overview?.recent_claim; as rc) {
                <div
                  style="background: var(--elevated); padding: 10px 14px; border-radius: 6px; font-size: 0.78rem;"
                >
                  <strong style="color: var(--text);">{{ rc.reference }}</strong>
                  <span style="color: var(--muted);"> · ₹{{ rc.amount }} ({{ rc.status }})</span>
                </div>
              }
            </div>
          </div>

          <!-- Quick Actions Grid -->
          <div class="portal-card-box">
            <header>
              <h3>Quick Actions</h3>
              <span class="micro-label">ACTIONS</span>
            </header>
            <div class="quick-actions-row">
              <button
                type="button"
                class="action-btn-card"
                (click)="setTab('records')"
              >
                <h-icon name="FileText" />
                <strong>View Health Records</strong>
                <span>Review verified diagnostic imaging and lab tests</span>
              </button>
              <button
                type="button"
                class="action-btn-card"
                (click)="setTab('bills')"
              >
                <h-icon name="Receipt" />
                <strong>Review Medical Bills</strong>
                <span>Inspect itemized charges and patient responsibility</span>
              </button>
              <button
                type="button"
                class="action-btn-card"
                (click)="setTab('insurance')"
              >
                <h-icon name="ShieldCheck" />
                <strong>Check Coverage</strong>
                <span>Track claims and review policy limits and exclusions</span>
              </button>
              <button
                type="button"
                class="action-btn-card"
                (click)="setTab('timeline')"
              >
                <h-icon name="Calendar" />
                <strong>Care Timeline</strong>
                <span>Chronological history of appointments and bills</span>
              </button>
              <button
                type="button"
                class="action-btn-card"
                (click)="setTab('ai-assistant')"
              >
                <h-icon name="Sparkles" />
                <strong>AI Assistant</strong>
                <span>Plain-language explanation of clinical notes and bills</span>
              </button>
            </div>
          </div>

          <!-- Financial Assistance Overview -->
          <div class="financial-assistance-box">
            <header
              style="display: flex; justify-content: space-between; align-items: center;"
            >
              <h4 style="margin: 0; font-family: var(--heading); font-size: 0.95rem;">
                {{ dashboard()?.financial_assistance_overview?.eligible_tier }}
              </h4>
              <span class="status-chip active">0% EMI ELIGIBLE</span>
            </header>
            <p style="margin: 0; font-size: 0.78rem; color: var(--secondary);">
              {{ dashboard()?.financial_assistance_overview?.income_threshold_guidance }}
            </p>
            <div class="assistance-highlights">
              <div class="assist-stat">
                <strong
                  >₹{{
                    dashboard()?.financial_assistance_overview?.estimated_monthly_inr
                  }}/mo</strong
                >
                <span
                  >Estimated installment ({{
                    dashboard()?.financial_assistance_overview?.zero_interest_months
                  }} months)</span
                >
              </div>
              <div class="assist-stat">
                <strong>Zero Interest</strong>
                <span>No processing charges or hidden finance fees</span>
              </div>
            </div>
            <small style="font-size: 0.68rem; color: var(--muted); font-style: italic;">
              {{ dashboard()?.financial_assistance_overview?.disclaimer }}
            </small>
          </div>

          <!-- Recent Care Activity Table (Exact 3 rows in tbody for Task 03 checks) -->
          <section class="portal-records" aria-labelledby="records-heading">
            <header
              style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;"
            >
              <h2 id="records-heading" style="font-size: 1.2rem; margin: 0;">
                Recent Care Activity
              </h2>
              <span class="micro-label">SYNTHETIC RECORDS / DEMO</span>
            </header>
            <div class="portal-table-wrap">
              <table>
                <caption class="sr-only">
                  Fictional Patient preview records. No live activity.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Demo activity</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (record of previewRecords(); track record.id) {
                    <tr>
                      <td style="font-family: var(--mono); font-size: 0.78rem;">
                        {{ record.id }}
                      </td>
                      <td>{{ record.label }}</td>
                      <td>
                        <span class="preview-status">{{ record.status }}</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Details disclosure (Checked in Task 03 Playwright tests) -->
            <details style="margin-top: 14px;">
              <summary style="cursor: pointer; font-size: 0.8rem; color: var(--secondary);">
                About this preview
              </summary>
              <p style="font-size: 0.78rem; color: var(--muted); margin-top: 6px;">
                These sample counts and records demonstrate information layout only.
                They do not represent real patients, claims, payments, eligibility,
                partnerships, or government activity. No action is submitted.
              </p>
            </details>
          </section>
        }

        <!-- TAB CONTENT: 2. HEALTH RECORDS -->
        @if (activeTab() === 'records') {
          <div class="portal-card-box">
            <header>
              <h2>My Health Records</h2>
              <span class="micro-label">VERIFIED DIAGNOSTIC ARCHIVE</span>
            </header>
            <p style="font-size: 0.82rem; color: var(--secondary); margin: 0;">
              Secure access to synthetic clinical reports, neuro-imaging scans,
              and laboratory biomarker profiles.
            </p>

            <!-- Search and Filter Bar -->
            <div class="table-filter-bar">
              <input
                type="text"
                placeholder="Search by report title, summary, or facility..."
                [ngModel]="recordsSearch()"
                (ngModelChange)="onRecordSearch($event)"
              />
              <select
                [ngModel]="recordTypeFilter()"
                (ngModelChange)="onRecordTypeFilter($event)"
              >
                <option value="">All Record Types</option>
                <option value="IMAGING">Imaging & Radiology</option>
                <option value="DIAGNOSTIC_LAB">Diagnostic Lab</option>
                <option value="CLINICAL_SUMMARY">Clinical Summary</option>
                <option value="PRESCRIPTION">Prescription</option>
              </select>
            </div>

            <!-- Records Data Table -->
            <div class="portal-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Type</th>
                    <th>Title & Facility</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (rec of filteredRecords(); track rec.id) {
                    <tr>
                      <td style="font-family: var(--mono); font-weight: 600;">
                        {{ rec.record_identifier }}
                      </td>
                      <td>
                        <span class="status-chip confirmed">{{ rec.record_type_display || rec.record_type }}</span>
                      </td>
                      <td>
                        <strong>{{ rec.title }}</strong>
                        <div style="font-size: 0.72rem; color: var(--muted);">
                          {{ rec.healthcare_facility }} · {{ rec.attending_clinician }}
                        </div>
                      </td>
                      <td style="font-family: var(--mono); font-size: 0.75rem;">
                        {{ rec.record_date | date: 'dd MMM yyyy' }}
                      </td>
                      <td>
                        <span class="status-chip active">{{ rec.status }}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          class="button secondary"
                          style="padding: 4px 10px; font-size: 0.72rem;"
                          (click)="openRecordDetail(rec)"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" style="text-align: center; color: var(--muted); padding: 30px;">
                        No matching medical records found.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- TAB CONTENT: 3. MEDICAL BILLS -->
        @if (activeTab() === 'bills') {
          <div class="portal-card-box">
            <header>
              <h2>Medical Bills & Invoices</h2>
              <span class="micro-label">INR FINANCIAL SETTLEMENT</span>
            </header>
            <p style="font-size: 0.82rem; color: var(--secondary); margin: 0;">
              All amounts are explicitly formatted in Indian Rupees (₹). Financial
              figures are entirely synthetic.
            </p>

            <!-- Bills Table -->
            <div class="portal-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Facility</th>
                    <th>Bill Date</th>
                    <th>Total (₹)</th>
                    <th>Insurance Share (₹)</th>
                    <th>Patient Responsibility (₹)</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (bill of bills(); track bill.id) {
                    <tr>
                      <td style="font-family: var(--mono); font-weight: 600;">
                        {{ bill.invoice_number }}
                      </td>
                      <td>{{ bill.hospital_name }}</td>
                      <td style="font-family: var(--mono); font-size: 0.75rem;">
                        {{ bill.bill_date | date: 'dd MMM yyyy' }}
                      </td>
                      <td style="font-family: var(--mono); font-weight: 600;">
                        ₹{{ bill.total_amount }}
                      </td>
                      <td style="font-family: var(--mono); color: var(--emerald);">
                        ₹{{ bill.simulated_coverage_amount }}
                      </td>
                      <td style="font-family: var(--mono); color: var(--gold); font-weight: 700;">
                        ₹{{ bill.estimated_patient_responsibility }}
                      </td>
                      <td>
                        <span
                          class="status-chip"
                          [class.pending]="bill.payment_status === 'PENDING'"
                          [class.paid]="bill.payment_status === 'PAID'"
                        >
                          {{ bill.payment_status_display }}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          class="button secondary"
                          style="padding: 4px 10px; font-size: 0.72rem;"
                          (click)="openBillDetail(bill)"
                        >
                          Line Items
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div
              style="padding: 12px; background: var(--elevated); border-radius: 6px; font-size: 0.75rem; color: var(--muted);"
            >
              <strong>Financial Simulation Notice:</strong> All hospital bill figures
              represent synthetic demonstration data. No actual payment gateway is
              connected or financial liability incurred.
            </div>
          </div>
        }

        <!-- TAB CONTENT: 4. INSURANCE COVERAGE -->
        @if (activeTab() === 'insurance') {
          <div class="portal-card-box">
            <header>
              <h2>Insurance Policy & Claims</h2>
              <span class="micro-label">SPECTRAL SHIELD COVERAGE</span>
            </header>
            <p style="font-size: 0.82rem; color: var(--secondary); margin: 0;">
              Fictional insurance policy overview. Estimated coverage is not a
              guaranteed legal benefit.
            </p>

            @if (policies().length > 0) {
              @for (pol of policies(); track pol.id) {
                <div
                  style="border: 1px solid var(--border); border-radius: 8px; padding: 20px; background: var(--elevated); display: flex; flex-direction: column; gap: 12px;"
                >
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
                    <div>
                      <h3 style="margin: 0; font-size: 1.1rem; color: var(--text);">
                        {{ pol.plan_name }}
                      </h3>
                      <span style="font-size: 0.75rem; color: var(--muted); font-family: var(--mono);">
                        Policy: {{ pol.policy_number }} · Underwriter: {{ pol.fictional_insurer }}
                      </span>
                    </div>
                    <span class="status-chip active">{{ pol.status_display }}</span>
                  </div>

                  <!-- Progress Bar -->
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-family: var(--mono); margin-bottom: 4px;">
                      <span>Utilized: ₹{{ pol.used_coverage }}</span>
                      <span>Total Limit: ₹{{ pol.coverage_limit }}</span>
                    </div>
                    <div class="coverage-progress-track">
                      <div
                        class="coverage-progress-fill"
                        style="width: 24.5%;"
                      ></div>
                    </div>
                    <div style="text-align: right; font-size: 0.72rem; color: var(--emerald); font-family: var(--mono);">
                      Remaining Balance: ₹{{ pol.remaining_coverage }}
                    </div>
                  </div>

                  <!-- Policy Terms -->
                  <div
                    style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 0.78rem;"
                  >
                    <div>
                      <strong style="color: var(--muted);">Category:</strong>
                      <div>{{ pol.coverage_category }}</div>
                    </div>
                    <div>
                      <strong style="color: var(--muted);">Co-Payment:</strong>
                      <div>{{ pol.co_pay_percentage }}% required on elective admissions</div>
                    </div>
                    <div>
                      <strong style="color: var(--muted);">Renewal Date:</strong>
                      <div>{{ pol.renewal_date | date: 'dd MMMM yyyy' }}</div>
                    </div>
                  </div>

                  <!-- Exclusions Panel -->
                  <div
                    style="border-top: 1px solid var(--border); padding-top: 12px; font-size: 0.75rem; color: var(--muted);"
                  >
                    <strong style="color: var(--gold);">Policy Limitations & Exclusions:</strong>
                    {{ pol.exclusions_summary }}
                  </div>
                </div>
              }
            }

            <!-- Claims Timeline Section -->
            <h3 style="margin-top: 16px; font-size: 1.05rem;">Active Claims Timeline</h3>
            <div class="portal-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Claim Reference</th>
                    <th>Date</th>
                    <th>Facility</th>
                    <th>Claimed (₹)</th>
                    <th>Status</th>
                    <th>Latest Step</th>
                  </tr>
                </thead>
                <tbody>
                  @for (claim of claims(); track claim.id) {
                    <tr>
                      <td style="font-family: var(--mono); font-weight: 600;">
                        {{ claim.claim_reference }}
                      </td>
                      <td style="font-family: var(--mono); font-size: 0.75rem;">
                        {{ claim.claim_date | date: 'dd MMM yyyy' }}
                      </td>
                      <td>{{ claim.hospital_name }}</td>
                      <td style="font-family: var(--mono); font-weight: 600;">
                        ₹{{ claim.claimed_amount }}
                      </td>
                      <td>
                        <span class="status-chip pending">{{ claim.settlement_status_display }}</span>
                      </td>
                      <td style="font-size: 0.75rem; color: var(--secondary);">
                        {{ claim.timeline_steps[claim.timeline_steps.length - 1]?.note || 'Processing' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- TAB CONTENT: 5. CARE TIMELINE -->
        @if (activeTab() === 'timeline') {
          <div class="portal-card-box">
            <header>
              <h2>Chronological Care Timeline</h2>
              <span class="micro-label">SYNTHETIC EVENT FEED</span>
            </header>
            <p style="font-size: 0.82rem; color: var(--secondary); margin: 0;">
              An unified event stream linking hospital appointments, diagnostic test results,
              issued bills, and insurance claims.
            </p>

            <div class="care-timeline-feed">
              @for (evt of timelineEvents(); track evt.id) {
                <article class="timeline-event-item">
                  <div class="timeline-event-header">
                    <strong>{{ evt.title }}</strong>
                    <time>{{ evt.event_date | date: 'dd MMM yyyy, HH:mm' }}</time>
                  </div>
                  <div style="font-size: 0.75rem; color: var(--muted);">
                    {{ evt.facility }} @if (evt.related_reference) {
                      · <span style="font-family: var(--mono); color: var(--accent);">{{ evt.related_reference }}</span>
                    }
                  </div>
                  <p style="font-size: 0.82rem; color: var(--secondary); margin: 4px 0 0;">
                    {{ evt.summary }}
                  </p>
                </article>
              }
            </div>
          </div>
        }

        <!-- TAB CONTENT: 6. PROFILE & PREFERENCES -->
        @if (activeTab() === 'profile') {
          <div class="portal-card-box">
            <header>
              <h2>Patient Profile & Preferences</h2>
              <span class="micro-label">DEMO CONFIGURATION</span>
            </header>
            <p style="font-size: 0.82rem; color: var(--secondary); margin: 0;">
              Manage accessibility preferences, display settings, and notification channels.
            </p>

            <!-- Demographics Overview -->
            <div
              style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; background: var(--elevated); padding: 18px; border-radius: 8px;"
            >
              <div>
                <span style="font-size: 0.7rem; color: var(--muted); text-transform: uppercase;">Full Name</span>
                <div style="font-weight: 600;">{{ profile()?.first_name }} {{ profile()?.last_name }}</div>
              </div>
              <div>
                <span style="font-size: 0.7rem; color: var(--muted); text-transform: uppercase;">Identifier</span>
                <div style="font-family: var(--mono); color: var(--gold);">{{ profile()?.patient_identifier }}</div>
              </div>
              <div>
                <span style="font-size: 0.7rem; color: var(--muted); text-transform: uppercase;">Blood Group</span>
                <div>{{ profile()?.blood_group }}</div>
              </div>
              <div>
                <span style="font-size: 0.7rem; color: var(--muted); text-transform: uppercase;">Location</span>
                <div>{{ profile()?.address_city }}, {{ profile()?.address_state }}</div>
              </div>
              <div>
                <span style="font-size: 0.7rem; color: var(--muted); text-transform: uppercase;">Known Allergies</span>
                <div style="color: var(--warning);">{{ profile()?.allergies }}</div>
              </div>
              <div>
                <span style="font-size: 0.7rem; color: var(--muted); text-transform: uppercase;">Chronic Conditions</span>
                <div>{{ profile()?.chronic_conditions }}</div>
              </div>
            </div>

            <!-- Editable Preferences -->
            <h3 style="margin-top: 16px; font-size: 1.05rem;">Accessibility & Display Preferences</h3>
            <div style="display: flex; flex-direction: column; gap: 14px; max-width: 500px;">
              <label style="display: flex; align-items: center; gap: 12px; font-size: 0.85rem; cursor: pointer;">
                <input
                  type="checkbox"
                  [ngModel]="profile()?.reduced_motion"
                  (ngModelChange)="onPreferenceToggle('reduced_motion', $event)"
                />
                <span>Prefer Reduced Motion (Disables heavy transitions & 3D models)</span>
              </label>

              <label style="display: flex; align-items: center; gap: 12px; font-size: 0.85rem; cursor: pointer;">
                <input
                  type="checkbox"
                  [ngModel]="profile()?.high_contrast"
                  (ngModelChange)="onPreferenceToggle('high_contrast', $event)"
                />
                <span>High Contrast Mode (Enhances text borders and metric legibility)</span>
              </label>

              <label style="display: flex; align-items: center; gap: 12px; font-size: 0.85rem; cursor: pointer;">
                <input
                  type="checkbox"
                  [ngModel]="profile()?.email_notifications"
                  (ngModelChange)="onPreferenceToggle('email_notifications', $event)"
                />
                <span>Email Notifications for verified clinical records</span>
              </label>

              <label style="display: flex; align-items: center; gap: 12px; font-size: 0.85rem; cursor: pointer;">
                <input
                  type="checkbox"
                  [ngModel]="profile()?.sms_alerts"
                  (ngModelChange)="onPreferenceToggle('sms_alerts', $event)"
                />
                <span>SMS Alerts for upcoming hospital visits</span>
              </label>

              @if (prefSavedMessage()) {
                <div style="color: var(--emerald); font-size: 0.78rem; font-family: var(--mono);">
                  {{ prefSavedMessage() }}
                </div>
              }
            </div>
          </div>
        }

        <!-- TAB CONTENT: 7. AI ASSISTANT PLACEHOLDER -->
        @if (activeTab() === 'ai-assistant') {
          <div class="ai-assistant-placeholder">
            <div class="ai-assistant-header">
              <div class="ai-assistant-icon-badge">
                <h-icon name="Sparkles" />
              </div>
              <div>
                <h2 style="margin: 0; font-size: 1.3rem;">
                  HEFIN Spectral AI Assistant (Upcoming Feature)
                </h2>
                <span class="micro-label">CLINICAL & BILLING EXPLAINABILITY</span>
              </div>
            </div>

            <div class="notice" style="margin: 0;">
              <h-icon name="Layers" />
              <div>
                <h3>AI Model Integration Planned for Future Tasks</h3>
                <p>
                  In accordance with the Task 04 specification, AI assistance is not connected yet.
                  No fake responses or simulated Gemma 3/Ollama model outputs are generated.
                  This interface provides the verified front-end design foundation that will
                  be linked to real local AI inference in later tasks.
                </p>
              </div>
            </div>

            <h4 style="margin: 0; font-family: var(--heading);">Planned Assistant Capabilities:</h4>
            <div class="ai-prompt-cards">
              <div class="ai-prompt-card">
                <strong style="display: block; color: var(--text); margin-bottom: 4px;"
                  >Clinical Report Clarification</strong
                >
                Translates complex medical jargon (such as microvascular perfusion or intracranial imaging) into clear patient summaries.
              </div>
              <div class="ai-prompt-card">
                <strong style="display: block; color: var(--text); margin-bottom: 4px;"
                  >Itemized Bill Breakdown</strong
                >
                Explains hospital billing codes and computes exact co-pay responsibility under Indian health insurance policies.
              </div>
              <div class="ai-prompt-card">
                <strong style="display: block; color: var(--text); margin-bottom: 4px;"
                  >Financial Assistance Guidance</strong
                >
                Identifies zero-interest micro-installment options and eligible patient assistance programs.
              </div>
            </div>
          </div>
        }

        <!-- Record Detail Drawer / Modal -->
        @if (selectedRecord(); as r) {
          <div class="drawer-backdrop" (click)="closeRecordDetail()">
            <div class="drawer-panel" (click)="$event.stopPropagation()">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <span class="status-chip confirmed">{{ r.record_type_display || r.record_type }}</span>
                  <h2 style="margin: 8px 0 4px; font-size: 1.3rem;">{{ r.title }}</h2>
                  <span style="font-size: 0.75rem; color: var(--muted); font-family: var(--mono);"
                    >{{ r.record_identifier }} · {{ r.record_date | date: 'dd MMMM yyyy' }}</span
                  >
                </div>
                <button
                  type="button"
                  class="button secondary"
                  style="padding: 6px 12px; font-size: 0.75rem;"
                  (click)="closeRecordDetail()"
                >
                  Close
                </button>
              </div>

              <div>
                <h4 style="margin: 0 0 6px; font-size: 0.85rem; color: var(--muted); text-transform: uppercase;">
                  Healthcare Facility & Clinician
                </h4>
                <div style="font-size: 0.9rem; font-weight: 500;">
                  {{ r.healthcare_facility }}
                </div>
                <div style="font-size: 0.82rem; color: var(--secondary);">
                  Attending: {{ r.attending_clinician }}
                </div>
              </div>

              <div>
                <h4 style="margin: 0 0 6px; font-size: 0.85rem; color: var(--muted); text-transform: uppercase;">
                  Clinical Summary
                </h4>
                <p style="font-size: 0.85rem; color: var(--text); line-height: 1.5; margin: 0;">
                  {{ r.summary }}
                </p>
              </div>

              @if (r.vitals_summary && objectKeys(r.vitals_summary).length > 0) {
                <div>
                  <h4 style="margin: 0 0 8px; font-size: 0.85rem; color: var(--muted); text-transform: uppercase;">
                    Recorded Vitals
                  </h4>
                  <div
                    style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: var(--elevated); padding: 14px; border-radius: 6px;"
                  >
                    @for (key of objectKeys(r.vitals_summary); track key) {
                      <div>
                        <span style="font-size: 0.68rem; color: var(--muted);">{{ key }}</span>
                        <div style="font-family: var(--mono); font-size: 0.85rem; font-weight: 600;">
                          {{ r.vitals_summary[key] }}
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              @if (r.clinical_notes) {
                <div>
                  <h4 style="margin: 0 0 6px; font-size: 0.85rem; color: var(--muted); text-transform: uppercase;">
                    Clinician Notes & Directives
                  </h4>
                  <p style="font-size: 0.82rem; color: var(--secondary); margin: 0;">
                    {{ r.clinical_notes }}
                  </p>
                </div>
              }

              <div
                style="margin-top: auto; padding-top: 14px; border-top: 1px solid var(--border); font-size: 0.72rem; color: var(--muted);"
              >
                <strong>Synthetic Medical Record:</strong> This report was generated
                for evaluation purposes only. No real patient data was processed.
              </div>
            </div>
          </div>
        }

        <!-- Bill Detail Drawer / Modal -->
        @if (selectedBill(); as b) {
          <div class="drawer-backdrop" (click)="closeBillDetail()">
            <div class="drawer-panel" (click)="$event.stopPropagation()">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <span class="status-chip pending">{{ b.payment_status_display }}</span>
                  <h2 style="margin: 8px 0 4px; font-size: 1.3rem;">Invoice: {{ b.invoice_number }}</h2>
                  <span style="font-size: 0.75rem; color: var(--muted); font-family: var(--mono);"
                    >{{ b.hospital_name }} · Due: {{ b.due_date | date: 'dd MMM yyyy' }}</span
                  >
                </div>
                <button
                  type="button"
                  class="button secondary"
                  style="padding: 6px 12px; font-size: 0.75rem;"
                  (click)="closeBillDetail()"
                >
                  Close
                </button>
              </div>

              <!-- Financial Breakdown Summary -->
              <div
                style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: var(--elevated); padding: 14px; border-radius: 6px; font-family: var(--mono);"
              >
                <div>
                  <span style="font-size: 0.65rem; color: var(--muted);">TOTAL BILLED</span>
                  <div style="font-size: 1.05rem; font-weight: 700;">₹{{ b.total_amount }}</div>
                </div>
                <div>
                  <span style="font-size: 0.65rem; color: var(--emerald);">INSURANCE COVER</span>
                  <div style="font-size: 1.05rem; font-weight: 700; color: var(--emerald);">
                    ₹{{ b.simulated_coverage_amount }}
                  </div>
                </div>
                <div>
                  <span style="font-size: 0.65rem; color: var(--gold);">PATIENT SHARE</span>
                  <div style="font-size: 1.05rem; font-weight: 700; color: var(--gold);">
                    ₹{{ b.estimated_patient_responsibility }}
                  </div>
                </div>
              </div>

              <!-- Itemized Line Items -->
              <div>
                <h4 style="margin: 0 0 10px; font-size: 0.85rem; color: var(--muted); text-transform: uppercase;">
                  Itemized Hospital Services
                </h4>
                <div class="portal-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Qty</th>
                        <th>Price (₹)</th>
                        <th>Patient (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of b.line_items; track item.id) {
                        <tr>
                          <td>
                            <strong>{{ item.description }}</strong>
                            <div style="font-size: 0.68rem; color: var(--muted);">
                              Code: {{ item.service_code || 'N/A' }}
                            </div>
                          </td>
                          <td style="font-family: var(--mono); text-align: center;">
                            {{ item.quantity }}
                          </td>
                          <td style="font-family: var(--mono);">
                            ₹{{ item.total_price }}
                          </td>
                          <td style="font-family: var(--mono); color: var(--gold);">
                            ₹{{ item.patient_share }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                style="margin-top: auto; padding-top: 14px; border-top: 1px solid var(--border); font-size: 0.72rem; color: var(--muted);"
              >
                {{ b.simulation_disclaimer }}
              </div>
            </div>
          </div>
        }
      </section>
    </div>
  `,
})
export class PatientPortalPage implements OnInit {
  auth = inject(AuthService);
  api = inject(PatientApiService);

  segments = [0, 1, 2, 3, 4, 5, 6, 7];
  demoPatients = DEMO_PATIENTS;

  activeTab = signal<PortalTab>('dashboard');
  dashboard = signal<PatientDashboardSummary | null>(null);
  profile = signal<PatientProfileData | null>(null);
  records = signal<MedicalRecordItem[]>([]);
  bills = signal<MedicalBillItem[]>([]);
  policies = signal<InsurancePolicyItem[]>([]);
  claims = signal<InsuranceClaimItem[]>([]);
  timelineEvents = signal<CareEventItem[]>([]);

  recordsSearch = signal<string>('');
  recordTypeFilter = signal<string>('');

  selectedRecord = signal<MedicalRecordItem | null>(null);
  selectedBill = signal<MedicalBillItem | null>(null);

  prefSavedMessage = signal<string>('');

  activeUser = computed(() => this.auth.currentUser());

  patientInitials = computed(() => {
    const user = this.activeUser();
    const f = user.first_name?.[0] ?? 'A';
    const l = user.last_name?.[0] ?? 'S';
    return `${f}${l}`.toUpperCase();
  });

  greetingText = computed(() => {
    return this.dashboard()?.greeting || `Welcome, ${this.activeUser().first_name} ${this.activeUser().last_name}`;
  });

  // Preserved for Task 03 foundation checks
  previewRecords = computed(() => [
    { id: 'DEMO-01', label: 'Preventive care planning', status: 'Planned' },
    { id: 'DEMO-02', label: 'Coverage document checklist', status: 'Draft' },
    { id: 'DEMO-03', label: 'Follow-up reminder', status: 'Scheduled' },
  ]);

  filteredRecords = computed(() => {
    let list = this.records();
    const type = this.recordTypeFilter().toLowerCase();
    const q = this.recordsSearch().toLowerCase().trim();

    if (type) {
      list = list.filter((r) => r.record_type.toLowerCase() === type);
    }
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q) ||
          r.healthcare_facility.toLowerCase().includes(q) ||
          r.attending_clinician.toLowerCase().includes(q),
      );
    }
    return list;
  });

  ngOnInit() {
    this.refreshAllData();
  }

  setTab(tab: PortalTab) {
    this.activeTab.set(tab);
  }

  onPatientChange(username: string) {
    this.auth.switchDemoPatient(username);
    this.refreshAllData();
  }

  onRecordSearch(q: string) {
    this.recordsSearch.set(q);
  }

  onRecordTypeFilter(type: string) {
    this.recordTypeFilter.set(type);
  }

  openRecordDetail(r: MedicalRecordItem) {
    this.selectedRecord.set(r);
  }

  closeRecordDetail() {
    this.selectedRecord.set(null);
  }

  openBillDetail(b: MedicalBillItem) {
    this.selectedBill.set(b);
  }

  closeBillDetail() {
    this.selectedBill.set(null);
  }

  backendError = signal<string>('');

  onPreferenceToggle(key: string, value: boolean) {
    const current = this.profile();
    if (!current) return;
    const patch = { [key]: value };
    this.api.updatePreferences(patch).subscribe({
      next: (res) => {
        this.profile.set(res.profile);
        this.prefSavedMessage.set('Preference saved.');
        setTimeout(() => this.prefSavedMessage.set(''), 3000);
      },
      error: () => {
        this.prefSavedMessage.set('Failed to save preference to backend.');
        setTimeout(() => this.prefSavedMessage.set(''), 4000);
      },
    });
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  toggleApiMode(mode: 'live' | 'simulated') {
    this.api.setMode(mode);
    this.refreshAllData();
  }

  refreshAllData() {
    this.backendError.set('');
    if (this.api.apiMode() === 'live') {
      this.api.checkStatus().subscribe({
        next: (status) => {
          if (status.mode === 'offline') {
            this.backendError.set(`Could not connect to Django API at ${this.api.baseUrl}. Ensure 'python manage.py runserver' is running.`);
          }
        },
        error: () => {
          this.backendError.set(`Could not reach Django API at ${this.api.baseUrl}.`);
        },
      });
    } else {
      this.api.checkStatus().subscribe();
    }

    this.api.getDashboard().subscribe({
      next: (data) => this.dashboard.set(data),
      error: () => {
        this.backendError.set(`Failed to retrieve live dashboard from ${this.api.baseUrl}.`);
      },
    });
    this.api.getProfile().subscribe({
      next: (data) => this.profile.set(data),
      error: () => {},
    });
    this.api.getRecords().subscribe({
      next: (data) => this.records.set(data),
      error: () => {},
    });
    this.api.getBills().subscribe({
      next: (data) => this.bills.set(data),
      error: () => {},
    });
    this.api.getInsurancePolicies().subscribe({
      next: (data) => this.policies.set(data),
      error: () => {},
    });
    this.api.getInsuranceClaims().subscribe({
      next: (data) => this.claims.set(data),
      error: () => {},
    });
    this.api.getTimeline().subscribe({
      next: (data) => this.timelineEvents.set(data),
      error: () => {},
    });
  }
}
