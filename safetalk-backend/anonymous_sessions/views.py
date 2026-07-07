from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from .models import AnonymousSession
from .serializers import AnonymousSessionSerializer, AnonymousSessionStatusSerializer


class AnonymousSessionListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = AnonymousSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = AnonymousSession.objects.select_related(
            "client",
            "psychologist",
            "psychologist__user",
        )

        if user.is_staff or user.is_superuser:
            return queryset.order_by("-created_at")

        if user.role == "psychologist":
            if not user.is_psychologist_verified:
                return queryset.none()
            return queryset.filter(psychologist__user=user).order_by("-created_at")

        return queryset.filter(client=user).order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != "client":
            raise PermissionDenied("Only authenticated clients can create anonymous sessions.")

        serializer.save(client=user)


class AnonymousSessionStatusUpdateAPIView(generics.UpdateAPIView):
    serializer_class = AnonymousSessionStatusSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch"]

    def get_queryset(self):
        user = self.request.user
        queryset = AnonymousSession.objects.select_related(
            "client",
            "psychologist",
            "psychologist__user",
        )

        if user.is_staff or user.is_superuser:
            return queryset

        if user.role == "psychologist":
            if not user.is_psychologist_verified:
                return queryset.none()
            return queryset.filter(psychologist__user=user)

        return queryset.filter(client=user)
