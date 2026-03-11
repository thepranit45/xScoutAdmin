from django.contrib import admin
from django.urls import path, re_path, include  # Added include
from . import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("dashboard/", views.index, name="dashboard"),  # Restored direct view
    path("test/", views.code_city_demo, name="code_city_demo"),  # 3D City Demo
    path("auth/", include("authentication.urls")),
    path("", views.home, name="home"),
    path("login/", views.login_view, name="login"),  # Restored login
    path("logout/", views.logout_view, name="logout"),  # Restored logout
    re_path(
        r"^api/telemetry/?$",
        views.get_dashboard_data,
        name="get_dashboard_data",
    ),
    path(
        "api/history/<str:user_id>/",
        views.get_user_history,
        name="get_user_history",
    ),  # Time Travel Endpoint
    # Data Management
    path("api/export-logs/", views.export_logs, name="export_logs"),
    path("api/system-backup/", views.system_backup, name="system_backup"),
    path("api/purge-logs/", views.purge_logs, name="purge_logs"),
    # Explorer API
    path(
        "api/explorer/",
        views.get_directory_structure,
        name="get_directory_structure",
    ),
    path("api/read-file/", views.read_file_content, name="read_file_content"),
    path("playback/", views.playback_view, name="playback_view"),
    path(
        "api/playback-data/", views.get_playback_data, name="get_playback_data"
    ),
    # Environment / Classroom
    path(
        "environment/create/",
        views.create_environment,
        name="create_environment",
    ),
    path(
        "environment/<str:env_code>/",
        views.environment_view,
        name="environment_view",
    ),
    path("monitor/<str:student_id>/", views.monitor_view, name="monitor_view"),
    path(
        "api/environment/update-code/",
        views.update_environment_code,
        name="update_environment_code",
    ),
    path(
        "api/environment/<str:env_code>/",
        views.get_environment_data,
        name="get_environment_data",
    ),
    path(
        "api/environments/list/",
        views.get_all_environments,
        name="get_all_environments",
    ),
    path(
        "api/environment/delete/",
        views.delete_environment,
        name="delete_environment",
    ),
    # Network Graph
    path("network/", views.network_view, name="network_graph"),
    path("api/network-data/", views.get_network_data, name="get_network_data"),
]
