from sqlalchemy.orm import Session
import backend.models as models
import backend.schemas as schemas
from backend.crud import get_comanda_aberta_mesa, recalcular_comanda, preco_vigente, produto_disponivel_agora
import json

def processar_pedido_mesa(db: Session, mesa_numero: str, estabelecimento_id: int, pedido: schemas.PedidoCreate, cliente_id: int = None):
    # Find table
    mesa = db.query(models.Mesa).filter(models.Mesa.estabelecimento_id == estabelecimento_id, models.Mesa.numero == mesa_numero).first()
    if not mesa or not mesa.ativo:
        raise ValueError(f"Mesa {mesa_numero} não encontrada ou está inativa.")

    # Find or create open comanda
    comanda = get_comanda_aberta_mesa(db, mesa.id, estabelecimento_id)
    if not comanda:
        if mesa.status != "livre":
            # Just force it open anyway if it was weirdly occupied but no comanda
            pass
        sequencia = db.query(models.Comanda).filter(models.Comanda.estabelecimento_id == estabelecimento_id).count() + 1
        comanda = models.Comanda(
            estabelecimento_id=estabelecimento_id,
            mesa_id=mesa.id,
            numero=f"C{sequencia:05d}",
            cliente=pedido.cliente or "Auto-atendimento",
            pessoas=1,
            aberta_por_nome="Auto-atendimento (QR Code)"
        )
        mesa.status = "ocupada"
        db.add(comanda)
        db.commit()
        db.refresh(comanda)

    # Process items
    for item in pedido.itens:
        produto = db.query(models.Produto).filter(models.Produto.id == item.produto_id, models.Produto.estabelecimento_id == estabelecimento_id).first()
        if not produto or not produto.ativo:
            raise ValueError("Um dos produtos não existe ou está indisponível.")
        if item.quantidade < 1:
            raise ValueError("A quantidade do produto deve ser maior que zero.")
        if not produto_disponivel_agora(produto):
            raise ValueError(f"O produto '{produto.nome}' não está disponível neste horário.")
        if not produto.disponivel_salao:
            raise ValueError(f"O produto '{produto.nome}' não está disponível para consumo no salão.")
        
        preco_venda = preco_vigente(produto)
        
        # Resolve options
        grupos_vinculados = {g.id: g for g in produto.grupos_opcoes if g.ativo}
        opcoes_ids = [s.opcao_id for s in item.opcoes]
        opcoes_bd = db.query(models.OpcaoProduto).join(models.GrupoOpcao).filter(
            models.OpcaoProduto.id.in_(opcoes_ids),
            models.OpcaoProduto.ativo == True,
            models.GrupoOpcao.estabelecimento_id == estabelecimento_id,
        ).all() if opcoes_ids else []
        opcoes_por_id = {opcao.id: opcao for opcao in opcoes_bd}
        
        if len(opcoes_por_id) != len(set(opcoes_ids)):
            raise ValueError("Uma das opções escolhidas é inválida ou está indisponível.")
            
        contagem_por_grupo = {grupo_id: 0 for grupo_id in grupos_vinculados}
        opcoes_selecionadas_json = []
        valor_opcoes = 0.0
        custo_opcoes = 0.0

        for selecao in item.opcoes:
            opcao = opcoes_por_id.get(selecao.opcao_id)
            if not opcao or opcao.grupo_id not in grupos_vinculados:
                raise ValueError("Opção não pertence ao produto.")
            contagem_por_grupo[opcao.grupo_id] += selecao.quantidade
            valor_opcoes += float(opcao.preco) * selecao.quantidade
            custo_opcoes += float(opcao.custo) * selecao.quantidade
            opcoes_selecionadas_json.append({
                "grupo": opcao.grupo.nome,
                "opcao": opcao.nome,
                "quantidade": selecao.quantidade,
                "preco": float(opcao.preco)
            })

        for grupo_id, count in contagem_por_grupo.items():
            grupo = grupos_vinculados[grupo_id]
            if count < grupo.minimo or count > grupo.maximo:
                raise ValueError(f"Quantidade de opções inválida para o grupo '{grupo.nome}'.")

        valor_unitario = preco_venda + valor_opcoes
        subtotal = valor_unitario * item.quantidade
        custo_unitario = (produto.custo or 0) + custo_opcoes

        novo_item = models.ComandaItem(
            comanda_id=comanda.id,
            produto_id=produto.id,
            setor_producao_id=produto.setor_producao_id,
            produto_nome=produto.nome,
            quantidade=item.quantidade,
            custo_unitario=custo_unitario,
            valor_unitario=valor_unitario,
            subtotal=subtotal,
            observacao=item.observacao,
            opcoes_json=json.dumps(opcoes_selecionadas_json) if opcoes_selecionadas_json else None,
            status="enviado"
        )
        db.add(novo_item)

    db.commit()
    recalcular_comanda(comanda)
    db.commit()
    db.refresh(comanda)
    
    return comanda
