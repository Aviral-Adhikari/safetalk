from django.shortcuts import get_object_or_404
from django.db import models
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from anonymous_sessions.models import AnonymousSession

from .models import ChatRoom, Message
from .serializers import ChatRoomSerializer, MessageSerializer


def _user_can_access_room(user, room):
    if room.session.client_id == user.id:
        return True

    psychologist_user = getattr(room.session.psychologist, "user", None)
    return psychologist_user is not None and psychologist_user.id == user.id


class ChatRoomListAPIView(generics.ListAPIView):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            ChatRoom.objects.select_related(
                "session",
                "session__client",
                "session__psychologist",
                "session__psychologist__user",
            )
            .filter(
                models.Q(session__client=user) |
                models.Q(session__psychologist__user=user)
            )
            .order_by("-created_at")
        )


class ChatRoomDetailAPIView(generics.RetrieveAPIView):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            ChatRoom.objects.select_related(
                "session",
                "session__client",
                "session__psychologist",
                "session__psychologist__user",
            )
            .filter(
                models.Q(session__client=user) |
                models.Q(session__psychologist__user=user)
            )
        )


class MessageListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_room(self):
        room = get_object_or_404(
            ChatRoom.objects.select_related(
                "session",
                "session__client",
                "session__psychologist",
                "session__psychologist__user",
            ),
            pk=self.kwargs["pk"],
        )
        if not _user_can_access_room(self.request.user, room):
            raise PermissionDenied("You are not allowed to access this chat room.")
        return room

    def get_queryset(self):
        room = self.get_room()
        return (
            Message.objects.select_related("sender", "room", "room__session")
            .filter(room=room)
            .order_by("created_at")
        )

    def perform_create(self, serializer):
        room = self.get_room()
        if room.session.status == AnonymousSession.Status.ENDED:
            raise PermissionDenied("This counseling session has ended. New messages are disabled.")
        serializer.save(room=room, sender=self.request.user)
