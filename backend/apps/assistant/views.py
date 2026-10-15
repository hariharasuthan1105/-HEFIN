from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from apps.assistant.models import ChatMessage
from apps.assistant.serializers import ChatMessageSerializer, AssistantRequestSerializer
from apps.assistant.services import AssistantIntentRouter

class AssistantMessagesView(APIView):
    """
    Assistant endpoint for HEFIN Care Assistant.
    GET: Retrieve active session message history for authenticated patient.
    POST: Send a question to the assistant and receive a grounded structured response.
    DELETE: Clear active session message history for authenticated patient.
    """
    permission_classes = [IsAuthenticated]

    def _get_patient_profile(self, request):
        if not hasattr(request.user, 'patient_profile'):
            return None
        return request.user.patient_profile

    def get(self, request):
        patient = self._get_patient_profile(request)
        if not patient:
            return Response(
                {'detail': 'Authenticated user does not have a linked patient profile.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        messages = ChatMessage.objects.filter(patient=patient).order_by('created_at')[:60]
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request):
        patient = self._get_patient_profile(request)
        if not patient:
            return Response(
                {'detail': 'Authenticated user does not have a linked patient profile.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        req_serializer = AssistantRequestSerializer(data=request.data)
        if not req_serializer.is_valid():
            return Response(req_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_text = req_serializer.validated_data['message']

        # 1. Store user message in active session
        ChatMessage.objects.create(
            patient=patient,
            role='user',
            content=user_text,
            is_simulated=True,
        )

        # 2. Process message through deterministic Intent Router
        router = AssistantIntentRouter(patient=patient)
        result = router.process_message(user_text)

        # 3. Store assistant message in active session
        assistant_msg = ChatMessage.objects.create(
            patient=patient,
            role='assistant',
            content=result['message'],
            intent=result.get('intent', ''),
            cards=result.get('cards', []),
            suggested_actions=result.get('suggested_actions', []),
            navigation_target=result.get('navigation_target', ''),
            is_simulated=True,
        )

        return Response({
            'id': assistant_msg.id,
            'role': 'assistant',
            'intent': result.get('intent', ''),
            'message': result['message'],
            'cards': result.get('cards', []),
            'suggested_actions': result.get('suggested_actions', []),
            'navigation_target': result.get('navigation_target', ''),
            'simulation': True,
            'disclaimer': result.get('disclaimer', 'DEMO -- SIMULATED HEALTHCARE AND INSURANCE DATA'),
            'created_at': assistant_msg.created_at.isoformat(),
        }, status=status.HTTP_200_OK)

    def delete(self, request):
        patient = self._get_patient_profile(request)
        if not patient:
            return Response(
                {'detail': 'Authenticated user does not have a linked patient profile.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        deleted_count, _ = ChatMessage.objects.filter(patient=patient).delete()
        return Response({
            'status': 'cleared',
            'deleted_count': deleted_count,
            'message': 'Active session chat history cleared.',
        }, status=status.HTTP_200_OK)

class AssistantClearView(APIView):
    """
    Explicit POST endpoint for clearing chat history.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'patient_profile'):
            return Response(
                {'detail': 'Authenticated user does not have a linked patient profile.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        patient = request.user.patient_profile
        deleted_count, _ = ChatMessage.objects.filter(patient=patient).delete()
        return Response({
            'status': 'cleared',
            'deleted_count': deleted_count,
            'message': 'Active session chat history cleared.',
        }, status=status.HTTP_200_OK)
