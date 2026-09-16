import requests
import sys

token_res = requests.post("https://registro-bug.onrender.com/auth/login", json={"estabelecimento": "bisburger", "senha": "burger123", "email": ""})
token = token_res.json()["token"]

res = requests.get("https://registro-bug.onrender.com/dashboard/relatorios", headers={"Authorization": f"Bearer {token}"})
print(f"Status: {res.status_code}")
print(res.text)
