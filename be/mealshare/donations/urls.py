from django.urls import path
from .views import *

urlpatterns = [
	path('', DonationListCreateView.as_view(), name='donation-list-create'),
	path('<uuid:pk>/', DonationDetailView.as_view(), name='donation-detail'),
	path('<uuid:pk>/update-status/', DonationStatusUpdateView.as_view(), name='donation-update-status'),
	
	path('my-pickups/', DonationMyPickupsView.as_view(), name='donation-my-pickups'),
	path('requests/', DonationRequestListCreateView.as_view(), name='donationrequest-list-create'),
	path('requests/<uuid:pk>/', DonationRequestDetailView.as_view(), name='donationrequest-detail'),
	path('requests/<uuid:pk>/reserve/', DonationRequestReserveView.as_view(), name='donationrequest-reserve'),
	path('requests/<uuid:pk>/claim/', DonationRequestClaimView.as_view(), name='donationrequest-claim'),







    path('create-from-form/', DonationCreateFromFormView.as_view(), name='donation-create-from-form'),

   

   
]
