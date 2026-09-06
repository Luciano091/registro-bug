import requests
import time

url = "https://registro-bug.onrender.com/auth/google"
for i in range(30):
    try:
        r = requests.post(url, json={"token": "invalid_token"})
        if r.status_code == 401 or r.status_code == 400:
            print("Render is UP!")
            break
    except Exception:
        pass
    time.sleep(5)
