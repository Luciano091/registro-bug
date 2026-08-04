import datetime
from datetime import timedelta

class MockProduto:
    def __init__(self):
        self.nome = "Burger"
        self.preco = 10.0

class MockItem:
    def __init__(self):
        self.quantidade = 1
        self.valor_unitario = 10.0
        self.produto = MockProduto()

class MockPedido:
    def __init__(self, dt):
        self.total = 10.0
        self.data = dt
        self.forma_pagamento = "Pix"
        self.itens = [MockItem()]

def run(periodo):
    hoje = (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).date()
    
    if periodo == "mes":
        inicio = datetime.datetime.combine(hoje.replace(day=1), datetime.time.min)
        fim = datetime.datetime.combine(hoje, datetime.time.max)
        if hoje.month == 1:
            inicio_ant = datetime.datetime.combine(hoje.replace(year=hoje.year-1, month=12, day=1), datetime.time.min)
        else:
            inicio_ant = datetime.datetime.combine(hoje.replace(month=hoje.month-1, day=1), datetime.time.min)
        import calendar
        _, last_day = calendar.monthrange(inicio_ant.year, inicio_ant.month)
        fim_ant = datetime.datetime.combine(inicio_ant.replace(day=last_day), datetime.time.max)
    
    pedidos_periodo = [MockPedido(datetime.datetime.utcnow() - datetime.timedelta(hours=3))]
    pedidos_anteriores = []
    
    faturamento_total = sum(p.total for p in pedidos_periodo)
    total_pedidos = len(pedidos_periodo)
    ticket_medio = faturamento_total / total_pedidos if total_pedidos > 0 else 0
    itens_vendidos = sum(sum(i.quantidade for i in p.itens) for p in pedidos_periodo)
    
    fat_ant = sum(p.total for p in pedidos_anteriores)
    ped_ant = len(pedidos_anteriores)
    tk_ant = fat_ant / ped_ant if ped_ant > 0 else 0
    it_ant = sum(sum(i.quantidade for i in p.itens) for p in pedidos_anteriores)
    
    def calc_growth(curr, ant):
        if ant == 0: return 100 if curr > 0 else 0
        return ((curr - ant) / ant) * 100

    pagamentos = {}
    categorias = {"Lanches": 0, "Bebidas": 0, "Acompanhamentos": 0, "Sobremesas": 0, "Outros": 0}
    
    for p in pedidos_periodo:
        if p.forma_pagamento not in pagamentos:
            pagamentos[p.forma_pagamento] = 0
        pagamentos[p.forma_pagamento] += p.total

        for item in p.itens:
            if item.produto:
                nome = (item.produto.nome or "").lower()
                cat = "Outros"
                if "burger" in nome or "lanche" in nome or "x-" in nome or "smash" in nome:
                    cat = "Lanches"
                elif "coca" in nome or "suco" in nome or "bebida" in nome or "água" in nome:
                    cat = "Bebidas"
                elif "frita" in nome or "batata" in nome or "nugget" in nome:
                    cat = "Acompanhamentos"
                elif "sorvete" in nome or "doce" in nome or "brownie" in nome:
                    cat = "Sobremesas"
                
                categorias[cat] += (item.quantidade * item.valor_unitario)
            
    vendas_pagamento = [{"name": k, "value": v} for k, v in pagamentos.items() if v > 0]
    vendas_categoria = [{"name": k, "value": v} for k, v in categorias.items() if v > 0]
    
    vendas_tempo = {}
    if periodo == "hoje":
        pass
    else:
        current_date = inicio.date()
        while current_date <= fim.date():
            vendas_tempo[current_date.strftime("%Y-%m-%d")] = {"name": f"{current_date.day:02d}/{current_date.month:02d}", "vendas": 0}
            current_date += timedelta(days=1)
        for p in pedidos_periodo:
            dia_str = p.data.date().strftime("%Y-%m-%d")
            if dia_str in vendas_tempo: vendas_tempo[dia_str]["vendas"] += p.total
        vendas_grafico = list(vendas_tempo.values())

    vendas_produtos = {}
    for p in pedidos_periodo:
        for item in p.itens:
            if item.produto:
                nome_prod = item.produto.nome or "Produto Sem Nome"
                if nome_prod not in vendas_produtos:
                    vendas_produtos[nome_prod] = 0
                vendas_produtos[nome_prod] += item.quantidade
                
    produtos_ord = sorted([{"nome": k, "qtd": v} for k, v in vendas_produtos.items()], key=lambda x: x["qtd"], reverse=True)[:5]
    
    heatmap = {
        "Manhã (06h - 11h)": {"Seg":0, "Ter":0, "Qua":0, "Qui":0, "Sex":0, "Sáb":0, "Dom":0, "Total":0},
        "Tarde (12h - 17h)": {"Seg":0, "Ter":0, "Qua":0, "Qui":0, "Sex":0, "Sáb":0, "Dom":0, "Total":0},
        "Noite (18h - 23h)": {"Seg":0, "Ter":0, "Qua":0, "Qui":0, "Sex":0, "Sáb":0, "Dom":0, "Total":0},
        "Total": {"Seg":0, "Ter":0, "Qua":0, "Qui":0, "Sex":0, "Sáb":0, "Dom":0, "Total":0}
    }
    dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    for p in pedidos_periodo:
        dia = dias[p.data.weekday()]
        h = p.data.hour
        if 6 <= h <= 11: turno = "Manhã (06h - 11h)"
        elif 12 <= h <= 17: turno = "Tarde (12h - 17h)"
        else: turno = "Noite (18h - 23h)"
        
        heatmap[turno][dia] += 1
        heatmap[turno]["Total"] += 1
        heatmap["Total"][dia] += 1
        heatmap["Total"]["Total"] += 1
        
    heatmap_list = [{"turno": k, **v} for k, v in heatmap.items()]

    return "SUCCESS"

print(run("mes"))
