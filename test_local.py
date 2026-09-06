import requests
import time
import subprocess
import os

proc = subprocess.Popen(["./venv/bin/uvicorn", "main:app", "--port", "8080"], cwd="backend")
time.sleep(3)

pedido = {
    "uuid": "test-1234",
    "cliente": "Test User",
    "telefone": "11999999999",
    "endereco": "Test Addr",
    "tipo_entrega": "Delivery",
    "forma_pagamento": "dinheiro",
    "itens": [
        {
            "produto_id": 1,
            "quantidade": 1,
            "observacao": ""
        }
    ]
}

try:
    r = requests.post("http://localhost:8080/pedidos", json=pedido)
    print("STATUS:", r.status_code)
    print("TEXT:", r.text)
except Exception as e:
    print(e)

proc.terminate()
