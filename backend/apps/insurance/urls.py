from django.urls import path
from .views import (
    InsurancePolicyListView,
    InsurancePolicyDetailView,
    InsuranceClaimListView,
    InsuranceClaimDetailView,
)

urlpatterns = [
    path('policies/', InsurancePolicyListView.as_view(), name='insurance-policies-list'),
    path('policies/<int:pk>/', InsurancePolicyDetailView.as_view(), name='insurance-policies-detail'),
    path('claims/', InsuranceClaimListView.as_view(), name='insurance-claims-list'),
    path('claims/<int:pk>/', InsuranceClaimDetailView.as_view(), name='insurance-claims-detail'),
]
