import requests

r = requests.post("https://registro-bug.onrender.com/auth/login", json={"senha": "burger123"})
print("Login with burger123:", r.status_code, r.text)
