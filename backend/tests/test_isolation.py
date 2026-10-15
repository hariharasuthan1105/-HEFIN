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
from apps.billing.models import MedicalBill
from apps.insurance.models import InsurancePolicy, InsuranceClaim
from apps.assistant.models import ChatMessage

User = get_user_model()

class PatientIsolationTestCase(TestCase):
    def setUp(self):
        # Patient A
        self.user_a = User.objects.create_user(
            username='patient.alpha',
            email='alpha@example.com',
            password='password123',
            role='PATIENT',
        )
        self.profile_a = PatientProfile.objects.create(
            user=self.user_a,
            patient_identifier='HEF-PAT-ALPHA-01',
        )
        self.token_a, _ = Token.objects.get_or_create(user=self.user_a)

        # Patient B
        self.user_b = User.objects.create_user(
            username='patient.beta',
            email='beta@example.com',
            password='password123',
            role='PATIENT',
        )
        self.profile_b = PatientProfile.objects.create(
            user=self.user_b,
            patient_identifier='HEF-PAT-BETA-02',
        )
        self.token_b, _ = Token.objects.get_or_create(user=self.user_b)

        # Create Record for Patient B
        self.record_b = MedicalRecord.objects.create(
            patient=self.profile_b,
            record_identifier='REC-BETA-999',
            record_type='CLINICAL_SUMMARY',
            title='Confidential Beta Care Note',
            healthcare_facility='Private Facility B',
            attending_clinician='Dr. Beta',
            record_date=date(2026, 9, 1),
            summary='Sensitive medical summary for Beta only',
        )

        # Create Bill for Patient B
        self.bill_b = MedicalBill.objects.create(
            patient=self.profile_b,
            invoice_number='INV-BETA-888',
            hospital_name='Hospital B',
            bill_date=date(2026, 9, 1),
            due_date=date(2026, 10, 1),
            total_amount=Decimal('45000.00'),
            simulated_coverage_amount=Decimal('40000.00'),
            estimated_patient_responsibility=Decimal('5000.00'),
            payment_status='PENDING',
        )

        self.client_a = APIClient()
        self.client_a.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')

    def test_patient_a_cannot_see_patient_b_records_in_list(self):
        url = reverse('records-list')
        response = self.client_a.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Results should contain zero records, as Patient A has no records
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

    def test_patient_a_cannot_access_patient_b_record_detail(self):
        url = reverse('records-detail', kwargs={'pk': self.record_b.pk})
        response = self.client_a.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patient_a_cannot_see_patient_b_bills_in_list(self):
        url = reverse('billing-list')
        response = self.client_a.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

    def test_patient_a_cannot_access_patient_b_bill_detail(self):
        url = reverse('billing-detail', kwargs={'pk': self.bill_b.pk})
        response = self.client_a.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patient_a_cannot_see_patient_b_assistant_messages(self):
        # Create assistant message for Patient B
        ChatMessage.objects.create(
            patient=self.profile_b,
            role='assistant',
            content='Private medical explanation for Patient B',
            intent='RECORDS_VITALS',
            is_simulated=True,
        )
        url = reverse('assistant-messages')
        response = self.client_a.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Patient A must not see Patient B's chat history
        self.assertEqual(len(response.data), 0)

    def test_patient_a_cannot_query_patient_b_data_via_assistant(self):
        url = reverse('assistant-messages')
        # Patient A asks for bills - should receive "no outstanding bills" since only Patient B has a bill
        response = self.client_a.post(url, {'message': 'What are my unpaid bills?'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn('INV-BETA-888', response.data['message'])
        self.assertNotIn('Private Facility B', response.data['message'])

    def test_unauthenticated_request_is_rejected(self):
        unauth_client = APIClient()
        url = reverse('records-list')
        response = unauth_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_token_is_rejected(self):
        bad_client = APIClient()
        bad_client.credentials(HTTP_AUTHORIZATION='Token invalid-forged-token-xyz123')
        url = reverse('records-list')
        response = bad_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

