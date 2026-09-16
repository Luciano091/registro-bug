import requests
import json
import os

token_res = requests.post("https://registro-bug.onrender.com/auth/login", json={"estabelecimento": "bisburger", "senha": "ritmesa-dev"})
if token_res.status_code == 200:
    token = token_res.json()["token"]
    res = requests.get("https://registro-bug.onrender.com/admin/estabelecimentos", headers={"Authorization": f"Bearer {token}"})
    for e in res.json():
        print(f"ID: {e['id']} | Nome: {e['nome']} | Slug: {e['slug']}")
else:
    print("Failed to login as admin:", token_res.text)
