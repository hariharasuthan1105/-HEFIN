from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from apps.patients.models import PatientProfile

class MedicalBill(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('PAID', 'Paid in Full'),
        ('PENDING', 'Pending Payment'),
        ('IN_REVIEW', 'Insurance Verification in Progress'),
        ('PARTIALLY_PAID', 'Partially Paid'),
        ('ASSISTANCE_APPLIED', 'Financial Assistance Applied'),
    ]

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name='bills',
        db_index=True,
    )
    invoice_number = models.CharField(
        max_length=32,
        unique=True,
        db_index=True,
        help_text='Unique synthetic invoice number (e.g., INV-2026-8841)',
    )
    hospital_name = models.CharField(max_length=150)
    bill_date = models.DateField(db_index=True)
    due_date = models.DateField()
    currency = models.CharField(max_length=3, default='INR', help_text='ISO 4217 Currency Code')
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Gross total billed amount in INR',
    )
    simulated_coverage_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Simulated amount covered by insurance policy in INR',
    )
    estimated_patient_responsibility = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Estimated net amount payable by patient in INR',
    )
    payment_status = models.CharField(
        max_length=30,
        choices=PAYMENT_STATUS_CHOICES,
        default='PENDING',
        db_index=True,
    )
    is_simulated = models.BooleanField(
        default=True,
        help_text='Explicit marker confirming this invoice is simulated for demonstration',
    )
    simulation_disclaimer = models.TextField(
        default='Simulated financial figures for demonstration purposes only. Not an actual hospital invoice.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Medical Bill'
        verbose_name_plural = 'Medical Bills'
        ordering = ['-bill_date', '-created_at']
        indexes = [
            models.Index(fields=['patient', 'payment_status']),
            models.Index(fields=['patient', 'bill_date']),
        ]

    def clean(self):
        super().clean()
        if self.total_amount is not None and self.total_amount < Decimal('0.00'):
            raise ValidationError({'total_amount': 'Total amount cannot be negative.'})
        if self.simulated_coverage_amount is not None and self.simulated_coverage_amount < Decimal('0.00'):
            raise ValidationError({'simulated_coverage_amount': 'Simulated coverage cannot be negative.'})
        if self.estimated_patient_responsibility is not None and self.estimated_patient_responsibility < Decimal('0.00'):
            raise ValidationError({'estimated_patient_responsibility': 'Patient responsibility cannot be negative.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} — ₹{self.total_amount} ({self.hospital_name})"

class BillLineItem(models.Model):
    bill = models.ForeignKey(
        MedicalBill,
        on_delete=models.CASCADE,
        related_name='line_items',
    )
    description = models.CharField(max_length=200)
    service_code = models.CharField(max_length=40, blank=True, default='')
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    covered_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    patient_share = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        verbose_name = 'Bill Line Item'
        verbose_name_plural = 'Bill Line Items'
        ordering = ['id']

    def clean(self):
        super().clean()
        if self.unit_price is not None and self.unit_price < Decimal('0.00'):
            raise ValidationError({'unit_price': 'Unit price cannot be negative.'})
        if self.total_price is not None and self.total_price < Decimal('0.00'):
            raise ValidationError({'total_price': 'Total price cannot be negative.'})

    def save(self, *args, **kwargs):
        if self.quantity and self.unit_price and not self.total_price:
            self.total_price = self.quantity * self.unit_price
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} (₹{self.total_price})"
