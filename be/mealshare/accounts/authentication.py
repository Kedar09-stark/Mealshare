import jwt
from typing import Tuple, Optional
from django.conf import settings
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed
from .models import User


class JWTAuthentication(authentication.BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request) -> Optional[Tuple[User, str]]:
        auth_header = authentication.get_authorization_header(request).split()

        if not auth_header:
            return None

        if auth_header[0].decode().lower() != self.keyword.lower():
            return None

        if len(auth_header) == 1:
            raise AuthenticationFailed('No credentials provided.')
        elif len(auth_header) > 2:
            raise AuthenticationFailed('Invalid token header')

        token = auth_header[1].decode()

        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[getattr(settings, 'JWT_ALGORITHM', 'HS256')]
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')

        user_id = payload.get('user_id')

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found')

        return (user, token)