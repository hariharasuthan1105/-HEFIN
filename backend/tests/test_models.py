from decimal import Decimal
from datetime import date
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from apps.patients.models import PatientProfile
from apps.records.models import MedicalRecord
from apps.billing.models import MedicalBill, BillLineItem
from apps.insurance.models import InsurancePolicy, InsuranceClaim

User = get_user_model()

class ModelValidationTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='test.patient',
            email='test.patient@example.com',
            password='testpassword123',
            role='PATIENT',
        )
        self.profile = PatientProfile.objects.create(
            user=self.user,
            patient_identifier='HEF-PAT-TEST-0001',
            date_of_birth=date(1990, 1, 1),
            gender='M',
            blood_group='O+',
            address_city='Bengaluru',
            address_state='Karnataka',
        )

    def test_patient_profile_creation(self):
        self.assertEqual(self.profile.patient_identifier, 'HEF-PAT-TEST-0001')
        self.assertEqual(self.profile.user.username, 'test.patient')
        self.assertFalse(self.profile.reduced_motion)

    def test_medical_record_creation(self):
        record = MedicalRecord.objects.create(
            patient=self.profile,
            record_identifier='REC-TEST-001',
            record_type='IMAGING',
            title='Test MRI Scan',
            healthcare_facility='Apollo CyberCare Institute',
            attending_clinician='Dr. Sen',
            record_date=date(2026, 9, 1),
            summary='Normal findings',
            is_synthetic=True,
        )
        self.assertEqual(record.record_identifier, 'REC-TEST-001')
        self.assertTrue(record.is_synthetic)
        self.assertEqual(record.get_record_type_display(), 'Radiology & Imaging')

    def test_financial_calculations_and_decimal_precision(self):
        bill = MedicalBill(
            patient=self.profile,
            invoice_number='INV-TEST-001',
            hospital_name='Apollo CyberCare',
            bill_date=date(2026, 9, 1),
            due_date=date(2026, 10, 1),
            total_amount=Decimal('100000.00'),
            simulated_coverage_amount=Decimal('80000.00'),
            estimated_patient_responsibility=Decimal('20000.00'),
            payment_status='PENDING',
        )
        bill.save()

        line_item = BillLineItem.objects.create(
            bill=bill,
            description='MRI Procedure',
            unit_price=Decimal('50000.00'),
            quantity=2,
            covered_amount=Decimal('80000.00'),
            patient_share=Decimal('20000.00'),
        )

        self.assertEqual(line_item.total_price, Decimal('100000.00'))
        self.assertIsInstance(bill.total_amount, Decimal)
        self.assertIsInstance(bill.estimated_patient_responsibility, Decimal)

    def test_negative_financial_amount_validation_error(self):
        bill = MedicalBill(
            patient=self.profile,
            invoice_number='INV-FAIL-001',
            hospital_name='Apollo CyberCare',
            bill_date=date(2026, 9, 1),
            due_date=date(2026, 10, 1),
            total_amount=Decimal('-500.00'),
            simulated_coverage_amount=Decimal('0.00'),
            estimated_patient_responsibility=Decimal('0.00'),
        )
        with self.assertRaises(ValidationError):
            bill.clean()

    def test_insurance_policy_remaining_coverage_calculation(self):
        policy = InsurancePolicy(
            patient=self.profile,
            policy_number='POL-TEST-001',
            plan_name='SpectralShield Comprehensive',
            fictional_insurer='Spectral Indemnity Corp',
            coverage_category='Comprehensive',
            coverage_limit=Decimal('500000.00'),
            used_coverage=Decimal('120000.00'),
            start_date=date(2026, 1, 1),
            renewal_date=date(2027, 1, 1),
            exclusions_summary='Standard test exclusions apply.',
        )
        policy.save()

        self.assertEqual(policy.remaining_coverage, Decimal('380000.00'))
