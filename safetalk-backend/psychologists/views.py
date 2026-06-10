from rest_framework import generics

from .models import PsychologistProfile
from .serializers import PsychologistProfileSerializer


class PsychologistProfileListAPIView(generics.ListAPIView):
    serializer_class = PsychologistProfileSerializer

    def get_queryset(self):
        return (
            PsychologistProfile.objects.select_related("user")
            .filter(
                user__role="psychologist",
                user__is_psychologist_verified=True,
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
            )
        )
