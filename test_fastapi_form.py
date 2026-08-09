from fastapi import FastAPI, Form, UploadFile, File
from fastapi.testclient import TestClient

app = FastAPI()

@app.post("/upload")
def upload(remover_fundo: bool = Form(False)):
    return {"remover_fundo": remover_fundo}

client = TestClient(app)
response = client.post("/upload", data={"remover_fundo": "true"})
print("With 'true' (dict):", response.json())

# simulating FormData
import io
files = {'file': ('test.txt', io.BytesIO(b"test"), 'text/plain')}
data = {'remover_fundo': 'true'}
response = client.post("/upload", files=files, data=data)
print("With files and data:", response.json())
