from django.db import DatabaseError
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    PsychologistApplicationSerializer,
    RegisterSerializer,
    UserSafeSerializer,
)


class RegisterAPIView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class PsychologistApplicationAPIView(generics.CreateAPIView):
    serializer_class = PsychologistApplicationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            headers = self.get_success_headers({})
            response_serializer = UserSafeSerializer(user)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED,
                headers=headers,
            )
        except DatabaseError:
            return Response(
                {
                    "detail": (
                        "The application could not be saved right now. "
                        "Please try again in a moment."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class SafeTalkTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token


class LoginAPIView(TokenObtainPairView):
    serializer_class = SafeTalkTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class MeAPIView(generics.GenericAPIView):
    serializer_class = UserSafeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
