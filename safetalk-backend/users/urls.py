from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginAPIView,
    MeAPIView,
    PsychologistApplicationAPIView,
    RegisterAPIView,
)


urlpatterns = [
    path("register/", RegisterAPIView.as_view(), name="auth-register"),
    path("psychologist-apply/", PsychologistApplicationAPIView.as_view(), name="auth-psychologist-apply"),
    path("login/", LoginAPIView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("me/", MeAPIView.as_view(), name="auth-me"),
]
