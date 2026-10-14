from decimal import Decimal
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import PatientProfile
from .serializers import PatientProfileSerializer, PatientPreferencesSerializer

class PatientDashboardView(APIView):
    """
    Patient-scoped aggregated dashboard overview.
    Returns real-time aggregated metrics for the authenticated patient's profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, 'patient_profile', None)

        if not profile:
            return Response(
                {'error': 'No patient profile found for this user account.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 1. Insurance Coverage Summary
        active_policy = profile.insurance_policies.filter(status='ACTIVE').first() or profile.insurance_policies.first()
        if active_policy:
            limit = active_policy.coverage_limit
            used = active_policy.used_coverage
            remaining = active_policy.remaining_coverage
            util_pct = round((used / limit * Decimal('100.0')), 1) if limit > Decimal('0.00') else Decimal('0.0')
            coverage_data = {
                'policy_number': active_policy.policy_number,
                'plan_name': active_policy.plan_name,
                'insurer': active_policy.fictional_insurer,
                'coverage_category': active_policy.coverage_category,
                'coverage_limit': str(limit),
                'used_coverage': str(used),
                'remaining_coverage': str(remaining),
                'utilization_percentage': float(util_pct),
                'currency': active_policy.currency,
                'status': active_policy.get_status_display(),
                'renewal_date': active_policy.renewal_date.isoformat(),
                'co_pay_percentage': float(active_policy.co_pay_percentage),
            }
        else:
            coverage_data = {
                'policy_number': 'N/A',
                'plan_name': 'No active policy found',
                'insurer': 'HEFIN Fictional Health',
                'coverage_category': 'General',
                'coverage_limit': '0.00',
                'used_coverage': '0.00',
                'remaining_coverage': '0.00',
                'utilization_percentage': 0.0,
                'currency': 'INR',
                'status': 'Inactive',
                'renewal_date': None,
                'co_pay_percentage': 0.0,
            }

        # 2. Outstanding Medical Bills
        unpaid_bills = profile.bills.filter(payment_status__in=['PENDING', 'PARTIALLY_PAID', 'IN_REVIEW'])
        total_outstanding = sum((b.estimated_patient_responsibility for b in unpaid_bills), Decimal('0.00'))
        total_gross_billed = sum((b.total_amount for b in profile.bills.all()), Decimal('0.00'))

        bills_summary = {
            'total_outstanding_inr': str(total_outstanding),
            'total_gross_billed_inr': str(total_gross_billed),
            'unpaid_invoices_count': unpaid_bills.count(),
            'currency': 'INR',
            'latest_due_date': unpaid_bills.first().due_date.isoformat() if unpaid_bills.exists() else None,
            'simulated_disclaimer': 'Simulated financial figures for demonstration. Not a legally enforceable debt.',
        }

        # 3. Recent Care Activity (Latest medical records)
        recent_records = profile.records.all()[:4]
        care_activity = [
            {
                'id': rec.id,
                'record_identifier': rec.record_identifier,
                'type': rec.record_type,
                'type_display': rec.get_record_type_display(),
                'title': rec.title,
                'facility': rec.healthcare_facility,
                'date': rec.record_date.isoformat(),
                'summary': rec.summary,
                'status': rec.status,
            }
            for rec in recent_records
        ]

        # 4. Claim Status Overview
        claims = profile.insurance_policies.values_list('claims', flat=True)
        from apps.insurance.models import InsuranceClaim
        user_claims = InsuranceClaim.objects.filter(policy__patient=profile)
        total_claims_count = user_claims.count()
        pending_claims_count = user_claims.filter(
            settlement_status__in=['SUBMITTED', 'UNDER_VERIFICATION', 'ADDITIONAL_INFO_REQUESTED']
        ).count()
        approved_claims_count = user_claims.filter(settlement_status__in=['APPROVED', 'SETTLED']).count()
        total_claimed_inr = sum((c.claimed_amount for c in user_claims), Decimal('0.00'))
        total_approved_inr = sum((c.approved_amount for c in user_claims), Decimal('0.00'))

        claims_overview = {
            'total_claims': total_claims_count,
            'pending_count': pending_claims_count,
            'approved_count': approved_claims_count,
            'total_claimed_inr': str(total_claimed_inr),
            'total_approved_inr': str(total_approved_inr),
            'recent_claim': (
                {
                    'reference': user_claims.first().claim_reference,
                    'status': user_claims.first().get_settlement_status_display(),
                    'amount': str(user_claims.first().claimed_amount),
                    'date': user_claims.first().claim_date.isoformat(),
                }
                if user_claims.exists()
                else None
            ),
        }

        # 5. Upcoming Appointments
        upcoming_apts = profile.appointments.filter(
            appointment_date__gte=timezone.now(),
            status__in=['CONFIRMED', 'SCHEDULED'],
        ).order_by('appointment_date')[:3]

        appointments_list = [
            {
                'id': apt.id,
                'identifier': apt.appointment_identifier,
                'facility': apt.healthcare_facility,
                'department': apt.department,
                'clinician': apt.clinician_name,
                'datetime': apt.appointment_date.isoformat(),
                'type': apt.get_appointment_type_display(),
                'status': apt.status,
                'reason': apt.reason_for_visit,
            }
            for apt in upcoming_apts
        ]

        # 6. Quick Actions
        quick_actions = [
            {
                'id': 'view_records',
                'label': 'Review Medical Records',
                'target': 'records',
                'icon': 'FileText',
                'description': 'Inspect verified diagnostic reports & clinical summaries',
            },
            {
                'id': 'review_bills',
                'label': 'Manage Healthcare Invoices',
                'target': 'bills',
                'icon': 'Receipt',
                'description': f"Review ₹{total_outstanding:,.2f} in pending patient responsibility",
            },
            {
                'id': 'track_claims',
                'label': 'Track Insurance Claims',
                'target': 'insurance',
                'icon': 'ShieldCheck',
                'description': f"{pending_claims_count} active claims currently under verification",
            },
            {
                'id': 'schedule_care',
                'label': 'View Care Timeline',
                'target': 'timeline',
                'icon': 'Calendar',
                'description': 'Examine complete chronological record of visits and milestones',
            },
            {
                'id': 'ai_assistant',
                'label': 'AI Health & Billing Assistant',
                'target': 'ai',
                'icon': 'Sparkles',
                'description': 'Preview upcoming clinical explanation and billing assistant',
            },
        ]

        # 7. Financial Assistance Overview (Simulated)
        financial_assistance = {
            'eligible_tier': 'Tier 1 — Micro-Installment Program (Simulated)',
            'zero_interest_months': 6,
            'estimated_monthly_inr': str(round(total_outstanding / Decimal('6.0'), 2)) if total_outstanding > 0 else '0.00',
            'income_threshold_guidance': 'Households eligible for zero-fee payment rescheduling under pilot protocols.',
            'charity_care_supported': True,
            'disclaimer': 'Simulated financial assistance calculation. Non-binding demonstration model.',
        }

        # Full aggregated response
        full_name = f"{user.first_name} {user.last_name}".strip() or user.username
        greeting = f"Welcome, {full_name}"

        return Response({
            'greeting': greeting,
            'patient_name': full_name,
            'patient_identifier': profile.patient_identifier,
            'blood_group': profile.blood_group,
            'city': profile.address_city,
            'state': profile.address_state,
            'coverage_summary': coverage_data,
            'outstanding_medical_bills': bills_summary,
            'recent_care_activity': care_activity,
            'claim_status_overview': claims_overview,
            'upcoming_appointments': appointments_list,
            'quick_actions': quick_actions,
            'financial_assistance_overview': financial_assistance,
            'demo_banner': 'DEMO ENVIRONMENT — SIMULATED HEALTHCARE AND FINANCIAL DATA',
        })

class PatientProfileView(APIView):
    """
    Patient profile details and preferences endpoint.
    Allows reading full profile and updating non-sensitive demo preferences.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, 'patient_profile', None)
        if not profile:
            return Response({'error': 'Profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientProfileSerializer(profile).data)

    def patch(self, request):
        profile = getattr(request.user, 'patient_profile', None)
        if not profile:
            return Response({'error': 'Profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PatientPreferencesSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'message': 'Preferences updated successfully.',
            'profile': PatientProfileSerializer(profile).data,
        })
