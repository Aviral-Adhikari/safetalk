from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from anonymous_sessions.models import AnonymousSession


class ChatRoom(models.Model):
    session = models.OneToOneField(
        AnonymousSession,
        on_delete=models.CASCADE,
        related_name="chat_room",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Room for session {self.session.session_id}"


class Message(models.Model):
    class MessageType(models.TextChoices):
        TEXT = "text", "Text"
        SYSTEM = "system", "System"

    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    content = models.TextField()
    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.TEXT,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.message_type} message in room {self.room_id} by {self.sender}"


@receiver(post_save, sender=AnonymousSession)
def ensure_chat_room_exists(sender, instance, created, **kwargs):
    if created:
        ChatRoom.objects.get_or_create(session=instance)
