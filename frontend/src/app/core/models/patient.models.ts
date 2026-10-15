export interface CoverageSummary {
  policy_number: string;
  plan_name: string;
  insurer: string;
  coverage_category: string;
  coverage_limit: string;
  used_coverage: string;
  remaining_coverage: string;
  utilization_percentage: number;
  currency: string;
  status: string;
  renewal_date: string | null;
  co_pay_percentage: number;
}

export interface OutstandingBillsSummary {
  total_outstanding_inr: string;
  total_gross_billed_inr: string;
  unpaid_invoices_count: number;
  currency: string;
  latest_due_date: string | null;
  simulated_disclaimer: string;
}

export interface CareActivityItem {
  id: number;
  record_identifier: string;
  type: string;
  type_display: string;
  title: string;
  facility: string;
  date: string;
  summary: string;
  status: string;
}

export interface ClaimOverview {
  total_claims: number;
  pending_count: number;
  approved_count: number;
  total_claimed_inr: string;
  total_approved_inr: string;
  recent_claim: {
    reference: string;
    status: string;
    amount: string;
    date: string;
  } | null;
}

export interface UpcomingAppointmentItem {
  id: number;
  identifier: string;
  facility: string;
  department: string;
  clinician: string;
  datetime: string;
  type: string;
  status: string;
  reason: string;
}

export interface QuickActionItem {
  id: string;
  label: string;
  target: string;
  icon: string;
  description: string;
}

export interface FinancialAssistanceOverview {
  eligible_tier: string;
  zero_interest_months: number;
  estimated_monthly_inr: string;
  income_threshold_guidance: string;
  charity_care_supported: boolean;
  disclaimer: string;
}

export interface PatientDashboardSummary {
  greeting: string;
  patient_name: string;
  patient_identifier: string;
  blood_group: string;
  city: string;
  state: string;
  coverage_summary: CoverageSummary;
  outstanding_medical_bills: OutstandingBillsSummary;
  recent_care_activity: CareActivityItem[];
  claim_status_overview: ClaimOverview;
  upcoming_appointments: UpcomingAppointmentItem[];
  quick_actions: QuickActionItem[];
  financial_assistance_overview: FinancialAssistanceOverview;
  demo_banner: string;
}

