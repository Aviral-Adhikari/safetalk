from rest_framework import serializers

from psychologists.models import PsychologistProfile

from .models import AnonymousSession


class AnonymousSessionSerializer(serializers.ModelSerializer):
    psychologist_id = serializers.PrimaryKeyRelatedField(
        source="psychologist",
        queryset=PsychologistProfile.objects.select_related("user").filter(
            user__role="psychologist",
            user__is_psychologist_verified=True,
            is_available=True,
        ),
        write_only=True,
    )
    psychologist = serializers.SerializerMethodField(read_only=True)
    client_identity = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = AnonymousSession
        fields = (
            "id",
            "session_id",
            "identity_mode",
            "anonymous_alias",
            "client_identity",
            "psychologist_id",
            "psychologist",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "session_id",
            "anonymous_alias",
            "client_identity",
            "psychologist",
            "status",
            "created_at",
            "updated_at",
        )

    def get_psychologist(self, obj):
        return {
            "id": obj.psychologist.id,
            "full_name": obj.psychologist.user.full_name or obj.psychologist.user.username,
            "specialization": obj.psychologist.specialization,
            "is_available": obj.psychologist.is_available,
        }

    def get_client_identity(self, obj):
        request = self.context.get("request")
        viewer = getattr(request, "user", None)

        if obj.identity_mode == AnonymousSession.IdentityMode.ANONYMOUS:
            return {
                "identity_mode": obj.identity_mode,
                "display_name": obj.anonymous_alias,
            }

        display_name = obj.client.full_name if obj.client else None

        if viewer and getattr(viewer, "role", None) == "psychologist":
            return {
                "identity_mode": obj.identity_mode,
                "display_name": display_name,
            }

        return {
            "identity_mode": obj.identity_mode,
            "display_name": display_name,
        }


class AnonymousSessionStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnonymousSession
        fields = (
            "id",
            "status",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "updated_at",
        )

    def validate_status(self, value):
        request = self.context["request"]
        user = request.user
        session = self.instance

        if session.status == AnonymousSession.Status.ENDED and value != AnonymousSession.Status.ENDED:
            raise serializers.ValidationError("Ended sessions cannot be reopened.")

        if value == AnonymousSession.Status.ACTIVE:
            psychologist_user = getattr(session.psychologist, "user", None)
            if (
                user.role != "psychologist"
                or not user.is_psychologist_verified
                or psychologist_user is None
                or psychologist_user.id != user.id
            ):
                raise serializers.ValidationError("Only the assigned psychologist can mark a session as active.")
            return value

        if value == AnonymousSession.Status.ENDED:
            is_client = session.client_id == user.id
            psychologist_user = getattr(session.psychologist, "user", None)
            is_psychologist = (
                psychologist_user is not None
                and psychologist_user.id == user.id
                and user.is_psychologist_verified
            )
            if not (is_client or is_psychologist):
                raise serializers.ValidationError("Only session participants can end a session.")
            return value

        raise serializers.ValidationError("Session status can only be updated to active or ended.")
