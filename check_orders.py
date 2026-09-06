import requests
r = requests.get("https://registro-bug.onrender.com/pedidos")
print(r.status_code, r.text[:500])
