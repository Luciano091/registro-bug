import requests
r = requests.get("https://registro-bug.onrender.com/caixa/status")
print("Status do Caixa:", r.status_code, r.text)
r2 = requests.get("https://registro-bug.onrender.com/configuracao")
print("Configuração:", r2.status_code, r2.text[:200])
