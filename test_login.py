import requests
r = requests.post("https://registro-bug.onrender.com/login", data={"username": "admin", "password": "burger123"})
print("Login with burger123:", r.status_code, r.text)

# Also test with the hash
hashed = "$2b$12$jZOHVtFP0N6/FPzFvNWdxuz1uSVd4JyspB3yrL7UC1wzoel88C7Jm"
r = requests.post("https://registro-bug.onrender.com/login", data={"username": "admin", "password": hashed})
print("Login with hash:", r.status_code, r.text)
