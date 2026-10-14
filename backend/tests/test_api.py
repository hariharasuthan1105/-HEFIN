from decimal import Decimal
from datetime import date
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

from apps.patients.models import PatientProfile
from apps.records.models import MedicalRecord
from apps.billing.models import MedicalBill, BillLineItem
from apps.insurance.models import InsurancePolicy, InsuranceClaim
from apps.appointments.models import Appointment, CareEvent
from django.utils import timezone

User = get_user_model()

class APITestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='api.user',
            email='api.user@example.com',
            password='password123',
            first_name='Aarav',
            last_name='Sharma',
            role='PATIENT',
        )
        self.profile = PatientProfile.objects.create(
            user=self.user,
            patient_identifier='HEF-PAT-API-001',
            date_of_birth=date(1991, 6, 14),
            gender='M',
            blood_group='O+',
            address_city='Bengaluru',
            address_state='Karnataka',
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        # Setup test data
        self.policy = InsurancePolicy.objects.create(
            patient=self.profile,
            policy_number='POL-API-001',
            plan_name='SpectralShield Comprehensive',
            fictional_insurer='Spectral Indemnity Corp (Simulated)',
            coverage_category='Comprehensive',
            coverage_limit=Decimal('1000000.00'),
            used_coverage=Decimal('200000.00'),
            remaining_coverage=Decimal('800000.00'),
            status='ACTIVE',
            start_date=date(2026, 1, 1),
            renewal_date=date(2027, 1, 1),
            exclusions_summary='Standard exclusions apply.',
        )

        self.bill = MedicalBill.objects.create(
            patient=self.profile,
            invoice_number='INV-API-001',
            hospital_name='Apollo CyberCare Institute',
            bill_date=date(2026, 9, 15),
            due_date=date(2026, 10, 15),
            currency='INR',
            total_amount=Decimal('150000.00'),
            simulated_coverage_amount=Decimal('120000.00'),
            estimated_patient_responsibility=Decimal('30000.00'),
            payment_status='PENDING',
        )
        BillLineItem.objects.create(
            bill=self.bill,
            description='Brain Protocol MRI',
            unit_price=Decimal('150000.00'),
            total_price=Decimal('150000.00'),
            covered_amount=Decimal('120000.00'),
            patient_share=Decimal('30000.00'),
        )

        self.record1 = MedicalRecord.objects.create(
            patient=self.profile,
            record_identifier='REC-API-001',
            record_type='IMAGING',
            title='Neural MRI Protocol',
            healthcare_facility='Apollo CyberCare Institute',
            attending_clinician='Dr. Sen',
            record_date=date(2026, 9, 10),
            summary='Intracranial scan within normal variations.',
        )
        self.record2 = MedicalRecord.objects.create(
            patient=self.profile,
            record_identifier='REC-API-002',
            record_type='DIAGNOSTIC_LAB',
            title='Hemodynamic Lab Screen',
            healthcare_facility='AIIMS Horizon Health Hub',
            attending_clinician='Dr. Nambiar',
            record_date=date(2026, 8, 10),
            summary='Normal cardiac markers.',
        )

        self.claim = InsuranceClaim.objects.create(
            policy=self.policy,
            bill=self.bill,
            claim_reference='CLM-API-001',
            claim_date=date(2026, 9, 16),
            hospital_name='Apollo CyberCare Institute',
            treatment_summary='Brain Protocol MRI',
            claimed_amount=Decimal('120000.00'),
            approved_amount=Decimal('120000.00'),
            settlement_status='UNDER_VERIFICATION',
        )

        self.appointment = Appointment.objects.create(
            patient=self.profile,
            appointment_identifier='APT-API-001',
            healthcare_facility='Apollo CyberCare Institute',
            department='Neurology',
            clinician_name='Dr. Sen',
            appointment_date=timezone.now() + timezone.timedelta(days=5),
            appointment_type='IN_PERSON',
            status='CONFIRMED',
            reason_for_visit='Follow-up examination',
        )

        self.care_event = CareEvent.objects.create(
            patient=self.profile,
            event_identifier='EVT-API-001',
            event_type='APPOINTMENT',
            title='Upcoming Appointment with Dr. Sen',
            event_date=timezone.now() + timezone.timedelta(days=5),
            facility='Apollo CyberCare Institute',
            summary='Follow-up appointment booked',
            badge_tone='cyan',
        )

    def test_api_status_endpoint_public(self):
        client = APIClient()  # unauthenticated
        response = client.get(reverse('api-status'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'healthy')
        self.assertEqual(response.data['version'], 'v1')

    def test_dashboard_summary_endpoint(self):
        response = self.client.get(reverse('patient-dashboard'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('greeting', response.data)
        self.assertEqual(response.data['patient_identifier'], 'HEF-PAT-API-001')
        self.assertEqual(response.data['coverage_summary']['currency'], 'INR')
        self.assertEqual(response.data['coverage_summary']['coverage_limit'], '1000000.00')
        self.assertEqual(response.data['outstanding_medical_bills']['total_outstanding_inr'], '30000.00')
        self.assertEqual(len(response.data['recent_care_activity']), 2)
        self.assertIn('demo_banner', response.data)

    def test_records_list_and_filters(self):
        # All records
        response = self.client.get(reverse('records-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)

        # Filter by record_type
        response_filtered = self.client.get(reverse('records-list') + '?record_type=IMAGING')
        results_filtered = response_filtered.data.get('results', response_filtered.data)
        self.assertEqual(len(results_filtered), 1)
        self.assertEqual(results_filtered[0]['record_identifier'], 'REC-API-001')

        # Search
        response_search = self.client.get(reverse('records-list') + '?search=Hemodynamic')
        results_search = response_search.data.get('results', response_search.data)
        self.assertEqual(len(results_search), 1)
        self.assertEqual(results_search[0]['record_identifier'], 'REC-API-002')

    def test_billing_list_and_line_items(self):
        response = self.client.get(reverse('billing-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['currency'], 'INR')
        self.assertEqual(len(results[0]['line_items']), 1)
        self.assertEqual(results[0]['line_items'][0]['description'], 'Brain Protocol MRI')

    def test_profile_patch_preferences(self):
        response = self.client.patch(reverse('patient-profile'), {
            'reduced_motion': True,
            'font_scale': 'large',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.reduced_motion)
        self.assertEqual(self.profile.font_scale, 'large')

    def test_insurance_policies_and_claims(self):
        res_policies = self.client.get(reverse('insurance-policies-list'))
        self.assertEqual(res_policies.status_code, status.HTTP_200_OK)
        policies = res_policies.data.get('results', res_policies.data)
        self.assertEqual(len(policies), 1)
        self.assertEqual(policies[0]['policy_number'], 'POL-API-001')

        res_claims = self.client.get(reverse('insurance-claims-list'))
        self.assertEqual(res_claims.status_code, status.HTTP_200_OK)
        claims = res_claims.data.get('results', res_claims.data)
        self.assertEqual(len(claims), 1)
        self.assertEqual(claims[0]['claim_reference'], 'CLM-API-001')

    def test_appointments_and_timeline(self):
        res_apts = self.client.get(reverse('appointments-list'))
        self.assertEqual(res_apts.status_code, status.HTTP_200_OK)
        apts = res_apts.data.get('results', res_apts.data)
        self.assertEqual(len(apts), 1)

        res_timeline = self.client.get(reverse('timeline-list'))
        self.assertEqual(res_timeline.status_code, status.HTTP_200_OK)
        timeline = res_timeline.data.get('results', res_timeline.data)
        self.assertEqual(len(timeline), 1)
        self.assertEqual(timeline[0]['event_type'], 'APPOINTMENT')
