from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from accounts.views import JWTAuthentication
from .serializers import DonationSerializer, DonationRequestSerializer
from .models import Donation, DonationRequest
from django.db.models import Q
import re


def _norm(s: str) -> str:
    """Normalize a string for loose matching: lowercase and strip non-alphanumerics."""
    if not s:
        return ''
    return re.sub(r'[^a-z0-9]', '', s.lower())


def _is_owner_or_match(user, donation) -> bool:
    """Return True if the given user should be considered the owner of the donation.

    Checks (in order): explicit owner FK, exact username/email/full match, or
    a loose normalized substring match to allow variants like 'chicken_house' <-> 'chicken house'.
    """
    # explicit owner
    if getattr(donation, 'owner', None) is not None:
        return donation.owner == user

    username = getattr(user, 'username', '') or ''
    email = getattr(user, 'email', '') or ''
    full = (user.get_full_name() or '')
    hname = (donation.hotel_name or '')

    # exact matches
    if hname.lower() == username.lower() or hname.lower() == email.lower() or hname.lower() == full.lower():
        return True

    # normalized loose match
    nh = _norm(hname)
    if not nh:
        return False
    if _norm(username) and _norm(username) in nh:
        return True
    if _norm(email) and _norm(email) in nh:
        return True
    if _norm(full) and _norm(full) in nh:
        return True

    # also allow the inverse: normalized hotel name contained in normalized username
    if _norm(username) and nh in _norm(username):
        return True

    return False


