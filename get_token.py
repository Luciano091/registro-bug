import requests

r = requests.post("https://registro-bug.onrender.com/auth/login", json={"senha": "burger123"})
token = r.json()["token"]

r2 = requests.get("https://registro-bug.onrender.com/caixa/status", headers={"Authorization": f"Bearer {token}"})
print("Caixa Status:", r2.status_code, r2.json())
