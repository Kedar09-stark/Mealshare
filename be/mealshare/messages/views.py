from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.views import JWTAuthentication
from .models import Message
from .serializers import MessageSerializer
import time

# Simple in-memory cache
_LAST_FETCH_CACHE = {}
_CACHE_COOLDOWN_SECONDS = 1.0


def parse_room(room: str):
    """
    Parse room name: chat_user1_user2
    Returns (user1, user2) or (None, None) if invalid
    """
    try:
        prefix, u1, u2 = room.split('_', 2)
        if prefix != 'chat':
            return None, None
        return u1.strip(), u2.strip()
    except Exception:
        return None, None


def is_user_in_room(room: str, username: str):
    u1, u2 = parse_room(room)
    return username in [u1, u2]


class MessageListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        room = request.query_params.get('room')
        user = request.user
        username = getattr(user, 'username', None)

        print(f"[MessageList] user={username!r}, room={room!r}")

        # =========================
        # 📌 CASE 1: ROOM HISTORY
        # =========================
        if room:
            # Validate room
            u1, u2 = parse_room(room)
            if not u1 or not u2:
                return Response({"error": "Invalid room format"}, status=400)

            if username not in [u1, u2]:
                return Response({"error": "Unauthorized for this room"}, status=403)

            cache_key = (username, room)
            now = time.time()
            cached = _LAST_FETCH_CACHE.get(cache_key)

            if cached and (now - cached['ts'] < _CACHE_COOLDOWN_SECONDS):
                print(f"Returning cached history for {room}")
                return Response(cached['data'])

            msgs = Message.objects.filter(room=room).order_by('timestamp')
            print(f"Fetched {msgs.count()} messages for room={room}")

            serializer = MessageSerializer(msgs, many=True)

            _LAST_FETCH_CACHE[cache_key] = {
                'ts': now,
                'data': serializer.data
            }

            return Response(serializer.data)

        # =========================
        # 📌 CASE 2: INBOX (LATEST PER ROOM)
        # =========================
        cache_key = (username, 'inbox')
        now = time.time()
        cached = _LAST_FETCH_CACHE.get(cache_key)

        if cached and (now - cached['ts'] < _CACHE_COOLDOWN_SECONDS):
            print(f"Returning cached inbox for {username}")
            return Response(cached['data'])

        # Get all unique rooms
        all_rooms = Message.objects.values_list('room', flat=True).distinct()

        valid_rooms = []
        for r in all_rooms:
            u1, u2 = parse_room(r)
            if not u1 or not u2:
                continue  # skip invalid rooms
            if username in [u1, u2]:
                valid_rooms.append(r)

        latest_messages = []

        for r in valid_rooms:
            msg = Message.objects.filter(room=r).order_by('-timestamp').first()
            if msg:
                latest_messages.append(msg)

        print(f"Inbox rooms count: {len(latest_messages)}")

        serializer = MessageSerializer(latest_messages, many=True)

        _LAST_FETCH_CACHE[cache_key] = {
            'ts': now,
            'data': serializer.data
        }

        return Response(serializer.data)