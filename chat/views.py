from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import ChatRoom, ChatMessage, ChatParticipant
from .serializers import (
    ChatRoomSerializer, 
    ChatMessageSerializer, 
    ChatParticipantSerializer,
    CreateMessageSerializer
)
from users.models import Student
import cloudinary.uploader


class ChatRoomViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing chat rooms
    """
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return chat rooms where user is a participant"""
        user = self.request.user
        
        # Get all students where user is involved (as teacher, doctor, or parent)
        if user.role == 'teacher':
            student_ids = Student.objects.filter(teacher=user).values_list('student_id', flat=True)
        elif user.role == 'doctor':
            # Assuming doctor relationship exists in Student model
            student_ids = Student.objects.filter(
                Q(student_links__user=user) & Q(student_links__user__role='doctor')
            ).values_list('student_id', flat=True)
        elif user.role == 'parent':
            # Assuming parent relationship exists in Student model
            student_ids = Student.objects.filter(
                Q(student_links__user=user) & Q(student_links__user__role='parent')
            ).values_list('student_id', flat=True)
        else:
            student_ids = []
        
        return ChatRoom.objects.filter(student__student_id__in=student_ids)
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get all messages for a chat room"""
        chat_room = self.get_object()
        
        # Check if user has permission to access this chat room
        if request.user not in chat_room.get_participants():
            return Response(
                {'error': 'You do not have permission to access this chat room'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get messages with pagination
        page_size = request.query_params.get('page_size', 50)
        messages = chat_room.messages.all()[:int(page_size)]
        
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send a message to the chat room"""
        chat_room = self.get_object()
        
        # Check if user has permission to send messages
        if request.user not in chat_room.get_participants():
            return Response(
                {'error': 'You do not have permission to send messages to this chat room'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CreateMessageSerializer(data=request.data)
        if serializer.is_valid():
            # Create message
            message = ChatMessage.objects.create(
                chat_room=chat_room,
                sender=request.user,
                message_type=serializer.validated_data.get('message_type', 'text'),
                file_url=serializer.validated_data.get('file_url', ''),
                file_name=serializer.validated_data.get('file_name', ''),
                file_size=serializer.validated_data.get('file_size', None)
            )
            message.set_content(serializer.validated_data['content'])
            message.save()
            
            # Ensure sender is a participant
            ChatParticipant.objects.get_or_create(
                chat_room=chat_room,
                user=request.user
            )
            
            response_serializer = ChatMessageSerializer(message)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def upload_file(self, request, pk=None):
        """Upload a file to Cloudinary and send as message"""
        chat_room = self.get_object()
        
        # Check permissions
        if request.user not in chat_room.get_participants():
            return Response(
                {'error': 'You do not have permission to upload files to this chat room'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        
        # Validate file size (max 10MB)
        if file.size > 10 * 1024 * 1024:  # 10MB
            return Response(
                {'error': 'File size exceeds 10MB limit'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Upload to Cloudinary
            upload_result = cloudinary.uploader.upload(
                file,
                folder="dyslexie/chat",
                resource_type="auto"  # Auto-detect file type
            )
            
            # Determine message type based on file
            file_type = 'image' if upload_result.get('resource_type') == 'image' else 'file'
            
            # Create message with file
            message = ChatMessage.objects.create(
                chat_room=chat_room,
                sender=request.user,
                message_type=file_type,
                file_url=upload_result['secure_url'],
                file_name=file.name,
                file_size=file.size
            )
            
            # Set content as file description
            content = f"Shared {file_type}: {file.name}"
            message.set_content(content)
            message.save()
            
            response_serializer = ChatMessageSerializer(message)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'File upload failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark messages as read for the current user"""
        chat_room = self.get_object()
        
        # Check permissions
        if request.user not in chat_room.get_participants():
            return Response(
                {'error': 'You do not have permission to access this chat room'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update participant's last read timestamp
        participant, created = ChatParticipant.objects.get_or_create(
            chat_room=chat_room,
            user=request.user
        )
        participant.save()  # This updates last_read_at due to auto_now
        
        return Response({'status': 'Messages marked as read'}, status=status.HTTP_200_OK)


class StudentChatViewSet(viewsets.ViewSet):
    """
    ViewSet for student-specific chat operations
    """
    permission_classes = [IsAuthenticated]
    
    def retrieve(self, request, pk=None):
        """Get or create chat room for a specific student"""
        student = get_object_or_404(Student, pk=pk)
        
        # Check if user has permission to access this student's chat
        if request.user.role == 'teacher' and student.teacher != request.user:
            return Response(
                {'error': 'You can only access chats for your own students'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # For doctor and parent, check if they're linked to this student
        if request.user.role in ['doctor', 'parent']:
            is_linked = student.student_links.filter(user=request.user).exists()
            if not is_linked:
                return Response(
                    {'error': 'You do not have access to this student'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Get or create chat room
        chat_room, created = ChatRoom.objects.get_or_create(student=student)
        
        # Ensure current user is a participant
        ChatParticipant.objects.get_or_create(
            chat_room=chat_room,
            user=request.user
        )
        
        # If this is a newly created chat room, add all eligible participants
        if created:
            # Add teacher as participant
            if student.teacher:
                ChatParticipant.objects.get_or_create(
                    chat_room=chat_room,
                    user=student.teacher
                )
            
            # Add all linked doctors and parents as participants
            for link in student.student_links.all():
                ChatParticipant.objects.get_or_create(
                    chat_room=chat_room,
                    user=link.user
                )
        
        serializer = ChatRoomSerializer(chat_room)
        return Response(serializer.data)
