import requests
res = requests.get("https://registro-bug.onrender.com/dashboard")
print(res.json())
