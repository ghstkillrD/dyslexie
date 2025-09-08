from rest_framework import generics, status, viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from .models import User, Student, StudentUserLink, StageProgress, HandwritingSample, StudentTask, AssessmentSummary, ActivityAssignment, ActivityProgress, FinalEvaluation, TherapySessionReport, StakeholderRecommendation
from .serializers import UserSerializer, RegisterSerializer, StudentSerializer, StudentUserLinkSerializer, LinkedUserSerializer, MyTokenObtainPairSerializer, HandwritingSampleSerializer, StudentTaskSerializer, AssessmentSummarySerializer, ActivityAssignmentSerializer, ActivityProgressSerializer, ActivityProgressCreateSerializer, FinalEvaluationSerializer, FinalEvaluationCreateSerializer, StakeholderRecommendationSerializer, StakeholderRecommendationCreateSerializer
from rest_framework.permissions import IsAuthenticated
from .permissions import IsTeacherOrReadOnly, IsLinkedDoctorOrParentReadOnly
from rest_framework.decorators import action
import requests
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from datetime import datetime, timezone
from django.utils import timezone as django_timezone

class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered successfully."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated, IsTeacherOrReadOnly | IsLinkedDoctorOrParentReadOnly]

    def perform_create(self, serializer):
        # Automatically set teacher as logged-in user
        student = serializer.save(teacher=self.request.user)
        StageProgress.objects.get_or_create(student=student, defaults={'current_stage': 1})  # Initialize progress

    def get_queryset(self):
        user = self.request.user
        if user.role == 'teacher':
            return Student.objects.filter(teacher=user)
        elif user.role in ['doctor', 'parent']:
            return Student.objects.filter(student_links__user=user)
        return Student.objects.none()
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def linked_users(self, request, pk=None):
        student = self.get_object()
        links = StudentUserLink.objects.filter(student=student)
        users = [link.user for link in links]
        serializer = LinkedUserSerializer(users, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unlink_user(self, request, pk=None):
        student = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response({'error': 'user_id is required'}, status=400)

        try:
            link = StudentUserLink.objects.get(student=student, user_id=user_id)
        except StudentUserLink.DoesNotExist:
            return Response({'error': 'Link does not exist'}, status=404)

        # Prevent unlinking the teacher who owns the student
        if link.user == student.teacher:
            return Response({'error': 'Cannot unlink the teacher who owns the student'}, status=403)

        link.delete()
        return Response({'success': 'User unlinked successfully'})
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def complete_stage(self, request, pk=None):
        student = self.get_object()
        progress = StageProgress.objects.get(student=student)
        user = request.user

        current_stage = progress.current_stage

        # Role-based access control per stage
        stage_roles = {
            1: 'teacher',
            2: 'doctor',
            3: 'teacher',
            4: 'doctor',
            5: 'doctor',
            6: ['teacher', 'parent'],  # multiple roles allowed
            7: 'doctor'
        }

        allowed_roles = stage_roles.get(current_stage)
        if isinstance(allowed_roles, list):
            if user.role not in allowed_roles:
                return Response({"error": "You are not allowed to complete this stage."}, status=403)
        else:
            if user.role != allowed_roles:
                return Response({"error": "You are not allowed to complete this stage."}, status=403)

        # Prevent re-completion of the same stage
        if current_stage in progress.completed_stages:
            return Response({"error": "This stage has already been completed."}, status=400)

        # Mark current stage as completed
        progress.completed_stages.append(current_stage)

        # Advance to next stage (if not already at Stage 7)
        if current_stage < 7:
            progress.current_stage += 1

        progress.save()

        return Response({
            'status': 'stage completed',
            'current_stage': progress.current_stage,
            'completed_stages': progress.completed_stages
        }, status=200)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_tasks(self, request, pk=None):
        """
        Stage 2: Doctor defines tasks and max score
        """
        student = self.get_object()

        # Only allow doctor linked to student
        if request.user.role != 'doctor':
            return Response({"error": "Only doctors can define tasks."}, status=403)

        tasks_data = request.data.get('tasks', [])
        if not tasks_data:
            return Response({"error": "No tasks provided."}, status=400)

        created_tasks = []
        for task in tasks_data:
            serializer = StudentTaskSerializer(data=task)
            if serializer.is_valid():
                serializer.save(student=student)
                created_tasks.append(serializer.data)
            else:
                return Response(serializer.errors, status=400)

        return Response({"message": "Tasks added", "tasks": created_tasks}, status=201)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def get_tasks(self, request, pk=None):
        """
        Get all tasks for a student
        """
        student = self.get_object()
        tasks = student.tasks.all()
        serializer = StudentTaskSerializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def score_tasks(self, request, pk=None):
        """
        Stage 3: Teacher assigns scores to tasks
        """
        student = self.get_object()

        # Only allow teacher who owns the student
        if request.user.role != 'teacher' or student.teacher != request.user:
            return Response({"error": "Only the assigned teacher can score tasks."}, status=403)

        task_scores = request.data.get('task_scores', [])
        if not task_scores:
            return Response({"error": "No task scores provided."}, status=400)

        updated_tasks = []
        for score_data in task_scores:
            task_id = score_data.get('task_id')
            score = score_data.get('score')
            
            try:
                task = student.tasks.get(id=task_id)
                
                # Validate score is within max_score
                if score < 0 or score > task.max_score:
                    return Response({
                        "error": f"Score {score} for task '{task.task_name}' must be between 0 and {task.max_score}"
                    }, status=400)
                
                task.score_obtained = score
                task.save()
                updated_tasks.append(StudentTaskSerializer(task).data)
                
            except student.tasks.model.DoesNotExist:
                return Response({"error": f"Task with id {task_id} not found for this student."}, status=404)

        return Response({"message": "Task scores updated", "tasks": updated_tasks}, status=200)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def get_assessment_summary(self, request, pk=None):
        """
        Get assessment summary for a student (if exists)
        """
        student = self.get_object()
        
        try:
            summary = student.assessment_summary
            serializer = AssessmentSummarySerializer(summary)
            return Response(serializer.data)
        except AssessmentSummary.DoesNotExist:
            return Response({"message": "No assessment summary found"}, status=404)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def create_assessment_summary(self, request, pk=None):
        """
        Stage 4: Doctor creates assessment summary and sets cutoffs
        """
        student = self.get_object()

        # Only allow doctors linked to the student
        if request.user.role != 'doctor':
            return Response({"error": "Only doctors can create assessment summaries."}, status=403)

        # Check if doctor is linked to this student
        if not StudentUserLink.objects.filter(student=student, user=request.user, role='doctor').exists():
            return Response({"error": "You are not assigned to this student."}, status=403)

        # Get task scores from Stage 3
        tasks = student.tasks.all()
        if not tasks.exists():
            return Response({"error": "No tasks found for this student."}, status=400)

        # Check if all tasks have been scored
        unscored_tasks = tasks.filter(score_obtained__isnull=True)
        if unscored_tasks.exists():
            return Response({"error": "Not all tasks have been scored yet."}, status=400)

        # Calculate totals
        total_score = sum(task.score_obtained for task in tasks if task.score_obtained is not None)
        total_max_score = sum(task.max_score for task in tasks)
        percentage_score = (total_score / total_max_score) * 100 if total_max_score > 0 else 0

        # Get cutoff and analysis from request
        cutoff_percentage = request.data.get('cutoff_percentage')
        summary_notes = request.data.get('summary_notes', '')
        recommendations = request.data.get('recommendations', '')

        if cutoff_percentage is None:
            return Response({"error": "Cutoff percentage is required."}, status=400)

        try:
            cutoff_percentage = float(cutoff_percentage)
        except ValueError:
            return Response({"error": "Invalid cutoff percentage."}, status=400)

        # Determine risk level and dyslexia indication
        dyslexia_indication = percentage_score < cutoff_percentage
        
        if percentage_score >= cutoff_percentage:
            risk_level = 'low'
        elif percentage_score >= (cutoff_percentage - 10):
            risk_level = 'medium'
        else:
            risk_level = 'high'

        # Create or update assessment summary
        summary, created = AssessmentSummary.objects.update_or_create(
            student=student,
            defaults={
                'doctor': request.user,
                'cutoff_percentage': cutoff_percentage,
                'total_score': total_score,
                'total_max_score': total_max_score,
                'percentage_score': percentage_score,
                'risk_level': risk_level,
                'dyslexia_indication': dyslexia_indication,
                'summary_notes': summary_notes,
                'recommendations': recommendations,
            }
        )

        serializer = AssessmentSummarySerializer(summary)
        status_message = "Assessment summary created" if created else "Assessment summary updated"
        
        return Response({
            "message": status_message,
            "assessment_summary": serializer.data
        }, status=201 if created else 200)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def get_activity_assignments(self, request, pk=None):
        """
        Get all activity assignments for a student
        """
        student = self.get_object()
        activities = student.activity_assignments.all()
        serializer = ActivityAssignmentSerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def assign_activities(self, request, pk=None):
        """
        Stage 5: Doctor assigns therapeutic activities to a student
        """
        student = self.get_object()

        # Only allow doctors linked to the student
        if request.user.role != 'doctor':
            return Response({"error": "Only doctors can assign activities."}, status=403)

        # Check if doctor is linked to this student
        if not StudentUserLink.objects.filter(student=student, user=request.user, role='doctor').exists():
            return Response({"error": "You are not assigned to this student."}, status=403)

        # Check if Stage 4 is completed (assessment summary exists)
        try:
            assessment_summary = student.assessment_summary
        except AssessmentSummary.DoesNotExist:
            return Response({"error": "Stage 4 must be completed before assigning activities."}, status=400)

        activities_data = request.data.get('activities', [])
        if not activities_data:
            return Response({"error": "No activities provided."}, status=400)

        created_activities = []
        for activity_data in activities_data:
            # Add student and doctor to the activity data
            activity_data['student'] = student.pk
            activity_data['doctor'] = request.user.pk
            
            serializer = ActivityAssignmentSerializer(data=activity_data)
            if serializer.is_valid():
                activity = serializer.save(student=student, doctor=request.user)
                created_activities.append(ActivityAssignmentSerializer(activity).data)
            else:
                return Response({
                    "error": f"Invalid activity data: {serializer.errors}"
                }, status=400)

        return Response({
            "message": f"Successfully assigned {len(created_activities)} activities",
            "activities": created_activities
        }, status=201)

    @action(detail=True, methods=['put'], permission_classes=[permissions.IsAuthenticated])
    def update_activity(self, request, pk=None):
        """
        Update a specific activity assignment
        """
        student = self.get_object()
        activity_id = request.data.get('activity_id')
        
        if not activity_id:
            return Response({"error": "Activity ID is required."}, status=400)

        try:
            activity = student.activity_assignments.get(id=activity_id)
        except ActivityAssignment.DoesNotExist:
            return Response({"error": "Activity not found."}, status=404)

        # Only allow the doctor who assigned the activity to update it
        if request.user != activity.doctor:
            return Response({"error": "You can only update activities you assigned."}, status=403)

        serializer = ActivityAssignmentSerializer(activity, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Activity updated successfully",
                "activity": serializer.data
            })
        return Response(serializer.errors, status=400)


