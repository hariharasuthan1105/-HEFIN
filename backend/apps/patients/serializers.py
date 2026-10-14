from rest_framework import serializers
from .models import PatientProfile

class PatientProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = PatientProfile
        fields = [
            'id',
            'patient_identifier',
            'username',
            'first_name',
            'last_name',
            'email',
            'date_of_birth',
            'gender',
            'blood_group',
            'address_city',
            'address_state',
            'emergency_contact_name',
            'emergency_contact_phone',
            'allergies',
            'chronic_conditions',
            'preferred_language',
            'reduced_motion',
            'high_contrast',
            'font_scale',
            'email_notifications',
            'sms_alerts',
            'in_app_alerts',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'patient_identifier',
            'username',
            'first_name',
            'last_name',
            'email',
            'created_at',
            'updated_at',
        ]

class PatientPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = [
            'reduced_motion',
            'high_contrast',
            'font_scale',
            'email_notifications',
            'sms_alerts',
            'in_app_alerts',
            'preferred_language',
        ]
