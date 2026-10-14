from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import MedicalBill
from .serializers import MedicalBillSerializer

class MedicalBillListView(generics.ListAPIView):
    serializer_class = MedicalBillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = getattr(self.request.user, 'patient_profile', None)
        if not profile:
            return MedicalBill.objects.none()

        qs = MedicalBill.objects.filter(patient=profile).prefetch_related('line_items')

        payment_status = self.request.query_params.get('payment_status')
        if payment_status:
            qs = qs.filter(payment_status__iexact=payment_status)

        hospital = self.request.query_params.get('hospital')
        if hospital:
            qs = qs.filter(hospital_name__icontains=hospital)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(invoice_number__icontains=search)
                | Q(hospital_name__icontains=search)
            )

        return qs

class MedicalBillDetailView(generics.RetrieveAPIView):
    serializer_class = MedicalBillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = getattr(self.request.user, 'patient_profile', None)
        if not profile:
            return MedicalBill.objects.none()
        return MedicalBill.objects.filter(patient=profile).prefetch_related('line_items')
