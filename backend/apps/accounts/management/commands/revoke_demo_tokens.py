from django.core.management.base import BaseCommand
from rest_framework.authtoken.models import Token
from apps.accounts.models import User

class Command(BaseCommand):
    help = (
        'Idempotently revokes all DRF authentication tokens belonging to demo accounts '
        'without deleting legitimate accounts or unrelated credentials.'
    )

    def handle(self, *args, **options):
        self.stdout.write('Scanning for active demo authentication tokens...')
        demo_users = User.objects.filter(is_demo=True)
        demo_count = demo_users.count()

        tokens_qs = Token.objects.filter(user__is_demo=True)
        token_count = tokens_qs.count()

        if token_count == 0:
            self.stdout.write(self.style.SUCCESS(
                f'Zero demo tokens found among {demo_count} demo user account(s). Nothing to revoke.'
            ))
            return

        deleted_count, _ = tokens_qs.delete()
        self.stdout.write(self.style.SUCCESS(
            f'Successfully revoked {deleted_count} demo authentication token(s) across {demo_count} demo user account(s).'
        ))
