import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import {
  PatientDashboardSummary,
  PatientProfileData,
  MedicalRecordItem,
  MedicalBillItem,
  InsurancePolicyItem,
  InsuranceClaimItem,
  AppointmentItem,
  CareEventItem,
} from '../models/patient.models';

export type ApiConnectionState = 'connected' | 'offline' | 'checking';

@Injectable({
  providedIn: 'root',
})
export class PatientApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  readonly apiMode = signal<'live' | 'simulated'>(this.detectInitialMode());
  readonly connectionStatus = signal<ApiConnectionState>(this.detectInitialMode() === 'live' ? 'checking' : 'offline');
  readonly lastStatusMessage = signal<string>(
    this.detectInitialMode() === 'live' ? 'Verifying Django REST API connectivity...' : 'Simulated Demo Mode Active'
  );

  private detectInitialMode(): 'live' | 'simulated' {
    if (typeof window === 'undefined') return 'simulated';
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'live' || params.has('live') || params.get('api') === 'live') {
        return 'live';
      }
      if (window.__HEFIN_CONFIG__?.demoMode === false) {
        return 'live';
      }
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('hefin_api_mode');
        if (saved === 'live') return 'live';
      }
    } catch {
      // In constrained environments
    }
    return 'simulated';
  }

  get baseUrl(): string {
    if (typeof window !== 'undefined' && window.__HEFIN_CONFIG__?.apiBaseUrl) {
      return window.__HEFIN_CONFIG__.apiBaseUrl.replace(/\/+$/, '');
    }
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('hefin_api_base_url');
      if (saved) return saved.replace(/\/+$/, '');
    }
    return environment.apiBaseUrl.replace(/\/+$/, '');
  }

  setMode(mode: 'live' | 'simulated'): void {
    this.apiMode.set(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hefin_api_mode', mode);
    }
    if (mode === 'live') {
      this.checkStatus().subscribe();
    } else {
      this.connectionStatus.set('offline');
      this.lastStatusMessage.set('Simulated Demo Mode Active');
    }
  }

  setApiBaseUrl(url: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hefin_api_base_url', url.trim());
    }
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
    const token = this.auth.token();
    if (token) {
      headers = headers.set('Authorization', `Token ${token}`);
    }
    return headers;
  }

  // Check backend health
  checkStatus(): Observable<{ status: string; version: string; mode: string }> {
    if (this.apiMode() === 'simulated') {
      this.connectionStatus.set('offline');
      this.lastStatusMessage.set('Simulated Demo Mode Active (Static Preview)');
      return of({ status: 'simulated', version: 'v1.0-simulated', mode: 'offline' });
    }
    this.connectionStatus.set('checking');
    return this.http.get<{ status: string; version: string }>(`${this.baseUrl}/status/`).pipe(
      tap(() => {
        this.connectionStatus.set('connected');
        this.lastStatusMessage.set('Live Django REST API Connected (/api/v1/)');
      }),
      map((res) => ({ ...res, mode: 'live' })),
      catchError((err) => {
        this.connectionStatus.set('offline');
        this.lastStatusMessage.set(`Backend offline (${err.message || 'Connection refused'})`);
        return of({ status: 'offline', version: 'v1-unavailable', mode: 'offline' });
      }),
    );
  }

  // Dashboard summary
  getDashboard(): Observable<PatientDashboardSummary> {
    if (this.apiMode() === 'simulated') {
      return of(this.getFallbackDashboard());
    }
    return this.http
      .get<PatientDashboardSummary>(`${this.baseUrl}/patient/dashboard/`, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap(() => this.connectionStatus.set('connected')),
        catchError((err) => {
          this.connectionStatus.set('offline');
          return throwError(() => err);
        }),
      );
  }

  // Profile
  getProfile(): Observable<PatientProfileData> {
    if (this.apiMode() === 'simulated') {
      return of(this.getFallbackProfile());
    }
    return this.http
      .get<PatientProfileData>(`${this.baseUrl}/patient/profile/`, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap(() => this.connectionStatus.set('connected')),
        catchError((err) => {
          this.connectionStatus.set('offline');
          return throwError(() => err);
        }),
      );
  }

  // Update preferences
  updatePreferences(prefs: Partial<PatientProfileData>): Observable<{ message: string; profile: PatientProfileData }> {
    if (this.apiMode() === 'simulated') {
      const fallback = { ...this.getFallbackProfile(), ...prefs };
      return of({ message: 'Preference saved locally (Simulated Mode).', profile: fallback });
    }
    return this.http
      .patch<{ message: string; profile: PatientProfileData }>(
        `${this.baseUrl}/patient/profile/`,
        prefs,
        { headers: this.getHeaders() },
      )
      .pipe(
        tap(() => this.connectionStatus.set('connected')),
        catchError((err) => {
          this.connectionStatus.set('offline');
          return throwError(() => err);
        }),
      );
  }

  // Medical Records
  getRecords(params?: { record_type?: string; facility?: string; search?: string }): Observable<MedicalRecordItem[]> {
    if (this.apiMode() === 'simulated') {
      return of(this.getSimulatedRecords(params));
    }
    let httpParams = new HttpParams();
    if (params?.record_type) httpParams = httpParams.set('record_type', params.record_type);
    if (params?.facility) httpParams = httpParams.set('facility', params.facility);
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http
      .get<any>(`${this.baseUrl}/records/`, {
        headers: this.getHeaders(),
        params: httpParams,
      })
      .pipe(
        tap(() => this.connectionStatus.set('connected')),
        map((res) => (Array.isArray(res) ? res : res.results || [])),
        catchError((err) => {
          this.connectionStatus.set('offline');
          return throwError(() => err);
        }),
      );
  }

  // Medical Record Detail
  getRecordDetail(id: number): Observable<MedicalRecordItem | null> {
    if (this.apiMode() === 'simulated') {
      return of(this.getFallbackRecords().find((r) => r.id === id) ?? null);
    }
    return this.http
      .get<MedicalRecordItem>(`${this.baseUrl}/records/${id}/`, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap(() => this.connectionStatus.set('connected')),
        catchError((err) => {
          this.connectionStatus.set('offline');
          return throwError(() => err);
        }),
      );
  }

  // Medical Bills
  getBills(params?: { payment_status?: string; search?: string }): Observable<MedicalBillItem[]> {
    if (this.apiMode() === 'simulated') {
      return of(this.getSimulatedBills(params));
    }
    let httpParams = new HttpParams();
    if (params?.payment_status) httpParams = httpParams.set('payment_status', params.payment_status);
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http
      .get<any>(`${this.baseUrl}/billing/`, {
        headers: this.getHeaders(),
        params: httpParams,
      })
      .pipe(
        tap(() => this.connectionStatus.set('connected')),
        map((res) => (Array.isArray(res) ? res : res.results || [])),
        catchError((err) => {
          this.connectionStatus.set('offline');
          return throwError(() => err);
        }),
      );
  }

  // Bill Detail
  getBillDetail(id: number): Observable<MedicalBillItem | null> {
    if (this.apiMode() === 'simulated') {
      return of(this.getFallbackBills().find((b) => b.id === id) ?? null);
    }
    return this.http
      .get<MedicalBillItem>(`${this.baseUrl}/billing/${id}/`, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap(() => this.connectionStatus.set('connected')),
        catchError((err) => {
          this.connectionStatus.set('offline');
          return throwError(() => err);
        }),
      );
  }

  // Insurance Policies
  getInsurancePolicies(): Observable<InsurancePolicyItem[]> {
    if (this.apiMode() === 'simulated') {
      return of(this.getFallbackPolicies());
    }
    return this.http
      .get<any>(`${this.baseUrl}/insurance/policies/`, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap(() => this.connectionStatus.set('connected')),
        map((res) => (Array.isArray(res) ? res : res.results || [])),
        catchError((err) => {
          this.connectionStatus.set('offline');
          return throwError(() => err);
        }),
      );
  }

  // Insurance Claims
  getInsuranceClaims(statusParam?: string): Observable<InsuranceClaimItem[]> {
    if (this.apiMode() === 'simulated') {
      return of(this.getSimulatedClaims(statusParam));
    }
    let httpParams = new HttpParams();
    if (statusParam) httpParams = httpParams.set('status', statusParam);

    return this.http
      .get<any>(`${this.baseUrl}/insurance/claims/`, {
        headers: this.getHeaders(),
        params: httpParams,
      })
      .pipe(
        tap(() => this.connectionStatus.set('connected')),
        map((res) => (Array.isArray(res) ? res : res.results || [])),
        catchError((err) => {
          this.connectionStatus.set('offline');
          return throwError(() => err);
        }),
      );
  }

  // Appointments
  getAppointments(timeFilter?: 'upcoming' | 'past'): Observable<AppointmentItem[]> {
    if (this.apiMode() === 'simulated') {
      return of(this.getSimulatedAppointments(timeFilter));
    }
    let httpParams = new HttpParams();
    if (timeFilter) httpParams = httpParams.set('time', timeFilter);

    return this.http
      .get<any>(`${this.baseUrl}/appointments/`, {
        headers: this.getHeaders(),
        params: httpParams,
      })
      .pipe(
        tap(() => this.connectionStatus.set('connected')),
        map((res) => (Array.isArray(res) ? res : res.results || [])),
        catchError((err) => {
          this.connectionStatus.set('offline');
          return throwError(() => err);
        }),
      );
  }

  // Care Timeline
  getTimeline(typeFilter?: string): Observable<CareEventItem[]> {
    if (this.apiMode() === 'simulated') {
      return of(this.getSimulatedTimeline(typeFilter));
    }
    let httpParams = new HttpParams();
    if (typeFilter) httpParams = httpParams.set('type', typeFilter);

    return this.http
      .get<any>(`${this.baseUrl}/timeline/`, {
        headers: this.getHeaders(),
        params: httpParams,
      })
      .pipe(
        tap(() => this.connectionStatus.set('connected')),
        map((res) => (Array.isArray(res) ? res : res.results || [])),
        catchError((err) => {
          this.connectionStatus.set('offline');
          return throwError(() => err);
        }),
      );
  }

  private getSimulatedRecords(params?: { record_type?: string; facility?: string; search?: string }): MedicalRecordItem[] {
    let records = this.getFallbackRecords();
    if (params?.record_type) {
      records = records.filter((r) => r.record_type.toLowerCase() === params.record_type?.toLowerCase());
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      records = records.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q) ||
          r.healthcare_facility.toLowerCase().includes(q),
      );
    }
    return records;
  }

  private getSimulatedBills(params?: { payment_status?: string; search?: string }): MedicalBillItem[] {
    let bills = this.getFallbackBills();
    if (params?.payment_status) {
      bills = bills.filter((b) => b.payment_status.toLowerCase() === params.payment_status?.toLowerCase());
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      bills = bills.filter(
        (b) => b.invoice_number.toLowerCase().includes(q) || b.hospital_name.toLowerCase().includes(q),
      );
    }
    return bills;
  }

  private getSimulatedClaims(statusParam?: string): InsuranceClaimItem[] {
    let claims = this.getFallbackClaims();
    if (statusParam) {
      claims = claims.filter((c) => c.settlement_status.toLowerCase() === statusParam.toLowerCase());
    }
    return claims;
  }

  private getSimulatedAppointments(timeFilter?: 'upcoming' | 'past'): AppointmentItem[] {
    let appts = this.getFallbackAppointments();
    if (timeFilter === 'upcoming') {
      appts = appts.filter((a) => a.status === 'scheduled');
    } else if (timeFilter === 'past') {
      appts = appts.filter((a) => a.status === 'completed');
    }
    return appts;
  }

  private getSimulatedTimeline(typeFilter?: string): CareEventItem[] {
    let events = this.getFallbackTimeline();
    if (typeFilter) {
      events = events.filter((e) => e.event_type.toLowerCase() === typeFilter.toLowerCase());
    }
    return events;
  }

  // Fallback Synthetic Data (for GitHub Pages & Offline Evaluation)
  private getFallbackDashboard(): PatientDashboardSummary {
    const user = this.auth.currentUser();
    return {
      greeting: `Welcome, ${user.first_name} ${user.last_name}`.trim(),
      patient_name: `${user.first_name} ${user.last_name}`.trim(),
      patient_identifier: user.patient_identifier || 'HEF-PAT-2026-9814',
      blood_group: 'O+',
      city: 'Bengaluru',
      state: 'Karnataka',
      coverage_summary: {
        policy_number: 'POL-SPECTRAL-2026-0911',
        plan_name: 'HEFIN SpectralShield Comprehensive Health Plan',
        insurer: 'Spectral Indemnity Assurance Corp (Simulated)',
        coverage_category: 'Comprehensive Inpatient + Daycare + Advanced Neuro-Diagnostics',
        coverage_limit: '1000000.00',
        used_coverage: '245000.00',
        remaining_coverage: '755000.00',
        utilization_percentage: 24.5,
        currency: 'INR',
        status: 'Active & Verified',
        renewal_date: '2027-01-01',
        co_pay_percentage: 10.0,
      },
      outstanding_medical_bills: {
        total_outstanding_inr: '29000.00',
        total_gross_billed_inr: '245000.00',
        unpaid_invoices_count: 1,
        currency: 'INR',
        latest_due_date: '2026-10-30',
        simulated_disclaimer: 'Simulated financial figures for demonstration. Not a legally enforceable debt.',
      },
      recent_care_activity: [
        {
          id: 1,
          record_identifier: 'REC-2026-0042',
          type: 'IMAGING',
          type_display: 'Radiology & Imaging',
          title: 'High-Resolution 3.0T Brain MRI & Metabolic Neuro-Profiling',
          facility: 'Apollo CyberCare Institute, Bengaluru',
          date: '2026-09-18',
          summary: 'Preserved gray-white differentiation. Microvascular perfusion indices stable.',
          status: 'VERIFIED',
        },
        {
          id: 2,
          record_identifier: 'REC-2026-0038',
          type: 'DIAGNOSTIC_LAB',
          type_display: 'Diagnostic Lab Report',
          title: 'Comprehensive Cardiac & Hemodynamic Biomarker Panel',
          facility: 'AIIMS Horizon Health Hub, Bengaluru',
          date: '2026-08-04',
          summary: 'High-sensitivity Troponin I and lipid panel within normal physiologic thresholds.',
          status: 'VERIFIED',
        },
        {
          id: 3,
          record_identifier: 'REC-2026-0029',
          type: 'CLINICAL_SUMMARY',
          type_display: 'Clinical Care Summary',
          title: 'Preventive Neurology Care & Spectral Telemetry Review',
          facility: 'Fortis Spectral Neuroscience Hospital',
          date: '2026-06-12',
          summary: 'Sensory and cognitive evaluation at 99th percentile. Prophylactic ocular care advised.',
          status: 'VERIFIED',
        },
      ],
      claim_status_overview: {
        total_claims: 2,
        pending_count: 1,
        approved_count: 1,
        total_claimed_inr: '176000.00',
        total_approved_inr: '176000.00',
        recent_claim: {
          reference: 'CLM-2026-7712',
          status: 'Clinical Documentation Review',
          amount: '116000.00',
          date: '2026-09-21',
        },
      },
      upcoming_appointments: [
        {
          id: 1,
          identifier: 'APT-2026-3104',
          facility: 'Apollo CyberCare Institute, Bengaluru',
          department: 'Neurology & Neuro-Radiology',
          clinician: 'Dr. Vikramaditya Sen, MD, DM',
          datetime: '2026-10-24T10:30:00+05:30',
          type: 'In-Person Consultation',
          status: 'CONFIRMED',
          reason: 'Post-MRI neuro-metabolic stability review.',
        },
        {
          id: 2,
          identifier: 'APT-2026-3180',
          facility: 'AIIMS Horizon Health Hub, Bengaluru',
          department: 'Cardiology & Tele-Monitoring',
          clinician: 'Dr. Meera Nambiar, MD',
          datetime: '2026-11-12T14:00:00+05:30',
          type: 'Tele-Health Video',
          status: 'SCHEDULED',
          reason: 'Routine virtual check on hemodynamic markers.',
        },
      ],
      quick_actions: [
        {
          id: 'view_records',
          label: 'Review Medical Records',
          target: 'records',
          icon: 'FileText',
          description: 'Inspect verified diagnostic reports & clinical summaries',
        },
        {
          id: 'review_bills',
          label: 'Manage Healthcare Invoices',
          target: 'bills',
          icon: 'Receipt',
          description: 'Review ₹29,000.00 in pending patient responsibility',
        },
        {
          id: 'track_claims',
          label: 'Track Insurance Claims',
          target: 'insurance',
          icon: 'ShieldCheck',
          description: '1 active claim currently under verification',
        },
        {
          id: 'care_timeline',
          label: 'View Care Timeline',
          target: 'timeline',
          icon: 'Calendar',
          description: 'Examine complete chronological record of care events',
        },
        {
          id: 'ai_assistant',
          label: 'AI Health & Billing Assistant',
          target: 'ai',
          icon: 'Sparkles',
          description: 'Preview clinical clarification and billing explanation interface',
        },
      ],
      financial_assistance_overview: {
        eligible_tier: 'Tier 1 — Micro-Installment Program (Simulated)',
        zero_interest_months: 6,
        estimated_monthly_inr: '4833.33',
        income_threshold_guidance: 'Households eligible for zero-fee payment rescheduling under pilot protocols.',
        charity_care_supported: true,
        disclaimer: 'Simulated financial assistance calculation. Non-binding demonstration model.',
      },
      demo_banner: 'DEMO ENVIRONMENT — SIMULATED HEALTHCARE AND FINANCIAL DATA',
    };
  }

  private getFallbackProfile(): PatientProfileData {
    const user = this.auth.currentUser();
    return {
      id: 1,
      patient_identifier: user.patient_identifier || 'HEF-PAT-2026-9814',
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      date_of_birth: '1991-06-14',
      gender: 'M',
      blood_group: 'O+',
      address_city: 'Bengaluru',
      address_state: 'Karnataka',
      emergency_contact_name: 'Dr. Ananya Sharma',
      emergency_contact_phone: '+91 98765 43210',
      allergies: 'Penicillin, Sulfa drugs',
      chronic_conditions: 'Mild Migraine Aura, Essential Hypertension (Controlled)',
      preferred_language: 'en',
      reduced_motion: false,
      high_contrast: false,
      font_scale: 'normal',
      email_notifications: true,
      sms_alerts: true,
      in_app_alerts: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-10-14T12:00:00Z',
    };
  }

  private getFallbackRecords(): MedicalRecordItem[] {
    return [
      {
        id: 1,
        record_identifier: 'REC-2026-0042',
        record_type: 'IMAGING',
        record_type_display: 'Radiology & Imaging',
        title: 'High-Resolution 3.0T Brain MRI & Metabolic Neuro-Profiling',
        healthcare_facility: 'Apollo CyberCare Institute, Bengaluru',
        attending_clinician: 'Dr. Vikramaditya Sen, MD, DM (Neurology)',
        record_date: '2026-09-18',
        summary:
          '3.0T functional MRI protocol demonstrates preserved gray-white differentiation. Microvascular perfusion stable.',
        clinical_notes:
          'Clinical follow-up scheduled in 6 weeks. Recommended hydration and routine blood pressure monitoring.',
        vitals_summary: {
          'Blood Pressure': '118/76 mmHg',
          Pulse: '68 bpm',
          SpO2: '99%',
          BMI: '22.8',
          Temperature: '98.4 F',
        },
        status: 'VERIFIED',
        status_display: 'Clinically Verified',
        is_synthetic: true,
        created_at: '2026-09-18T10:00:00Z',
        updated_at: '2026-09-18T10:00:00Z',
      },
      {
        id: 2,
        record_identifier: 'REC-2026-0038',
        record_type: 'DIAGNOSTIC_LAB',
        record_type_display: 'Diagnostic Lab Report',
        title: 'Comprehensive Cardiac & Hemodynamic Biomarker Panel',
        healthcare_facility: 'AIIMS Horizon Health Hub, Bengaluru',
        attending_clinician: 'Dr. Meera Nambiar, MD (Cardiology)',
        record_date: '2026-08-04',
        summary: 'High-sensitivity Troponin I, hs-CRP, and Lipid Profile all within normal physiologic thresholds.',
        clinical_notes: 'Serum cholesterol 172 mg/dL, HDL 54 mg/dL, LDL 94 mg/dL. Normal baseline ECG confirmed.',
        vitals_summary: {
          'Blood Pressure': '120/78 mmHg',
          Pulse: '72 bpm',
          SpO2: '98%',
          BMI: '22.7',
          Temperature: '98.6 F',
        },
        status: 'VERIFIED',
        status_display: 'Clinically Verified',
        is_synthetic: true,
        created_at: '2026-08-04T09:30:00Z',
        updated_at: '2026-08-04T09:30:00Z',
      },
      {
        id: 3,
        record_identifier: 'REC-2026-0029',
        record_type: 'CLINICAL_SUMMARY',
        record_type_display: 'Clinical Care Summary',
        title: 'Preventive Neurology Care & Spectral Telemetry Review',
        healthcare_facility: 'Fortis Spectral Neuroscience Hospital',
        attending_clinician: 'Dr. Rajeshwari Rao, DNB (Internal Medicine)',
        record_date: '2026-06-12',
        summary:
          'Routine neurological evaluation. Cognitive performance scores at 99th percentile. Mild eye-strain noted.',
        clinical_notes: 'Regular aerobic exercise maintained. Sleep architecture shows optimal REM distribution.',
        vitals_summary: {
          'Blood Pressure': '116/74 mmHg',
          Pulse: '66 bpm',
          SpO2: '99%',
          BMI: '22.5',
          Temperature: '98.2 F',
        },
        status: 'VERIFIED',
        status_display: 'Clinically Verified',
        is_synthetic: true,
        created_at: '2026-06-12T11:15:00Z',
        updated_at: '2026-06-12T11:15:00Z',
      },
      {
        id: 4,
        record_identifier: 'REC-2026-0015',
        record_type: 'PRESCRIPTION',
        record_type_display: 'Prescription & Medication',
        title: 'Outpatient Preventive Medication & Neuro-Supportive Regimen',
        healthcare_facility: 'Apollo CyberCare Institute, Bengaluru',
        attending_clinician: 'Dr. Vikramaditya Sen, MD, DM',
        record_date: '2026-03-10',
        summary:
          'Prescription for Telmisartan 20mg (morning) and Neuro-B Complex supplementation. Periodic home BP logging.',
        clinical_notes: 'Medication dispensed via digital pharmacy desk. Refill active for 90 days.',
        vitals_summary: {
          'Blood Pressure': '124/80 mmHg',
          Pulse: '74 bpm',
          SpO2: '98%',
          BMI: '23.0',
          Temperature: '98.6 F',
        },
        status: 'VERIFIED',
        status_display: 'Clinically Verified',
        is_synthetic: true,
        created_at: '2026-03-10T14:00:00Z',
        updated_at: '2026-03-10T14:00:00Z',
      },
    ];
  }

  private getFallbackBills(): MedicalBillItem[] {
    return [
      {
        id: 1,
        invoice_number: 'INV-2026-8841',
        hospital_name: 'Fortis Spectral Neuroscience Hospital, Bannerghatta',
        bill_date: '2026-09-20',
        due_date: '2026-10-30',
        currency: 'INR',
        total_amount: '145000.00',
        simulated_coverage_amount: '116000.00',
        estimated_patient_responsibility: '29000.00',
        payment_status: 'PENDING',
        payment_status_display: 'Pending Payment',
        is_simulated: true,
        simulation_disclaimer:
          'Simulated financial figures for demonstration purposes only. Not an actual hospital invoice.',
        line_items: [
          {
            id: 1,
            description: 'Functional 3.0T MRI Brain Protocol',
            service_code: 'RAD-MRI-301',
            quantity: 1,
            unit_price: '65000.00',
            total_price: '65000.00',
            covered_amount: '52000.00',
            patient_share: '13000.00',
          },
          {
            id: 2,
            description: 'Contrast Neuro-Perfusion & Spectral Reconstruction',
            service_code: 'RAD-CON-104',
            quantity: 1,
            unit_price: '35000.00',
            total_price: '35000.00',
            covered_amount: '28000.00',
            patient_share: '7000.00',
          },
          {
            id: 3,
            description: 'Senior Neuro-Radiology Clinical Consultation',
            service_code: 'CON-NEU-501',
            quantity: 1,
            unit_price: '15000.00',
            total_price: '15000.00',
            covered_amount: '12000.00',
            patient_share: '3000.00',
          },
          {
            id: 4,
            description: 'Daycare Monitoring Suite & Precision Nursing',
            service_code: 'DAY-MON-202',
            quantity: 1,
            unit_price: '30000.00',
            total_price: '30000.00',
            covered_amount: '24000.00',
            patient_share: '6000.00',
          },
        ],
        created_at: '2026-09-20T12:00:00Z',
        updated_at: '2026-09-20T12:00:00Z',
      },
      {
        id: 2,
        invoice_number: 'INV-2026-7210',
        hospital_name: 'AIIMS Horizon Health Hub, Bengaluru',
        bill_date: '2026-08-05',
        due_date: '2026-09-15',
        currency: 'INR',
        total_amount: '75000.00',
        simulated_coverage_amount: '60000.00',
        estimated_patient_responsibility: '15000.00',
        payment_status: 'PAID',
        payment_status_display: 'Paid in Full',
        is_simulated: true,
        simulation_disclaimer:
          'Simulated financial figures for demonstration purposes only. Not an actual hospital invoice.',
        line_items: [
          {
            id: 5,
            description: 'Advanced Cardiac Enzyme & Troponin Panel',
            service_code: 'LAB-CAR-201',
            quantity: 1,
            unit_price: '25000.00',
            total_price: '25000.00',
            covered_amount: '20000.00',
            patient_share: '5000.00',
          },
          {
            id: 6,
            description: 'Comprehensive Hemodynamic Biomarker Profile',
            service_code: 'LAB-HEM-102',
            quantity: 1,
            unit_price: '30000.00',
            total_price: '30000.00',
            covered_amount: '24000.00',
            patient_share: '6000.00',
          },
          {
            id: 7,
            description: 'Cardiology Clinical Evaluation',
            service_code: 'CON-CAR-401',
            quantity: 1,
            unit_price: '20000.00',
            total_price: '20000.00',
            covered_amount: '16000.00',
            patient_share: '4000.00',
          },
        ],
        created_at: '2026-08-05T10:00:00Z',
        updated_at: '2026-08-05T10:00:00Z',
      },
      {
        id: 3,
        invoice_number: 'INV-2026-6102',
        hospital_name: 'Apollo CyberCare Institute, Bengaluru',
        bill_date: '2026-03-12',
        due_date: '2026-04-20',
        currency: 'INR',
        total_amount: '25000.00',
        simulated_coverage_amount: '25000.00',
        estimated_patient_responsibility: '0.00',
        payment_status: 'PAID',
        payment_status_display: 'Paid in Full',
        is_simulated: true,
        simulation_disclaimer:
          'Simulated financial figures for demonstration purposes only. Not an actual hospital invoice.',
        line_items: [
          {
            id: 8,
            description: 'Executive Annual Neuro-Screening',
            service_code: 'PRO-EXE-101',
            quantity: 1,
            unit_price: '25000.00',
            total_price: '25000.00',
            covered_amount: '25000.00',
            patient_share: '0.00',
          },
        ],
        created_at: '2026-03-12T09:00:00Z',
        updated_at: '2026-03-12T09:00:00Z',
      },
    ];
  }

  private getFallbackPolicies(): InsurancePolicyItem[] {
    return [
      {
        id: 1,
        policy_number: 'POL-SPECTRAL-2026-0911',
        plan_name: 'HEFIN SpectralShield Comprehensive Health Plan',
        fictional_insurer: 'Spectral Indemnity Assurance Corp (Simulated)',
        coverage_category: 'Comprehensive Inpatient + Daycare + Advanced Neuro-Diagnostics',
        currency: 'INR',
        coverage_limit: '1000000.00',
        used_coverage: '245000.00',
        remaining_coverage: '755000.00',
        status: 'ACTIVE',
        status_display: 'Active & Verified',
        start_date: '2026-01-01',
        renewal_date: '2027-01-01',
        co_pay_percentage: '10.00',
        exclusions_summary:
          'Excludes cosmetic procedures, unverified experimental therapies, non-prescribed supplements. 30-day initial waiting period applies to elective procedures.',
        is_synthetic: true,
        claims: this.getFallbackClaims(),
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-10-14T00:00:00Z',
      },
    ];
  }

  private getFallbackClaims(): InsuranceClaimItem[] {
    return [
      {
        id: 1,
        claim_reference: 'CLM-2026-7712',
        claim_date: '2026-09-21',
        hospital_name: 'Fortis Spectral Neuroscience Hospital, Bannerghatta',
        treatment_summary: 'High-Resolution 3.0T Brain MRI Diagnostic Protocol',
        claimed_amount: '116000.00',
        approved_amount: '116000.00',
        settlement_status: 'UNDER_VERIFICATION',
        settlement_status_display: 'Clinical Verification',
        timeline_steps: [
          { step: 'Claim Submitted', timestamp: '2026-09-21 11:30', note: 'Electronic submission via HEFIN Direct Gateway' },
          { step: 'Clinical Review', timestamp: '2026-09-23 15:45', note: 'Medical records validated by spectral review board' },
          { step: 'Pre-Approval Issued', timestamp: '2026-09-28 09:20', note: '₹1,16,000 pre-approved; final disbursement scheduled' },
        ],
        disclaimer: 'Synthetic insurance claim record. Not connected to any real insurance carrier.',
        created_at: '2026-09-21T11:30:00Z',
        updated_at: '2026-09-28T09:20:00Z',
      },
      {
        id: 2,
        claim_reference: 'CLM-2026-5309',
        claim_date: '2026-08-06',
        hospital_name: 'AIIMS Horizon Health Hub, Bengaluru',
        treatment_summary: 'Hemodynamic Biomarkers & Cardiac Diagnostic Panel',
        claimed_amount: '60000.00',
        approved_amount: '60000.00',
        settlement_status: 'SETTLED',
        settlement_status_display: 'Disbursed to Healthcare Provider',
        timeline_steps: [
          { step: 'Claim Submitted', timestamp: '2026-08-06 10:15', note: 'Claim registered by facility billing desk' },
          { step: 'Approved', timestamp: '2026-08-10 14:00', note: 'Approved for 100% of policy-covered amount' },
          { step: 'Disbursed', timestamp: '2026-08-14 16:30', note: '₹60,000 disbursed directly to AIIMS Horizon Health' },
        ],
        disclaimer: 'Synthetic insurance claim record. Not connected to any real insurance carrier.',
        created_at: '2026-08-06T10:15:00Z',
        updated_at: '2026-08-14T16:30:00Z',
      },
    ];
  }

  private getFallbackAppointments(): AppointmentItem[] {
    return [
      {
        id: 1,
        appointment_identifier: 'APT-2026-3104',
        healthcare_facility: 'Apollo CyberCare Institute, Bengaluru',
        department: 'Neurology & Neuro-Radiology',
        clinician_name: 'Dr. Vikramaditya Sen, MD, DM',
        appointment_date: '2026-10-24T10:30:00+05:30',
        appointment_type: 'IN_PERSON',
        appointment_type_display: 'In-Person Consultation',
        status: 'CONFIRMED',
        status_display: 'Confirmed',
        reason_for_visit: 'Follow-up consultation to evaluate post-scan neuro-metabolic stability.',
        instructions: 'Arrive 15 minutes prior with home blood pressure logs.',
        created_at: '2026-09-22T08:00:00Z',
        updated_at: '2026-09-22T08:00:00Z',
      },
      {
        id: 2,
        appointment_identifier: 'APT-2026-3180',
        healthcare_facility: 'AIIMS Horizon Health Hub, Bengaluru',
        department: 'Cardiology & Tele-Monitoring',
        clinician_name: 'Dr. Meera Nambiar, MD',
        appointment_date: '2026-11-12T14:00:00+05:30',
        appointment_type: 'TELE_HEALTH',
        appointment_type_display: 'Tele-Health Video',
        status: 'SCHEDULED',
        status_display: 'Scheduled',
        reason_for_visit: 'Routine virtual review of hemodynamic biomarkers.',
        instructions: 'Secure video room link will activate 10 minutes prior.',
        created_at: '2026-08-12T10:00:00Z',
        updated_at: '2026-08-12T10:00:00Z',
      },
    ];
  }

  private getFallbackTimeline(): CareEventItem[] {
    return [
      {
        id: 1,
        event_identifier: 'EVT-2026-9011',
        event_type: 'APPOINTMENT',
        event_type_display: 'Appointment',
        title: 'Confirmed: Upcoming Follow-up with Dr. Vikramaditya Sen',
        event_date: '2026-10-24T10:30:00+05:30',
        facility: 'Apollo CyberCare Institute, Bengaluru',
        summary: 'In-person neuro-radiology review scheduled.',
        related_reference: 'APT-2026-3104',
        badge_tone: 'cyan',
        created_at: '2026-09-22T08:00:00Z',
      },
      {
        id: 2,
        event_identifier: 'EVT-2026-8912',
        event_type: 'CLAIM_SUBMITTED',
        event_type_display: 'Claim Submitted',
        title: 'Insurance Claim Submitted: CLM-2026-7712',
        event_date: '2026-09-21T11:30:00+05:30',
        facility: 'Spectral Indemnity Assurance Corp (Simulated)',
        summary: 'Claim of ₹1,16,000 filed for MRI Neuro Protocol.',
        related_reference: 'CLM-2026-7712',
        badge_tone: 'violet',
        created_at: '2026-09-21T11:30:00Z',
      },
      {
        id: 3,
        event_identifier: 'EVT-2026-8913',
        event_type: 'BILL_GENERATED',
        event_type_display: 'Bill Generated',
        title: 'Medical Invoice Issued: INV-2026-8841',
        event_date: '2026-09-20T12:00:00+05:30',
        facility: 'Fortis Spectral Neuroscience Hospital',
        summary: 'Total billed ₹1,45,000; Patient estimated responsibility: ₹29,000.',
        related_reference: 'INV-2026-8841',
        badge_tone: 'gold',
        created_at: '2026-09-20T12:00:00Z',
      },
      {
        id: 4,
        event_identifier: 'EVT-2026-8914',
        event_type: 'TEST_RESULT',
        event_type_display: 'Test Result',
        title: 'Diagnostic Lab Published: REC-2026-0042',
        event_date: '2026-09-18T10:00:00+05:30',
        facility: 'Apollo CyberCare Institute, Bengaluru',
        summary: 'High-resolution MRI images verified and added to patient health records.',
        related_reference: 'REC-2026-0042',
        badge_tone: 'cyan',
        created_at: '2026-09-18T10:00:00Z',
      },
      {
        id: 5,
        event_identifier: 'EVT-2026-8815',
        event_type: 'CLAIM_PROCESSED',
        event_type_display: 'Claim Processed',
        title: 'Insurance Claim Settled: CLM-2026-5309',
        event_date: '2026-08-14T16:30:00+05:30',
        facility: 'Spectral Indemnity Assurance Corp',
        summary: 'Claim of ₹60,000 processed and settled directly to provider.',
        related_reference: 'CLM-2026-5309',
        badge_tone: 'emerald',
        created_at: '2026-08-14T16:30:00Z',
      },
    ];
  }
}
