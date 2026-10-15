from django.db import models
from apps.patients.models import PatientProfile

class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name='chat_messages',
        db_index=True,
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    content = models.TextField()
    intent = models.CharField(max_length=64, blank=True, default='')
    cards = models.JSONField(default=list, blank=True)
    suggested_actions = models.JSONField(default=list, blank=True)
    navigation_target = models.CharField(max_length=64, blank=True, default='')
    is_simulated = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Chat Message'
        verbose_name_plural = 'Chat Messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['patient', 'created_at']),
        ]

    def __str__(self):
        return f"[{self.role}] {self.patient.patient_identifier}: {self.content[:40]}"
