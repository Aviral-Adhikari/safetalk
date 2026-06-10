from django.urls import path

from .views import AnonymousSessionListCreateAPIView


urlpatterns = [
    path("", AnonymousSessionListCreateAPIView.as_view(), name="anonymous-session-list-create"),
]
