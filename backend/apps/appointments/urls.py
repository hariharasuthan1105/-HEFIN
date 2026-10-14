from django.urls import path
from .views import AppointmentListView, AppointmentDetailView, CareTimelineListView

urlpatterns = [
    path('appointments/', AppointmentListView.as_view(), name='appointments-list'),
    path('appointments/<int:pk>/', AppointmentDetailView.as_view(), name='appointments-detail'),
    path('timeline/', CareTimelineListView.as_view(), name='timeline-list'),
]
