from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
	fieldsets = DjangoUserAdmin.fieldsets + (
		("Custom", {"fields": ("role",)}),
	)
	list_display = ('username', 'email', 'role', 'is_staff', 'is_active')
