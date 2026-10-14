from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from .models import User
from .serializers import UserSerializer, LoginSerializer, DemoLoginSerializer

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        login(request, user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data,
            'disclaimer': 'DEMO ENVIRONMENT — SIMULATED HEALTHCARE AND FINANCIAL DATA',
        }, status=status.HTTP_200_OK)

class DemoLoginView(APIView):
    """
    Development and review helper to authenticate directly as a synthetic demo user.
    Disabled if not is_demo or in strict production mode.
    """
    permission_classes = [AllowAny]

    def post(self, request):
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
