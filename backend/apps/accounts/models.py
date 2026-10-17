from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('PATIENT', 'Patient'),
        ('HOSPITAL', 'Hospital Provider'),
        ('INSURANCE', 'Insurance Reviewer'),
        ('GOVERNMENT', 'Government Auditor'),
        ('ADMIN', 'System Administrator'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='PATIENT',
        help_text='System authorization role for this user account',
    )
    phone_number = models.CharField(max_length=20, blank=True, default='')
    is_demo = models.BooleanField(
        default=False,
        help_text='Indicates if this is a synthetic demonstration account',
    )

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['id']

    def __str__(self):
        return f"{self.username} [{self.get_role_display()}]"
