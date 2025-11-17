from rest_framework import serializers
from .models import Donation
from .models import DonationRequest


class DonationSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')
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

    class Meta:
        model = Donation
        fields = ['id', 'hotel_name', 'food_items', 'quantity', 'category', 'expiry_date', 'location', 'quality_score', 'status', 'reserved_by', 'owner', 'created_at', 'image_url']
        read_only_fields = ['id', 'quality_score', 'status', 'reserved_by', 'owner', 'created_at']


class DonationRequestSerializer(serializers.ModelSerializer):
    ngo = serializers.ReadOnlyField(source='ngo.username')

    class Meta:
        model = DonationRequest
        fields = ['id', 'requested_items', 'ngo', 'ngo_name', 'quantity', 'beneficiaries', 'purpose', 'location', 'urgency', 'status', 'created_at']
        read_only_fields = ['id', 'ngo', 'status', 'created_at']
