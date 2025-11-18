from django.db import models
from django.conf import settings


class Message(models.Model):
	room = models.CharField(max_length=200, db_index=True)
	sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_messages')
	sender_name = models.CharField(max_length=150, blank=True)
	receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_messages')
	receiver_name = models.CharField(max_length=150, blank=True)
	content = models.TextField()
	timestamp = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['timestamp']
		indexes = [
			models.Index(fields=['sender', 'receiver', 'timestamp']),
			models.Index(fields=['room', 'timestamp']),
		]

	def __str__(self):
		return f"{self.sender_name} -> {self.receiver_name}: {self.content[:50]}"

