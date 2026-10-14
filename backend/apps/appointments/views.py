from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Appointment, CareEvent
from .serializers import AppointmentSerializer, CareEventSerializer

class AppointmentListView(generics.ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = getattr(self.request.user, 'patient_profile', None)
        if not profile:
            return Appointment.objects.none()

        qs = Appointment.objects.filter(patient=profile)
        time_filter = self.request.query_params.get('time')
        if time_filter == 'upcoming':
            qs = qs.filter(appointment_date__gte=timezone.now(), status__in=['CONFIRMED', 'SCHEDULED'])
        elif time_filter == 'past':
            qs = qs.filter(appointment_date__lt=timezone.now())

        return qs.order_by('appointment_date')

class AppointmentDetailView(generics.RetrieveAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = getattr(self.request.user, 'patient_profile', None)
        if not profile:
            return Appointment.objects.none()
        return Appointment.objects.filter(patient=profile)

class CareTimelineListView(generics.ListAPIView):
    """
    Chronological care timeline aggregating appointments, hospital visits,
    diagnostic test results, generated bills, and insurance claim milestones.
    """
    serializer_class = CareEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = getattr(self.request.user, 'patient_profile', None)
        if not profile:
            return CareEvent.objects.none()

        qs = CareEvent.objects.filter(patient=profile)
        event_type = self.request.query_params.get('type')
        if event_type:
            qs = qs.filter(event_type__iexact=event_type)

        return qs.order_by('-event_date')
