import requests

r = requests.get("https://registro-bug.onrender.com/configuracao")
data = r.json()

data["senha_admin"] = "burger123"

r = requests.put("https://registro-bug.onrender.com/configuracao", json=data)
print("PUT config:", r.status_code)

r2 = requests.post("https://registro-bug.onrender.com/auth/login", json={"senha": "burger123"})
print("Login with burger123:", r2.status_code, r2.text)