export interface PatientProfileData {
  id: number;
  patient_identifier: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  address_city: string;
  address_state: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  allergies: string;
  chronic_conditions: string;
  preferred_language: string;
  reduced_motion: boolean;
  high_contrast: boolean;
  font_scale: string;
  email_notifications: boolean;
  sms_alerts: boolean;
  in_app_alerts: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicalRecordItem {
  id: number;
  record_identifier: string;
  record_type: string;
  record_type_display: string;
  type_display?: string;
  title: string;
  healthcare_facility: string;
  attending_clinician: string;
  record_date: string;
  summary: string;
  clinical_notes: string;
  vitals_summary: Record<string, string>;
  status: string;
  status_display: string;
  is_synthetic: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillLineItem {
  id: number;
  description: string;
  service_code: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  covered_amount: string;
  patient_share: string;
}

export interface MedicalBillItem {
  id: number;
  invoice_number: string;
  hospital_name: string;
  bill_date: string;
  due_date: string;
  currency: string;
  total_amount: string;
  simulated_coverage_amount: string;
  estimated_patient_responsibility: string;
  payment_status: string;
  payment_status_display: string;
  is_simulated: boolean;
  simulation_disclaimer: string;
  line_items: BillLineItem[];
  created_at: string;
  updated_at: string;
}

export interface InsuranceClaimItem {
  id: number;
  claim_reference: string;
  claim_date: string;
  hospital_name: string;
  treatment_summary: string;
  claimed_amount: string;
  approved_amount: string;
  settlement_status: string;
  settlement_status_display: string;
  timeline_steps: Array<{ step: string; timestamp: string; note: string }>;
  disclaimer: string;
  created_at: string;
  updated_at: string;
}

export interface InsurancePolicyItem {
  id: number;
  policy_number: string;
  plan_name: string;
  fictional_insurer: string;
  coverage_category: string;
  currency: string;
  coverage_limit: string;
  used_coverage: string;
  remaining_coverage: string;
  status: string;
  status_display: string;
  start_date: string;
  renewal_date: string;
  co_pay_percentage: string;
  exclusions_summary: string;
  is_synthetic: boolean;
  claims: InsuranceClaimItem[];
  created_at: string;
  updated_at: string;
}

export interface AppointmentItem {
  id: number;
  appointment_identifier: string;
  healthcare_facility: string;
  department: string;
  clinician_name: string;
  appointment_date: string;
  appointment_type: string;
  appointment_type_display: string;
  status: string;
  status_display: string;
  reason_for_visit: string;
  instructions: string;
  created_at: string;
  updated_at: string;
}

export interface CareEventItem {
  id: number;
  event_identifier: string;
  event_type: string;
  event_type_display: string;
  title: string;
  event_date: string;
  facility: string;
  summary: string;
  related_reference: string;
  badge_tone: string;
  created_at: string;
}

export interface AssistantCard {
  type: 'claim' | 'bill' | 'insurance' | 'appointment' | 'record' | 'timeline' | 'navigation';
  claim_id?: string;
  hospital?: string;
  treatment?: string;
  claim_date?: string;
  claimed_amount?: string;
  claimed_amount_formatted?: string;
  approved_amount?: string;
  approved_amount_formatted?: string;
  status?: string;
  status_display?: string;
  current_stage?: string;
  missing_documents?: string;
  next_action?: string;
  timeline_steps?: Array<{ step: string; timestamp: string; note: string }>;

  invoice_number?: string;
  bill_date?: string;
  due_date?: string;
  total_amount?: string;
  total_amount_formatted?: string;
  simulated_coverage_amount?: string;
  simulated_coverage_amount_formatted?: string;
  estimated_patient_responsibility?: string;
  estimated_patient_responsibility_formatted?: string;
  payment_status?: string;
  payment_status_display?: string;
  line_items?: Array<{
    description: string;
    service_code: string;
    quantity: number;
    total_price: string;
    total_price_formatted: string;
    covered_amount: string;
    covered_amount_formatted: string;
    patient_share: string;
    patient_share_formatted: string;
  }>;

  policy_number?: string;
  plan_name?: string;
  fictional_insurer?: string;
  coverage_category?: string;
  coverage_limit?: string;
  coverage_limit_formatted?: string;
  used_coverage?: string;
  used_coverage_formatted?: string;
  remaining_coverage?: string;
  remaining_coverage_formatted?: string;
  co_pay_percentage?: string;
  exclusions?: string;
  renewal_date?: string;

  appointment_id?: string;
  facility?: string;
  department?: string;
  clinician?: string;
  datetime?: string;
  datetime_formatted?: string;
  appointment_type?: string;
  type_display?: string;
  reason?: string;
  instructions?: string;

  record_id?: string;
  title?: string;
  record_date?: string;
  record_date_formatted?: string;
  record_type?: string;
  record_type_display?: string;
  summary?: string;
  vitals?: Record<string, string>;

  events?: Array<{
    id: string;
    type: string;
    title: string;
    date: string;
    facility: string;
    summary: string;
    ref: string;
    badge_tone: string;
  }>;

  target?: string;
  label?: string;
  description?: string;
}

export interface ChatMessageItem {
  id?: number | string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  cards?: AssistantCard[];
  suggested_actions?: string[];
  navigation_target?: string;
  simulation?: boolean;
  disclaimer?: string;
  created_at?: string;
  error?: boolean;
}

export interface AssistantResponse {
  id?: number;
  role: string;
  intent: string;
  message: string;
  cards: AssistantCard[];
  suggested_actions: string[];
  navigation_target: string;
  simulation: boolean;
  disclaimer: string;
  created_at?: string;
}

