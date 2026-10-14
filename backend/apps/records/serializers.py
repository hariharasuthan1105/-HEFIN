from rest_framework import serializers
from .models import MedicalRecord

class MedicalRecordSerializer(serializers.ModelSerializer):
    record_type_display = serializers.CharField(source='get_record_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = MedicalRecord
        fields = [
            'id',
            'record_identifier',
            'record_type',
            'record_type_display',
            'title',
            'healthcare_facility',
            'attending_clinician',
            'record_date',
            'summary',
            'clinical_notes',
            'vitals_summary',
            'status',
            'status_display',
            'is_synthetic',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'record_identifier', 'is_synthetic', 'created_at', 'updated_at']
