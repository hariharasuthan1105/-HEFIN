from django.db import models
from apps.patients.models import PatientProfile

class MedicalRecord(models.Model):
    RECORD_TYPE_CHOICES = [
        ('DIAGNOSTIC_LAB', 'Diagnostic Lab Report'),
        ('CLINICAL_SUMMARY', 'Clinical Care Summary'),
        ('IMAGING', 'Radiology & Imaging'),
        ('PRESCRIPTION', 'Prescription & Medication'),
        ('PROCEDURE', 'Procedure Note'),
        ('DISCHARGE', 'Discharge Summary'),
    ]

    STATUS_CHOICES = [
        ('VERIFIED', 'Clinically Verified'),
        ('PRELIMINARY', 'Preliminary / In Progress'),
        ('AMENDED', 'Amended'),
    ]

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name='records',
        db_index=True,
    )
    record_identifier = models.CharField(
        max_length=32,
        unique=True,
        db_index=True,
        help_text='Unique synthetic record identifier (e.g., REC-2026-0042)',
    )
    record_type = models.CharField(
        max_length=32,
        choices=RECORD_TYPE_CHOICES,
        default='CLINICAL_SUMMARY',
        db_index=True,
    )
    title = models.CharField(max_length=200)
    healthcare_facility = models.CharField(max_length=150)
    attending_clinician = models.CharField(max_length=120)
    record_date = models.DateField(db_index=True)
    summary = models.TextField(help_text='High level patient-accessible summary')
    clinical_notes = models.TextField(blank=True, default='')
    vitals_summary = models.JSONField(
        default=dict,
        blank=True,
        help_text='Key vitals such as blood pressure, pulse, spO2, temperature',
    )
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='VERIFIED')
    is_synthetic = models.BooleanField(
        default=True,
        help_text='Explicit marker confirming this record is entirely simulated',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Medical Record'
        verbose_name_plural = 'Medical Records'
        ordering = ['-record_date', '-created_at']
        indexes = [
            models.Index(fields=['patient', 'record_date']),
            models.Index(fields=['patient', 'record_type']),
        ]

    def __str__(self):
        return f"{self.record_identifier} — {self.title} ({self.record_date})"
