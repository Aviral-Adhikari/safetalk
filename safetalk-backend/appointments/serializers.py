from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from anonymous_sessions.models import AnonymousSession
from psychologists.models import PsychologistProfile

from .models import Appointment, PsychologistAvailabilitySlot


def _client_display_for_appointment(appointment):
    if appointment.identity_mode == AnonymousSession.IdentityMode.ANONYMOUS:
        if appointment.session and appointment.session.anonymous_alias:
            return appointment.session.anonymous_alias
        return "Anonymous Client"

    return appointment.client.full_name or appointment.client.username


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    psychologist_name = serializers.SerializerMethodField(read_only=True)
    booked_client_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PsychologistAvailabilitySlot
        fields = (
            "id",
            "psychologist",
            "psychologist_name",
            "date",
            "start_time",
            "end_time",
            "is_booked",
            "booked_client_display",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "psychologist",
            "psychologist_name",
            "is_booked",
            "booked_client_display",
            "created_at",
            "updated_at",
        )

    def get_psychologist_name(self, obj):
        return obj.psychologist.user.full_name or obj.psychologist.user.username

    def get_booked_client_display(self, obj):
        appointment = getattr(obj, "appointment", None)
        if not appointment:
            return None
        return _client_display_for_appointment(appointment)

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        if instance and instance.is_booked:
            raise serializers.ValidationError("Booked slots cannot be edited.")

        date = attrs.get("date", getattr(instance, "date", None))
        start_time = attrs.get("start_time", getattr(instance, "start_time", None))
        end_time = attrs.get("end_time", getattr(instance, "end_time", None))
        psychologist = self.context.get("psychologist") or getattr(instance, "psychologist", None)

        if date and date < timezone.localdate():
            raise serializers.ValidationError({"date": "Availability date cannot be in the past."})

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})

        if psychologist and date and start_time and end_time:
            overlaps = PsychologistAvailabilitySlot.objects.filter(
                psychologist=psychologist,
                date=date,
                start_time__lt=end_time,
                end_time__gt=start_time,
            )
            if instance:
                overlaps = overlaps.exclude(pk=instance.pk)

            if overlaps.exists():
                raise serializers.ValidationError("This slot overlaps an existing slot.")

        return attrs


class PublicAvailabilitySlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = PsychologistAvailabilitySlot
        fields = (
            "id",
            "date",
            "start_time",
            "end_time",
        )


class AppointmentSerializer(serializers.ModelSerializer):
    client_identity = serializers.SerializerMethodField(read_only=True)
    psychologist_name = serializers.SerializerMethodField(read_only=True)
    psychologist_specialization = serializers.CharField(
        source="psychologist.specialization",
        read_only=True,
    )
    session_id = serializers.IntegerField(source="session.id", read_only=True)
    chat_room_id = serializers.IntegerField(source="session.chat_room.id", read_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id",
            "client_identity",
            "psychologist",
            "psychologist_name",
            "psychologist_specialization",
            "availability_slot",
            "session",
            "session_id",
            "chat_room_id",
            "status",
            "appointment_date",
            "start_time",
            "end_time",
            "notes",
            "identity_mode",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "client_identity",
            "psychologist",
            "psychologist_name",
            "psychologist_specialization",
            "availability_slot",
            "session",
            "session_id",
            "chat_room_id",
            "status",
            "appointment_date",
            "start_time",
            "end_time",
            "created_at",
            "updated_at",
        )

    def get_client_identity(self, obj):
        return {
            "identity_mode": obj.identity_mode,
            "display_name": _client_display_for_appointment(obj),
        }

    def get_psychologist_name(self, obj):
        return obj.psychologist.user.full_name or obj.psychologist.user.username


