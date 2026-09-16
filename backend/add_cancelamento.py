import re

with open('models.py', 'r') as f:
    content = f.read()

pedido_pattern = r"(class Pedido\(Base\):\n.*?\n    id = Column\(Integer, primary_key=True, index=True\))"
content = re.sub(pedido_pattern, r"\1\n    motivo_cancelamento = Column(Text, nullable=True)\n    estornado = Column(Boolean, default=False)", content, flags=re.DOTALL)

with open('models.py', 'w') as f:
    f.write(content)
