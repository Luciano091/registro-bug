import re

with open('schemas.py', 'r') as f:
    content = f.read()

financial_cols = [
    'preco_compra', 'preco', 'preco_promocao', 'valor', 'pedido_minimo',
    'preco_adicional', 'subtotal', 'taxa_entrega', 'taxa_servico', 'desconto',
    'total', 'custo_unitario', 'valor_unitario', 'preco_unitario',
    'taxa_base_entrega', 'taxa_por_km', 'pedido_minimo_entrega',
    'entrega_gratis_acima', 'taxa', 'saldo_inicial', 'saldo_final'
]

if "from decimal import Decimal" not in content:
    content = "from decimal import Decimal\n" + content

lines = content.split('\n')
new_lines = []
for line in lines:
    for col in financial_cols:
        # Match "    col: float" or "    col: Optional[float]"
        pattern = fr"(\b{col}\s*:\s*(?:Optional\[)?)(float)(\]?)"
        if re.search(pattern, line):
            line = re.sub(pattern, r"\1Decimal\3", line)
    new_lines.append(line)

with open('schemas.py', 'w') as f:
    f.write('\n'.join(new_lines))
