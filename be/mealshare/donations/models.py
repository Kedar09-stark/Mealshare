from django.db import models
import uuid
from django.conf import settings


class Donation(models.Model):
	STATUS_AVAILABLE = 'available'
	STATUS_RESERVED = 'reserved'
	STATUS_PICKED_UP = 'picked-up'
	STATUS_COMPLETED = 'completed'
	STATUS_PENDING = 'pending'

	STATUS_CHOICES = [
		(STATUS_AVAILABLE, 'Available'),
		(STATUS_RESERVED, 'Reserved'),
		(STATUS_PICKED_UP, 'Picked up'),
		(STATUS_COMPLETED, 'Completed'),
		(STATUS_PENDING, 'Pending'),
	]

	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	hotel_name = models.CharField(max_length=255)
	food_items = models.TextField()
	quantity = models.CharField(max_length=255)
	category = models.CharField(max_length=100)
	expiry_date = models.DateField()
	# store location as JSON: { address: str, coordinates: { lat, lng } }
	location = models.JSONField()
	quality_score = models.IntegerField(default=0)
	status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_PENDING)
	reserved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='reservations')
	# owner: the user account that created/owns this donation (hotel user). Prefer this for ownership checks.
	owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='donations_created')
	created_at = models.DateTimeField(auto_now_add=True)
	image_url = models.TextField(blank=True, null=True)
	rating = models.IntegerField(null=True, blank=True)
	rating_comment = models.TextField(blank=True, null=True)

	def clean(self):
		"""Validate and normalize location coordinates before saving."""
		if not self.location or not isinstance(self.location, dict):
			self.location = {'address': '', 'coordinates': {'lat': 0, 'lng': 0}}
			return
		
		address = self.location.get('address', '')
		coords = self.location.get('coordinates', {})
		
		if not isinstance(coords, dict):
			coords = {'lat': 0, 'lng': 0}
		
		lat = coords.get('lat', 0)
		lng = coords.get('lng', 0)
		
		# Validate and normalize coordinates
		try:
			import math
			lat = float(lat) if lat is not None else 0
			lng = float(lng) if lng is not None else 0
			# Check for NaN
			if math.isnan(lat) or math.isnan(lng):
				lat, lng = 0, 0
		except (TypeError, ValueError):
			lat, lng = 0, 0
		
		# Update location with validated coordinates
		self.location = {
			'address': str(address) if address else '',
			'coordinates': {'lat': lat, 'lng': lng}
		}

	def save(self, *args, **kwargs):
		"""Ensure coordinates are valid before saving."""
		self.clean()
		super().save(*args, **kwargs)

	def __str__(self):
		return f"{self.hotel_name} - {self.category} ({self.quantity})"


class DonationRequest(models.Model):
	URGENCY_LOW = 'low'
	URGENCY_MEDIUM = 'medium'
	URGENCY_HIGH = 'high'

	URGENCY_CHOICES = [
		(URGENCY_LOW, 'Low'),
		(URGENCY_MEDIUM, 'Medium'),
		(URGENCY_HIGH, 'High'),
	]

	STATUS_OPEN = 'open'
	STATUS_FULFILLED = 'fulfilled'

	STATUS_CHOICES = [
		(STATUS_OPEN, 'Open'),
		(STATUS_FULFILLED, 'Fulfilled'),
	]

	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	requested_items = models.TextField()
	ngo = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='donation_requests')
	ngo_name = models.CharField(max_length=255, blank=True)
	quantity = models.CharField(max_length=255, blank=True)
	beneficiaries = models.CharField(max_length=255, blank=True)
	purpose = models.TextField(blank=True)
	location = models.CharField(max_length=512, blank=True)
	urgency = models.CharField(max_length=16, choices=URGENCY_CHOICES, default=URGENCY_MEDIUM)
	status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_OPEN)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f"Request {self.requested_items} ({self.ngo_name})"
