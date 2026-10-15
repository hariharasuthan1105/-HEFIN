from django.db import models
from apps.patients.models import PatientProfile

class Appointment(models.Model):
    APPOINTMENT_TYPE_CHOICES = [
        ('IN_PERSON', 'In-Person Consultation'),
        ('TELE_HEALTH', 'Tele-Health Video'),
        ('FOLLOW_UP', 'Follow-up Review'),
        ('DIAGNOSTIC_PROCEDURE', 'Diagnostic Procedure'),
    ]

    STATUS_CHOICES = [
        ('CONFIRMED', 'Confirmed'),
        ('SCHEDULED', 'Scheduled'),
        ('COMPLETED', 'Completed'),
        ('RESCHEDULED', 'Rescheduled'),
        ('CANCELLED', 'Cancelled'),
    ]

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name='appointments',
        db_index=True,
    )
    appointment_identifier = models.CharField(
        max_length=32,
        unique=True,
        db_index=True,
        help_text='Unique synthetic appointment identifier (e.g., APT-2026-3104)',
    )
    healthcare_facility = models.CharField(max_length=150)
    department = models.CharField(max_length=100)
    clinician_name = models.CharField(max_length=120)
    appointment_date = models.DateTimeField(db_index=True)
    appointment_type = models.CharField(
        max_length=30,
        choices=APPOINTMENT_TYPE_CHOICES,
        default='IN_PERSON',
    )
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='CONFIRMED')
    reason_for_visit = models.TextField()
    instructions = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Appointment'
        verbose_name_plural = 'Appointments'
        ordering = ['appointment_date']
        indexes = [
            models.Index(fields=['patient', 'appointment_date']),
            models.Index(fields=['patient', 'status']),
        ]

    def __str__(self):
        return f"{self.appointment_identifier} — {self.clinician_name} ({self.appointment_date.strftime('%Y-%m-%d %H:%M')})"

class CareEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('APPOINTMENT', 'Appointment'),
        ('HOSPITAL_VISIT', 'Hospital Visit'),
        ('TEST_RESULT', 'Test Result'),
        ('BILL_GENERATED', 'Bill Generated'),
        ('CLAIM_SUBMITTED', 'Claim Submitted'),
        ('CLAIM_PROCESSED', 'Claim Processed'),
    ]

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name='care_events',
        db_index=True,
    )
    event_identifier = models.CharField(
        max_length=32,
        unique=True,
        db_index=True,
        help_text='Unique synthetic care event identifier (e.g., EVT-2026-9011)',
    )
    event_type = models.CharField(
        max_length=30,
        choices=EVENT_TYPE_CHOICES,
        db_index=True,
    )
    title = models.CharField(max_length=200)
    event_date = models.DateTimeField(db_index=True)
    facility = models.CharField(max_length=150)
    summary = models.TextField()
    related_reference = models.CharField(
        max_length=50,
        blank=True,
        default='',
        help_text='Cross-reference code (e.g., invoice number, claim ID, record ID)',
    )
    badge_tone = models.CharField(max_length=20, default='cyan')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Care Event'
        verbose_name_plural = 'Care Events'
        ordering = ['-event_date']
        indexes = [
            models.Index(fields=['patient', '-event_date']),
            models.Index(fields=['patient', 'event_type']),
        ]

    def __str__(self):
        return f"[{self.event_type}] {self.title} ({self.event_date.strftime('%Y-%m-%d')})"
