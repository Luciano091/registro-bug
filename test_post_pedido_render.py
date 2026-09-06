import requests

pedido = {
    "uuid": "test-render-1",
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

r = requests.post("https://registro-bug.onrender.com/pedidos", json=pedido)
print(r.status_code)
print(r.text)
