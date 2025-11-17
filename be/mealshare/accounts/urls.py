from django.urls import path
from . import views

urlpatterns = [
	path('register/', views.RegisterView.as_view(), name='api-register'),
	path('login/', views.LoginView.as_view(), name='api-login'),
	path('me/', views.UserView.as_view(), name='api-user'),
]
