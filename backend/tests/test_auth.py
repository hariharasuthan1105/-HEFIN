from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

from apps.patients.models import PatientProfile

User = get_user_model()

class AuthenticationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='auth.patient',
            email='auth.patient@example.com',
            password='securePassword123!',
            role='PATIENT',
            is_demo=True,
        )
        self.profile = PatientProfile.objects.create(
            user=self.user,
            patient_identifier='HEF-PAT-AUTH-001',
        )

    def test_login_success_returns_token(self):
        url = reverse('auth-login')
        response = self.client.post(url, {
            'username': 'auth.patient',
            'password': 'securePassword123!',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'auth.patient')
        self.assertEqual(response.data['user']['patient_identifier'], 'HEF-PAT-AUTH-001')

    def test_login_invalid_password_fails(self):
        url = reverse('auth-login')
        response = self.client.post(url, {
            'username': 'auth.patient',
            'password': 'wrongpassword',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('token', response.data)

    def test_unauthenticated_request_to_private_endpoint_denied(self):
        url = reverse('patient-dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_request_with_token_header(self):
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        url = reverse('patient-dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('greeting', response.data)
        self.assertEqual(response.data['patient_identifier'], 'HEF-PAT-AUTH-001')

    def test_demo_login_endpoint(self):
        url = reverse('auth-demo-login')
        response = self.client.post(url, {'username': 'auth.patient'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'auth.patient')
