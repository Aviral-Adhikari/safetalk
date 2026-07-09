from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from psychologists.models import PsychologistProfile

from .models import Appointment, PsychologistAvailabilitySlot
from .serializers import (
    AppointmentBookingSerializer,
    AppointmentSerializer,
    AppointmentStatusSerializer,
    AvailabilitySlotSerializer,
    PublicAvailabilitySlotSerializer,
)


def _get_verified_psychologist_profile(user):
    if user.role != "psychologist" or not user.is_psychologist_verified:
        raise PermissionDenied("Only verified psychologists can manage appointment slots.")

    try:
        return user.psychologist_profile
    except PsychologistProfile.DoesNotExist:
        raise PermissionDenied("No psychologist profile is connected to this account.")


class MyAvailabilitySlotListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = AvailabilitySlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        psychologist = _get_verified_psychologist_profile(self.request.user)
        return (
            PsychologistAvailabilitySlot.objects.select_related(
                "psychologist",
                "psychologist__user",
                "appointment",
                "appointment__client",
                "appointment__session",
            )
            .filter(psychologist=psychologist)
            .order_by("date", "start_time")
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.user.is_authenticated and self.request.user.role == "psychologist":
            try:
                context["psychologist"] = self.request.user.psychologist_profile
            except PsychologistProfile.DoesNotExist:
                pass
        return context

    def perform_create(self, serializer):
        psychologist = _get_verified_psychologist_profile(self.request.user)
        serializer.save(psychologist=psychologist)


class MyAvailabilitySlotDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AvailabilitySlotSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        psychologist = _get_verified_psychologist_profile(self.request.user)
        return PsychologistAvailabilitySlot.objects.select_related(
            "psychologist",
            "psychologist__user",
            "appointment",
            "appointment__client",
            "appointment__session",
        ).filter(psychologist=psychologist)

    def destroy(self, request, *args, **kwargs):
        slot = self.get_object()
        if slot.is_booked:
            raise PermissionDenied("Booked slots cannot be deleted.")
        return super().destroy(request, *args, **kwargs)


class PublicPsychologistSlotsAPIView(generics.ListAPIView):
    serializer_class = PublicAvailabilitySlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        psychologist_id = self.kwargs["psychologist_id"]
        return (
            PsychologistAvailabilitySlot.objects.select_related("psychologist", "psychologist__user")
            .filter(
                psychologist_id=psychologist_id,
                psychologist__user__role="psychologist",
                psychologist__user__is_psychologist_verified=True,
                psychologist__is_available=True,
                is_booked=False,
            )
            .order_by("date", "start_time")
        )


class AppointmentBookingAPIView(generics.CreateAPIView):
    serializer_class = AppointmentBookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()
        response_serializer = AppointmentSerializer(appointment, context=self.get_serializer_context())
        return Response(response_serializer.data, status=201)


class AppointmentListAPIView(generics.ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Appointment.objects.select_related(
            "client",
            "psychologist",
            "psychologist__user",
            "availability_slot",
            "session",
            "session__chat_room",
        )

        if user.is_staff or user.is_superuser:
            return queryset.order_by("-created_at")

        if user.role == "psychologist":
            if not user.is_psychologist_verified:
                return queryset.none()
            return queryset.filter(psychologist__user=user).order_by("-created_at")

        return queryset.filter(client=user).order_by("-created_at")


class AppointmentStatusUpdateAPIView(generics.UpdateAPIView):
    serializer_class = AppointmentStatusSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch"]

    def get_queryset(self):
        user = self.request.user
        queryset = Appointment.objects.select_related(
            "client",
            "psychologist",
            "psychologist__user",
            "availability_slot",
            "session",
        )

        if user.is_staff or user.is_superuser:
            return queryset

        if user.role == "psychologist":
            if not user.is_psychologist_verified:
                return queryset.none()
            return queryset.filter(psychologist__user=user)

        return queryset.filter(client=user)
