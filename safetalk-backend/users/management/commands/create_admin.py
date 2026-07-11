from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Deprecated alias for create_initial_superuser. "
        "Uses DJANGO_SUPERUSER_* environment variables."
    )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.WARNING(
                "create_admin is deprecated. Use create_initial_superuser instead."
            )
        )
        call_command("create_initial_superuser")
