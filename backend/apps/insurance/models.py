from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from apps.patients.models import PatientProfile
from apps.billing.models import MedicalBill

class InsurancePolicy(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active & Verified'),
        ('EXPIRING_SOON', 'Expiring within 30 Days'),
        ('UNDER_REVIEW', 'Under Annual Review'),
        ('SUSPENDED', 'Temporarily Suspended'),
    ]

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name='insurance_policies',
        db_index=True,
    )
    policy_number = models.CharField(
        max_length=40,
        unique=True,
        db_index=True,
        help_text='Synthetic policy number (e.g., POL-SPECTRAL-2026-0941)',
    )
    plan_name = models.CharField(max_length=150)
    fictional_insurer = models.CharField(
        max_length=150,
        help_text='Fictional insurance carrier name',
    )
    coverage_category = models.CharField(max_length=100)
    currency = models.CharField(max_length=3, default='INR')
    coverage_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Annual aggregate coverage limit in INR',
    )
    used_coverage = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Cumulative coverage utilized to date in INR',
    )
    remaining_coverage = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Available remaining coverage balance in INR',
    )
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='ACTIVE')
    start_date = models.DateField()
    renewal_date = models.DateField()
    co_pay_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('10.00'),
        help_text='Co-payment requirement percentage',
    )
    exclusions_summary = models.TextField(
        blank=True,
        default='Standard policy exclusions, waiting periods, and non-covered services apply.',
        help_text='Non-covered treatments, cosmetic exclusions, and waiting period limitations',
    )
    is_synthetic = models.BooleanField(
        default=True,
        help_text='Confirms policy is completely fictional with no real insurer affiliation',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Insurance Policy'
        verbose_name_plural = 'Insurance Policies'
        ordering = ['-start_date']

    def clean(self):
        super().clean()
        if self.coverage_limit is not None and self.coverage_limit < Decimal('0.00'):
            raise ValidationError({'coverage_limit': 'Coverage limit cannot be negative.'})
        if self.used_coverage is not None and self.used_coverage < Decimal('0.00'):
            raise ValidationError({'used_coverage': 'Used coverage cannot be negative.'})
        if self.remaining_coverage is not None and self.remaining_coverage < Decimal('0.00'):
            raise ValidationError({'remaining_coverage': 'Remaining coverage cannot be negative.'})

    def save(self, *args, **kwargs):
        if self.coverage_limit is not None and self.used_coverage is not None:
            self.remaining_coverage = max(Decimal('0.00'), self.coverage_limit - self.used_coverage)
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.policy_number} — {self.plan_name} (₹{self.coverage_limit})"

class InsuranceClaim(models.Model):
    SETTLEMENT_STATUS_CHOICES = [
        ('SUBMITTED', 'Claim Submitted'),
        ('UNDER_VERIFICATION', 'Clinical Documentation Review'),
        ('APPROVED', 'Approved for Settlement'),
        ('SETTLED', 'Disbursed to Healthcare Provider'),
        ('ADDITIONAL_INFO_REQUESTED', 'Query Raised'),
        ('DECLINED', 'Declined under Policy Exclusions'),
    ]

    policy = models.ForeignKey(
        InsurancePolicy,
        on_delete=models.CASCADE,
        related_name='claims',
        db_index=True,
    )
    bill = models.ForeignKey(
        MedicalBill,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='claims',
    )
    claim_reference = models.CharField(
        max_length=40,
        unique=True,
        db_index=True,
        help_text='Unique synthetic claim identifier (e.g., CLM-2026-7712)',
    )
    claim_date = models.DateField(db_index=True)
    hospital_name = models.CharField(max_length=150)
    treatment_summary = models.CharField(max_length=255)
    claimed_amount = models.DecimalField(max_digits=12, decimal_places=2)
    approved_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    settlement_status = models.CharField(
        max_length=32,
        choices=SETTLEMENT_STATUS_CHOICES,
        default='SUBMITTED',
        db_index=True,
    )
    timeline_steps = models.JSONField(
        default=list,
        blank=True,
        help_text='Chronological trace of claim status events and review notes',
    )
    disclaimer = models.TextField(
        default='Synthetic insurance claim record. Not connected to any real insurance carrier.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Insurance Claim'
        verbose_name_plural = 'Insurance Claims'
        ordering = ['-claim_date', '-created_at']

    def clean(self):
        super().clean()
        if self.claimed_amount is not None and self.claimed_amount < Decimal('0.00'):
            raise ValidationError({'claimed_amount': 'Claimed amount cannot be negative.'})
        if self.approved_amount is not None and self.approved_amount < Decimal('0.00'):
            raise ValidationError({'approved_amount': 'Approved amount cannot be negative.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.claim_reference} — ₹{self.claimed_amount} [{self.get_settlement_status_display()}]"
