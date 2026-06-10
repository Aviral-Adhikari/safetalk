from rest_framework import serializers

from .models import PsychologistProfile


class PsychologistProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = PsychologistProfile
        fields = (
            "id",
            "full_name",
            "specialization",
            "bio",
            "years_of_experience",
            "languages",
            "is_available",
        )

    def get_full_name(self, obj):
        return obj.user.full_name or obj.user.username
