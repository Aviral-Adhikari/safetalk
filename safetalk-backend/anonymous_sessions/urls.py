from django.urls import path

from .views import AnonymousSessionListCreateAPIView, AnonymousSessionStatusUpdateAPIView


urlpatterns = [
    path("", AnonymousSessionListCreateAPIView.as_view(), name="anonymous-session-list-create"),
    path("<int:pk>/status/", AnonymousSessionStatusUpdateAPIView.as_view(), name="anonymous-session-status-update"),
]
