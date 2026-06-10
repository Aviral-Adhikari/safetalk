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
