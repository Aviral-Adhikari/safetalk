from django.contrib.auth import get_user_model
from rest_framework import serializers


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
