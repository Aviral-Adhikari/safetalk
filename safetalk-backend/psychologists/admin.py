from django.contrib import admin

from .models import PsychologistProfile


@admin.register(PsychologistProfile)
class PsychologistProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "specialization",
        "years_of_experience",
        "languages",
        "is_available",
        "created_at",
    )
    list_filter = (
        "is_available",
        "specialization",
        "created_at",
    )
    search_fields = (
        "user__username",
        "user__email",
        "user__full_name",
        "specialization",
        "languages",
    )
    autocomplete_fields = ("user",)
