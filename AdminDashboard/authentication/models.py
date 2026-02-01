from django.db import models

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
