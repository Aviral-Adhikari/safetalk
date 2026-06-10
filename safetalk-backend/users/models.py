from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        CLIENT = "client", "Client"
        PSYCHOLOGIST = "psychologist", "Psychologist"

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CLIENT,
    )
    is_psychologist_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.full_name or self.username or self.email
