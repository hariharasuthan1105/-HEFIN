from django.urls import path
from .views import PatientDashboardView, PatientProfileView

urlpatterns = [
    path('dashboard/', PatientDashboardView.as_view(), name='patient-dashboard'),
    path('profile/', PatientProfileView.as_view(), name='patient-profile'),
]
