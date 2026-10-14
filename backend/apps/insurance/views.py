from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import InsurancePolicy, InsuranceClaim
from .serializers import InsurancePolicySerializer, InsuranceClaimSerializer

class InsurancePolicyListView(generics.ListAPIView):
    serializer_class = InsurancePolicySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = getattr(self.request.user, 'patient_profile', None)
        if not profile:
            return InsurancePolicy.objects.none()
        return InsurancePolicy.objects.filter(patient=profile).prefetch_related('claims')

class InsurancePolicyDetailView(generics.RetrieveAPIView):
    serializer_class = InsurancePolicySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = getattr(self.request.user, 'patient_profile', None)
        if not profile:
            return InsurancePolicy.objects.none()
        return InsurancePolicy.objects.filter(patient=profile).prefetch_related('claims')

class InsuranceClaimListView(generics.ListAPIView):
    serializer_class = InsuranceClaimSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = getattr(self.request.user, 'patient_profile', None)
        if not profile:
            return InsuranceClaim.objects.none()

        qs = InsuranceClaim.objects.filter(policy__patient=profile)
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(settlement_status__iexact=status_param)
        return qs

class InsuranceClaimDetailView(generics.RetrieveAPIView):
    serializer_class = InsuranceClaimSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = getattr(self.request.user, 'patient_profile', None)
        if not profile:
            return InsuranceClaim.objects.none()
        return InsuranceClaim.objects.filter(policy__patient=profile)
