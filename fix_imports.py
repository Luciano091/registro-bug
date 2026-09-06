filepath = 'backend/main.py'
with open(filepath, 'r') as f:
    content = f.read()

imports = """import models, schemas, crud, whatsapp_api, auth
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests"""

content = content.replace("import models, schemas, crud, whatsapp_api, auth", imports)

with open(filepath, 'w') as f:
    f.write(content)
