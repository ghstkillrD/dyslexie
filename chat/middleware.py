from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_string):
    """Get user from JWT token"""
    try:
        # Validate the token
        token = AccessToken(token_string)
        user_id = token.get('user_id')
        user = User.objects.get(id=user_id)
        return user
    except (InvalidToken, TokenError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware to handle JWT authentication for WebSocket connections
    """
    
    async def __call__(self, scope, receive, send):
        # Parse query string for token
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        
        # Get token from query parameters
        token = query_params.get('token', [None])[0]
        
        if token:
            # Get user from token
            scope['user'] = await get_user_from_token(token)
        else:
            # No token provided
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
