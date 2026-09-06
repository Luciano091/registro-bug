import requests

r = requests.get("https://registro-bug.onrender.com/pedidos/1")
print(r.status_code, r.text[:100])
