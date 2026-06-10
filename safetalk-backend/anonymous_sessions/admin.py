from django.contrib import admin

from .models import AnonymousSession


@admin.register(AnonymousSession)
class AnonymousSessionAdmin(admin.ModelAdmin):
    list_display = (
        "anonymous_alias",
        "psychologist",
        "status",
        "created_at",
        "updated_at",
    )
    list_filter = (
        "status",
        "created_at",
        "updated_at",
    )
    search_fields = (
        "anonymous_alias",
        "session_id",
        "psychologist__user__full_name",
        "psychologist__user__username",
        "client__username",
        "client__full_name",
    )
    autocomplete_fields = ("client", "psychologist")
