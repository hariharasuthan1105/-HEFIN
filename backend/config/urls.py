"""
URL configuration for HEFIN 3.0 backend.
Task 04 API v1 Routing.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

class APIStatusView(APIView):
    """
    Health check and metadata endpoint for HEFIN 3.0 API v1.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'status': 'healthy',
            'system': 'HEFIN 3.0 Spectral Intelligence',
            'version': 'v1',
            'portal': 'Patient Portal Foundation',
            'disclaimer': 'DEMO ENVIRONMENT — SIMULATED HEALTHCARE AND FINANCIAL DATA',
            'endpoints': {
                'status': '/api/v1/status/',
                'auth': '/api/v1/auth/',
                'dashboard': '/api/v1/patient/dashboard/',
                'profile': '/api/v1/patient/profile/',
                'records': '/api/v1/records/',
                'billing': '/api/v1/billing/',
                'insurance_policies': '/api/v1/insurance/policies/',
                'insurance_claims': '/api/v1/insurance/claims/',
                'appointments': '/api/v1/appointments/',
                'timeline': '/api/v1/timeline/',
                'assistant': '/api/v1/assistant/messages/',
            },
        })

urlpatterns = [
    path('', APIStatusView.as_view(), name='root-status'),
    path('healthz/', APIStatusView.as_view(), name='healthz'),
    path('healthz', APIStatusView.as_view(), name='healthz-noslash'),
    path('admin/', admin.site.urls),
    path('api/v1/status/', APIStatusView.as_view(), name='api-status'),
    path('api/v1/healthz/', APIStatusView.as_view(), name='api-healthz'),
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/patient/', include('apps.patients.urls')),
    path('api/v1/records/', include('apps.records.urls')),
    path('api/v1/billing/', include('apps.billing.urls')),
    path('api/v1/insurance/', include('apps.insurance.urls')),
    path('api/v1/assistant/', include('apps.assistant.urls')),
    path('api/v1/', include('apps.appointments.urls')),
]
