from django.db import models
from django.contrib.auth import get_user_model
from users.models import Student
from cryptography.fernet import Fernet
from django.conf import settings
import base64

User = get_user_model()


class ChatRoom(models.Model):
    """
    Chat room for a specific student. 
    Participants include teacher, doctor, and parent(s).
    """
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='chat_room')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Encryption key for this chat room (stored encrypted)
    encryption_key = models.TextField()
    
    def save(self, *args, **kwargs):
        if not self.encryption_key:
            # Generate a new encryption key for this chat room
            key = Fernet.generate_key()
            self.encryption_key = base64.urlsafe_b64encode(key).decode()
        super().save(*args, **kwargs)
    
    def get_fernet_key(self):
        """Get the Fernet encryption object for this chat room"""
        key = base64.urlsafe_b64decode(self.encryption_key.encode())
        return Fernet(key)
    
    def get_participants(self):
        """Get all participants in this chat room"""
        participants = []
        
        # Add teacher
        if self.student.teacher:
            participants.append(self.student.teacher)
        
        # Add doctors and parents through StudentUserLink
        for link in self.student.student_links.all():
            participants.append(link.user)
            
        return participants
    
    def __str__(self):
        return f"Chat Room - {self.student.name}"


class ChatMessage(models.Model):
    """
    Individual chat message with end-to-end encryption
    """
    MESSAGE_TYPES = [
        ('text', 'Text Message'),
        ('file', 'File Share'),
        ('image', 'Image Share'),
        ('system', 'System Message'),
    ]
    
    chat_room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='text')
    
    # Encrypted content
    encrypted_content = models.TextField()
    
    # File information (if message_type is 'file' or 'image')
    file_url = models.URLField(blank=True, null=True)  # Cloudinary URL
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.IntegerField(blank=True, null=True)  # Size in bytes
    
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['created_at']
    
    def set_content(self, content):
        """Encrypt and store the message content"""
        fernet = self.chat_room.get_fernet_key()
        encrypted_content = fernet.encrypt(content.encode())
        self.encrypted_content = base64.urlsafe_b64encode(encrypted_content).decode()
    
    def get_content(self):
        """Decrypt and return the message content"""
        try:
            fernet = self.chat_room.get_fernet_key()
            encrypted_data = base64.urlsafe_b64decode(self.encrypted_content.encode())
            decrypted_content = fernet.decrypt(encrypted_data)
            return decrypted_content.decode()
        except Exception:
            return "[Message could not be decrypted]"
    
    def __str__(self):
        return f"{self.sender.username} - {self.message_type} - {self.created_at}"


class ChatParticipant(models.Model):
    """
    Track chat participants and their last read timestamp
    """
    chat_room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['chat_room', 'user']
    
    def get_unread_count(self):
        """Get count of unread messages for this participant"""
        return self.chat_room.messages.filter(
            created_at__gt=self.last_read_at,
            is_read=False
        ).exclude(sender=self.user).count()
    
    def __str__(self):
        return f"{self.user.username} in {self.chat_room.student.name}'s chat"
