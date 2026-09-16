import sys

with open('backend/crud.py', 'r') as f:
    content = f.read()

content = content.replace("reward = round(pedido.total * 0.02, 2)", "reward = round(float(pedido.total) * 0.02, 2)")

with open('backend/crud.py', 'w') as f:
    f.write(content)
