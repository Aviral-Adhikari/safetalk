from django.contrib.auth import get_user_model
from rest_framework import serializers

from psychologists.models import PsychologistProfile

User = get_user_model()


class UserSafeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "full_name",
            "role",
        )


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "password",
            "full_name",
        )

    def create(self, validated_data):
        user = User(
            username=validated_data["username"],
            email=validated_data["email"],
            full_name=validated_data.get("full_name", ""),
            role=User.Role.CLIENT,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class PsychologistApplicationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    specialization = serializers.CharField(max_length=255)
    bio = serializers.CharField()
    years_of_experience = serializers.IntegerField(min_value=0)
    languages = serializers.CharField(max_length=255)

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "password",
            "full_name",
            "specialization",
            "bio",
            "years_of_experience",
            "languages",
        )

    def create(self, validated_data):
        specialization = validated_data.pop("specialization")
        bio = validated_data.pop("bio")
        years_of_experience = validated_data.pop("years_of_experience")
        languages = validated_data.pop("languages")

        user = User(
            username=validated_data["username"],
            email=validated_data["email"],
            full_name=validated_data.get("full_name", ""),
            role=User.Role.PSYCHOLOGIST,
            is_psychologist_verified=False,
        )
        user.set_password(validated_data["password"])
        user.save()

        PsychologistProfile.objects.create(
            user=user,
            specialization=specialization,
            bio=bio,
            years_of_experience=years_of_experience,
            languages=languages,
            is_available=False,
        )

        return user
