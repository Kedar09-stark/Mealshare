from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
	fieldsets = DjangoUserAdmin.fieldsets + (
		("Custom", {"fields": ("role", "business_license_number", "ngo_registration_number")}),
	)
	list_display = ('username', 'email', 'role', 'business_license_number', 'ngo_registration_number', 'is_staff', 'is_active')
