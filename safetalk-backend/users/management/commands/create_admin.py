import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create or reset the Safetalk admin superuser from ADMIN_PASSWORD."

    def handle(self, *args, **options):
        password = os.environ.get("ADMIN_PASSWORD")
        if not password:
            raise CommandError("ADMIN_PASSWORD environment variable is required.")

        User = get_user_model()
        defaults = {
            "email": "aviral.adhikari05@gmail.com",
            "is_staff": True,
            "is_superuser": True,
            "is_active": True,
        }

        user, created = User.objects.get_or_create(
            username="admin",
            defaults=defaults,
        )

        if not created:
            user.email = "aviral.adhikari05@gmail.com"
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True

        user.set_password(password)
        user.save()

        action = "created" if created else "updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"Admin user {action} successfully for username='admin'."
            )
        )
