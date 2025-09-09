import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import ChatRoom, ChatMessage, ChatParticipant
from .serializers import ChatMessageSerializer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Get room ID from URL
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        
        # Check if user is authenticated
        user = self.scope["user"]
        if isinstance(user, AnonymousUser):
            await self.close()
            return
        
        # Check if user has permission to access this chat room
        has_permission = await self.check_room_permission(user, self.room_id)
        if not has_permission:
            await self.close()
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Update user's last read timestamp
        await self.update_last_read(user, self.room_id)
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type', 'chat_message')
            
            if message_type == 'chat_message':
                await self.handle_chat_message(text_data_json)
            elif message_type == 'mark_read':
                await self.handle_mark_read(text_data_json)
            elif message_type == 'typing':
                await self.handle_typing(text_data_json)
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON format'
            }))
    
    async def handle_chat_message(self, data):
        content = data.get('content', '')
        message_type = data.get('message_type', 'text')
        file_url = data.get('file_url', '')
        file_name = data.get('file_name', '')
        file_size = data.get('file_size', None)
        
        user = self.scope["user"]
        
        # Save message to database
        message = await self.save_message(
            user, self.room_id, content, message_type, 
            file_url, file_name, file_size
        )
        
        if message:
            # Serialize message for sending
            message_data = await self.serialize_message(message)
            
            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message_data
                }
            )
    
    async def handle_mark_read(self, data):
        user = self.scope["user"]
        await self.update_last_read(user, self.room_id)
        
        # Notify other participants that messages have been read
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'message_read',
                'user_id': user.id,
                'username': user.username
            }
        )
    
    async def handle_typing(self, data):
        user = self.scope["user"]
        is_typing = data.get('is_typing', False)
        
        # Send typing indicator to room group (excluding sender)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user_id': user.id,
                'username': user.username,
                'is_typing': is_typing
            }
        )
    
    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message
        }))
    
    async def message_read(self, event):
        # Send read receipt to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'user_id': event['user_id'],
            'username': event['username']
        }))
    
    async def typing_indicator(self, event):
        # Don't send typing indicator to the user who is typing
        if event['user_id'] != self.scope["user"].id:
            await self.send(text_data=json.dumps({
                'type': 'typing_indicator',
                'username': event['username'],
                'is_typing': event['is_typing']
            }))
    
    @database_sync_to_async
    def check_room_permission(self, user, room_id):
        """Check if user has permission to access this chat room"""
        try:
            chat_room = ChatRoom.objects.get(id=room_id)
            participants = chat_room.get_participants()
            return user in participants
        except ChatRoom.DoesNotExist:
            return False
    
    @database_sync_to_async
    def save_message(self, user, room_id, content, message_type, file_url, file_name, file_size):
        """Save message to database with encryption"""
        try:
            chat_room = ChatRoom.objects.get(id=room_id)
            message = ChatMessage.objects.create(
                chat_room=chat_room,
                sender=user,
                message_type=message_type,
                file_url=file_url,
                file_name=file_name,
                file_size=file_size
            )
            message.set_content(content)
            message.save()
            return message
        except Exception as e:
            print(f"Error saving message: {e}")
            return None
    
    @database_sync_to_async
    def serialize_message(self, message):
        """Serialize message for JSON response"""
        serializer = ChatMessageSerializer(message)
        return serializer.data
    
    @database_sync_to_async
    def update_last_read(self, user, room_id):
        """Update user's last read timestamp"""
        try:
            chat_room = ChatRoom.objects.get(id=room_id)
            participant, created = ChatParticipant.objects.get_or_create(
                chat_room=chat_room,
                user=user
            )
            participant.save()  # This updates last_read_at due to auto_now
        except Exception as e:
            print(f"Error updating last read: {e}")
