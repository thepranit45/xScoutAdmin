import requests
import json

def test_post():
    url = "http://127.0.0.1:8000/auth/api/verify-id/"
    data = {"student_id": "s2"}
    try:
        print(f"POST to {url}...")
        r = requests.post(url, json=data, timeout=5)
        print(f"Status: {r.status_code}")
        print(f"Body: {r.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_post()
