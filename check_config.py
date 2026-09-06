import requests
res = requests.get("https://registro-bug.onrender.com/configuracao")
print(res.json())
