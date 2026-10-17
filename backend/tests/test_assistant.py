"""
Backend test suite for HEFIN 3.0 Care Assistant.
Covers deterministic intent routing, grounded records, cross-patient isolation,
unauthenticated rejection, session message tracking, and clear-chat endpoints.
"""
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token

from apps.patients.models import PatientProfile
from apps.records.models import MedicalRecord
from apps.billing.models import MedicalBill, BillLineItem
from apps.insurance.models import InsurancePolicy, InsuranceClaim
from apps.appointments.models import Appointment, CareEvent
from apps.assistant.models import ChatMessage

User = get_user_model()

@override_settings(DEBUG=True, ENABLE_DEV_DEMO_AUTH=True)
class CareAssistantTests(APITestCase):
    def setUp(self):
        # Patient 1: Aarav Sharma
        self.user_aarav = User.objects.create_user(
            username='aarav.sharma',
            email='aarav@test.hefin',
            password='testpassword123',
            first_name='Aarav',
            last_name='Sharma',
            is_demo=True,
        )
        self.patient_aarav = PatientProfile.objects.create(
            user=self.user_aarav,
            patient_identifier='HEF-PAT-2026-9814',
            date_of_birth=date(1991, 6, 14),
            gender='M',
            blood_group='O+',
            address_city='Bengaluru',
            address_state='Karnataka',
        )
        self.token_aarav = Token.objects.create(user=self.user_aarav)

        # Patient 2: Priya Patel
        self.user_priya = User.objects.create_user(
            username='priya.patel',
            email='priya@test.hefin',
            password='testpassword123',
            first_name='Priya',
            last_name='Patel',
            is_demo=True,
        )
        self.patient_priya = PatientProfile.objects.create(
            user=self.user_priya,
            patient_identifier='HEF-PAT-2026-4402',
            date_of_birth=date(1996, 3, 22),
            gender='F',
            blood_group='B+',
            address_city='Mumbai',
            address_state='Maharashtra',
        )
        self.token_priya = Token.objects.create(user=self.user_priya)

        # Seed Aarav's data
        self.policy_aarav = InsurancePolicy.objects.create(
            patient=self.patient_aarav,
            policy_number='POL-SPECTRAL-2026-0941',
            plan_name='Spectral UltraCare Comprehensive',
            fictional_insurer='Spectral Indemnity Assurance Corp (Simulated)',
            coverage_category='Comprehensive Super-Specialty Inpatient & Neuro Care',
            coverage_limit=Decimal('1500000.00'),
            used_coverage=Decimal('176000.00'),
            remaining_coverage=Decimal('1324000.00'),
            co_pay_percentage=Decimal('10.00'),
            exclusions_summary='Standard 30-day waiting period for elective robotic surgery.',
            status='ACTIVE',
            start_date=date(2026, 1, 1),
            renewal_date=date(2027, 1, 1),
        )

        self.bill_aarav = MedicalBill.objects.create(
            patient=self.patient_aarav,
            invoice_number='INV-2026-8801',
            hospital_name='Fortis Spectral Neuroscience Hospital, Bannerghatta',
            bill_date=date(2026, 9, 20),
            due_date=date(2026, 10, 30),
            total_amount=Decimal('145000.00'),
            simulated_coverage_amount=Decimal('116000.00'),
            estimated_patient_responsibility=Decimal('29000.00'),
            payment_status='PENDING',
        )
        BillLineItem.objects.create(
            bill=self.bill_aarav,
            description='Functional 3.0T MRI Brain Protocol',
            service_code='RAD-MRI-301',
            quantity=1,
            unit_price=Decimal('65000.00'),
            total_price=Decimal('65000.00'),
            covered_amount=Decimal('52000.00'),
            patient_share=Decimal('13000.00'),
        )

        self.claim_aarav = InsuranceClaim.objects.create(
            policy=self.policy_aarav,
            bill=self.bill_aarav,
            claim_reference='CLM-2026-7702',
            claim_date=date(2026, 9, 21),
            hospital_name='Fortis Spectral Neuroscience Hospital, Bannerghatta',
            treatment_summary='High-Resolution 3.0T Brain MRI Diagnostic Protocol',
            claimed_amount=Decimal('116000.00'),
            approved_amount=Decimal('116000.00'),
            settlement_status='UNDER_VERIFICATION',
            timeline_steps=[
                {'step': 'Claim Submitted', 'timestamp': '2026-09-21 11:30', 'note': 'Electronic submission'},
                {'step': 'Clinical Review', 'timestamp': '2026-09-23 15:45', 'note': 'Medical records validated'},
            ],
        )

        now = timezone.now()
        self.appointment_aarav = Appointment.objects.create(
            patient=self.patient_aarav,
            appointment_identifier='APT-2026-3104',
            healthcare_facility='Apollo CyberCare Institute, Bengaluru',
            department='Neurology & Neuro-Radiology',
            clinician_name='Dr. Vikramaditya Sen, MD, DM',
            appointment_date=now + timedelta(days=5),
            appointment_type='IN_PERSON',
            status='CONFIRMED',
            reason_for_visit='Follow-up post MRI evaluation',
            instructions='Arrive 15 minutes prior with home BP logs.',
        )

        self.record_aarav = MedicalRecord.objects.create(
            patient=self.patient_aarav,
            record_identifier='REC-2026-0041',
            record_type='IMAGING',
            title='High-Resolution 3.0T Brain MRI & Neuro-Profiling',
            healthcare_facility='Apollo CyberCare Institute, Bengaluru',
            attending_clinician='Dr. Vikramaditya Sen, MD, DM',
            record_date=date(2026, 9, 18),
            summary='3.0T functional MRI protocol demonstrates preserved gray-white differentiation.',
            vitals_summary={'bp': '118/76 mmHg', 'pulse': '68 bpm'},
            status='VERIFIED',
        )

        self.event_aarav = CareEvent.objects.create(
            patient=self.patient_aarav,
            event_identifier='EVT-2026-9001',
            event_type='APPOINTMENT',
            title='Confirmed: Upcoming Follow-up with Dr. Vikramaditya Sen',
            event_date=now + timedelta(days=5),
            facility='Apollo CyberCare Institute, Bengaluru',
            summary='In-person neuro-radiology review scheduled.',
            related_reference='APT-2026-3104',
            badge_tone='cyan',
        )

        # Priya's unique data to test isolation
        self.policy_priya = InsurancePolicy.objects.create(
            patient=self.patient_priya,
            policy_number='POL-PRIYA-SECRET-9999',
            plan_name='Priya Private Plan',
            fictional_insurer='Private Healthcare Trust',
            coverage_category='Outpatient Only',
            coverage_limit=Decimal('500000.00'),
            used_coverage=Decimal('50000.00'),
            remaining_coverage=Decimal('450000.00'),
            start_date=date(2026, 2, 1),
            renewal_date=date(2027, 2, 1),
        )
        self.claim_priya = InsuranceClaim.objects.create(
            policy=self.policy_priya,
            claim_reference='CLM-PRIYA-SECRET-8888',
            claim_date=date(2026, 9, 1),
            hospital_name='Priya Clinic Mumbai',
            treatment_summary='Priya Confidential Treatment',
            claimed_amount=Decimal('45000.00'),
            approved_amount=Decimal('45000.00'),
            settlement_status='APPROVED',
        )

    def test_unauthenticated_request_denied(self):
        """Unauthenticated requests must be rejected with 401."""
        response = self.client.post('/api/v1/assistant/messages/', {'message': 'What is my claim status?'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_claim_status_query_grounded_in_patient_data(self):
        """Aarav queries his claim and gets grounded response with cards."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_aarav.key}')
        response = self.client.post('/api/v1/assistant/messages/', {'message': 'What is the status of my claim?'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['intent'], 'claim_status')
        self.assertTrue(data['simulation'])
        self.assertIn('CLM-2026-7702', data['message'])
        self.assertIn('Clinical Documentation Review', data['message'])
        self.assertEqual(len(data['cards']), 1)

        card = data['cards'][0]
        self.assertEqual(card['type'], 'claim')
        self.assertEqual(card['claim_id'], 'CLM-2026-7702')
        self.assertEqual(card['status'], 'UNDER_VERIFICATION')
        self.assertIn('timeline_steps', card)
        self.assertEqual(data['navigation_target'], 'insurance')

    def test_claim_timeline_query(self):
        """Aarav asks about claim timeline and gets steps."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_aarav.key}')
        response = self.client.post('/api/v1/assistant/messages/', {'message': 'Show the claim timeline'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['intent'], 'claim_status')
        card = data['cards'][0]
        self.assertGreaterEqual(len(card['timeline_steps']), 2)

    def test_unpaid_bills_query_with_breakdown(self):
        """Aarav asks about unpaid bills and receives calculated responsibility and line items."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_aarav.key}')
        response = self.client.post('/api/v1/assistant/messages/', {'message': 'Show my unpaid bills and explain this hospital bill'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['intent'], 'billing_summary')
        self.assertIn('INV-2026-8801', data['message'])
        card = data['cards'][0]
        self.assertEqual(card['type'], 'bill')
        self.assertEqual(card['invoice_number'], 'INV-2026-8801')
        self.assertEqual(card['estimated_patient_responsibility'], '29000.00')
        self.assertGreaterEqual(len(card['line_items']), 1)
        self.assertEqual(card['line_items'][0]['service_code'], 'RAD-MRI-301')
        self.assertEqual(data['navigation_target'], 'bills')

    def test_insurance_coverage_query(self):
        """Aarav asks about insurance coverage and gets limits and remaining balance."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_aarav.key}')
        response = self.client.post('/api/v1/assistant/messages/', {'message': 'How much coverage is remaining?'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['intent'], 'insurance_coverage')
        self.assertIn('POL-SPECTRAL-2026-0941', data['message'])
        card = data['cards'][0]
        self.assertEqual(card['type'], 'insurance')
        self.assertEqual(card['remaining_coverage'], '1324000.00')
        self.assertEqual(card['co_pay_percentage'], '10.00')
        self.assertIn('Standard 30-day waiting period', card['exclusions'])

    def test_appointments_query(self):
        """Aarav asks about next appointment and gets Dr. Vikramaditya Sen details."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_aarav.key}')
        response = self.client.post('/api/v1/assistant/messages/', {'message': 'When is my next appointment?'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['intent'], 'appointments')
        self.assertIn('Dr. Vikramaditya Sen', data['message'])
        card = data['cards'][0]
        self.assertEqual(card['type'], 'appointment')
        self.assertEqual(card['appointment_id'], 'APT-2026-3104')
        self.assertEqual(card['facility'], 'Apollo CyberCare Institute, Bengaluru')

    def test_medical_records_query(self):
        """Aarav asks about recent medical records and gets MRI record link."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_aarav.key}')
        response = self.client.post('/api/v1/assistant/messages/', {'message': 'Show my latest medical records'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['intent'], 'health_records')
        self.assertIn('REC-2026-0041', data['message'])
        card = data['cards'][0]
        self.assertEqual(card['type'], 'record')
        self.assertEqual(card['record_id'], 'REC-2026-0041')
        self.assertEqual(card['facility'], 'Apollo CyberCare Institute, Bengaluru')

    def test_care_timeline_query(self):
        """Aarav asks about care journey and gets timeline summary."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_aarav.key}')
        response = self.client.post('/api/v1/assistant/messages/', {'message': 'Show my care journey'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['intent'], 'care_timeline')
        card = data['cards'][0]
        self.assertEqual(card['type'], 'timeline')
        self.assertGreaterEqual(len(card['events']), 1)

    def test_portal_navigation_intent(self):
        """Aarav asks to navigate and gets navigation card."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_aarav.key}')
        response = self.client.post('/api/v1/assistant/messages/', {'message': 'Take me to my bills'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['intent'], 'portal_navigation')
        self.assertEqual(data['navigation_target'], 'bills')

    def test_clinical_advice_safety_guardrail(self):
        """Asking for prescriptions or diagnosis triggers safety warning and refuses clinical advice."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_aarav.key}')
        response = self.client.post('/api/v1/assistant/messages/', {'message': 'Can you prescribe antibiotics for my headache?'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['intent'], 'medical_advice_warning')
        self.assertIn('cannot provide medical diagnoses', data['message'])

    def test_unsupported_action_guardrail(self):
        """Attempting to pay bill or transfer funds explains read-only limitation."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_aarav.key}')
        response = self.client.post('/api/v1/assistant/messages/', {'message': 'Pay my bill now'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['intent'], 'unsupported_action')
        self.assertIn('read-only inquiry mode', data['message'])

    def test_cross_patient_isolation(self):
        """Aarav must NEVER be able to see Priya's confidential claims, policies or records."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_aarav.key}')
        # Aarav specifically queries Priya's claim ID
        response = self.client.post('/api/v1/assistant/messages/', {'message': 'Show details for claim CLM-PRIYA-SECRET-8888'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # The response must only show Aarav's own claim, NEVER Priya's claim
        self.assertNotIn('CLM-PRIYA-SECRET-8888', data['message'])
        self.assertNotIn('Priya Clinic Mumbai', data['message'])
        self.assertIn('CLM-2026-7702', data['message'])

    def test_session_history_and_clear_chat(self):
        """Messages are tracked in active session and cleared via DELETE or clear endpoint."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_aarav.key}')
        self.client.post('/api/v1/assistant/messages/', {'message': 'What is my claim status?'})
        self.client.post('/api/v1/assistant/messages/', {'message': 'When is my next appointment?'})

        # Fetch history
        get_res = self.client.get('/api/v1/assistant/messages/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        history = get_res.json()
        self.assertEqual(len(history), 4)  # 2 user + 2 assistant messages

        # Clear chat
        clear_res = self.client.delete('/api/v1/assistant/messages/')
        self.assertEqual(clear_res.status_code, status.HTTP_200_OK)
        self.assertEqual(clear_res.json()['status'], 'cleared')

        # Check history is empty
        get_empty = self.client.get('/api/v1/assistant/messages/')
        self.assertEqual(len(get_empty.json()), 0)
