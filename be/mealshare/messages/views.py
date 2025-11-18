from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import authentication
from .models import Message
from .serializers import MessageSerializer
from accounts.views import JWTAuthentication
import time

# Simple in-memory per-user-room cache to avoid responding to very frequent identical requests
# Keyed by (username, room) for room-history requests and by username for inbox requests.
# This is intentionally simple for dev; for production use a proper cache (redis/memcached).
_LAST_FETCH_CACHE = {}
_CACHE_COOLDOWN_SECONDS = 1.0


class MessageListView(APIView):
	# Accept JWT Bearer tokens issued by our accounts app
	authentication_classes = [JWTAuthentication]
	permission_classes = [IsAuthenticated]

	def get(self, request):
		room = request.query_params.get('room')
		# Debug: log who's requesting and what room
		try:
			user_info = getattr(request.user, 'username', None)
		except Exception:
			user_info = None
		print(f"MessageList requested by user={user_info!r} for room={room!r}")

		# If a specific room is requested, return messages in that room
		if room:
			cache_key = (user_info or 'anonymous', room)
			now = time.time()
			cached = _LAST_FETCH_CACHE.get(cache_key)
			# If cached and within cooldown, return cached response to avoid rapid repeated DB queries
			if cached and (now - cached['ts'] < _CACHE_COOLDOWN_SECONDS):
				print(f"Returning cached history for {cache_key} (age={now-cached['ts']:.2f}s)")
				return Response(cached['data'])

			msgs = Message.objects.filter(room=room).order_by('timestamp')
			print(f"Found {msgs.count()} messages for room={room!r}")
			serializer = MessageSerializer(msgs, many=True)
			# store in cache
			try:
				_LAST_FETCH_CACHE[cache_key] = {'ts': now, 'data': serializer.data}
			except Exception:
				pass
			return Response(serializer.data)

		# No room provided: return a list of latest messages (one per room)
		# Find rooms where the user is a participant (room name includes username)
		# No room provided: return a list of latest messages (one per room)
		# Use a per-user inbox cache to reduce frequent identical inbox requests.
		cache_key = (user_info or 'anonymous', 'inbox')
		now = time.time()
		cached = _LAST_FETCH_CACHE.get(cache_key)
		if cached and (now - cached['ts'] < _CACHE_COOLDOWN_SECONDS):
			print(f"Returning cached inbox for user={user_info!r} (age={now-cached['ts']:.2f}s)")
			return Response(cached['data'])

		if user_info:
			rooms = Message.objects.filter(room__icontains=user_info).values_list('room', flat=True).distinct()
		else:
			rooms = Message.objects.values_list('room', flat=True).distinct()
		latest = []
		for r in rooms:
			m = Message.objects.filter(room=r).order_by('-timestamp').first()
			if m:
				latest.append(m)
		print(f"Returning {len(latest)} latest messages for inbox for user={user_info!r}")
		serializer = MessageSerializer(latest, many=True)
		try:
			_LAST_FETCH_CACHE[cache_key] = {'ts': now, 'data': serializer.data}
		except Exception:
			pass
		return Response(serializer.data)

