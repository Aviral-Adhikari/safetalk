from django.urls import path

from .views import (
    PsychologistProfileDetailAPIView,
    PsychologistProfileListAPIView,
)


urlpatterns = [
    path("", PsychologistProfileListAPIView.as_view(), name="psychologist-list"),
    path("<int:pk>/", PsychologistProfileDetailAPIView.as_view(), name="psychologist-detail"),
]
