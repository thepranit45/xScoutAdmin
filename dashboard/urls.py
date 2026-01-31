from django.contrib import admin
from django.urls import path, re_path, include # Added include
from django.shortcuts import redirect
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('dashboard/', views.index, name='dashboard'), # Restored direct view
    path('auth/', include('authentication.urls')),
    path('', views.home, name='home'),
    path('login/', views.login_view, name='login'), # Restored login
    path('logout/', views.logout_view, name='logout'), # Restored logout
    re_path(r'^api/telemetry/?$', views.get_dashboard_data, name='get_dashboard_data'),
    
    # Data Management
    path('api/export-logs/', views.export_logs, name='export_logs'),
    path('api/system-backup/', views.system_backup, name='system_backup'),
    path('api/purge-logs/', views.purge_logs, name='purge_logs'),
]
