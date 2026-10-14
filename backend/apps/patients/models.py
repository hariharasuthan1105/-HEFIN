from django.db import models
from django.conf import settings

class PatientProfile(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('PREFER_NOT_TO_SAY', 'Prefer not to say'),
    ]

    BLOOD_GROUP_CHOICES = [
        ('A+', 'A Positive'),
        ('A-', 'A Negative'),
        ('B+', 'B Positive'),
        ('B-', 'B Negative'),
        ('AB+', 'AB Positive'),
        ('AB-', 'AB Negative'),
        ('O+', 'O Positive'),
        ('O-', 'O Negative'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patient_profile',
    )
    patient_identifier = models.CharField(
        max_length=32,
        unique=True,
        db_index=True,
        help_text='Unique synthetic patient identifier (e.g., HEF-PAT-2026-9814)',
    )
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, default='M')
    blood_group = models.CharField(max_length=10, choices=BLOOD_GROUP_CHOICES, default='O+')
    address_city = models.CharField(max_length=100, default='Bengaluru')
    address_state = models.CharField(max_length=100, default='Karnataka')
    emergency_contact_name = models.CharField(max_length=120, blank=True, default='')
    emergency_contact_phone = models.CharField(max_length=20, blank=True, default='')
    allergies = models.TextField(blank=True, default='None reported')
    chronic_conditions = models.TextField(blank=True, default='None reported')
    preferred_language = models.CharField(max_length=10, default='en')

    # Demo preferences
    reduced_motion = models.BooleanField(
        default=False,
        help_text='Patient preference for reduced visual animations and 3D scenes',
    )
    high_contrast = models.BooleanField(
        default=False,
        help_text='Patient preference for high contrast styling tokens',
    )
    font_scale = models.CharField(
        max_length=20,
        default='normal',
        choices=[('normal', 'Standard'), ('large', 'Comfort (Large)'), ('xlarge', 'Readable (Extra Large)')],
    )
    email_notifications = models.BooleanField(default=True)
    sms_alerts = models.BooleanField(default=True)
    in_app_alerts = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Patient Profile'
        verbose_name_plural = 'Patient Profiles'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.patient_identifier} — {self.user.get_full_name() or self.user.username}"
