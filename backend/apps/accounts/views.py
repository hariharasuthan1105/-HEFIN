from django.conf import settings
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from .models import User
from .serializers import UserSerializer, LoginSerializer, DemoLoginSerializer
from .authentication import is_demo_auth_permitted

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        if getattr(user, 'is_demo', False) and not is_demo_auth_permitted():
            return Response(
                {'error': 'Demo account authentication is strictly prohibited in production and unapproved environments.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        token, _ = Token.objects.get_or_create(user=user)
        login(request, user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data,
            'disclaimer': 'DEMO ENVIRONMENT — SIMULATED HEALTHCARE AND FINANCIAL DATA' if getattr(user, 'is_demo', False) else '',
        }, status=status.HTTP_200_OK)

class DemoLoginView(APIView):
    """
    Development-only helper to authenticate directly as a synthetic demo user.
    Strictly disabled in production (DEBUG=False). Never issues tokens in production.
    In development (DEBUG=True), requires explicit ENABLE_DEV_DEMO_AUTH=True.
    No environment variable can override the production restriction.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # 1. Unconditional production lockout: if DEBUG=False, always return 403 Forbidden
        if not settings.DEBUG:
            return Response(
                {'error': 'Demo authentication is strictly disabled in production environments.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 2. Development opt-in check: requires explicit ENABLE_DEV_DEMO_AUTH=True
        if not getattr(settings, 'ENABLE_DEV_DEMO_AUTH', False):
            return Response(
                {'error': 'Demo authentication is disabled in development. Set ENABLE_DEV_DEMO_AUTH=True in settings to enable.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = DemoLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data.get('username', 'aarav.sharma')
        
        try:
            user = User.objects.get(username=username, is_demo=True)
        except User.DoesNotExist:
            return Response(
                {'error': f"Demo user '{username}' not found. Please run 'python manage.py seed_demo'."},
                status=status.HTTP_404_NOT_FOUND,
            )

        token, _ = Token.objects.get_or_create(user=user)
        login(request, user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data,
            'disclaimer': 'DEMO ENVIRONMENT — SIMULATED HEALTHCARE AND FINANCIAL DATA',
        }, status=status.HTTP_200_OK)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            request.user.auth_token.delete()
        except Exception:
            pass
        logout(request)
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'user': UserSerializer(request.user).data,
            'disclaimer': 'DEMO ENVIRONMENT — SIMULATED HEALTHCARE AND FINANCIAL DATA',
        })
