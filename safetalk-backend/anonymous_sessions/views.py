from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from .models import AnonymousSession
from .serializers import AnonymousSessionSerializer


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

        if user.role == "psychologist":
            return queryset.filter(psychologist__user=user).order_by("-created_at")

        return queryset.filter(client=user).order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != "client":
            raise PermissionDenied("Only authenticated clients can create anonymous sessions.")

        serializer.save(client=user)