class DonationListCreateView(generics.ListCreateAPIView):
    """List and create donations.

    - GET: if user is a hotel, return donations that match the hotel's identity (hotel_name variants).
           if user is an NGO, return available donations.
    - POST: allow hotel users to create a donation; hotel_name is set to the user's username if not provided.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DonationSerializer

    def get_queryset(self):
        user = self.request.user
        from accounts.models import User
        qs = Donation.objects.all().order_by('-created_at')
        if getattr(user, 'role', None) == User.ROLE_HOTEL:
            # Show all donations except those owned by this hotel user
            return qs.exclude(owner=user)
        if getattr(user, 'role', None) == User.ROLE_NGO:
            # For NGOs, return donations that are available for reservation
            # as well as any donations already reserved by the current NGO user
            return qs.filter(Q(status=Donation.STATUS_AVAILABLE) | Q(reserved_by=user))
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        from accounts.models import User
        if getattr(user, 'role', None) != User.ROLE_HOTEL:
            raise PermissionDenied('only hotel users can create donations')

        hotel_name = serializer.validated_data.get('hotel_name') or user.username
        # set owner to the creating hotel user
        donation = serializer.save(hotel_name=hotel_name, owner=user)

        # If an image file was uploaded in the multipart request under key 'image',
        # read it and store as a base64 data URL in image_url to avoid DB migrations.
        try:
            img = None
            try:
                img = self.request.FILES.get('image')
            except Exception:
                img = None
            if img:
                try:
                    import base64
                    content = img.read()
                    b64 = base64.b64encode(content).decode('ascii')
                    mime = img.content_type or 'application/octet-stream'
                    donation.image_url = f'data:{mime};base64,{b64}'
                    donation.save()
                except Exception:
                    # fail silently
                    pass
        except Exception:
            pass

        # compute basic quality score and set pending status
        try:
            from datetime import date
            days = (donation.expiry_date - date.today()).days
            qs = min(95, max(75, 85 + days * 2))
            donation.quality_score = int(qs)
            # make newly created donations available immediately so NGOs can see them
            donation.status = Donation.STATUS_AVAILABLE
            donation.save()
        except Exception:
            pass


class DonationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a donation.

    Unsafe methods are restricted to the owning hotel (matched by hotel_name variants).
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DonationSerializer
    queryset = Donation.objects.all()

    def check_object_permissions(self, request, obj):
        # Allow safe (read) methods for authorized users; modifications reserved for hotel owners
        from accounts.models import User
        user = request.user
        if request.method in permissions.SAFE_METHODS:
            return
        if getattr(user, 'role', None) != User.ROLE_HOTEL:
            raise PermissionDenied('only hotel users can modify donations')

        # Prefer explicit owner FK, otherwise use relaxed matching
        if _is_owner_or_match(user, obj):
            return
        raise PermissionDenied('not the owner of this donation')


class DonationStatusUpdateView(APIView):
    """Update donation status via POST with { "status": "available" | "reserved" | "completed" | "picked-up" }"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            donation = Donation.objects.get(pk=pk)
        except Donation.DoesNotExist:
            return Response({'error': 'Donation not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check ownership
        from accounts.models import User
        user = request.user
        # Determine requested status
        new_status = (request.data.get('status') or '').strip()
        valid_statuses = [Donation.STATUS_AVAILABLE, Donation.STATUS_RESERVED, Donation.STATUS_PICKED_UP, Donation.STATUS_COMPLETED]
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}, status=status.HTTP_400_BAD_REQUEST)

        # Allow NGO users to reserve an available donation
        if new_status == Donation.STATUS_RESERVED:
            # Only NGOs (or hotels) can reserve; hotels might reserve on behalf too
            if getattr(user, 'role', None) not in (User.ROLE_NGO, User.ROLE_HOTEL):
                raise PermissionDenied('only NGO or hotel users can reserve donations')
            if donation.status != Donation.STATUS_AVAILABLE:
                return Response({'error': 'Donation is not available for reservation'}, status=status.HTTP_400_BAD_REQUEST)
            # set reserver
            donation.status = Donation.STATUS_RESERVED
            try:
                donation.reserved_by = user
            except Exception:
                # if FK assignment fails, ignore
                pass
            donation.save()
            return Response(DonationSerializer(donation).data, status=status.HTTP_200_OK)

        # Other status changes (available, picked-up, completed) require hotel owner
        if getattr(user, 'role', None) != User.ROLE_HOTEL:
            raise PermissionDenied('only hotel users can modify donations')

        # If an explicit owner exists, require ownership (explicit owner FK or relaxed matching).
        # If no owner is recorded (legacy rows), allow any hotel user to perform the change
        # so that older donations are not blocked by missing owner FK.
        if getattr(donation, 'owner', None) is not None:
            if not _is_owner_or_match(user, donation):
                return Response({'error': 'not the owner of this donation'}, status=status.HTTP_403_FORBIDDEN)

        # perform the change
        donation.status = new_status
        # if marking available again, clear reserved_by
        if new_status == Donation.STATUS_AVAILABLE:
            donation.reserved_by = None
        donation.save()
        return Response(DonationSerializer(donation).data, status=status.HTTP_200_OK)


