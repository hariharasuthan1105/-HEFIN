from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import MedicalRecord
from .serializers import MedicalRecordSerializer

class MedicalRecordListView(generics.ListAPIView):
    serializer_class = MedicalRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'patient_profile', None)
        if not profile:
            return MedicalRecord.objects.none()

        qs = MedicalRecord.objects.filter(patient=profile)

        # Filters
        record_type = self.request.query_params.get('record_type')
        if record_type:
            qs = qs.filter(record_type__iexact=record_type)

        facility = self.request.query_params.get('facility')
        if facility:
            qs = qs.filter(healthcare_facility__icontains=facility)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(record_date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(record_date__lte=date_to)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(summary__icontains=search)
                | Q(healthcare_facility__icontains=search)
                | Q(attending_clinician__icontains=search)
                | Q(record_identifier__icontains=search)
            )

        return qs

class MedicalRecordDetailView(generics.RetrieveAPIView):
    serializer_class = MedicalRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = getattr(self.request.user, 'patient_profile', None)
        if not profile:
            return MedicalRecord.objects.none()
        return MedicalRecord.objects.filter(patient=profile)
