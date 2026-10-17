"""
HEFIN 4.0 Authentication Security Layer.
Enforces strict demo-credential lockdown across all DRF authentication entry points.
"""
from django.conf import settings
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.exceptions import AuthenticationFailed


def is_demo_auth_permitted():
    """
    Demo account authentication is strictly forbidden in production (DEBUG=False).
    In development (DEBUG=True), it is only permitted if ENABLE_DEV_DEMO_AUTH is explicitly True.
    No environment variable or override may enable demo authentication when DEBUG=False.
    """
    if not settings.DEBUG:
        return False
    return bool(getattr(settings, 'ENABLE_DEV_DEMO_AUTH', False))


class HefinTokenAuthentication(TokenAuthentication):
    """
    Authoritative TokenAuthentication subclass.
    Strictly denies authentication if the token belongs to a demo account (is_demo=True)
    in production or when ENABLE_DEV_DEMO_AUTH is disabled in development.
    Denies access even before token revocation completes.
    """
    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        if getattr(user, 'is_demo', False) and not is_demo_auth_permitted():
            raise AuthenticationFailed(
                'Demo credentials are strictly prohibited in production and unapproved environments.'
            )
        return (user, token)


class HefinSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication subclass enforcing the same demo credential prohibition.
    """
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            user, auth = result
            if getattr(user, 'is_demo', False) and not is_demo_auth_permitted():
                raise AuthenticationFailed(
                    'Demo credentials are strictly prohibited in production and unapproved environments.'
                )
        return result
