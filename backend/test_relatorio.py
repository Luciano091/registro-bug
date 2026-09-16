import requests
import json
import sys

# Login
token_res = requests.post("https://registro-bug.onrender.com/auth/login", json={"estabelecimento": "bisburger", "senha": "burger123", "email": ""})
if token_res.status_code != 200:
    print("Login falhou:", token_res.text)
    sys.exit(1)

token = token_res.json()["token"]

# Fetch relatorios
res = requests.get("https://registro-bug.onrender.com/relatorios", headers={"Authorization": f"Bearer {token}"})
print(f"Status: {res.status_code}")
print(res.text)
