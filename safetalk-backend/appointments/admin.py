from django.contrib import admin

from .models import Appointment, PsychologistAvailabilitySlot


@admin.register(PsychologistAvailabilitySlot)
class PsychologistAvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = (
        "psychologist",
        "date",
        "start_time",
        "end_time",
        "is_booked",
        "created_at",
    )
    list_filter = ("date", "is_booked", "psychologist")
    search_fields = (
        "psychologist__user__username",
        "psychologist__user__full_name",
        "psychologist__specialization",
    )


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        "client",
        "psychologist",
        "appointment_date",
        "start_time",
        "end_time",
        "status",
        "identity_mode",
        "session",
    )
    list_filter = ("status", "identity_mode", "appointment_date")
    search_fields = (
        "client__username",
        "client__full_name",
        "psychologist__user__username",
        "psychologist__user__full_name",
    )
    autocomplete_fields = ("client", "psychologist", "availability_slot", "session")
