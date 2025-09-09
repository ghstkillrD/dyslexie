from django.urls import path, include
from .views import (UserListCreateView, RegisterView, ProfileView, PasswordChangeView, AccountDeleteView,
                   StudentViewSet, StudentUserLinkViewSet, 
                   AnalyzeHandwritingView, EvaluateTasksView, FinalDiagnosisView, MyTokenObtainPairView,
                   MyTokenRefreshView, TokenValidateView, ExtendSessionView,
                   get_student_activities_for_tracking, record_activity_progress, 
                   get_activity_progress_history, update_activity_progress,
                   get_comprehensive_student_data, final_evaluation_view, 
                   complete_final_evaluation, get_evaluation_summary,
                   terminate_therapy_session, restart_therapy_from_stage5,
                   get_therapy_session_reports, get_detailed_therapy_report,
                   stakeholder_recommendations_view, get_all_stakeholder_recommendations)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='students')
router.register(r'student-links', StudentUserLinkViewSet, basename='student-links')

urlpatterns = [
    path('', UserListCreateView.as_view(), name='user-list-create'),
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('profile/change-password/', PasswordChangeView.as_view(), name='change-password'),
    path('profile/delete-account/', AccountDeleteView.as_view(), name='delete-account'),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', MyTokenRefreshView.as_view(), name='token_refresh'),
    path('token/validate/', TokenValidateView.as_view(), name='token_validate'),
    path('token/extend/', ExtendSessionView.as_view(), name='extend_session'),
    path('', include(router.urls)),
    path('students/<int:student_id>/analyze-handwriting/', AnalyzeHandwritingView.as_view(), name='analyze-handwriting'),
    path('evaluate-tasks/', EvaluateTasksView.as_view(), name='evaluate-tasks'),
    path('final-diagnosis/', FinalDiagnosisView.as_view(), name='final-diagnosis'),
    
    # Stage 6: Activity Tracking URLs
    path('students/<int:student_id>/activities/tracking/', get_student_activities_for_tracking, name='student-activities-tracking'),
    path('students/<int:student_id>/activities/progress/', record_activity_progress, name='record-activity-progress'),
    path('students/<int:student_id>/activities/<int:activity_id>/history/', get_activity_progress_history, name='activity-progress-history'),
    path('activities/progress/<int:progress_id>/', update_activity_progress, name='update-activity-progress'),
    
    # Stage 7: Final Evaluation URLs
    path('students/<int:student_id>/comprehensive-data/', get_comprehensive_student_data, name='comprehensive-student-data'),
    path('students/<int:student_id>/final-evaluation/', final_evaluation_view, name='final-evaluation'),
    path('students/<int:student_id>/complete-evaluation/', complete_final_evaluation, name='complete-final-evaluation'),
    path('students/<int:student_id>/evaluation-summary/', get_evaluation_summary, name='evaluation-summary'),
    
    # Therapy Session Management URLs
    path('students/<int:student_id>/terminate-therapy/', terminate_therapy_session, name='terminate-therapy'),
    path('students/<int:student_id>/restart-therapy/', restart_therapy_from_stage5, name='restart-therapy'),
    
    # Therapy Session Reports URLs
    path('students/<int:student_id>/therapy-reports/', get_therapy_session_reports, name='therapy-reports'),
    path('students/<int:student_id>/therapy-reports/<int:session_number>/', get_detailed_therapy_report, name='detailed-therapy-report'),
    
    # Stakeholder Recommendations URLs
    path('students/<int:student_id>/stakeholder-recommendations/', stakeholder_recommendations_view, name='stakeholder-recommendations'),
    path('students/<int:student_id>/all-stakeholder-recommendations/', get_all_stakeholder_recommendations, name='all-stakeholder-recommendations'),
]
