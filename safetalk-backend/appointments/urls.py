from django.urls import path

from .views import (
    AppointmentBookingAPIView,
    AppointmentListAPIView,
    AppointmentStatusUpdateAPIView,
    MyAvailabilitySlotDetailAPIView,
    MyAvailabilitySlotListCreateAPIView,
    PublicPsychologistSlotsAPIView,
)


urlpatterns = [
    path("my-slots/", MyAvailabilitySlotListCreateAPIView.as_view(), name="appointment-my-slots"),
    path("my-slots/<int:pk>/", MyAvailabilitySlotDetailAPIView.as_view(), name="appointment-my-slot-detail"),
    path(
        "psychologists/<int:psychologist_id>/slots/",
        PublicPsychologistSlotsAPIView.as_view(),
        name="appointment-psychologist-slots",
    ),
    path("book/", AppointmentBookingAPIView.as_view(), name="appointment-book"),
    path("", AppointmentListAPIView.as_view(), name="appointment-list"),
    path("<int:pk>/status/", AppointmentStatusUpdateAPIView.as_view(), name="appointment-status-update"),
]
