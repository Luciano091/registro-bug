import re

with open('models.py', 'r') as f:
    content = f.read()

financial_cols = [
    'preco_compra', 'preco', 'preco_promocao', 'valor', 'pedido_minimo',
    'preco_adicional', 'subtotal', 'taxa_entrega', 'taxa_servico', 'desconto',
    'total', 'custo_unitario', 'valor_unitario', 'preco_unitario',
    'taxa_base_entrega', 'taxa_por_km', 'pedido_minimo_entrega',
    'entrega_gratis_acima', 'taxa', 'saldo_inicial', 'saldo_final'
]

lines = content.split('\n')
new_lines = []
for line in lines:
    replaced = False
    for col in financial_cols:
        # Match "    col = Column(Float"
        pattern = fr"(\b{col}\s*=\s*Column\()Float"
        if re.search(pattern, line):
            line = re.sub(pattern, r"\1Numeric(10, 2)", line)
            replaced = True
            break
    new_lines.append(line)

with open('models.py', 'w') as f:
    f.write('\n'.join(new_lines))
