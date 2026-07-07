from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
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
            "is_psychologist_verified",
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

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("This email is already registered.")
        return normalized_email

    def create(self, validated_data):
        specialization = validated_data.pop("specialization")
        bio = validated_data.pop("bio")
        years_of_experience = validated_data.pop("years_of_experience")
        languages = validated_data.pop("languages")

        try:
            with transaction.atomic():
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
        except IntegrityError:
            errors = {}

            if User.objects.filter(username__iexact=validated_data["username"]).exists():
                errors["username"] = ["This username is already taken."]

            if User.objects.filter(email__iexact=validated_data["email"]).exists():
                errors["email"] = ["This email is already registered."]

            if not errors:
                errors["detail"] = ["Could not complete psychologist application."]

            raise serializers.ValidationError(errors)

        return user
