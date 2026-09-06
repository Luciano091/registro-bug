import requests

r = requests.post("https://registro-bug.onrender.com/auth/google", json={"token": "invalid_token"})
print(r.status_code)
print(r.text)
