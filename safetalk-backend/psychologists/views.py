from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser

from .models import PsychologistProfile
from .serializers import PsychologistMeSerializer, PsychologistProfileSerializer


class PsychologistProfileListAPIView(generics.ListAPIView):
    serializer_class = PsychologistProfileSerializer

    def get_queryset(self):
        return (
            PsychologistProfile.objects.select_related("user")
            .filter(
                user__role="psychologist",
                user__is_psychologist_verified=True,
                is_available=True,
            )
            .order_by("id")
        )


class PsychologistProfileDetailAPIView(generics.RetrieveAPIView):
    serializer_class = PsychologistProfileSerializer

    def get_queryset(self):
        return (
            PsychologistProfile.objects.select_related("user")
            .filter(
                user__role="psychologist",
                user__is_psychologist_verified=True,
                is_available=True,
            )
        )


class PsychologistMeAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = PsychologistMeSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        user = self.request.user

        if user.role != "psychologist" or not user.is_psychologist_verified:
            raise PermissionDenied("Only verified psychologists can manage a psychologist profile.")

        try:
            return user.psychologist_profile
        except PsychologistProfile.DoesNotExist:
            raise PermissionDenied("No psychologist profile is connected to this account.")
