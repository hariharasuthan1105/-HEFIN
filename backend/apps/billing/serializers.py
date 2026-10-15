from rest_framework import serializers
from .models import MedicalBill, BillLineItem

class BillLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillLineItem
        fields = [
            'id',
            'description',
            'service_code',
            'quantity',
            'unit_price',
            'total_price',
            'covered_amount',
            'patient_share',
        ]

class MedicalBillSerializer(serializers.ModelSerializer):
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    line_items = BillLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = MedicalBill
        fields = [
            'id',
            'invoice_number',
            'hospital_name',
            'bill_date',
            'due_date',
            'currency',
            'total_amount',
            'simulated_coverage_amount',
            'estimated_patient_responsibility',
            'payment_status',
            'payment_status_display',
            'is_simulated',
            'simulation_disclaimer',
            'line_items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'invoice_number',
            'is_simulated',
            'simulation_disclaimer',
            'created_at',
            'updated_at',
        ]
