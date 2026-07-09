from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from anonymous_sessions.models import AnonymousSession
from psychologists.models import PsychologistProfile


class PsychologistAvailabilitySlot(models.Model):
    psychologist = models.ForeignKey(
        PsychologistProfile,
        on_delete=models.CASCADE,
        related_name="availability_slots",
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_booked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("date", "start_time")
        constraints = [
            models.UniqueConstraint(
                fields=("psychologist", "date", "start_time", "end_time"),
                name="unique_psychologist_slot_time",
            )
        ]

    def __str__(self):
        return f"{self.psychologist} - {self.date} {self.start_time}-{self.end_time}"

    def clean(self):
        if self.end_time <= self.start_time:
            raise ValidationError("End time must be after start time.")

        if self.date < timezone.localdate():
            raise ValidationError("Availability date cannot be in the past.")

        overlapping_slots = PsychologistAvailabilitySlot.objects.filter(
            psychologist=self.psychologist,
            date=self.date,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time,
        )
        if self.pk:
            overlapping_slots = overlapping_slots.exclude(pk=self.pk)

        if overlapping_slots.exists():
            raise ValidationError("This availability slot overlaps another slot.")


class Appointment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="appointments",
    )
    psychologist = models.ForeignKey(
        PsychologistProfile,
        on_delete=models.CASCADE,
        related_name="appointments",
    )
    availability_slot = models.OneToOneField(
        PsychologistAvailabilitySlot,
        on_delete=models.PROTECT,
        related_name="appointment",
    )
    session = models.OneToOneField(
        AnonymousSession,
        on_delete=models.SET_NULL,
        related_name="appointment",
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    appointment_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    notes = models.TextField(blank=True)
    identity_mode = models.CharField(
        max_length=20,
        choices=AnonymousSession.IdentityMode.choices,
        default=AnonymousSession.IdentityMode.ANONYMOUS,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("appointment_date", "start_time")

    def __str__(self):
        return f"{self.client} with {self.psychologist} on {self.appointment_date}"
