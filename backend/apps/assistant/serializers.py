from rest_framework import serializers
from apps.assistant.models import ChatMessage

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            'id',
            'role',
            'content',
            'intent',
            'cards',
            'suggested_actions',
            'navigation_target',
            'is_simulated',
            'created_at',
        ]
        read_only_fields = fields

class AssistantRequestSerializer(serializers.Serializer):
    message = serializers.CharField(
        max_length=1000,
        required=True,
        trim_whitespace=True,
    )
