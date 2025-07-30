from rest_framework import generics, status, viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User, Student, StudentUserLink, StageProgress, HandwritingSample
from .serializers import UserSerializer, RegisterSerializer, StudentSerializer, StudentUserLinkSerializer, LinkedUserSerializer, MyTokenObtainPairSerializer, HandwritingSampleSerializer, StudentTaskSerializer
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