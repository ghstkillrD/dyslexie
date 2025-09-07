from rest_framework import generics, status, viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User, Student, StudentUserLink, StageProgress, HandwritingSample, StudentTask, AssessmentSummary
from .serializers import UserSerializer, RegisterSerializer, StudentSerializer, StudentUserLinkSerializer, LinkedUserSerializer, MyTokenObtainPairSerializer, HandwritingSampleSerializer, StudentTaskSerializer, AssessmentSummarySerializer
from rest_framework.permissions import IsAuthenticated
from .permissions import IsTeacherOrReadOnly, IsLinkedDoctorOrParentReadOnly
from rest_framework.decorators import action
import requests
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.views import TokenObtainPairView

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