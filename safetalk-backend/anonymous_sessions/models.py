import secrets
import string
import uuid
from django.conf import settings
from django.db import models

from psychologists.models import PsychologistProfile


class AnonymousSession(models.Model):
    class IdentityMode(models.TextChoices):
        ANONYMOUS = "anonymous", "Anonymous"
        KNOWN = "known", "Known"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        ENDED = "ended", "Ended"

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="anonymous_sessions",
        null=True,
        blank=True,
    )
    psychologist = models.ForeignKey(
        PsychologistProfile,
        on_delete=models.CASCADE,
        related_name="anonymous_sessions",
        null=True,
        blank=True,
    )

    session_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )

    identity_mode = models.CharField(
        max_length=20,
        choices=IdentityMode.choices,
        default=IdentityMode.ANONYMOUS,
    )
    anonymous_alias = models.CharField(
        max_length=32,
        unique=True,
        editable=False,
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        display_identity = self.anonymous_alias or "known-client"
        return f"{display_identity} -> {self.psychologist}"

    def save(self, *args, **kwargs):
        if self.identity_mode == self.IdentityMode.ANONYMOUS and not self.anonymous_alias:
            self.anonymous_alias = self.generate_alias()
        elif self.identity_mode == self.IdentityMode.KNOWN:
            self.anonymous_alias = None
        super().save(*args, **kwargs)

    @classmethod
    def generate_alias(cls):
        alphabet = string.ascii_uppercase + string.digits
        while True:
            alias = f"anon_{''.join(secrets.choice(alphabet) for _ in range(6))}"
            if not cls.objects.filter(anonymous_alias=alias).exists():
                return alias
