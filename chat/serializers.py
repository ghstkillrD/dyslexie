from rest_framework import serializers
from .models import ChatRoom, ChatMessage, ChatParticipant
from users.serializers import UserSerializer


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    content = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'message_type', 'content', 'file_url', 
                 'file_name', 'file_size', 'created_at', 'is_read']
    
    def get_content(self, obj):
        """Return decrypted content"""
        return obj.get_content()


class ChatParticipantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatParticipant
        fields = ['id', 'user', 'joined_at', 'last_read_at', 'is_active', 'unread_count']
    
    def get_unread_count(self, obj):
        return obj.get_unread_count()


class ChatRoomSerializer(serializers.ModelSerializer):
    participants = ChatParticipantSerializer(many=True, read_only=True)
    recent_message = serializers.SerializerMethodField()
    student_name = serializers.CharField(source='student.name', read_only=True)
    
    class Meta:
        model = ChatRoom
        fields = ['id', 'student', 'student_name', 'created_at', 'updated_at', 
                 'participants', 'recent_message']
    
    def get_recent_message(self, obj):
        """Get the most recent message in this chat room"""
        recent_msg = obj.messages.last()
        if recent_msg:
            return {
                'content': recent_msg.get_content()[:50] + '...' if len(recent_msg.get_content()) > 50 else recent_msg.get_content(),
                'sender': recent_msg.sender.username,
                'created_at': recent_msg.created_at,
                'message_type': recent_msg.message_type
            }
        return None


class CreateMessageSerializer(serializers.Serializer):
    """Serializer for creating new messages"""
    content = serializers.CharField(max_length=5000)
    message_type = serializers.ChoiceField(choices=ChatMessage.MESSAGE_TYPES, default='text')
    file_url = serializers.URLField(required=False, allow_blank=True)
    file_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    file_size = serializers.IntegerField(required=False, allow_null=True)