# Stage 6: Activity Tracking Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_activities_for_tracking(request, student_id):
    """
    Get activities assigned to a student for tracking (Stage 6)
    Accessible by teachers and parents
    """
    try:
        student = Student.objects.get(student_id=student_id)
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)

    # Check if user has access to this student
    user_role = request.user.role
    has_access = False
    
    if user_role == 'teacher':
        has_access = student.teacher == request.user
    elif user_role == 'parent':
        has_access = StudentUserLink.objects.filter(student=student, user=request.user).exists()
    elif user_role == 'doctor':
        # Doctors can view activities they assigned to the student
        has_access = ActivityAssignment.objects.filter(student=student, doctor=request.user).exists()
    
    if not has_access:
        return Response({"error": "You don't have access to this student"}, status=403)

    # Get active activities for this student
    activities = student.activity_assignments.filter(is_active=True)
    
    # If user is a doctor, only show activities they assigned
    if user_role == 'doctor':
        activities = activities.filter(doctor=request.user)
    
    # Get progress records for each activity
    activities_with_progress = []
    for activity in activities:
        progress_records = ActivityProgress.objects.filter(activity_assignment=activity)
        activity_data = ActivityAssignmentSerializer(activity).data
        activity_data['progress_records'] = ActivityProgressSerializer(progress_records, many=True).data
        activity_data['total_sessions'] = progress_records.count()
        activity_data['completed_sessions'] = progress_records.filter(status='completed').count()
        activities_with_progress.append(activity_data)

    return Response({
        "student": StudentSerializer(student).data,
        "activities": activities_with_progress
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_activity_progress(request, student_id):
    """
    Record progress for an activity session (Stage 6)
    Accessible by teachers and parents
    """
    try:
        student = Student.objects.get(student_id=student_id)
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)

    # Check if user has access to this student
    user_role = request.user.role
    has_access = False
    
    if user_role == 'teacher':
        has_access = student.teacher == request.user
        performer = 'teacher'
    elif user_role == 'parent':
        has_access = StudentUserLink.objects.filter(student=student, user=request.user).exists()
        performer = 'parent'
    else:
        return Response({"error": "Only teachers and parents can record activity progress"}, status=403)
    
    if not has_access:
        return Response({"error": "You don't have access to this student"}, status=403)

    # Validate activity assignment exists
    activity_id = request.data.get('activity_assignment')
    try:
        activity = ActivityAssignment.objects.get(id=activity_id, student=student)
    except ActivityAssignment.DoesNotExist:
        return Response({"error": "Activity assignment not found"}, status=404)

    # Prepare data with performer and recorder
    progress_data = request.data.copy()
    progress_data['performer'] = performer

    serializer = ActivityProgressCreateSerializer(data=progress_data)
    if serializer.is_valid():
        progress = serializer.save(recorder=request.user)
        
        return Response({
            "message": "Activity progress recorded successfully",
            "progress": ActivityProgressSerializer(progress).data
        }, status=201)
    
    return Response(serializer.errors, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_activity_progress_history(request, student_id, activity_id):
    """
    Get progress history for a specific activity
    """
    try:
        student = Student.objects.get(student_id=student_id)
        activity = ActivityAssignment.objects.get(id=activity_id, student=student)
    except (Student.DoesNotExist, ActivityAssignment.DoesNotExist):
        return Response({"error": "Student or activity not found"}, status=404)

    # Check access permissions
    user_role = request.user.role
    has_access = False
    
    if user_role == 'teacher':
        has_access = student.teacher == request.user
    elif user_role == 'parent':
        has_access = StudentUserLink.objects.filter(student=student, user=request.user).exists()
    elif user_role == 'doctor':
        has_access = activity.doctor == request.user
    
    if not has_access:
        return Response({"error": "You don't have access to this activity"}, status=403)

    progress_records = ActivityProgress.objects.filter(activity_assignment=activity)
    
    return Response({
        "activity": ActivityAssignmentSerializer(activity).data,
        "progress_history": ActivityProgressSerializer(progress_records, many=True).data
    })


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_activity_progress(request, progress_id):
    """
    Update an existing activity progress record
    """
    try:
        progress = ActivityProgress.objects.get(id=progress_id)
    except ActivityProgress.DoesNotExist:
        return Response({"error": "Progress record not found"}, status=404)

    # Only allow the recorder to update their own records
    if request.user != progress.recorder:
        return Response({"error": "You can only update your own progress records"}, status=403)

    serializer = ActivityProgressCreateSerializer(progress, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        updated_progress = ActivityProgress.objects.get(id=progress_id)
        return Response({
            "message": "Progress record updated successfully",
            "progress": ActivityProgressSerializer(updated_progress).data
        })
    
    return Response(serializer.errors, status=400)


class StudentUserLinkViewSet(viewsets.ModelViewSet):
    queryset = StudentUserLink.objects.all()
    serializer_class = StudentUserLinkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'teacher':
            # Show only links for students taught by this teacher
            return StudentUserLink.objects.filter(student__teacher=user)
        elif user.role in ['doctor', 'parent']:
            return StudentUserLink.objects.filter(user=user)
        return StudentUserLink.objects.none()

class AnalyzeHandwritingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, student_id):
        student = get_object_or_404(Student, pk=student_id)

        image = request.FILES.get('image')
        if not image:
            return Response({"error": "No image uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(image, InMemoryUploadedFile):
            return Response({"error": "Invalid file format"}, status=status.HTTP_400_BAD_REQUEST)

        # Prepare request for FastAPI
        try:
            # Read the file content safely
            image_data = image.read()
            files = {'image': (image.name, image_data, image.content_type)}
            
            # Send the request to the FastAPI service
            response = requests.post('http://localhost:8001/analyze-handwriting/', files=files)

            if response.status_code != 200:
                return Response({"error": "ML service error", "detail": response.text}, status=response.status_code)

            data = response.json()

            # Save to DB
            sample = HandwritingSample.objects.create(
                student=student,
                image=image,
                dyslexia_score=data.get('dyslexia_score'),
                interpretation=data.get('interpretation'),
                letter_counts=data.get('letter_counts'),
            )

            return Response(HandwritingSampleSerializer(sample).data, status=status.HTTP_201_CREATED)
        
        except requests.exceptions.RequestException as e:
            return Response({"error": "ML service unreachable", "detail": str(e)}, status=500)

class EvaluateTasksView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            response = requests.post(
                'http://localhost:8001/evaluate-tasks/',
                json=request.data
            )
            return Response(response.json(), status=response.status_code)
        except requests.exceptions.RequestException as e:
            return Response(
                {"error": "FastAPI service unreachable", "detail": str(e)},
                status=500
            )

class FinalDiagnosisView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            response = requests.post(
                'http://localhost:8001/final-diagnosis/',
                json=request.data
            )
            return Response(response.json(), status=response.status_code)
        except requests.exceptions.RequestException as e:
            return Response(
                {"error": "FastAPI service unreachable", "detail": str(e)},
                status=500
            )

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class MyTokenRefreshView(TokenRefreshView):
    """
    Custom token refresh view that provides additional token information
    """
    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
            if response.status_code == 200:
                # Add additional info to response
                response.data['refreshed_at'] = datetime.now(timezone.utc).isoformat()
                response.data['message'] = 'Token refreshed successfully'
            return response
        except (InvalidToken, TokenError) as e:
            return Response(
                {'error': 'Invalid refresh token', 'detail': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )

class TokenValidateView(APIView):
    """
    Validate if the current token is still valid and return time until expiration
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get token from request
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if not auth_header.startswith('Bearer '):
                return Response({'error': 'No valid token provided'}, status=400)
            
            token = auth_header.split(' ')[1]
            from rest_framework_simplejwt.tokens import AccessToken
            
            # Validate token
            access_token = AccessToken(token)
            
            # Get expiration time
            exp_timestamp = access_token['exp']
            exp_datetime = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
            current_time = datetime.now(timezone.utc)
            
            # Calculate time until expiration
            time_until_expiry = exp_datetime - current_time
            minutes_until_expiry = int(time_until_expiry.total_seconds() / 60)
            
            return Response({
                'valid': True,
                'expires_at': exp_datetime.isoformat(),
                'minutes_until_expiry': minutes_until_expiry,
                'user_id': access_token['user_id'],
                'current_time': current_time.isoformat()
            })
            
        except Exception as e:
            return Response({
                'valid': False,
                'error': 'Token validation failed',
                'detail': str(e)
            }, status=401)

class ExtendSessionView(APIView):
    """
    Extend the current session by issuing a new access token
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Get refresh token from request body
            refresh_token = request.data.get('refresh_token')
            if not refresh_token:
                return Response({'error': 'Refresh token required'}, status=400)
            
            # Create new tokens
            refresh = RefreshToken(refresh_token)
            new_access_token = refresh.access_token
            
            # Update user's last login
            request.user.last_login = datetime.now(timezone.utc)
            request.user.save(update_fields=['last_login'])
            
            return Response({
                'access_token': str(new_access_token),
                'message': 'Session extended successfully',
                'extended_at': datetime.now(timezone.utc).isoformat()
            })
            
        except Exception as e:
            return Response({
                'error': 'Failed to extend session',
                'detail': str(e)
            }, status=400)


# Stage 7: Final Evaluation Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_comprehensive_student_data(request, student_id):
    """
    Get comprehensive data for Stage 7 final evaluation
    Only accessible by doctors
    """
    if request.user.role != 'doctor':
        return Response({"error": "Only doctors can access comprehensive evaluation data"}, status=403)
    
    try:
        student = Student.objects.get(student_id=student_id)
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)

    # Check if doctor has access to this student
    if not ActivityAssignment.objects.filter(student=student, doctor=request.user).exists():
        return Response({"error": "You don't have access to this student"}, status=403)

    # Gather comprehensive data from all stages
    data = {
        'student': StudentSerializer(student).data,
        'handwriting_analysis': [],
        'task_performance': {},
        'assessment_summary': {},
        'activity_assignments': [],
        'activity_progress': []
    }

    # Stage 1 & 2: Handwriting Analysis
    handwriting_samples = student.handwriting_samples.all()
    data['handwriting_analysis'] = HandwritingSampleSerializer(handwriting_samples, many=True).data

    # Stage 3: Task Performance
    tasks = student.tasks.all()
    data['task_performance'] = {
        'tasks': StudentTaskSerializer(tasks, many=True).data,
        'total_tasks': tasks.count(),
        'completed_tasks': tasks.filter(score_obtained__isnull=False).count()
    }

    # Stage 4: Assessment Summary
    try:
        assessment = student.assessment_summary
        data['assessment_summary'] = AssessmentSummarySerializer(assessment).data
    except AssessmentSummary.DoesNotExist:
        data['assessment_summary'] = None

    # Stage 5: Activity Assignments
    activities = student.activity_assignments.filter(doctor=request.user)
    data['activity_assignments'] = ActivityAssignmentSerializer(activities, many=True).data

    # Stage 6: Activity Progress
    progress_records = ActivityProgress.objects.filter(
        activity_assignment__student=student,
        activity_assignment__doctor=request.user
    )
    data['activity_progress'] = ActivityProgressSerializer(progress_records, many=True).data

    return Response(data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def final_evaluation_view(request, student_id):
    """
    Handle final evaluation for Stage 7
    GET: Retrieve existing evaluation
    POST: Create or update evaluation
    """
    if request.user.role != 'doctor':
        return Response({"error": "Only doctors can perform final evaluations"}, status=403)
    
    try:
        student = Student.objects.get(student_id=student_id)
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)

    # Check if doctor has access to this student
    if not ActivityAssignment.objects.filter(student=student, doctor=request.user).exists():
        return Response({"error": "You don't have access to this student"}, status=403)

    if request.method == 'GET':
        try:
            evaluation = student.final_evaluation
            return Response(FinalEvaluationSerializer(evaluation).data)
        except FinalEvaluation.DoesNotExist:
            return Response({"message": "No final evaluation found"}, status=404)
    
    elif request.method == 'POST':
        try:
            evaluation = student.final_evaluation
            serializer = FinalEvaluationCreateSerializer(evaluation, data=request.data, partial=True)
        except FinalEvaluation.DoesNotExist:
            serializer = FinalEvaluationCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            evaluation = serializer.save(student=student, doctor=request.user)
            
            return Response({
                "message": "Final evaluation saved successfully",
                "evaluation": FinalEvaluationSerializer(evaluation).data
            }, status=201)
        
        return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_final_evaluation(request, student_id):
    """
    Mark the final evaluation as complete and close the case
    """
    if request.user.role != 'doctor':
        return Response({"error": "Only doctors can complete final evaluations"}, status=403)
    
    try:
        student = Student.objects.get(student_id=student_id)
        evaluation = student.final_evaluation
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)
    except FinalEvaluation.DoesNotExist:
        return Response({"error": "Final evaluation not found. Please create the evaluation first."}, status=404)

    # Check if doctor has access to this student
    if evaluation.doctor != request.user:
        return Response({"error": "You can only complete evaluations you created"}, status=403)

    if evaluation.case_completed:
        return Response({"error": "This case has already been completed"}, status=400)

    # Mark evaluation as complete
    evaluation.mark_case_complete()
    
    return Response({
        "message": "Final evaluation completed successfully. Case is now closed.",
        "completion_date": evaluation.completion_date,
        "evaluation": FinalEvaluationSerializer(evaluation).data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_evaluation_summary(request, student_id):
    """
    Get a summary view of the final evaluation for all stakeholders
    """
    try:
        student = Student.objects.get(student_id=student_id)
        evaluation = student.final_evaluation
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)
    except FinalEvaluation.DoesNotExist:
        return Response({"error": "Final evaluation not completed yet"}, status=404)

    # Check access permissions
    user_role = request.user.role
    has_access = False
    
    if user_role == 'teacher':
        has_access = student.teacher == request.user
    elif user_role == 'parent':
        has_access = StudentUserLink.objects.filter(student=student, user=request.user).exists()
    elif user_role == 'doctor':
        has_access = evaluation.doctor == request.user
    
    if not has_access:
        return Response({"error": "You don't have access to this evaluation"}, status=403)

    # Return appropriate data based on user role
    if user_role == 'doctor':
        # Full access for doctor
        return Response(FinalEvaluationSerializer(evaluation).data)
    else:
        # Limited access for teachers and parents
        summary_data = {
            'student_name': student.name,
            'final_diagnosis': evaluation.final_diagnosis,
            'intervention_priority': evaluation.intervention_priority,
            'short_term_goals': evaluation.short_term_goals,
            'long_term_goals': evaluation.long_term_goals,
            'follow_up_timeline': evaluation.follow_up_timeline,
            'case_completed': evaluation.case_completed,
            'completion_date': evaluation.completion_date
        }
        
        # Get stakeholder recommendations for this user
        try:
            # Get the most recent recommendation for the current therapy session
            user_recommendation = StakeholderRecommendation.objects.filter(
                student__student_id=student_id,
                stakeholder=request.user,
                therapy_session_number=evaluation.therapy_session_number
            ).order_by('-submitted_at').first()
            
            if user_recommendation:
                summary_data['my_recommendation'] = StakeholderRecommendationSerializer(user_recommendation).data
            else:
                summary_data['my_recommendation'] = None
        except Exception:
            summary_data['my_recommendation'] = None
            
        return Response(summary_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def terminate_therapy_session(request, student_id):
    """
    Terminate therapy session - mark student as cured
    Only accessible by doctors
    """
    if request.user.role != 'doctor':
        return Response({"error": "Only doctors can terminate therapy sessions"}, status=403)
    
    try:
        student = Student.objects.get(student_id=student_id)
        evaluation = student.final_evaluation
        
        # Check if doctor has access to this student
        if not StudentUserLink.objects.filter(student=student, user=request.user).exists():
            return Response({"error": "You don't have access to this student"}, status=403)
        
        # Get termination reason from request
        termination_reason = request.data.get('termination_reason', 'Student has been successfully treated and no longer requires therapy')
        
        # Create therapy session report before terminating
        from .models import TherapySessionReport
        report = TherapySessionReport.create_report_from_current_data(student)
        report.session_outcome = 'terminated'
        report.session_end_date = django_timezone.now()
        report.save()
        
        # Terminate therapy
        evaluation.terminate_therapy(termination_reason)
        
        return Response({
            "message": "Therapy session terminated successfully",
            "student_name": student.name,
            "session_number": report.session_number,
            "termination_reason": termination_reason,
            "completion_date": evaluation.completion_date
        })
        
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def restart_therapy_from_stage5(request, student_id):
    """
    Restart therapy from Stage 5 - re-assign new activities
    Only accessible by doctors
    """
    if request.user.role != 'doctor':
        return Response({"error": "Only doctors can restart therapy sessions"}, status=403)
    
    try:
        student = Student.objects.get(student_id=student_id)
        evaluation = student.final_evaluation
        
        # Check if doctor has access to this student
        if not StudentUserLink.objects.filter(student=student, user=request.user).exists():
            return Response({"error": "You don't have access to this student"}, status=403)
        
        # Create therapy session report before restarting
        from .models import TherapySessionReport
        report = TherapySessionReport.create_report_from_current_data(student)
        report.session_outcome = 'continued'
        report.session_end_date = django_timezone.now()
        report.save()
        
        # Clear current activity assignments and progress for new session
        student.activity_assignments.all().delete()
        ActivityProgress.objects.filter(activity_assignment__student=student).delete()
        
        # Increment therapy session number
        evaluation.therapy_session_number += 1
        
        # Restart therapy from Stage 5
        stage_progress = evaluation.restart_therapy_from_stage5()
        
        return Response({
            "message": "Therapy session restarted successfully",
            "student_name": student.name,
            "new_session_number": evaluation.therapy_session_number,
            "current_stage": stage_progress.current_stage,
            "completed_stages": stage_progress.completed_stages,
            "previous_session_report_id": report.id
        })
        
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)
    except Exception as e:
        import traceback
        print(f"Error in restart_therapy_from_stage5: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return Response({"error": f"Internal error: {str(e)}"}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_therapy_session_reports(request, student_id):
    """
    Get all therapy session reports for a student
    Accessible by teachers, parents, and doctors with appropriate access
    """
    try:
        student = Student.objects.get(student_id=student_id)
        
        # Check access permissions
        user_role = request.user.role
        has_access = False
        
        if user_role == 'teacher':
            has_access = student.teacher == request.user
        elif user_role in ['parent', 'doctor']:
            has_access = StudentUserLink.objects.filter(student=student, user=request.user).exists()
        
        if not has_access:
            return Response({"error": "You don't have access to this student's reports"}, status=403)
        
        # Get all therapy session reports
        from .models import TherapySessionReport
        reports = TherapySessionReport.objects.filter(student=student).order_by('-session_number')
        
        reports_data = []
        for report in reports:
            report_data = {
                'session_number': report.session_number,
                'session_start_date': report.session_start_date,
                'session_end_date': report.session_end_date,
                'session_outcome': report.session_outcome,
                'created_at': report.created_at,
            }
            
            # Add appropriate data based on user role
            if user_role == 'doctor':
                # Full access for doctors
                report_data.update({
                    'activity_assignments_data': report.activity_assignments_data,
                    'activity_progress_data': report.activity_progress_data,
                    'final_evaluation_data': report.final_evaluation_data,
                })
            else:
                # Limited access for teachers and parents
                if report.final_evaluation_data:
                    eval_data = report.final_evaluation_data
                    report_data['diagnosis'] = eval_data.get('final_diagnosis', 'Not available')
                    report_data['intervention_priority'] = eval_data.get('intervention_priority', 'Not available')
                    
                    if user_role == 'teacher':
                        report_data['recommendations'] = eval_data.get('teacher_recommendations', 'Not available')
                    elif user_role == 'parent':
                        report_data['recommendations'] = eval_data.get('parent_recommendations', 'Not available')
                
                # Summary of activities and progress
                report_data['total_activities'] = len(report.activity_assignments_data)
                report_data['progress_records'] = len(report.activity_progress_data)
            
            reports_data.append(report_data)
        
        return Response({
            'student_name': student.name,
            'total_sessions': len(reports_data),
            'reports': reports_data
        })
        
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_detailed_therapy_report(request, student_id, session_number):
    """
    Get detailed view of a specific therapy session report
    Accessible by teachers, parents, and doctors with appropriate access
    """
    try:
        student = Student.objects.get(student_id=student_id)
        
        # Check access permissions
        user_role = request.user.role
        has_access = False
        
        if user_role == 'teacher':
            has_access = student.teacher == request.user
        elif user_role in ['parent', 'doctor']:
            has_access = StudentUserLink.objects.filter(student=student, user=request.user).exists()
        
        if not has_access:
            return Response({"error": "You don't have access to this student's reports"}, status=403)
        
        # Get specific therapy session report
        from .models import TherapySessionReport
        report = TherapySessionReport.objects.get(student=student, session_number=session_number)
        
        response_data = {
            'student_name': student.name,
            'session_number': report.session_number,
            'session_start_date': report.session_start_date,
            'session_end_date': report.session_end_date,
            'session_outcome': report.session_outcome,
            'created_at': report.created_at,
        }
        
        # Add data based on user role
        if user_role == 'doctor':
            # Full access for doctors
            response_data.update({
                'activity_assignments': report.activity_assignments_data,
                'activity_progress': report.activity_progress_data,
                'final_evaluation': report.final_evaluation_data,
            })
        else:
            # Filtered access for teachers and parents
            if report.final_evaluation_data:
                eval_data = report.final_evaluation_data
                response_data['evaluation_summary'] = {
                    'diagnosis': eval_data.get('final_diagnosis'),
                    'intervention_priority': eval_data.get('intervention_priority'),
                    'short_term_goals': eval_data.get('short_term_goals'),
                    'long_term_goals': eval_data.get('long_term_goals'),
                    'follow_up_timeline': eval_data.get('follow_up_timeline'),
                }
                
                if user_role == 'teacher':
                    response_data['evaluation_summary']['recommendations'] = eval_data.get('teacher_recommendations')
                elif user_role == 'parent':
                    response_data['evaluation_summary']['recommendations'] = eval_data.get('parent_recommendations')
            
            # Summary of activities
            response_data['activities_summary'] = {
                'total_activities': len(report.activity_assignments_data),
                'activity_types': list(set([activity.get('activity_type', 'Unknown') for activity in report.activity_assignments_data])),
                'progress_records': len(report.activity_progress_data),
            }
        
        return Response(response_data)
        
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)
    except TherapySessionReport.DoesNotExist:
        return Response({"error": "Therapy session report not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def stakeholder_recommendations_view(request, student_id):
    """
    Get or create stakeholder recommendations for Stage 7
    Accessible by teachers and parents
    """
    try:
        student = Student.objects.get(student_id=student_id)
        
        # Check access permissions
        user_role = request.user.role
        has_access = False
        
        if user_role == 'teacher':
            has_access = student.teacher == request.user
        elif user_role == 'parent':
            has_access = StudentUserLink.objects.filter(student=student, user=request.user).exists()
        
        if not has_access:
            return Response({"error": "You don't have access to this student"}, status=403)
        
        # Get current therapy session number
        therapy_session_number = 1
        if hasattr(student, 'final_evaluation'):
            therapy_session_number = student.final_evaluation.therapy_session_number
        
        if request.method == 'GET':
            # Get existing recommendation
            try:
                recommendation = StakeholderRecommendation.objects.get(
                    student=student,
                    stakeholder=request.user,
                    therapy_session_number=therapy_session_number
                )
                return Response(StakeholderRecommendationSerializer(recommendation).data)
            except StakeholderRecommendation.DoesNotExist:
                return Response({"message": "No recommendation found"}, status=404)
        
        elif request.method == 'POST':
            # Create or update recommendation
            recommendation, created = StakeholderRecommendation.objects.get_or_create(
                student=student,
                stakeholder=request.user,
                therapy_session_number=therapy_session_number,
                defaults={
                    'stakeholder_type': user_role,
                }
            )
            
            # Update the recommendation with new data
            serializer = StakeholderRecommendationCreateSerializer(recommendation, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                
                return Response({
                    "message": "Recommendation saved successfully",
                    "recommendation": StakeholderRecommendationSerializer(recommendation).data
                })
            else:
                return Response(serializer.errors, status=400)
                
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_stakeholder_recommendations(request, student_id):
    """
    Get all stakeholder recommendations for a student (for doctors to view)
    Only accessible by doctors
    """
    if request.user.role != 'doctor':
        return Response({"error": "Only doctors can view all stakeholder recommendations"}, status=403)
    
    try:
        student = Student.objects.get(student_id=student_id)
        
        # Check if doctor has access to this student
        if not StudentUserLink.objects.filter(student=student, user=request.user).exists():
            return Response({"error": "You don't have access to this student"}, status=403)
        
        # Get current therapy session number
        therapy_session_number = 1
        if hasattr(student, 'final_evaluation'):
            therapy_session_number = student.final_evaluation.therapy_session_number
        
        # Get all recommendations for current session
        recommendations = StakeholderRecommendation.objects.filter(
            student=student,
            therapy_session_number=therapy_session_number
        ).order_by('stakeholder_type')
        
        recommendations_data = []
        for rec in recommendations:
            recommendations_data.append(StakeholderRecommendationSerializer(rec).data)
        
        return Response({
            'student_name': student.name,
            'therapy_session_number': therapy_session_number,
            'recommendations': recommendations_data,
            'total_recommendations': len(recommendations_data)
        })
        
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)