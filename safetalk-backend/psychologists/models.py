from django.conf import settings
from django.db import models


class PsychologistProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="psychologist_profile",
    )
    specialization = models.CharField(max_length=255)
    bio = models.TextField()
    years_of_experience = models.PositiveIntegerField()
    profile_photo = models.ImageField(
        upload_to="psychologists/profile_photos/",
        blank=True,
        null=True,
    )
    languages = models.CharField(max_length=255)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.full_name or self.user.username
