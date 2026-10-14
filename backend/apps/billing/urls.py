from django.urls import path
from .views import MedicalBillListView, MedicalBillDetailView

urlpatterns = [
    path('', MedicalBillListView.as_view(), name='billing-list'),
    path('<int:pk>/', MedicalBillDetailView.as_view(), name='billing-detail'),
]
