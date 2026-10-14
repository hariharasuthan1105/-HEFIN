from rest_framework import serializers
from .models import InsurancePolicy, InsuranceClaim

class InsuranceClaimSerializer(serializers.ModelSerializer):
    settlement_status_display = serializers.CharField(source='get_settlement_status_display', read_only=True)

    class Meta:
        model = InsuranceClaim
        fields = [
            'id',
            'claim_reference',
            'claim_date',
            'hospital_name',
            'treatment_summary',
            'claimed_amount',
            'approved_amount',
            'settlement_status',
            'settlement_status_display',
            'timeline_steps',
            'disclaimer',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'claim_reference',
            'disclaimer',
            'created_at',
            'updated_at',
        ]

class InsurancePolicySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    claims = InsuranceClaimSerializer(many=True, read_only=True)

    class Meta:
        model = InsurancePolicy
        fields = [
            'id',
            'policy_number',
            'plan_name',
            'fictional_insurer',
            'coverage_category',
            'currency',
            'coverage_limit',
            'used_coverage',
            'remaining_coverage',
            'status',
            'status_display',
            'start_date',
            'renewal_date',
            'co_pay_percentage',
            'exclusions_summary',
            'is_synthetic',
            'claims',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'policy_number',
            'is_synthetic',
            'created_at',
            'updated_at',
        ]
