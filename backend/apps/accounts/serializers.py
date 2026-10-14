from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User

class UserSerializer(serializers.ModelSerializer):
    patient_identifier = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'phone_number',
            'is_demo',
            'patient_identifier',
        ]
        read_only_fields = ['id', 'role', 'is_demo', 'patient_identifier']

    def get_patient_identifier(self, obj):
        if hasattr(obj, 'patient_profile') and obj.patient_profile:
            return obj.patient_profile.patient_identifier
        return None

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('Invalid username or password credentials.')
            if not user.is_active:
                raise serializers.ValidationError('This user account is inactive.')
            attrs['user'] = user
            return attrs
        raise serializers.ValidationError('Must include username and password.')

class DemoLoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, default='aarav.sharma')
