from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

from apps.patients.models import PatientProfile
from apps.records.models import MedicalRecord
from apps.billing.models import MedicalBill, BillLineItem
from apps.insurance.models import InsurancePolicy, InsuranceClaim
from apps.appointments.models import Appointment, CareEvent

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds database with realistic synthetic demo healthcare and insurance-financial data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Wipes existing demo patient records before seeding.',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('=' * 75))
        self.stdout.write(self.style.MIGRATE_HEADING('HEFIN 3.0 -- DEMO DATA GENERATION ENGINE'))
        self.stdout.write(self.style.WARNING('DEMO ENVIRONMENT -- SIMULATED HEALTHCARE AND FINANCIAL DATA'))
        self.stdout.write(self.style.MIGRATE_HEADING('=' * 75))

        reset = options.get('reset', True)

        if reset:
            self.stdout.write('Clearing existing demo patients...')
            demo_users = User.objects.filter(is_demo=True)
            demo_users.delete()

        # Seed Patients
        patients_config = [
            {
                'username': 'aarav.sharma',
                'email': 'aarav.sharma.demo@hefin.health',
                'first_name': 'Aarav',
                'last_name': 'Sharma',
                'password': 'demo1234',
                'identifier': 'HEF-PAT-2026-9814',
                'dob': date(1991, 6, 14),
                'gender': 'M',
                'blood_group': 'O+',
                'city': 'Bengaluru',
                'state': 'Karnataka',
                'allergies': 'Penicillin, Sulfa drugs',
                'conditions': 'Mild Migraine Aura, Essential Hypertension (Controlled)',
                'contact_name': 'Dr. Ananya Sharma',
                'contact_phone': '+91 98765 43210',
            },
            {
                'username': 'priya.patel',
                'email': 'priya.patel.demo@hefin.health',
                'first_name': 'Priya',
                'last_name': 'Patel',
                'password': 'demo1234',
                'identifier': 'HEF-PAT-2026-4402',
                'dob': date(1996, 3, 22),
                'gender': 'F',
                'blood_group': 'B+',
                'city': 'Mumbai',
                'state': 'Maharashtra',
                'allergies': 'Aspirin (Mild Gastric Sensitivity)',
                'conditions': 'Seasonal Allergic Rhinitis',
                'contact_name': 'Karan Patel',
                'contact_phone': '+91 98111 22334',
            },
            {
                'username': 'rohan.verma',
                'email': 'rohan.verma.demo@hefin.health',
                'first_name': 'Rohan',
                'last_name': 'Verma',
                'password': 'demo1234',
                'identifier': 'HEF-PAT-2026-1189',
                'dob': date(1988, 11, 5),
                'gender': 'M',
                'blood_group': 'A+',
                'city': 'New Delhi',
                'state': 'Delhi NCR',
                'allergies': 'None reported',
                'conditions': 'Hyperlipidemia (Managed via Diet & Statin)',
                'contact_name': 'Sunita Verma',
                'contact_phone': '+91 99222 33445',
            },
        ]

        now = timezone.now()

        for idx, cfg in enumerate(patients_config):
            user, created = User.objects.get_or_create(
                username=cfg['username'],
                defaults={
                    'email': cfg['email'],
                    'first_name': cfg['first_name'],
                    'last_name': cfg['last_name'],
                    'role': 'PATIENT',
                    'is_demo': True,
                },
            )
            user.set_password(cfg['password'])
            user.save()
            token, _ = Token.objects.get_or_create(user=user)

            profile, _ = PatientProfile.objects.get_or_create(
                user=user,
                defaults={
                    'patient_identifier': cfg['identifier'],
                    'date_of_birth': cfg['dob'],
                    'gender': cfg['gender'],
                    'blood_group': cfg['blood_group'],
                    'address_city': cfg['city'],
                    'address_state': cfg['state'],
                    'emergency_contact_name': cfg['contact_name'],
                    'emergency_contact_phone': cfg['contact_phone'],
                    'allergies': cfg['allergies'],
                    'chronic_conditions': cfg['conditions'],
                },
            )

            # 1. Insurance Policy
            policy_num = f"POL-SPECTRAL-2026-09{idx + 1}1"
            policy, _ = InsurancePolicy.objects.get_or_create(
                patient=profile,
                policy_number=policy_num,
                defaults={
                    'plan_name': 'HEFIN SpectralShield Comprehensive Health Plan',
                    'fictional_insurer': 'Spectral Indemnity Assurance Corp (Simulated)',
                    'coverage_category': 'Comprehensive Inpatient + Daycare + Advanced Neuro-Diagnostics',
                    'currency': 'INR',
                    'coverage_limit': Decimal('1000000.00'),  # 10 Lakhs
                    'used_coverage': Decimal('245000.00'),
                    'remaining_coverage': Decimal('755000.00'),
                    'status': 'ACTIVE',
                    'start_date': date(2026, 1, 1),
                    'renewal_date': date(2027, 1, 1),
                    'co_pay_percentage': Decimal('10.00'),
                    'exclusions_summary': (
                        'Excludes non-prescription dietary supplements, cosmetic elective enhancements, '
                        'and unauthorized alternative therapies. Standard 30-day waiting period for non-emergency elective admissions.'
                    ),
                    'is_synthetic': True,
                },
            )

            # 2. Medical Records
            records_data = [
                {
                    'id': f"REC-2026-004{idx}1",
                    'type': 'IMAGING',
                    'title': 'High-Resolution 3.0T Brain MRI & Metabolic Neuro-Profiling',
                    'facility': 'Apollo CyberCare Institute, Bengaluru',
                    'clinician': 'Dr. Vikramaditya Sen, MD, DM (Neurology)',
                    'date': date(2026, 9, 18),
                    'summary': (
                        '3.0T functional MRI protocol demonstrates preserved gray-white differentiation. '
                        'Microvascular perfusion indices remain stable with no acute ischemic alterations or focal lesions.'
                    ),
                    'notes': 'Clinical follow-up scheduled in 6 weeks. Recommended hydration and routine blood pressure monitoring.',
                    'vitals': {'bp': '118/76 mmHg', 'pulse': '68 bpm', 'spO2': '99%', 'bmi': '22.8', 'temp': '98.4 F'},
                    'status': 'VERIFIED',
                },
                {
                    'id': f"REC-2026-003{idx}2",
                    'type': 'DIAGNOSTIC_LAB',
                    'title': 'Comprehensive Cardiac & Hemodynamic Biomarker Panel',
                    'facility': 'AIIMS Horizon Health Hub, Bengaluru',
                    'clinician': 'Dr. Meera Nambiar, MD (Cardiology)',
                    'date': date(2026, 8, 4),
                    'summary': (
                        'High-sensitivity Troponin I, hs-CRP, and Lipid Profile all within normal physiologic thresholds. '
                        'Electrolyte concentrations balanced.'
                    ),
                    'notes': 'Serum cholesterol 172 mg/dL, HDL 54 mg/dL, LDL 94 mg/dL. Normal baseline ECG confirmed.',
                    'vitals': {'bp': '120/78 mmHg', 'pulse': '72 bpm', 'spO2': '98%', 'bmi': '22.7', 'temp': '98.6 F'},
                    'status': 'VERIFIED',
                },
                {
                    'id': f"REC-2026-002{idx}3",
                    'type': 'CLINICAL_SUMMARY',
                    'title': 'Preventive Neurology Care & Spectral Telemetry Review',
                    'facility': 'Fortis Spectral Neuroscience Hospital, Bannerghatta',
                    'clinician': 'Dr. Rajeshwari Rao, DNB (Internal Medicine)',
                    'date': date(2026, 6, 12),
                    'summary': (
                        'Routine neurological and sensory evaluation. Cognitive performance scores at 99th percentile. '
                        'Mild occupational eye-strain noted with prophylactic blue-light management advised.'
                    ),
                    'notes': 'Patient maintains regular aerobic exercise. Sleep architecture report shows good REM distribution.',
                    'vitals': {'bp': '116/74 mmHg', 'pulse': '66 bpm', 'spO2': '99%', 'bmi': '22.5', 'temp': '98.2 F'},
                    'status': 'VERIFIED',
                },
                {
                    'id': f"REC-2026-001{idx}4",
                    'type': 'PRESCRIPTION',
                    'title': 'Outpatient Preventive Medication & Neuro-Supportive Regimen',
                    'facility': 'Apollo CyberCare Institute, Bengaluru',
                    'clinician': 'Dr. Vikramaditya Sen, MD, DM',
                    'date': date(2026, 3, 10),
                    'summary': (
                        'Prescription issued for Telmisartan 20mg (morning) and Neuro-B Complex supplementation. '
                        'Periodic home BP logging requested.'
                    ),
                    'notes': 'Medication dispensed via Apollo CyberCare digital pharmacy. Refill active for 90 days.',
                    'vitals': {'bp': '124/80 mmHg', 'pulse': '74 bpm', 'spO2': '98%', 'bmi': '23.0', 'temp': '98.6 F'},
                    'status': 'VERIFIED',
                },
            ]

            for r in records_data:
                MedicalRecord.objects.get_or_create(
                    patient=profile,
                    record_identifier=r['id'],
                    defaults={
                        'record_type': r['type'],
                        'title': r['title'],
                        'healthcare_facility': r['facility'],
                        'attending_clinician': r['clinician'],
                        'record_date': r['date'],
                        'summary': r['summary'],
                        'clinical_notes': r['notes'],
                        'vitals_summary': r['vitals'],
                        'status': r['status'],
                        'is_synthetic': True,
                    },
                )

            # 3. Medical Bills and Line Items
            bills_data = [
                {
                    'invoice': f"INV-2026-88{idx}1",
                    'hospital': 'Fortis Spectral Neuroscience Hospital, Bannerghatta',
                    'date': date(2026, 9, 20),
                    'due': date(2026, 10, 30),
                    'total': Decimal('145000.00'),
                    'covered': Decimal('116000.00'),
                    'patient_resp': Decimal('29000.00'),
                    'status': 'PENDING',
                    'items': [
                        ('Functional 3.0T MRI Brain Protocol', 'RAD-MRI-301', 1, Decimal('65000.00'), Decimal('52000.00'), Decimal('13000.00')),
                        ('Contrast Neuro-Perfusion & Spectral Reconstruction', 'RAD-CON-104', 1, Decimal('35000.00'), Decimal('28000.00'), Decimal('7000.00')),
                        ('Senior Neuro-Radiology Clinical Consultation', 'CON-NEU-501', 1, Decimal('15000.00'), Decimal('12000.00'), Decimal('3000.00')),
                        ('Daycare Monitoring Suite & Precision Nursing', 'DAY-MON-202', 1, Decimal('30000.00'), Decimal('24000.00'), Decimal('6000.00')),
                    ],
                },
                {
                    'invoice': f"INV-2026-72{idx}2",
                    'hospital': 'AIIMS Horizon Health Hub, Bengaluru',
                    'date': date(2026, 8, 5),
                    'due': date(2026, 9, 15),
                    'total': Decimal('75000.00'),
                    'covered': Decimal('60000.00'),
                    'patient_resp': Decimal('15000.00'),
                    'status': 'PAID',
                    'items': [
                        ('Advanced Cardiac Enzyme & Troponin Panel', 'LAB-CAR-201', 1, Decimal('25000.00'), Decimal('20000.00'), Decimal('5000.00')),
                        ('Comprehensive Hemodynamic Biomarker Profile', 'LAB-HEM-102', 1, Decimal('30000.00'), Decimal('24000.00'), Decimal('6000.00')),
                        ('Cardiology Clinical Evaluation', 'CON-CAR-401', 1, Decimal('20000.00'), Decimal('16000.00'), Decimal('4000.00')),
                    ],
                },
                {
                    'invoice': f"INV-2026-61{idx}3",
                    'hospital': 'Apollo CyberCare Institute, Bengaluru',
                    'date': date(2026, 3, 12),
                    'due': date(2026, 4, 20),
                    'total': Decimal('25000.00'),
                    'covered': Decimal('25000.00'),
                    'patient_resp': Decimal('0.00'),
                    'status': 'PAID',
                    'items': [
                        ('Executive Annual Neuro-Screening', 'PRO-EXE-101', 1, Decimal('25000.00'), Decimal('25000.00'), Decimal('0.00')),
                    ],
                },
            ]

            created_bills = []
            for b in bills_data:
                bill, _ = MedicalBill.objects.get_or_create(
                    patient=profile,
                    invoice_number=b['invoice'],
                    defaults={
                        'hospital_name': b['hospital'],
                        'bill_date': b['date'],
                        'due_date': b['due'],
                        'currency': 'INR',
                        'total_amount': b['total'],
                        'simulated_coverage_amount': b['covered'],
                        'estimated_patient_responsibility': b['patient_resp'],
                        'payment_status': b['status'],
                        'is_simulated': True,
                    },
                )
                created_bills.append(bill)

                for item_desc, code, qty, price, cov, pat in b['items']:
                    BillLineItem.objects.get_or_create(
                        bill=bill,
                        description=item_desc,
                        defaults={
                            'service_code': code,
                            'quantity': qty,
                            'unit_price': price,
                            'total_price': price * qty,
                            'covered_amount': cov,
                            'patient_share': pat,
                        },
                    )

            # 4. Insurance Claims
            claims_data = [
                {
                    'ref': f"CLM-2026-77{idx}2",
                    'bill': created_bills[0],
                    'date': date(2026, 9, 21),
                    'hospital': 'Fortis Spectral Neuroscience Hospital, Bannerghatta',
                    'treatment': 'High-Resolution 3.0T Brain MRI Diagnostic Protocol',
                    'claimed': Decimal('116000.00'),
                    'approved': Decimal('116000.00'),
                    'status': 'UNDER_VERIFICATION',
                    'steps': [
                        {'step': 'Claim Submitted', 'timestamp': '2026-09-21 11:30', 'note': 'Electronic submission via HEFIN Direct Gateway'},
                        {'step': 'Clinical Review', 'timestamp': '2026-09-23 15:45', 'note': 'Medical records validated by spectral review board'},
                        {'step': 'Pre-Approval Issued', 'timestamp': '2026-09-28 09:20', 'note': '₹1,16,000 pre-approved; final disbursement scheduled'},
                    ],
                },
                {
                    'ref': f"CLM-2026-53{idx}9",
                    'bill': created_bills[1],
                    'date': date(2026, 8, 6),
                    'hospital': 'AIIMS Horizon Health Hub, Bengaluru',
                    'treatment': 'Hemodynamic Biomarkers & Cardiac Diagnostic Panel',
                    'claimed': Decimal('60000.00'),
                    'approved': Decimal('60000.00'),
                    'status': 'SETTLED',
                    'steps': [
                        {'step': 'Claim Submitted', 'timestamp': '2026-08-06 10:15', 'note': 'Claim registered by facility billing desk'},
                        {'step': 'Approved', 'timestamp': '2026-08-10 14:00', 'note': 'Approved for 100% of policy-covered amount'},
                        {'step': 'Disbursed', 'timestamp': '2026-08-14 16:30', 'note': '₹60,000 disbursed directly to AIIMS Horizon Health'},
                    ],
                },
            ]

            for c in claims_data:
                InsuranceClaim.objects.get_or_create(
                    policy=policy,
                    claim_reference=c['ref'],
                    defaults={
                        'bill': c['bill'],
                        'claim_date': c['date'],
                        'hospital_name': c['hospital'],
                        'treatment_summary': c['treatment'],
                        'claimed_amount': c['claimed'],
                        'approved_amount': c['approved'],
                        'settlement_status': c['status'],
                        'timeline_steps': c['steps'],
                    },
                )

            # 5. Appointments
            apts_data = [
                {
                    'id': f"APT-2026-31{idx}4",
                    'facility': 'Apollo CyberCare Institute, Bengaluru',
                    'department': 'Neurology & Neuro-Radiology',
                    'clinician': 'Dr. Vikramaditya Sen, MD, DM',
                    'datetime': now + timedelta(days=7, hours=3),
                    'type': 'IN_PERSON',
                    'status': 'CONFIRMED',
                    'reason': 'Follow-up consultation to evaluate post-scan neuro-metabolic stability.',
                    'instructions': 'Arrive 15 minutes prior with home blood pressure logs.',
                },
                {
                    'id': f"APT-2026-31{idx}8",
                    'facility': 'AIIMS Horizon Health Hub, Bengaluru',
                    'department': 'Cardiology & Tele-Monitoring',
                    'clinician': 'Dr. Meera Nambiar, MD',
                    'datetime': now + timedelta(days=22, hours=5),
                    'type': 'TELE_HEALTH',
                    'status': 'SCHEDULED',
                    'reason': 'Routine virtual review of hemodynamic biomarkers.',
                    'instructions': 'Secure video room link will activate 10 minutes prior.',
                },
                {
                    'id': f"APT-2026-29{idx}1",
                    'facility': 'Fortis Spectral Neuroscience Hospital',
                    'department': 'Neuro-Radiology',
                    'clinician': 'Dr. Vikramaditya Sen',
                    'datetime': now - timedelta(days=26),
                    'type': 'DIAGNOSTIC_PROCEDURE',
                    'status': 'COMPLETED',
                    'reason': '3.0T MRI Brain imaging scan session.',
                    'instructions': 'Procedure completed successfully.',
                },
            ]

            for a in apts_data:
                Appointment.objects.get_or_create(
                    patient=profile,
                    appointment_identifier=a['id'],
                    defaults={
                        'healthcare_facility': a['facility'],
                        'department': a['department'],
                        'clinician_name': a['clinician'],
                        'appointment_date': a['datetime'],
                        'appointment_type': a['type'],
                        'status': a['status'],
                        'reason_for_visit': a['reason'],
                        'instructions': a['instructions'],
                    },
                )

            # 6. Care Timeline Events
            events_data = [
                {
                    'id': f"EVT-2026-90{idx}1",
                    'type': 'APPOINTMENT',
                    'title': 'Confirmed: Upcoming Follow-up with Dr. Vikramaditya Sen',
                    'date': now + timedelta(days=7, hours=3),
                    'facility': 'Apollo CyberCare Institute, Bengaluru',
                    'summary': 'In-person neuro-radiology review scheduled.',
                    'ref': f"APT-2026-31{idx}4",
                    'tone': 'cyan',
                },
                {
                    'id': f"EVT-2026-89{idx}2",
                    'type': 'CLAIM_SUBMITTED',
                    'title': f"Insurance Claim Submitted: {claims_data[0]['ref']}",
                    'date': now - timedelta(days=23),
                    'facility': 'Spectral Indemnity Assurance Corp (Simulated)',
                    'summary': f"Claim of ₹{claims_data[0]['claimed']:,} filed for MRI Neuro Protocol.",
                    'ref': claims_data[0]['ref'],
                    'tone': 'violet',
                },
                {
                    'id': f"EVT-2026-89{idx}3",
                    'type': 'BILL_GENERATED',
                    'title': f"Medical Invoice Issued: {bills_data[0]['invoice']}",
                    'date': now - timedelta(days=24),
                    'facility': bills_data[0]['hospital'],
                    'summary': f"Total billed ₹{bills_data[0]['total']:,}; Patient estimated responsibility: ₹{bills_data[0]['patient_resp']:,}.",
                    'ref': bills_data[0]['invoice'],
                    'tone': 'gold',
                },
                {
                    'id': f"EVT-2026-89{idx}4",
                    'type': 'TEST_RESULT',
                    'title': f"Diagnostic Lab Published: {records_data[0]['id']}",
                    'date': now - timedelta(days=26),
                    'facility': records_data[0]['facility'],
                    'summary': 'High-resolution MRI images verified and added to patient health records.',
                    'ref': records_data[0]['id'],
                    'tone': 'cyan',
                },
                {
                    'id': f"EVT-2026-88{idx}5",
                    'type': 'CLAIM_PROCESSED',
                    'title': f"Insurance Claim Settled: {claims_data[1]['ref']}",
                    'date': now - timedelta(days=62),
                    'facility': 'Spectral Indemnity Assurance Corp',
                    'summary': f"Claim of ₹{claims_data[1]['claimed']:,} processed and settled directly to provider.",
                    'ref': claims_data[1]['ref'],
                    'tone': 'emerald',
                },
            ]

            for e in events_data:
                CareEvent.objects.get_or_create(
                    patient=profile,
                    event_identifier=e['id'],
                    defaults={
                        'event_type': e['type'],
                        'title': e['title'],
                        'event_date': e['date'],
                        'facility': e['facility'],
                        'summary': e['summary'],
                        'related_reference': e['ref'],
                        'badge_tone': e['tone'],
                    },
                )

            self.stdout.write(
                self.style.SUCCESS(
                    f"[OK] Seeded patient: {user.username} ({cfg['identifier']}) -- Token: {token.key}"
                )
            )

        self.stdout.write(self.style.MIGRATE_HEADING('=' * 75))
        self.stdout.write(
            self.style.SUCCESS('Seed completed successfully. All data is synthetic.')
        )
        self.stdout.write(
            'Demo login credentials: aarav.sharma / demo1234 (Primary)'
        )
        self.stdout.write(self.style.MIGRATE_HEADING('=' * 75))
