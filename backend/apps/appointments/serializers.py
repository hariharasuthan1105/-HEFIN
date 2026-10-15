from rest_framework import serializers
from .models import Appointment, CareEvent

class AppointmentSerializer(serializers.ModelSerializer):
    appointment_type_display = serializers.CharField(source='get_appointment_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id',
            'appointment_identifier',
            'healthcare_facility',
            'department',
            'clinician_name',
            'appointment_date',
            'appointment_type',
            'appointment_type_display',
            'status',
            'status_display',
            'reason_for_visit',
            'instructions',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'appointment_identifier', 'created_at', 'updated_at']

class CareEventSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = CareEvent
        fields = [
            'id',
            'event_identifier',
            'event_type',
            'event_type_display',
            'title',
            'event_date',
            'facility',
            'summary',
            'related_reference',
            'badge_tone',
            'created_at',
        ]
        read_only_fields = ['id', 'event_identifier', 'created_at']
