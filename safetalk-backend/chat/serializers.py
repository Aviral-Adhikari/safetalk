from rest_framework import serializers

from anonymous_sessions.models import AnonymousSession

from .models import ChatRoom, Message


class ChatRoomSerializer(serializers.ModelSerializer):
    session = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = (
            "id",
            "session",
            "created_at",
        )

    def get_session(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        session = obj.session

        data = {
            "id": session.id,
            "session_id": str(session.session_id),
            "identity_mode": session.identity_mode,
            "status": session.status,
            "psychologist": {
                "id": session.psychologist.id if session.psychologist else None,
                "full_name": (
                    session.psychologist.user.full_name or session.psychologist.user.username
                ) if session.psychologist else None,
                "specialization": session.psychologist.specialization if session.psychologist else None,
            },
        }

        is_psychologist_viewer = (
            user is not None
            and getattr(user, "role", None) == "psychologist"
            and session.psychologist
            and session.psychologist.user_id == user.id
        )

        if is_psychologist_viewer:
            if session.identity_mode == AnonymousSession.IdentityMode.ANONYMOUS:
                data["client_identity"] = {
                    "identity_mode": session.identity_mode,
                    "display_name": session.anonymous_alias,
                }
            else:
                data["client_identity"] = {
                    "identity_mode": session.identity_mode,
                    "display_name": session.client.full_name if session.client else None,
                }
        else:
            data["client_identity"] = {
                "identity_mode": session.identity_mode,
                "display_name": session.anonymous_alias if session.identity_mode == AnonymousSession.IdentityMode.ANONYMOUS else (session.client.full_name if session.client else None),
            }

        return data


class MessageSerializer(serializers.ModelSerializer):
    sender_display_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Message
        fields = (
            "id",
            "room",
            "sender",
            "sender_display_name",
            "content",
            "message_type",
            "created_at",
            "updated_at",
            "is_read",
        )
        read_only_fields = (
            "id",
            "room",
            "sender",
            "sender_display_name",
            "created_at",
            "updated_at",
        )

    def get_sender_display_name(self, obj):
        session = obj.room.session
        if session.client_id == obj.sender_id:
            if session.identity_mode == AnonymousSession.IdentityMode.ANONYMOUS:
                return session.anonymous_alias
            return obj.sender.full_name or obj.sender.username

        return obj.sender.full_name or obj.sender.username
