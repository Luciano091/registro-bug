import httpx
import time
import json

payload = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123",
      "changes": [
        {
          "field": "messages",
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "123",
              "phone_number_id": "123"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Cliente Simulado API"
                },
                "wa_id": "5511999999999"
              }
            ],
            "messages": [
              {
                "from": "5511999999999",
                "id": f"wamid.test_{int(time.time())}",
                "timestamp": str(int(time.time())),
                "type": "text",
                "text": {
                  "body": "Oi! Queria fazer um pedido agora."
                }
              }
            ]
          }
        }
      ]
    }
  ]
}

print("Sending webhook payload to Render API...")
response = httpx.post("https://registro-bug.onrender.com/webhook", json=payload, timeout=10.0)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
