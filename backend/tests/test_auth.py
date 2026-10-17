"""
HEFIN 4.0 Authentication & Security Lockdown Test Suite.
Verifies production demo-authentication denial, credential containment,
token revocation, and preservation of legitimate patient authentication.
"""
from django.test import TestCase, override_settings
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
import io

from apps.patients.models import PatientProfile

User = get_user_model()


class AuthenticationSecurityTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Legitimate Patient Account (is_demo=False by default)
        self.legit_user = User.objects.create_user(
            username='legit.patient',
            email='legit.patient@example.com',
            password='securePassword123!',
            role='PATIENT',
        )
        self.legit_profile = PatientProfile.objects.create(
            user=self.legit_user,
            patient_identifier='HEF-PAT-LEGIT-001',
        )

        # 2. Synthetic Demo Account (explicit is_demo=True)
        self.demo_user = User.objects.create_user(
            username='demo.patient',
            email='demo.patient@example.com',
            password='demoPassword123!',
            role='PATIENT',
            is_demo=True,
        )
        self.demo_profile = PatientProfile.objects.create(
            user=self.demo_user,
            patient_identifier='HEF-PAT-DEMO-001',
        )

    # --------------------------------------------------------------------------
    # 1. Legitimate Authentication Flows Preserved
    # --------------------------------------------------------------------------
    def test_new_accounts_default_to_is_demo_false(self):
        """Newly created accounts must default to is_demo=False."""
        fresh_user = User.objects.create_user(
            username='fresh.user',
            email='fresh@example.com',
            password='Password123!',
        )
        self.assertFalse(fresh_user.is_demo)

    def test_legitimate_login_success_returns_token(self):
        """Legitimate patient accounts can authenticate normally via /api/v1/auth/login/."""
        url = reverse('auth-login')
        response = self.client.post(url, {
            'username': 'legit.patient',
            'password': 'securePassword123!',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'legit.patient')
        self.assertFalse(response.data['user']['is_demo'])

    def test_legitimate_login_invalid_password_fails(self):
        """Invalid passwords for legitimate accounts return HTTP 400 Bad Request."""
        url = reverse('auth-login')
        response = self.client.post(url, {
            'username': 'legit.patient',
            'password': 'wrongpassword',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('token', response.data)

    def test_unauthenticated_request_to_private_endpoint_denied(self):
        """Unauthenticated requests to protected endpoints return HTTP 401 Unauthorized."""
        url = reverse('patient-dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_legitimate_authenticated_request_with_token_header(self):
        """Legitimate tokens access protected endpoints successfully."""
        token = Token.objects.create(user=self.legit_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        url = reverse('patient-dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['patient_identifier'], 'HEF-PAT-LEGIT-001')

    # --------------------------------------------------------------------------
    # 2. Production Demo Lockdown & Credential Containment (DEBUG=False)
    # --------------------------------------------------------------------------
    @override_settings(DEBUG=False, ENABLE_DEV_DEMO_AUTH=False)
    def test_passwordless_demo_login_denied_in_production(self):
        """Passwordless demo login is unconditionally denied with HTTP 403 in production."""
        url = reverse('auth-demo-login')
        response = self.client.post(url, {'username': 'demo.patient'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn('token', response.data)
        self.assertIn('strictly disabled in production', response.data.get('error', ''))

    @override_settings(DEBUG=False, ENABLE_DEV_DEMO_AUTH=False)
    def test_demo_username_password_authentication_denied_in_production(self):
        """Even with correct username/password, demo accounts cannot authenticate in production."""
        url = reverse('auth-login')
        response = self.client.post(url, {
            'username': 'demo.patient',
            'password': 'demoPassword123!',
        })
        # Should be rejected by serializer validation (HTTP 400) or view check (HTTP 403)
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])
        self.assertNotIn('token', response.data)

    @override_settings(DEBUG=False, ENABLE_DEV_DEMO_AUTH=False)
    def test_existing_demo_token_denied_before_revocation(self):
        """Backend authorization denies access through demo tokens even before revocation runs."""
        demo_token = Token.objects.create(user=self.demo_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {demo_token.key}')
        url = reverse('patient-dashboard')
        response = self.client.get(url)
        # HefinTokenAuthentication must raise AuthenticationFailed (HTTP 401)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('strictly prohibited', str(response.data))

    # --------------------------------------------------------------------------
    # 3. Development Opt-In Control (DEBUG=True)
    # --------------------------------------------------------------------------
    @override_settings(DEBUG=True, ENABLE_DEV_DEMO_AUTH=False)
    def test_development_demo_login_denied_without_opt_in(self):
        """In development, demo login is denied if ENABLE_DEV_DEMO_AUTH is False."""
        url = reverse('auth-demo-login')
        response = self.client.post(url, {'username': 'demo.patient'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn('token', response.data)

    @override_settings(DEBUG=True, ENABLE_DEV_DEMO_AUTH=True)
    def test_development_demo_login_allowed_with_explicit_opt_in(self):
        """In development with explicit opt-in, demo login succeeds."""
        url = reverse('auth-demo-login')
        response = self.client.post(url, {'username': 'demo.patient'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'demo.patient')

    # --------------------------------------------------------------------------
    # 4. Idempotent Token Revocation Management Command
    # --------------------------------------------------------------------------
    def test_revoke_demo_tokens_command_revokes_demo_and_preserves_legitimate(self):
        """The revoke_demo_tokens command deletes all demo tokens and preserves legitimate tokens."""
        demo_token = Token.objects.create(user=self.demo_user)
        legit_token = Token.objects.create(user=self.legit_user)

        self.assertTrue(Token.objects.filter(key=demo_token.key).exists())
        self.assertTrue(Token.objects.filter(key=legit_token.key).exists())

        out = io.StringIO()
        call_command('revoke_demo_tokens', stdout=out)
        output = out.getvalue()

        # Demo token must be deleted
        self.assertFalse(Token.objects.filter(key=demo_token.key).exists())
        # Legitimate token must be preserved
        self.assertTrue(Token.objects.filter(key=legit_token.key).exists())
        self.assertIn('Successfully revoked 1 demo authentication token', output)

        # Idempotence: running it a second time should succeed with 0 revoked
        out_idempotent = io.StringIO()
        call_command('revoke_demo_tokens', stdout=out_idempotent)
        self.assertIn('Zero demo tokens found', out_idempotent.getvalue())
        self.assertTrue(Token.objects.filter(key=legit_token.key).exists())
