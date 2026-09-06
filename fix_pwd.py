import requests
import bcrypt

# Generate a bcrypt hash for "burger123"
hashed = bcrypt.hashpw(b"burger123", bcrypt.gensalt()).decode('utf-8')

# Get current config
r = requests.get("https://registro-bug.onrender.com/configuracao")
data = r.json()

# Set new password
data["senha_admin"] = hashed

# Send back
r = requests.put("https://registro-bug.onrender.com/configuracao", json=data)
print("Response:", r.status_code, r.text)
