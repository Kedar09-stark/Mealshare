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

    class Meta:
        model = Donation
        fields = ['id', 'hotel_name', 'food_items', 'quantity', 'category', 'expiry_date', 'location', 'quality_score', 'status', 'reserved_by', 'owner', 'owner_id', 'created_at', 'image_url']
        read_only_fields = ['id', 'quality_score', 'status', 'reserved_by', 'owner', 'owner_id', 'created_at']


class DonationRequestSerializer(serializers.ModelSerializer):
    ngo = serializers.ReadOnlyField(source='ngo.username')
    ngo_id = serializers.ReadOnlyField(source='ngo.id')

    class Meta:
        model = DonationRequest
        fields = ['id', 'requested_items', 'ngo', 'ngo_id', 'ngo_name', 'quantity', 'beneficiaries', 'purpose', 'location', 'urgency', 'status', 'created_at']
        read_only_fields = ['id', 'ngo', 'ngo_id', 'status', 'created_at']
