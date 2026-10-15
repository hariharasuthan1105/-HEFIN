from django.urls import path
from apps.assistant.views import AssistantMessagesView, AssistantClearView

urlpatterns = [
    path('messages/', AssistantMessagesView.as_view(), name='assistant-messages'),
    path('clear/', AssistantClearView.as_view(), name='assistant-clear'),
]
