from django.contrib import admin

from .models import ChatRoom, Message


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "session",
        "created_at",
    )
    search_fields = (
        "session__session_id",
        "session__anonymous_alias",
        "session__client__username",
        "session__psychologist__user__username",
    )
    autocomplete_fields = ("session",)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "room",
        "sender",
        "message_type",
        "is_read",
        "created_at",
    )
    list_filter = (
        "message_type",
        "is_read",
        "created_at",
    )
    search_fields = (
        "content",
        "sender__username",
        "sender__full_name",
        "room__session__anonymous_alias",
    )
    autocomplete_fields = ("room", "sender")
