import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Create or promote the initial Django superuser from environment variables."

    required_env_vars = (
        "DJANGO_SUPERUSER_USERNAME",
        "DJANGO_SUPERUSER_EMAIL",
        "DJANGO_SUPERUSER_PASSWORD",
    )

    def handle(self, *args, **options):
        missing_vars = [
            name for name in self.required_env_vars if not os.environ.get(name)
        ]

        if missing_vars:
            self.stdout.write(
                self.style.WARNING(
                    "Initial superuser was not created. Missing environment "
                    f"variable(s): {', '.join(missing_vars)}"
                )
            )
            return

        username = os.environ["DJANGO_SUPERUSER_USERNAME"].strip()
        email = os.environ["DJANGO_SUPERUSER_EMAIL"].strip().lower()
        password = os.environ["DJANGO_SUPERUSER_PASSWORD"]

        if not username or not email or not password:
            self.stdout.write(
                self.style.WARNING(
                    "Initial superuser was not created. Username, email, and "
                    "password environment variables must not be blank."
                )
            )
            return

        User = get_user_model()

        with transaction.atomic():
            username_user = User.objects.filter(username__iexact=username).first()
            email_user = User.objects.filter(email__iexact=email).first()

            if username_user and email_user and username_user.pk != email_user.pk:
                self.stdout.write(
                    self.style.WARNING(
                        "Initial superuser was not updated because the configured "
                        "username and email belong to two different users. Resolve "
                        "this manually in the database or Django admin."
                    )
                )
                return

            user = username_user or email_user

            if user:
                if user.username != username:
                    user.username = username

                if user.email != email:
                    user.email = email

                for field_name in ("is_staff", "is_superuser", "is_active"):
                    if not getattr(user, field_name):
                        setattr(user, field_name, True)

                user.set_password(password)
                user.save(
                    update_fields=[
                        "username",
                        "email",
                        "password",
                        "is_staff",
                        "is_superuser",
                        "is_active",
                    ]
                )

                self.stdout.write(
                    self.style.SUCCESS(
                        "Initial superuser already existed and was updated "
                        f"safely for username='{username}'."
                    )
                )
                return

            create_kwargs = {
                User.USERNAME_FIELD: username,
                "email": email,
                "password": password,
            }

            user = User.objects.create_superuser(**create_kwargs)

            if hasattr(user, "full_name") and not user.full_name:
                user.full_name = username
                user.save(update_fields=["full_name"])

            self.stdout.write(
                self.style.SUCCESS(
                    f"Initial superuser created successfully for username='{username}'."
                )
            )
