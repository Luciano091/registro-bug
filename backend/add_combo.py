import re

with open('models.py', 'r') as f:
    content = f.read()

# Add is_combo to Produto
produto_pattern = r"(class Produto\(Base\):\n.*?\n    id = Column\(Integer, primary_key=True, index=True\))"
content = re.sub(produto_pattern, r"\1\n    is_combo = Column(Boolean, default=False)", content, flags=re.DOTALL)

# Add produto_vinculado_id to OpcaoProduto
opcao_pattern = r"(class OpcaoProduto\(Base\):\n.*?\n    id = Column\(Integer, primary_key=True, index=True\))"
content = re.sub(opcao_pattern, r"\1\n    produto_vinculado_id = Column(Integer, ForeignKey('produtos.id', ondelete='SET NULL'), nullable=True)", content, flags=re.DOTALL)

with open('models.py', 'w') as f:
    f.write(content)