class AppointmentBookingSerializer(serializers.Serializer):
    availability_slot_id = serializers.IntegerField()
    identity_mode = serializers.ChoiceField(
        choices=AnonymousSession.IdentityMode.choices,
        default=AnonymousSession.IdentityMode.ANONYMOUS,
    )
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate_availability_slot_id(self, value):
        try:
            slot = PsychologistAvailabilitySlot.objects.select_related(
                "psychologist",
                "psychologist__user",
            ).get(pk=value)
        except PsychologistAvailabilitySlot.DoesNotExist:
            raise serializers.ValidationError("Selected appointment slot does not exist.")

        if slot.is_booked:
            raise serializers.ValidationError("This appointment slot is already booked.")

        if slot.date < timezone.localdate():
            raise serializers.ValidationError("This appointment slot is no longer available.")

        if (
            slot.psychologist.user.role != "psychologist"
            or not slot.psychologist.user.is_psychologist_verified
            or not slot.psychologist.is_available
        ):
            raise serializers.ValidationError("This psychologist is not available for new appointments.")

        self.context["slot"] = slot
        return value

    def validate(self, attrs):
        request = self.context["request"]
        if request.user.role != "client":
            raise serializers.ValidationError("Only clients can book appointments.")

        slot = self.context["slot"]
        if slot.psychologist.user_id == request.user.id:
            raise serializers.ValidationError("You cannot book your own psychologist profile.")

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        slot = self.context["slot"]

        try:
            with transaction.atomic():
                locked_slot = PsychologistAvailabilitySlot.objects.select_for_update().get(pk=slot.pk)
                if locked_slot.is_booked:
                    raise serializers.ValidationError(
                        {"availability_slot_id": ["This appointment slot is already booked."]}
                    )

                appointment = Appointment.objects.create(
                    client=request.user,
                    psychologist=locked_slot.psychologist,
                    availability_slot=locked_slot,
                    appointment_date=locked_slot.date,
                    start_time=locked_slot.start_time,
                    end_time=locked_slot.end_time,
                    notes=validated_data.get("notes", ""),
                    identity_mode=validated_data.get("identity_mode", AnonymousSession.IdentityMode.ANONYMOUS),
                )
                locked_slot.is_booked = True
                locked_slot.save(update_fields=["is_booked", "updated_at"])
        except IntegrityError:
            raise serializers.ValidationError(
                {"availability_slot_id": ["This appointment slot is already booked."]}
            )

        return appointment


class AppointmentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ("id", "status", "updated_at")
        read_only_fields = ("id", "updated_at")

    def validate_status(self, value):
        request = self.context["request"]
        appointment = self.instance

        is_client = appointment.client_id == request.user.id
        is_psychologist = (
            request.user.role == "psychologist"
            and request.user.is_psychologist_verified
            and appointment.psychologist.user_id == request.user.id
        )

        if value == Appointment.Status.CONFIRMED and not is_psychologist:
            raise serializers.ValidationError("Only the assigned psychologist can confirm appointments.")

        if value == Appointment.Status.COMPLETED and not is_psychologist:
            raise serializers.ValidationError("Only the assigned psychologist can complete appointments.")

        if value == Appointment.Status.CANCELLED and not (is_client or is_psychologist):
            raise serializers.ValidationError("Only appointment participants can cancel appointments.")

        if appointment.status in {Appointment.Status.CANCELLED, Appointment.Status.COMPLETED}:
            raise serializers.ValidationError("Finalized appointments cannot be changed.")

        if value == Appointment.Status.PENDING:
            raise serializers.ValidationError("Appointments cannot be moved back to pending.")

        return value

    def update(self, instance, validated_data):
        next_status = validated_data["status"]

        with transaction.atomic():
            appointment = Appointment.objects.select_for_update().select_related(
                "availability_slot",
                "psychologist",
            ).get(pk=instance.pk)
            appointment.status = next_status

            if next_status == Appointment.Status.CONFIRMED and appointment.session_id is None:
                session = AnonymousSession.objects.create(
                    client=appointment.client,
                    psychologist=appointment.psychologist,
                    identity_mode=appointment.identity_mode,
                    status=AnonymousSession.Status.ACTIVE,
                )
                appointment.session = session

            if next_status == Appointment.Status.CANCELLED:
                appointment.availability_slot.is_booked = False
                appointment.availability_slot.save(update_fields=["is_booked", "updated_at"])
                if appointment.session:
                    appointment.session.status = AnonymousSession.Status.ENDED
                    appointment.session.save(update_fields=["status", "updated_at"])

            if next_status == Appointment.Status.COMPLETED and appointment.session:
                appointment.session.status = AnonymousSession.Status.ENDED
                appointment.session.save(update_fields=["status", "updated_at"])

            appointment.save(update_fields=["status", "session", "updated_at"])

        return appointment
