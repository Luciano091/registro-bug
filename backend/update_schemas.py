import re

with open('schemas.py', 'r') as f:
    content = f.read()

# Add is_combo to Produto
produto_pattern = r"(class ProdutoBase\(BaseModel\):\n.*?)(?=\nclass ProdutoCreate)"
content = re.sub(produto_pattern, r"\1    is_combo: Optional[bool] = False\n", content, flags=re.DOTALL)

# Add produto_vinculado_id to OpcaoProduto
opcao_pattern = r"(class OpcaoProdutoBase\(BaseModel\):\n.*?)(?=\nclass OpcaoProdutoCreate)"
content = re.sub(opcao_pattern, r"\1    produto_vinculado_id: Optional[int] = None\n", content, flags=re.DOTALL)

# Add motivo_cancelamento and estornado to Pedido
pedido_pattern = r"(class PedidoBase\(BaseModel\):\n.*?)(?=\nclass PedidoCreate)"
content = re.sub(pedido_pattern, r"\1    motivo_cancelamento: Optional[str] = None\n    estornado: Optional[bool] = False\n", content, flags=re.DOTALL)

with open('schemas.py', 'w') as f:
    f.write(content)
