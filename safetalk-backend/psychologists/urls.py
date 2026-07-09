from django.urls import path

from .views import (
    PsychologistMeAPIView,
    PsychologistProfileDetailAPIView,
    PsychologistProfileListAPIView,
)


urlpatterns = [
    path("me/", PsychologistMeAPIView.as_view(), name="psychologist-me"),
    path("", PsychologistProfileListAPIView.as_view(), name="psychologist-list"),
    path("<int:pk>/", PsychologistProfileDetailAPIView.as_view(), name="psychologist-detail"),
]
