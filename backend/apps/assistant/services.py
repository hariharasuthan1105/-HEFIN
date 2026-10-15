"""
HEFIN 3.0 Care Assistant Intent Router and Service Layer.
Deterministic, patient-scoped, data-grounded assistant service.
"""
from decimal import Decimal
import re
from django.utils import timezone
from apps.patients.models import PatientProfile
from apps.records.models import MedicalRecord
from apps.billing.models import MedicalBill
from apps.insurance.models import InsurancePolicy, InsuranceClaim
from apps.appointments.models import Appointment, CareEvent
from apps.assistant.models import ChatMessage

SIMULATION_DISCLAIMER = "DEMO -- SIMULATED HEALTHCARE AND INSURANCE DATA"

def format_inr(amount):
    """Formats decimal or float amount into INR representation (e.g. ₹1,16,000.00)."""
    try:
        val = Decimal(str(amount))
        # Format with Indian grouping
        s = f"{val:,.2f}"
        return f"₹{s}"
    except Exception:
        return f"₹{amount}"

class AssistantIntentRouter:
    """
    Deterministic intent router for HEFIN Care Assistant.
    Grounds all responses in authenticated patient's synthetic records.
    """

    def __init__(self, patient: PatientProfile):
        self.patient = patient

    def process_message(self, user_message: str) -> dict:
        """
        Routes the user message to appropriate intent handler and generates
        a structured response with text, cards, suggested actions, and navigation target.
        """
        cleaned = (user_message or "").strip().lower()

        # 1. Clinical Advice Warning (Safety check)
        if self._is_medical_advice_query(cleaned):
            return self._handle_medical_advice()

        # 2. Unsupported Action Warning (Read-only guardrail)
        if self._is_unsupported_action(cleaned):
            return self._handle_unsupported_action(cleaned)

        # 3. Portal Navigation
        nav_intent = self._detect_navigation(cleaned)
        if nav_intent:
            return self._handle_navigation(nav_intent)

        # 4. Claim Progress & Tracking
        if self._is_claim_query(cleaned):
            return self._handle_claim_query(cleaned)

        # 5. Medical Bills & Invoices
        if self._is_billing_query(cleaned):
            return self._handle_billing_query(cleaned)

        # 6. Insurance Coverage & Policy
        if self._is_insurance_query(cleaned):
            return self._handle_insurance_query(cleaned)

        # 7. Appointments
        if self._is_appointment_query(cleaned):
            return self._handle_appointment_query(cleaned)

        # 8. Health Records & Vitals
        if self._is_records_query(cleaned):
            return self._handle_records_query(cleaned)

        # 9. Care Timeline & Journey
        if self._is_timeline_query(cleaned):
            return self._handle_timeline_query(cleaned)

        # 10. Help & Capabilities
        if self._is_help_query(cleaned):
            return self._handle_help_query()

        # 11. Unknown Intent Fallback
        return self._handle_unknown_query(user_message)

    # ---------------- Detection Helpers ----------------

    def _is_medical_advice_query(self, text: str) -> bool:
        triggers = [
            "prescribe", "prescription recommendation", "what medicine", "which drug",
            "what pill", "diagnose", "do i have cancer", "treat my", "cure my",
            "painkiller", "antibiotic", "should i take", "dosage", "medical advice"
        ]
        return any(t in text for t in triggers)

    def _is_unsupported_action(self, text: str) -> bool:
        triggers = [
            "pay my bill", "pay bill", "pay invoice", "pay now", "transfer money",
            "make payment", "submit claim", "submit a claim", "file claim", "file a claim",
            "book appointment", "book an appointment", "schedule appointment", "book doctor",
            "cancel appointment", "change policy", "change insurance", "modify record",
            "delete record", "edit record"
        ]
        return any(t in text for t in triggers)

    def _detect_navigation(self, text: str) -> str | None:
        nav_patterns = [
            (r"(open|go to|take me to|show)\s+(my\s+)?(claims?|claim tracking)", "insurance"),
            (r"(open|go to|take me to|show)\s+(my\s+)?(bills?|invoices?|billing)", "bills"),
            (r"(open|go to|take me to|show)\s+(my\s+)?(insurance|policy|coverage)", "insurance"),
            (r"(open|go to|take me to|show)\s+(my\s+)?(appointments?|care timeline|timeline|journey)", "timeline"),
            (r"(open|go to|take me to|show)\s+(my\s+)?(health records?|records?|lab reports?)", "records"),
            (r"(open|go to|take me to|show)\s+(my\s+)?(profile|preferences?|settings?)", "profile"),
            (r"(open|go to|take me to|show)\s+(my\s+)?(dashboard|overview|home|workspace)", "dashboard"),
        ]
        for pattern, target in nav_patterns:
            if re.search(pattern, text):
                return target
        return None

    def _is_claim_query(self, text: str) -> bool:
        triggers = [
            "claim", "claims", "clm-", "status of my claim", "latest claim",
            "pending claim", "why is my claim pending", "what happened after submission",
            "claim timeline", "how much was approved", "documents missing",
            "missing documents", "pre-approval", "settlement"
        ]
        return any(t in text for t in triggers)

    def _is_billing_query(self, text: str) -> bool:
        triggers = [
            "bill", "bills", "unpaid", "invoice", "invoices", "payment",
            "how much do i need to pay", "how much do i owe", "what portion is covered",
            "explain this hospital bill", "breakdown", "itemized", "co-pay amount",
            "responsibility", "cost"
        ]
        return any(t in text for t in triggers)

    def _is_insurance_query(self, text: str) -> bool:
        triggers = [
            "insurance", "policy", "coverage", "remaining coverage", "what does my policy cover",
            "show my policy", "exclusions", "coverage limit", "annual limit", "carrier", "insurer"
        ]
        return any(t in text for t in triggers)

    def _is_appointment_query(self, text: str) -> bool:
        triggers = [
            "appointment", "appointments", "doctor", "visiting", "next appointment",
            "upcoming appointment", "appointment history", "which hospital am i visiting",
            "consultation", "clinician", "when is my next"
        ]
        return any(t in text for t in triggers)

    def _is_records_query(self, text: str) -> bool:
        triggers = [
            "record", "records", "health record", "medical records", "test", "tests",
            "lab", "lab report", "imaging", "mri", "vitals", "blood pressure", "notes",
            "clinical summary", "last hospital visit"
        ]
        return any(t in text for t in triggers)

    def _is_timeline_query(self, text: str) -> bool:
        triggers = [
            "timeline", "journey", "care journey", "care timeline",
            "what happened in my last visit", "activities this month",
            "recent activity", "care activity", "history"
        ]
        return any(t in text for t in triggers)

    def _is_help_query(self, text: str) -> bool:
        triggers = [
            "help", "what can you do", "who are you", "commands",
            "options", "features", "capabilities", "what are you", "guide"
        ]
        return any(t in text for t in triggers)

    # ---------------- Intent Handlers ----------------

    def _handle_medical_advice(self) -> dict:
        return {
            "intent": "medical_advice_warning",
            "message": (
                "HEFIN Care Assistant provides administrative and record explainability for your simulated profile. "
                "I cannot provide medical diagnoses, treatment recommendations, or prescribe medications. "
                "Please consult your licensed attending physician for all clinical assessments."
            ),
            "cards": [],
            "suggested_actions": [
                "Show my latest medical records",
                "When is my next appointment?",
                "Open my health records"
            ],
            "navigation_target": "records",
            "simulation": True,
            "disclaimer": SIMULATION_DISCLAIMER,
        }

    def _handle_unsupported_action(self, text: str) -> dict:
        target = "bills" if "bill" in text or "pay" in text else "insurance" if "claim" in text else "timeline"
        return {
            "intent": "unsupported_action",
            "message": (
                "In HEFIN 3.0 Task 04, the Care Assistant operates in read-only inquiry mode. "
                "Direct financial transactions (such as bill payment or money transfers) and clinical alterations "
                "(such as booking real appointments or filing live claims) are not permitted from chat. "
                "You can review current simulated details in your patient workspace."
            ),
            "cards": [],
            "suggested_actions": [
                "Show my unpaid bills",
                "What is the status of my claim?",
                "When is my next appointment?"
            ],
            "navigation_target": target,
            "simulation": True,
            "disclaimer": SIMULATION_DISCLAIMER,
        }

    def _handle_navigation(self, target: str) -> dict:
        names = {
            "insurance": "Insurance & Claims",
            "bills": "Medical Bills",
            "timeline": "Care Timeline & Appointments",
            "records": "Health Records",
            "profile": "Preferences & Profile",
            "dashboard": "Patient Dashboard Overview",
        }
        section_name = names.get(target, "Patient Workspace")
        return {
            "intent": "portal_navigation",
            "message": f"Navigating to {section_name}.",
            "cards": [
                {
                    "type": "navigation",
                    "target": target,
                    "label": f"Open {section_name}",
                    "description": f"Switch directly to your {section_name} workspace view."
                }
            ],
            "suggested_actions": [
                "What is my claim status?",
                "Show my unpaid bills",
                "When is my next appointment?"
            ],
            "navigation_target": target,
            "simulation": True,
            "disclaimer": SIMULATION_DISCLAIMER,
        }

    def _handle_claim_query(self, text: str) -> dict:
        claims = list(InsuranceClaim.objects.filter(
            policy__patient=self.patient
        ).select_related('policy', 'bill').order_by('-claim_date', '-created_at'))

        if not claims:
            return {
                "intent": "claim_status",
                "message": "No insurance claims are currently recorded in your simulated profile.",
                "cards": [],
                "suggested_actions": [
                    "What does my policy cover?",
                    "Show my unpaid bills",
                    "Go to insurance"
                ],
                "navigation_target": "insurance",
                "simulation": True,
                "disclaimer": SIMULATION_DISCLAIMER,
            }

        # Check if user mentioned specific claim reference
        selected_claim = claims[0]
        for c in claims:
            if c.claim_reference.lower() in text:
                selected_claim = c
                break

        # Compute next action and missing documents based on status
        status = selected_claim.settlement_status
        status_display = selected_claim.get_settlement_status_display()
        
        missing_docs = "None recorded. All required clinical documentation was verified."
        next_action = "Awaiting final settlement disbursement to healthcare provider."

        if status == 'SUBMITTED':
            next_action = "Awaiting clinical documentation review by insurer's medical board."
        elif status == 'UNDER_VERIFICATION':
            next_action = "Review board validating high-resolution diagnostic imagery and billing codes."
        elif status == 'APPROVED':
            next_action = "Pre-approval issued. Awaiting fund release to provider's billing desk."
        elif status == 'SETTLED':
            next_action = "Claim settled in full. No further action required."
            missing_docs = "None (Claim settled)."
        elif status == 'ADDITIONAL_INFO_REQUESTED':
            missing_docs = "Hospital itemized discharge summary requested by insurer."
            next_action = "Submit requested itemized discharge summary to avoid processing delays."
        elif status == 'DECLINED':
            missing_docs = "Not applicable (Declined)."
            next_action = "Review policy exclusions or file an administrative query with the insurance desk."

        # Current processing stage
        steps = selected_claim.timeline_steps or []
        current_stage = steps[-1]['step'] if steps else status_display

        msg = (
            f"Your simulated claim ({selected_claim.claim_reference}) filed with {selected_claim.hospital_name} "
            f"for '{selected_claim.treatment_summary}' is currently {status_display}. "
            f"Claimed amount is {format_inr(selected_claim.claimed_amount)}, with "
            f"{format_inr(selected_claim.approved_amount)} approved. "
            f"Current stage: {current_stage}. Missing documents: {missing_docs}."
        )

        cards = [
            {
                "type": "claim",
                "claim_id": selected_claim.claim_reference,
                "hospital": selected_claim.hospital_name,
                "treatment": selected_claim.treatment_summary,
                "claim_date": selected_claim.claim_date.isoformat(),
                "claimed_amount": str(selected_claim.claimed_amount),
                "claimed_amount_formatted": format_inr(selected_claim.claimed_amount),
                "approved_amount": str(selected_claim.approved_amount),
                "approved_amount_formatted": format_inr(selected_claim.approved_amount),
                "status": selected_claim.settlement_status,
                "status_display": status_display,
                "current_stage": current_stage,
                "missing_documents": missing_docs,
                "next_action": next_action,
                "timeline_steps": steps,
            }
        ]

        return {
            "intent": "claim_status",
            "message": msg,
            "cards": cards,
            "suggested_actions": [
                "Show the claim timeline",
                "What does my policy cover?",
                "Show my unpaid bills"
            ],
            "navigation_target": "insurance",
            "simulation": True,
            "disclaimer": SIMULATION_DISCLAIMER,
        }

    def _handle_billing_query(self, text: str) -> dict:
        bills = list(MedicalBill.objects.filter(
            patient=self.patient
        ).prefetch_related('line_items').order_by('-bill_date', '-created_at'))

        if not bills:
            return {
                "intent": "billing_summary",
                "message": "No medical bills are currently recorded for your profile.",
                "cards": [],
                "suggested_actions": [
                    "What does my policy cover?",
                    "When is my next appointment?"
                ],
                "navigation_target": "bills",
                "simulation": True,
                "disclaimer": SIMULATION_DISCLAIMER,
            }

        unpaid_bills = [b for b in bills if b.payment_status in ['PENDING', 'PARTIALLY_PAID', 'IN_REVIEW']]
        primary_bill = unpaid_bills[0] if unpaid_bills else bills[0]

        total_patient_due = sum((b.estimated_patient_responsibility for b in unpaid_bills), Decimal('0.00'))
        total_billed_pending = sum((b.total_amount for b in unpaid_bills), Decimal('0.00'))

        items_list = []
        for it in primary_bill.line_items.all()[:5]:
            items_list.append({
                "description": it.description,
                "service_code": it.service_code,
                "quantity": it.quantity,
                "total_price": str(it.total_price),
                "total_price_formatted": format_inr(it.total_price),
                "covered_amount": str(it.covered_amount),
                "covered_amount_formatted": format_inr(it.covered_amount),
                "patient_share": str(it.patient_share),
                "patient_share_formatted": format_inr(it.patient_share),
            })

        if unpaid_bills:
            msg = (
                f"You have {len(unpaid_bills)} outstanding simulated bill(s). "
                f"Your estimated patient responsibility across unpaid invoices is {format_inr(total_patient_due)} "
                f"(out of {format_inr(total_billed_pending)} total billed). "
                f"Latest invoice {primary_bill.invoice_number} from {primary_bill.hospital_name} has a patient responsibility "
                f"of {format_inr(primary_bill.estimated_patient_responsibility)}, due on {primary_bill.due_date.strftime('%d %b %Y')}."
            )
        else:
            msg = (
                f"All your recorded medical bills are settled in full. "
                f"Your last invoice was {primary_bill.invoice_number} for {format_inr(primary_bill.total_amount)} "
                f"from {primary_bill.hospital_name}."
            )

        cards = [
            {
                "type": "bill",
                "invoice_number": primary_bill.invoice_number,
                "hospital": primary_bill.hospital_name,
                "bill_date": primary_bill.bill_date.isoformat(),
                "due_date": primary_bill.due_date.isoformat(),
                "total_amount": str(primary_bill.total_amount),
                "total_amount_formatted": format_inr(primary_bill.total_amount),
                "simulated_coverage_amount": str(primary_bill.simulated_coverage_amount),
                "simulated_coverage_amount_formatted": format_inr(primary_bill.simulated_coverage_amount),
                "estimated_patient_responsibility": str(primary_bill.estimated_patient_responsibility),
                "estimated_patient_responsibility_formatted": format_inr(primary_bill.estimated_patient_responsibility),
                "payment_status": primary_bill.payment_status,
                "payment_status_display": primary_bill.get_payment_status_display(),
                "line_items": items_list,
                "is_simulated": True,
            }
        ]

        return {
            "intent": "billing_summary",
            "message": msg,
            "cards": cards,
            "suggested_actions": [
                "What portion is covered?",
                "What does my policy cover?",
                "Open medical bills"
            ],
            "navigation_target": "bills",
            "simulation": True,
            "disclaimer": SIMULATION_DISCLAIMER,
        }

    def _handle_insurance_query(self, text: str) -> dict:
        policies = list(InsurancePolicy.objects.filter(
            patient=self.patient
        ).order_by('-start_date'))

        if not policies:
            return {
                "intent": "insurance_coverage",
                "message": "No insurance policy is currently recorded for your profile.",
                "cards": [],
                "suggested_actions": [
                    "Show my medical bills",
                    "When is my next appointment?"
                ],
                "navigation_target": "insurance",
                "simulation": True,
                "disclaimer": SIMULATION_DISCLAIMER,
            }

        pol = policies[0]
        msg = (
            f"You are covered under simulated policy '{pol.plan_name}' ({pol.policy_number}) "
            f"with {pol.fictional_insurer}. "
            f"Your annual coverage limit is {format_inr(pol.coverage_limit)}, of which "
            f"{format_inr(pol.used_coverage)} has been utilized and {format_inr(pol.remaining_coverage)} remains available. "
            f"Co-pay requirement: {pol.co_pay_percentage}%. Status: {pol.get_status_display()}."
        )

        cards = [
            {
                "type": "insurance",
                "policy_number": pol.policy_number,
                "plan_name": pol.plan_name,
                "fictional_insurer": pol.fictional_insurer,
                "coverage_category": pol.coverage_category,
                "coverage_limit": str(pol.coverage_limit),
                "coverage_limit_formatted": format_inr(pol.coverage_limit),
                "used_coverage": str(pol.used_coverage),
                "used_coverage_formatted": format_inr(pol.used_coverage),
                "remaining_coverage": str(pol.remaining_coverage),
                "remaining_coverage_formatted": format_inr(pol.remaining_coverage),
                "co_pay_percentage": str(pol.co_pay_percentage),
                "status": pol.status,
                "status_display": pol.get_status_display(),
                "exclusions": pol.exclusions_summary,
                "renewal_date": pol.renewal_date.isoformat(),
            }
        ]

        return {
            "intent": "insurance_coverage",
            "message": msg,
            "cards": cards,
            "suggested_actions": [
                "What is the status of my claim?",
                "What are the exclusions?",
                "Open insurance section"
            ],
            "navigation_target": "insurance",
            "simulation": True,
            "disclaimer": SIMULATION_DISCLAIMER,
        }

    def _handle_appointment_query(self, text: str) -> dict:
        now = timezone.now()
        apts = list(Appointment.objects.filter(
            patient=self.patient
        ).order_by('appointment_date'))

        if not apts:
            return {
                "intent": "appointments",
                "message": "You have no appointments recorded in your patient profile.",
                "cards": [],
                "suggested_actions": [
                    "Show my latest medical records",
                    "Show care journey"
                ],
                "navigation_target": "timeline",
                "simulation": True,
                "disclaimer": SIMULATION_DISCLAIMER,
            }

        upcoming = [a for a in apts if a.status in ['CONFIRMED', 'SCHEDULED']]
        selected_apt = upcoming[0] if upcoming else apts[-1]

        dt_str = selected_apt.appointment_date.strftime("%d %B %Y at %I:%M %p")
        msg = (
            f"Your next scheduled consultation is with {selected_apt.clinician_name} "
            f"({selected_apt.department}) at {selected_apt.healthcare_facility} on {dt_str}. "
            f"Type: {selected_apt.get_appointment_type_display()}. Status: {selected_apt.get_status_display()}. "
            f"Instructions: {selected_apt.instructions or 'Arrive 15 minutes prior with identity verification.'}"
        )

        cards = [
            {
                "type": "appointment",
                "appointment_id": selected_apt.appointment_identifier,
                "facility": selected_apt.healthcare_facility,
                "department": selected_apt.department,
                "clinician": selected_apt.clinician_name,
                "datetime": selected_apt.appointment_date.isoformat(),
                "datetime_formatted": dt_str,
                "appointment_type": selected_apt.appointment_type,
                "type_display": selected_apt.get_appointment_type_display(),
                "status": selected_apt.status,
                "status_display": selected_apt.get_status_display(),
                "reason": selected_apt.reason_for_visit,
                "instructions": selected_apt.instructions,
            }
        ]

        return {
            "intent": "appointments",
            "message": msg,
            "cards": cards,
            "suggested_actions": [
                "Show care journey",
                "Show my latest medical records",
                "Open appointments & timeline"
            ],
            "navigation_target": "timeline",
            "simulation": True,
            "disclaimer": SIMULATION_DISCLAIMER,
        }

    def _handle_records_query(self, text: str) -> dict:
        recs = list(MedicalRecord.objects.filter(
            patient=self.patient
        ).order_by('-record_date', '-created_at'))

        if not recs:
            return {
                "intent": "health_records",
                "message": "No medical records found for your profile.",
                "cards": [],
                "suggested_actions": [
                    "When is my next appointment?",
                    "What does my policy cover?"
                ],
                "navigation_target": "records",
                "simulation": True,
                "disclaimer": SIMULATION_DISCLAIMER,
            }

        rec = recs[0]
        date_str = rec.record_date.strftime("%d %B %Y")
        msg = (
            f"Your latest verified clinical record is '{rec.title}' ({rec.record_identifier}) "
            f"from {rec.healthcare_facility}, recorded on {date_str} by {rec.attending_clinician}. "
            f"Summary: {rec.summary}"
        )

        cards = [
            {
                "type": "record",
                "record_id": rec.record_identifier,
                "title": rec.title,
                "facility": rec.healthcare_facility,
                "clinician": rec.attending_clinician,
                "record_date": rec.record_date.isoformat(),
                "record_date_formatted": date_str,
                "record_type": rec.record_type,
                "record_type_display": rec.get_record_type_display(),
                "summary": rec.summary,
                "vitals": rec.vitals_summary,
                "status": rec.status,
            }
        ]

        return {
            "intent": "health_records",
            "message": msg,
            "cards": cards,
            "suggested_actions": [
                "Show recent tests",
                "Find my last hospital visit",
                "Open health records"
            ],
            "navigation_target": "records",
            "simulation": True,
            "disclaimer": SIMULATION_DISCLAIMER,
        }

    def _handle_timeline_query(self, text: str) -> dict:
        events = list(CareEvent.objects.filter(
            patient=self.patient
        ).order_by('-event_date')[:6])

        if not events:
            return {
                "intent": "care_timeline",
                "message": "No care events recorded on your timeline.",
                "cards": [],
                "suggested_actions": [
                    "When is my next appointment?",
                    "Show my latest medical records"
                ],
                "navigation_target": "timeline",
                "simulation": True,
                "disclaimer": SIMULATION_DISCLAIMER,
            }

        events_data = []
        for e in events:
            events_data.append({
                "id": e.event_identifier,
                "type": e.event_type,
                "title": e.title,
                "date": e.event_date.strftime("%d %b %Y"),
                "facility": e.facility,
                "summary": e.summary,
                "ref": e.related_reference,
                "badge_tone": e.badge_tone,
            })

        msg = (
            f"Your simulated care timeline tracks {len(events)} recent healthcare activities, "
            f"starting most recently with '{events[0].title}' on {events[0].event_date.strftime('%d %b %Y')} "
            f"at {events[0].facility}."
        )

        cards = [
            {
                "type": "timeline",
                "title": "Recent Care Journey",
                "events": events_data,
            }
        ]

        return {
            "intent": "care_timeline",
            "message": msg,
            "cards": cards,
            "suggested_actions": [
                "What is the status of my claim?",
                "When is my next appointment?",
                "Open care timeline"
            ],
            "navigation_target": "timeline",
            "simulation": True,
            "disclaimer": SIMULATION_DISCLAIMER,
        }

    def _handle_help_query(self) -> dict:
        return {
            "intent": "help",
            "message": (
                f"Hello {self.patient.user.first_name}. I am the HEFIN Care Assistant, grounded in your "
                f"authenticated synthetic healthcare, billing, and insurance records. "
                f"I can answer questions regarding your claims, hospital invoices, insurance coverage limits, "
                f"upcoming appointments, verified medical reports, and care journey timeline."
            ),
            "cards": [],
            "suggested_actions": [
                "What is the status of my claim?",
                "Show my unpaid bills",
                "How much coverage is remaining?",
                "When is my next appointment?",
                "Show my latest medical records",
                "Show my care journey"
            ],
            "navigation_target": "",
            "simulation": True,
            "disclaimer": SIMULATION_DISCLAIMER,
        }

    def _handle_unknown_query(self, original_text: str) -> dict:
        return {
            "intent": "unknown",
            "message": (
                "I could not match your question to your recorded synthetic data. "
                "I can assist with inquiries about your claim status, hospital bills, insurance policies, "
                "appointments, health records, or care timeline. Try choosing one of the suggested questions below."
            ),
            "cards": [],
            "suggested_actions": [
                "What is the status of my claim?",
                "Show my unpaid bills",
                "How much coverage is remaining?",
                "When is my next appointment?"
            ],
            "navigation_target": "",
            "simulation": True,
            "disclaimer": SIMULATION_DISCLAIMER,
        }
