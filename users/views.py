from rest_framework import generics, status, viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User, Student, StudentUserLink, StageProgress
from .serializers import UserSerializer, RegisterSerializer, StudentSerializer, StudentUserLinkSerializer, LinkedUserSerializer
from rest_framework.permissions import IsAuthenticated
from .permissions import IsTeacherOrReadOnly, IsLinkedDoctorOrParentReadOnly
from rest_framework.decorators import action
import requests
from django.core.files.uploadedfile import InMemoryUploadedFile

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
        StageProgress.objects.create(student=student)  # Initialize progress

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
        progress.current_stage += 1
        progress.completed_stages.append(progress.current_stage - 1)
        progress.save()
        return Response({'status': 'stage advanced', 'current_stage': progress.current_stage})

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

    def post(self, request):
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
            if response.status_code == 200:
                return Response(response.json())
            else:
                return Response({"error": "ML service error", "detail": response.text}, status=response.status_code)
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