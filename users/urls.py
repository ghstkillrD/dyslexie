from django.urls import path, include
from .views import UserListCreateView, RegisterView, StudentViewSet, StudentUserLinkViewSet, AnalyzeHandwritingView
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='students')
router.register(r'student-links', StudentUserLinkViewSet, basename='student-links')

urlpatterns = [
    path('', UserListCreateView.as_view(), name='user-list-create'),
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
    path('analyze-handwriting/', AnalyzeHandwritingView.as_view(), name='analyze-handwriting'),
]
