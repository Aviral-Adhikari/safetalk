from rest_framework import serializers

from .models import PsychologistProfile


class PsychologistProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = PsychologistProfile
        fields = (
            "id",
            "full_name",
            "profile_photo",
            "specialization",
            "bio",
            "years_of_experience",
            "languages",
            "is_available",
        )

    def get_full_name(self, obj):
        return obj.user.full_name or obj.user.username

    def get_profile_photo(self, obj):
        if not obj.profile_photo:
            return None

        request = self.context.get("request")
        url = obj.profile_photo.url
        return request.build_absolute_uri(url) if request else url


class PsychologistMeSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)
    is_psychologist_verified = serializers.BooleanField(
        source="user.is_psychologist_verified",
        read_only=True,
    )
    joined_date = serializers.DateTimeField(source="user.date_joined", read_only=True)
    profile_photo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = PsychologistProfile
        fields = (
            "id",
            "full_name",
            "email",
            "role",
            "is_psychologist_verified",
            "profile_photo",
            "specialization",
            "bio",
            "years_of_experience",
            "languages",
            "is_available",
            "joined_date",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "full_name",
            "email",
            "role",
            "is_psychologist_verified",
            "joined_date",
            "created_at",
            "updated_at",
        )

    def validate_bio(self, value):
        if len(value) > 1000:
            raise serializers.ValidationError("Bio must be 1000 characters or fewer.")
        return value

    def validate_languages(self, value):
        languages = [item.strip() for item in value.split(",") if item.strip()]
        if not languages:
            raise serializers.ValidationError("Enter at least one language.")
        return ", ".join(languages)

    def validate_profile_photo(self, value):
        if value is None:
            return value

        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        content_type = getattr(value, "content_type", "")
        if content_type not in allowed_types:
            raise serializers.ValidationError("Upload a JPG, PNG, or WEBP image.")

        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.profile_photo:
            request = self.context.get("request")
            url = instance.profile_photo.url
            data["profile_photo"] = request.build_absolute_uri(url) if request else url
        return data
