from rest_framework import serializers
from .models import Donation
from .models import DonationRequest


class DonationSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')
    owner_id = serializers.ReadOnlyField(source='owner.id')
    reserved_by = serializers.SerializerMethodField()

    def get_reserved_by(self, obj):
        user = obj.reserved_by
        if user is None:
            return None
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
        }

    def validate_location(self, value):
        """Ensure location coordinates are valid numbers, not NaN."""
        if not isinstance(value, dict):
            return {'address': '', 'coordinates': {'lat': 0, 'lng': 0}}
        
        address = value.get('address', '')
        coords = value.get('coordinates', {})
        
        if not isinstance(coords, dict):
            return {'address': address, 'coordinates': {'lat': 0, 'lng': 0}}
        
        lat = coords.get('lat', 0)
        lng = coords.get('lng', 0)
        
        # Validate coordinates
        try:
            import math
            lat = float(lat) if lat is not None else 0
            lng = float(lng) if lng is not None else 0
            if math.isnan(lat) or math.isnan(lng):
                lat, lng = 0, 0
        except (TypeError, ValueError):
            lat, lng = 0, 0
        
        return {
            'address': str(address) if address else '',
            'coordinates': {'lat': lat, 'lng': lng}
        }

    def to_representation(self, instance):
        """Ensure returned location data has valid coordinates."""
        data = super().to_representation(instance)
        # Double-check location coordinates in response
        if 'location' in data and isinstance(data['location'], dict):
            coords = data['location'].get('coordinates', {})
            if isinstance(coords, dict):
                try:
                    import math
                    lat = coords.get('lat', 0)
                    lng = coords.get('lng', 0)
                    lat = float(lat) if lat is not None else 0
                    lng = float(lng) if lng is not None else 0
                    if math.isnan(lat) or math.isnan(lng):
                        lat, lng = 0, 0
                    data['location']['coordinates'] = {'lat': lat, 'lng': lng}
                except (TypeError, ValueError):
                    data['location']['coordinates'] = {'lat': 0, 'lng': 0}
        return data

    class Meta:
        model = Donation
        fields = ['id', 'hotel_name', 'food_items', 'quantity', 'category', 'expiry_date', 'location', 'quality_score', 'status', 'reserved_by', 'owner', 'owner_id', 'created_at', 'image_url', 'rating', 'rating_comment']
        read_only_fields = ['id', 'quality_score', 'status', 'reserved_by', 'owner', 'owner_id', 'created_at']


class DonationRequestSerializer(serializers.ModelSerializer):
    ngo = serializers.ReadOnlyField(source='ngo.username')
    ngo_id = serializers.ReadOnlyField(source='ngo.id')

    class Meta:
        model = DonationRequest
        fields = ['id', 'requested_items', 'ngo', 'ngo_id', 'ngo_name', 'quantity', 'beneficiaries', 'purpose', 'location', 'urgency', 'status', 'created_at']
        read_only_fields = ['id', 'ngo', 'ngo_id', 'status', 'created_at']
