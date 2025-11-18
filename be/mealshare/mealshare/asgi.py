"""
ASGI config for mealshare project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mealshare.settings')

# Integrate python-socketio ASGI server so frontend can use socket.io for real-time chat
import socketio
from asgiref.sync import sync_to_async
import jwt
from django.conf import settings

# AsyncServer with CORS allowed for development (adjust origins in production)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')


@sio.event
async def connect(sid, environ, auth):
	# Require a JWT token in the `auth` payload: { token: 'Bearer token' or token }
	token = None
	if isinstance(auth, dict):
		token = auth.get('token')
	# Fallback: check querystring in environ (not recommended)
	if not token:
		qs = environ.get('QUERY_STRING', '')
		# look for token=<token>
		for part in qs.split('&'):
			if part.startswith('token='):
				token = part.split('=', 1)[1]
				break

	if not token:
		raise socketio.exceptions.ConnectionRefusedError('authentication required')

	# Strip Bearer prefix if present
	if isinstance(token, str) and token.startswith('Bearer '):
		token = token.split(' ', 1)[1]

	try:
		payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[getattr(settings, 'JWT_ALGORITHM', 'HS256')])
	except Exception as e:
		print('Socket auth failed:', e)
		raise socketio.exceptions.ConnectionRefusedError('invalid token')

	# Save minimal user info in the socket session for later validation
	user_id = payload.get('user_id')
	username = payload.get('username')
	await sio.save_session(sid, {'user_id': user_id, 'username': username})
	print('Socket connected (auth):', sid, 'user_id=', user_id)


@sio.event
async def disconnect(sid):
	print('Socket disconnected:', sid)


@sio.event
async def join(sid, data):
	# data: { room: string }
	session = await sio.get_session(sid)
	if not session or not session.get('user_id'):
		await sio.emit('system', {'error': 'authentication required'}, room=sid)
		return
	room = data.get('room')
	if room:
		sio.enter_room(sid, room)
		await sio.emit('system', {'message': f'Joined room {room}'}, room=sid)


@sio.event
async def leave(sid, data):
	session = await sio.get_session(sid)
	if not session or not session.get('user_id'):
		await sio.emit('system', {'error': 'authentication required'}, room=sid)
		return
	room = data.get('room')
	if room:
		sio.leave_room(sid, room)
		await sio.emit('system', {'message': f'Left room {room}'}, room=sid)


@sio.event
async def send_message(sid, data):
	# data expected: { room, content, receiver_id, receiver_name }
	room = data.get('room')
	content = data.get('content')
	receiver_id = data.get('receiver_id')
	receiver_name = data.get('receiver_name')
	from django.utils import timezone
	if not room or not content:
		return

	# Persist the message to DB (run sync ORM calls in a thread)
	try:
		from django.contrib.auth import get_user_model
		from messages.models import Message

		user_model = get_user_model()
		# get authenticated user from socket session
		session = await sio.get_session(sid)
		sender = None
		sender_name = None
		if session and session.get('user_id'):
			try:
				# run sync ORM in thread
				sender = await sync_to_async(lambda: user_model.objects.filter(id=session.get('user_id')).first())()
			except Exception:
				sender = None
		if sender:
			sender_name = sender.username
		else:
			sender_name = data.get('sender_name') or 'Unknown'

		# Get receiver user object if receiver_id provided
		receiver = None
		if receiver_id:
			try:
				receiver = await sync_to_async(lambda: user_model.objects.filter(id=receiver_id).first())()
			except Exception:
				receiver = None
		
		if receiver:
			receiver_name = receiver.username
		else:
			receiver_name = receiver_name or 'Unknown'

		# Create message in DB with simple server-side dedup within a short window
		# Prevent duplicate saves when clients accidentally send twice rapidly
		now_ts = timezone.now()
		recent = await sync_to_async(lambda: Message.objects.filter(
			room=room,
			sender_name=sender_name,
			receiver_name=receiver_name
		).order_by('-timestamp').first())()
		if recent and recent.content == content:
			try:
				delta = (now_ts - recent.timestamp).total_seconds()
			except Exception:
				delta = 0
			if delta >= 0 and delta < 2.0:
				msg = recent
			else:
				msg = await sync_to_async(Message.objects.create)(
					room=room,
					sender=sender,
					sender_name=sender_name,
					receiver=receiver,
					receiver_name=receiver_name,
					content=content,
					timestamp=now_ts
				)
		else:
			msg = await sync_to_async(Message.objects.create)(
				room=room,
				sender=sender,
				sender_name=sender_name,
				receiver=receiver,
				receiver_name=receiver_name,
				content=content,
				timestamp=now_ts
			)
		payload = {
			'id': msg.id,
			'room': room,
			'sender_id': sender.id if sender else None,
			'sender_name': msg.sender_name,
			'receiver_id': receiver.id if receiver else receiver_id,
			'receiver_name': msg.receiver_name,
			'content': msg.content,
			'timestamp': msg.timestamp.isoformat(),
		}
		print('Saved message:', payload)
		# Emit to room for participants; only emit directly to sender if not joined to room
		try:
			await sio.emit('message', payload, room=room)
			try:
				rooms_for_sid = sio.rooms(sid)
			except Exception:
				rooms_for_sid = []
			if room not in rooms_for_sid:
				await sio.emit('message', payload, room=sid)
		except Exception as e:
			print('Error emitting message:', e)

		# return ack to caller (include timestamp to reconcile optimistic messages)
		return {'ok': True, 'id': str(msg.id), 'timestamp': msg.timestamp.isoformat()}
	except Exception as e:
		print('Error saving message:', e)
		return {'ok': False, 'error': str(e)}


# Compose ASGI app: socketio app will dispatch and fall back to Django's ASGI app
django_asgi_app = get_asgi_application()
application = socketio.ASGIApp(sio, other_asgi_app=django_asgi_app)
