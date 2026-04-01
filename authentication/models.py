from django.db import models
from django.contrib.auth.models import User

class Environment(models.Model):
    invite_code = models.CharField(max_length=50, primary_key=True, unique=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.invite_code} ({self.created_by.username})"

class AuthorizedID(models.Model):
    student_id = models.CharField(max_length=50, unique=True, help_text="Unique Student ID allowed to access the system")
    is_active = models.BooleanField(default=True, help_text="Uncheck to temporarily disable access for this ID")
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=100, blank=True, help_text="Optional: Name or notes for this ID")

    def __str__(self):
        return self.student_id

    class Meta:
        verbose_name = "Authorized Student ID"
        verbose_name_plural = "Authorized Student IDs"

class TelemetryPulse(models.Model):
    """Local SQLite Ledger for real-time monitoring results"""
    developer_id = models.CharField(max_length=100, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    risk_score = models.IntegerField(default=0)
    node_code = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    rank = models.CharField(max_length=20, default='junior')
    # Store forensic JSON blob
    raw_data = models.TextField(help_text="Full pulse data blob")
    
    def __str__(self):
        return f"{self.developer_id} @ {self.timestamp}"

class CodeSnapshot(models.Model):
    """Forensic evidence for Time Travel playback (SQLite Mode)"""
    pulse = models.ForeignKey(TelemetryPulse, related_name="snapshots", on_delete=models.CASCADE)
    filename = models.CharField(max_length=255)
    content = models.TextField()
    language = models.CharField(max_length=50)
    
    def __str__(self):
        return f"{self.filename} for {self.pulse.developer_id}"
