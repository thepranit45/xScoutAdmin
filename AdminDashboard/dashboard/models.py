from django.db import models
from django.contrib.auth.models import User


class Environment(models.Model):
    invite_code = models.CharField(
        max_length=50, primary_key=True, unique=True
    )
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.invite_code
