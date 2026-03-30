import requests
import json

url = "http://127.0.0.1:8000/auth/api/verify-id/"
data = {"student_id": "s2"}
headers = {"Content-Type": "application/json"}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, data=json.dumps(data), headers=headers, timeout=5)
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
