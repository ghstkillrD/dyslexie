from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatRoomViewSet, StudentChatViewSet

router = DefaultRouter()
router.register(r'rooms', ChatRoomViewSet, basename='chatroom')
router.register(r'student', StudentChatViewSet, basename='student-chat')

urlpatterns = [
    path('api/chat/', include(router.urls)),
]
