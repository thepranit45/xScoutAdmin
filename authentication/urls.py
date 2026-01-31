from django.urls import path
from . import views

urlpatterns = [
    path('api/verify-id/', views.verify_student_id, name='verify_student_id'),
    path('api/add-user/', views.add_authorized_user, name='add_authorized_user'),
    path('api/list-users/', views.get_authorized_users, name='get_authorized_users'),
    path('api/toggle-status/', views.toggle_user_status, name='toggle_user_status'),
]
