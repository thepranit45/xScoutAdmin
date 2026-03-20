import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dashboard.settings")
django.setup()

from authentication.views import verify_student_id
from django.test import RequestFactory
import json

factory = RequestFactory()
req = factory.post('/auth/api/verify-id/', data=json.dumps({"student_id":"user1", "invite_code": ""}), content_type='application/json')
res = verify_student_id(req)
print(res.status_code)
print(res.content)