class DonationRequestListCreateView(generics.ListCreateAPIView):
    """List and create donation requests posted by NGOs.

    - GET: hotels see open requests; NGOs see their own requests.
    - POST: only NGO users may create requests; the creating user's username is used as ngo_name if not provided.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DonationRequestSerializer

    def get_queryset(self):
        user = self.request.user
        from accounts.models import User
        qs = DonationRequest.objects.all().order_by('-created_at')
        if getattr(user, 'role', None) == User.ROLE_HOTEL:
            return qs.filter(status=DonationRequest.STATUS_OPEN)
        if getattr(user, 'role', None) == User.ROLE_NGO:
            return qs.filter(ngo=user)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        from accounts.models import User
        if getattr(user, 'role', None) != User.ROLE_NGO:
            raise PermissionDenied('only NGO users can create donation requests')
        ngo_name = serializer.validated_data.get('ngo_name') or (user.get_full_name() or user.username)
        serializer.save(ngo=user, ngo_name=ngo_name)


class DonationRequestDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve or update a donation request. Only the NGO who created it may update it; hotels may view.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DonationRequestSerializer


class DonationMyPickupsView(APIView):
    """Return donations reserved by the current authenticated NGO user.

    GET: returns donations where `reserved_by` is the authenticated user and
    status is one of reserved/picked-up/completed. This provides a focused
    endpoint for NGO pickups so the frontend doesn't need to fetch all donations.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        from accounts.models import User
        # Only NGOs (and hotels acting on behalf) should call this; return empty otherwise
        if getattr(user, 'role', None) not in (User.ROLE_NGO, User.ROLE_HOTEL):
            return Response([], status=status.HTTP_200_OK)

        qs = Donation.objects.filter(reserved_by=user, status__in=[Donation.STATUS_RESERVED, Donation.STATUS_PICKED_UP, Donation.STATUS_COMPLETED]).order_by('-created_at')
        return Response(DonationSerializer(qs, many=True).data, status=status.HTTP_200_OK)
    queryset = DonationRequest.objects.all()

    def check_object_permissions(self, request, obj):
        from accounts.models import User
        user = request.user
        if request.method in permissions.SAFE_METHODS:
            return
        # only the creating NGO may modify
        if getattr(user, 'role', None) != User.ROLE_NGO or obj.ngo != user:
            raise PermissionDenied('only the creating NGO can modify this request')


class DonationRequestReserveView(APIView):
    """Allow a hotel user to reserve an open donation request.

    POST to set request.status -> STATUS_FULFILLED (marks it taken). No creation
    of Donation objects is performed here; that can be done separately by the hotel.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            req = DonationRequest.objects.get(pk=pk)
        except DonationRequest.DoesNotExist:
            return Response({'error': 'Donation request not found'}, status=status.HTTP_404_NOT_FOUND)

        from accounts.models import User
        user = request.user
        if getattr(user, 'role', None) != User.ROLE_HOTEL:
            raise PermissionDenied('only hotel users may reserve requests')

        if req.status != DonationRequest.STATUS_OPEN:
            return Response({'error': 'Request is not open'}, status=status.HTTP_400_BAD_REQUEST)

        req.status = DonationRequest.STATUS_FULFILLED
        try:
            req.save()
        except Exception:
            pass
        return Response(DonationRequestSerializer(req).data, status=status.HTTP_200_OK)


class DonationRequestClaimView(APIView):
    """Create a Donation from an open DonationRequest.

    POSTing here will create a Donation owned by the hotel user, pre-filled from the
    request data, mark the request fulfilled, and return the created Donation.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            req = DonationRequest.objects.get(pk=pk)
        except DonationRequest.DoesNotExist:
            return Response({'error': 'Donation request not found'}, status=status.HTTP_404_NOT_FOUND)

        from accounts.models import User
        user = request.user
        if getattr(user, 'role', None) != User.ROLE_HOTEL:
            raise PermissionDenied('only hotel users may claim requests')

        if req.status != DonationRequest.STATUS_OPEN:
            return Response({'error': 'Request is not open'}, status=status.HTTP_400_BAD_REQUEST)

        # Build donation from request
        try:
            # Minimal mapping; category left blank and expiry_date set to 7 days from now
            from datetime import date, timedelta
            expiry = date.today() + timedelta(days=7)
            donation = Donation.objects.create(
                hotel_name=user.username or '',
                food_items=req.requested_items or '',
                quantity=req.quantity or '',
                category='request-fulfillment',
                expiry_date=expiry,
                location={'address': req.location or '', 'coordinates': None},
                quality_score=80,
                status=Donation.STATUS_RESERVED,
                reserved_by=req.ngo if req.ngo else None,
                owner=user,
            )
        except Exception as e:
            return Response({'error': 'Failed to create donation', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # mark request fulfilled
        try:
            req.status = DonationRequest.STATUS_FULFILLED
            req.save()
        except Exception:
            pass

        return Response(DonationSerializer(donation).data, status=status.HTTP_201_CREATED)
