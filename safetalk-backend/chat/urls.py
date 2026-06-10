from django.urls import path

from .views import (
    ChatRoomDetailAPIView,
    ChatRoomListAPIView,
    MessageListCreateAPIView,
)


urlpatterns = [
    path("rooms/", ChatRoomListAPIView.as_view(), name="chat-room-list"),
    path("rooms/<int:pk>/", ChatRoomDetailAPIView.as_view(), name="chat-room-detail"),
    path("rooms/<int:pk>/messages/", MessageListCreateAPIView.as_view(), name="chat-room-messages"),
]
