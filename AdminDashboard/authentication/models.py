from django.db import models


class AuthorizedID(models.Model):
    student_id = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique Student ID allowed to access the system",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Uncheck to temporarily disable access for this ID",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.CharField(
        max_length=100,
        blank=True,
        help_text="Optional: Name or notes for this ID",
    )

    def __str__(self):
        return self.student_id

class TelemetryPulse(models.Model):
    developer_id = models.CharField(max_length=100, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    raw_data = models.TextField(help_text="JSON payload of developer activity")
    node_code = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    
    # Forensic context (computed fields)
    active_app = models.CharField(max_length=100, blank=True, null=True)
    active_file = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Pulse: {self.developer_id} @ {self.timestamp}"

    class Meta:
        ordering = ['-timestamp']


class CodeSnapshot(models.Model):
    pulse = models.ForeignKey(TelemetryPulse, on_delete=models.CASCADE, related_name="snapshots")
    filename = models.CharField(max_length=255)
    content = models.TextField()
    language = models.CharField(max_length=50, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Snapshot: {self.filename} for {self.pulse.developer_id}"
