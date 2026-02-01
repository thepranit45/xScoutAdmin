from django.contrib import admin
from .models import AuthorizedID

@admin.register(AuthorizedID)
class AuthorizedIDAdmin(admin.ModelAdmin):
    list_display = ('student_id', 'is_active', 'description', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('student_id', 'description')
    ordering = ('-created_at',)
