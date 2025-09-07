from django.urls import path, include
from .views import (UserListCreateView, RegisterView, StudentViewSet, StudentUserLinkViewSet, 
                   AnalyzeHandwritingView, EvaluateTasksView, FinalDiagnosisView, MyTokenObtainPairView,
                   MyTokenRefreshView, TokenValidateView, ExtendSessionView)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='students')
router.register(r'student-links', StudentUserLinkViewSet, basename='student-links')

urlpatterns = [
    path('', UserListCreateView.as_view(), name='user-list-create'),
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', MyTokenRefreshView.as_view(), name='token_refresh'),
    path('token/validate/', TokenValidateView.as_view(), name='token_validate'),
    path('token/extend/', ExtendSessionView.as_view(), name='extend_session'),
    path('', include(router.urls)),
    path('students/<int:student_id>/analyze-handwriting/', AnalyzeHandwritingView.as_view(), name='analyze-handwriting'),
    path('evaluate-tasks/', EvaluateTasksView.as_view(), name='evaluate-tasks'),
    path('final-diagnosis/', FinalDiagnosisView.as_view(), name='final-diagnosis'),
]
