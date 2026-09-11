from sqlalchemy import Column, Integer, String, Float, Numeric, Boolean, ForeignKey, DateTime, Text, UniqueConstraint
from sqlalchemy.orm import relationship
import datetime

def get_now():
    return datetime.datetime.utcnow() - datetime.timedelta(hours=3)

from database import Base

class Estabelecimento(Base):
    __tablename__ = "estabelecimentos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False, index=True)
    slug = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, nullable=True, index=True)
    telefone = Column(String, nullable=True)
    documento = Column(String, nullable=True)
    logo = Column(Text, nullable=True)
    plano = Column(String, default="Essencial")
    status = Column(String, default="trial", index=True)
    data_cadastro = Column(DateTime, default=get_now)
    trial_ate = Column(DateTime, nullable=True)
    configuracao_id = Column(Integer, ForeignKey("configuracoes.id"), nullable=True, unique=True)

class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        UniqueConstraint("estabelecimento_id", "email", name="uq_usuario_estabelecimento_email"),
    )

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=False, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    senha_hash = Column(String, nullable=False)
    perfil = Column(String, nullable=False, default="atendente", index=True)
    ativo = Column(Boolean, nullable=False, default=True, index=True)
    criado_em = Column(DateTime, default=get_now, nullable=False)
    ultimo_acesso_em = Column(DateTime, nullable=True)
    telefone = Column(String, nullable=True)
    veiculo = Column(String, nullable=True)
    placa = Column(String, nullable=True)
    status_entrega = Column(String, nullable=False, default="disponivel", index=True)

class LogAuditoria(Base):
    __tablename__ = "logs_auditoria"

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    acao = Column(String, nullable=False, index=True)
    entidade = Column(String, nullable=True, index=True)
    entidade_id = Column(String, nullable=True)
    detalhes = Column(Text, nullable=True)
    ip = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    criado_em = Column(DateTime, default=get_now, nullable=False, index=True)

class LeadComercial(Base):
    __tablename__ = "leads_comerciais"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    estabelecimento = Column(String, nullable=False)
    email = Column(String, nullable=True)
    telefone = Column(String, nullable=False)
    cidade = Column(String, nullable=True)
    mensagem = Column(Text, nullable=True)
    status = Column(String, default="novo", index=True)
    data_cadastro = Column(DateTime, default=get_now)

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=True, index=True)
    google_id = Column(String, unique=True, index=True)
    nome = Column(String)
    email = Column(String, unique=True, index=True)
    foto_url = Column(String, nullable=True)
    telefone = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    data_cadastro = Column(DateTime, default=get_now)
    
    pedidos = relationship("Pedido", back_populates="cliente_obj")

class Produto(Base):
    __tablename__ = "produtos"

    id = Column(Integer, primary_key=True, index=True)
    is_combo = Column(Boolean, nullable=False, default=False)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=True, index=True)
    nome = Column(String, index=True)
    categoria = Column(String, index=True)
    categoria_id = Column(Integer, ForeignKey("categorias.id", ondelete="SET NULL"), nullable=True, index=True)
    setor_producao_id = Column(Integer, ForeignKey("setores_producao.id", ondelete="SET NULL"), nullable=True, index=True)
    descricao = Column(String, nullable=True)
    imagem_url = Column(String, nullable=True)
    preco_compra = Column(Numeric(10, 2, asdecimal=False), default=0.0)
    preco = Column(Numeric(10, 2, asdecimal=False))
    ativo = Column(Boolean, default=True)
    controlar_estoque = Column(Boolean, default=False)
    estoque = Column(Integer, default=0)
    is_promocao = Column(Boolean, default=False)
    preco_promocao = Column(Numeric(10, 2, asdecimal=False), nullable=True)
    promocao_inicio = Column(DateTime, nullable=True)
    promocao_fim = Column(DateTime, nullable=True)
    dias_semana = Column(String, nullable=False, default="0,1,2,3,4,5,6")
    horario_inicio = Column(String, nullable=True)
    horario_fim = Column(String, nullable=True)
    disponivel_delivery = Column(Boolean, nullable=False, default=True)
    disponivel_retirada = Column(Boolean, nullable=False, default=True)
    disponivel_salao = Column(Boolean, nullable=False, default=True)
    
    fichas_tecnicas = relationship("ProdutoInsumo", back_populates="produto")
    grupos_opcoes = relationship("GrupoOpcao", secondary="produto_grupos_opcoes", order_by="ProdutoGrupoOpcao.ordem")
    categoria_obj = relationship("Categoria", back_populates="produtos")
    setor_producao = relationship("SetorProducao", back_populates="produtos")

    @property
    def promocao_ativa(self):
        if not self.is_promocao or self.preco_promocao is None:
            return False
        agora = get_now()
        return (self.promocao_inicio is None or agora >= self.promocao_inicio) and (self.promocao_fim is None or agora <= self.promocao_fim)

class Categoria(Base):
    __tablename__ = "categorias"
    __table_args__ = (UniqueConstraint("estabelecimento_id", "nome", name="uq_categoria_estabelecimento_nome"),)

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=False, index=True)
    nome = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    ordem = Column(Integer, nullable=False, default=0)
    ativo = Column(Boolean, nullable=False, default=True)
    dias_semana = Column(String, nullable=False, default="0,1,2,3,4,5,6")
    horario_inicio = Column(String, nullable=True)
    horario_fim = Column(String, nullable=True)
    produtos = relationship("Produto", back_populates="categoria_obj")

class SetorProducao(Base):
    __tablename__ = "setores_producao"
    __table_args__ = (UniqueConstraint("estabelecimento_id", "nome", name="uq_setor_producao_estabelecimento_nome"),)

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=False, index=True)
    nome = Column(String, nullable=False)
    cor = Column(String, nullable=False, default="#f97316")
    ordem = Column(Integer, nullable=False, default=0)
    ativo = Column(Boolean, nullable=False, default=True)
    produtos = relationship("Produto", back_populates="setor_producao")

class Cupom(Base):
    __tablename__ = "cupons"
    __table_args__ = (UniqueConstraint("estabelecimento_id", "codigo", name="uq_cupom_estabelecimento_codigo"),)

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=False, index=True)
    codigo = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    tipo = Column(String, nullable=False, default="percentual")
    valor = Column(Numeric(10, 2, asdecimal=False), nullable=False)
    pedido_minimo = Column(Numeric(10, 2, asdecimal=False), nullable=False, default=0.0)
    inicio = Column(DateTime, nullable=True)
    fim = Column(DateTime, nullable=True)
    limite_usos = Column(Integer, nullable=True)
    usos = Column(Integer, nullable=False, default=0)
    ativo = Column(Boolean, nullable=False, default=True)

class GrupoOpcao(Base):
    __tablename__ = "grupos_opcoes"
    __table_args__ = (UniqueConstraint("estabelecimento_id", "nome", name="uq_grupo_opcao_estabelecimento_nome"),)

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=False, index=True)
    nome = Column(String, nullable=False)
    minimo = Column(Integer, nullable=False, default=0)
    maximo = Column(Integer, nullable=False, default=1)
    obrigatorio = Column(Boolean, nullable=False, default=False)
    ativo = Column(Boolean, nullable=False, default=True)
    ordem = Column(Integer, nullable=False, default=0)
    opcoes = relationship("OpcaoProduto", back_populates="grupo", cascade="all, delete-orphan", order_by="OpcaoProduto.ordem")

class OpcaoProduto(Base):
    __tablename__ = "opcoes_produto"

    id = Column(Integer, primary_key=True, index=True)
    produto_vinculado_id = Column(Integer, ForeignKey('produtos.id', ondelete='SET NULL'), nullable=True)
    grupo_id = Column(Integer, ForeignKey("grupos_opcoes.id", ondelete="CASCADE"), nullable=False, index=True)
    nome = Column(String, nullable=False)
    preco_adicional = Column(Numeric(10, 2, asdecimal=False), nullable=False, default=0.0)
    ativo = Column(Boolean, nullable=False, default=True)
    ordem = Column(Integer, nullable=False, default=0)
    grupo = relationship("GrupoOpcao", back_populates="opcoes")

class ProdutoGrupoOpcao(Base):
    __tablename__ = "produto_grupos_opcoes"
    __table_args__ = (UniqueConstraint("produto_id", "grupo_id", name="uq_produto_grupo_opcao"),)

    id = Column(Integer, primary_key=True)
    produto_id = Column(Integer, ForeignKey("produtos.id", ondelete="CASCADE"), nullable=False, index=True)
    grupo_id = Column(Integer, ForeignKey("grupos_opcoes.id", ondelete="CASCADE"), nullable=False, index=True)
    ordem = Column(Integer, nullable=False, default=0)

class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    motivo_cancelamento = Column(Text, nullable=True)
    estornado = Column(Boolean, nullable=False, default=False)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=True, index=True)
    uuid = Column(String, unique=True, index=True, nullable=True)
    numero = Column(String, unique=True, index=True)
    cliente = Column(String, index=True)
    telefone = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    bairro = Column(String, nullable=True)
    latitude_entrega = Column(Float, nullable=True)
    longitude_entrega = Column(Float, nullable=True)
    tipo_entrega = Column(String) # "Delivery" ou "Retirada"
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    forma_pagamento = Column(String) # "Pix", "Cartão", "Dinheiro"
    status = Column(String, default="Recebido")
    subtotal = Column(Numeric(10, 2, asdecimal=False), default=0.0)
    taxa_entrega = Column(Numeric(10, 2, asdecimal=False), default=0.0)
    taxa_servico = Column(Numeric(10, 2, asdecimal=False), default=0.0)
    cupom_codigo = Column(String, nullable=True)
    desconto = Column(Numeric(10, 2, asdecimal=False), default=0.0)
    total = Column(Numeric(10, 2, asdecimal=False), default=0.0)
    observacao = Column(String, nullable=True)
    origem = Column(String, nullable=False, default="balcao")
    comanda_id = Column(Integer, ForeignKey("comandas.id"), nullable=True, unique=True, index=True)
    data = Column(DateTime, default=get_now)

    itens = relationship("ItemPedido", back_populates="pedido")
    cliente_obj = relationship("Cliente", back_populates="pedidos")
    entrega = relationship("Entrega", back_populates="pedido", uselist=False, cascade="all, delete-orphan")

class Entrega(Base):
    __tablename__ = "entregas"

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=False, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    entregador_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String, nullable=False, default="aguardando", index=True)
    observacao = Column(Text, nullable=True)
    atribuido_em = Column(DateTime, nullable=True)
    retirado_em = Column(DateTime, nullable=True)
    entregue_em = Column(DateTime, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    localizacao_atualizada_em = Column(DateTime, nullable=True)
    pedido = relationship("Pedido", back_populates="entrega")
    entregador = relationship("Usuario")

class Mesa(Base):
    __tablename__ = "mesas"
    __table_args__ = (UniqueConstraint("estabelecimento_id", "numero", name="uq_mesa_estabelecimento_numero"),)

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=False, index=True)
    numero = Column(String, nullable=False)
    nome = Column(String, nullable=True)
    capacidade = Column(Integer, nullable=False, default=4)
    status = Column(String, nullable=False, default="livre", index=True)
    ativo = Column(Boolean, nullable=False, default=True)
    ordem = Column(Integer, nullable=False, default=0)
    comandas = relationship("Comanda", back_populates="mesa")

class Comanda(Base):
    __tablename__ = "comandas"

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=False, index=True)
    mesa_id = Column(Integer, ForeignKey("mesas.id"), nullable=False, index=True)
    numero = Column(String, nullable=False, index=True)
    cliente = Column(String, nullable=True)
    pessoas = Column(Integer, nullable=False, default=1)
    status = Column(String, nullable=False, default="aberta", index=True)
    observacao = Column(Text, nullable=True)
    aberta_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    aberta_por_nome = Column(String, nullable=False)
    aberta_em = Column(DateTime, nullable=False, default=get_now)
    fechada_em = Column(DateTime, nullable=True)
    subtotal = Column(Numeric(10, 2, asdecimal=False), nullable=False, default=0.0)
    desconto = Column(Numeric(10, 2, asdecimal=False), nullable=False, default=0.0)
    taxa_servico = Column(Numeric(10, 2, asdecimal=False), nullable=False, default=0.0)
    total = Column(Numeric(10, 2, asdecimal=False), nullable=False, default=0.0)
    mesa = relationship("Mesa", back_populates="comandas")
    itens = relationship("ComandaItem", back_populates="comanda", cascade="all, delete-orphan", order_by="ComandaItem.id")
    pagamentos = relationship("ComandaPagamento", back_populates="comanda", cascade="all, delete-orphan")

class ComandaItem(Base):
    __tablename__ = "comanda_itens"

    id = Column(Integer, primary_key=True, index=True)
    comanda_id = Column(Integer, ForeignKey("comandas.id", ondelete="CASCADE"), nullable=False, index=True)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    setor_producao_id = Column(Integer, ForeignKey("setores_producao.id", ondelete="SET NULL"), nullable=True, index=True)
    produto_nome = Column(String, nullable=False)
    quantidade = Column(Integer, nullable=False, default=1)
    custo_unitario = Column(Numeric(10, 2, asdecimal=False), nullable=False, default=0.0)
    valor_unitario = Column(Numeric(10, 2, asdecimal=False), nullable=False)
    subtotal = Column(Numeric(10, 2, asdecimal=False), nullable=False)
    observacao = Column(Text, nullable=True)
    opcoes_json = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="enviado", index=True)
    criado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    criado_em = Column(DateTime, nullable=False, default=get_now)
    atualizado_em = Column(DateTime, nullable=False, default=get_now)
    iniciado_em = Column(DateTime, nullable=True)
    pronto_em = Column(DateTime, nullable=True)
    comanda = relationship("Comanda", back_populates="itens")

class ComandaPagamento(Base):
    __tablename__ = "comanda_pagamentos"

    id = Column(Integer, primary_key=True, index=True)
    comanda_id = Column(Integer, ForeignKey("comandas.id", ondelete="CASCADE"), nullable=False, index=True)
    forma_pagamento = Column(String, nullable=False)
    valor = Column(Numeric(10, 2, asdecimal=False), nullable=False)
    criado_em = Column(DateTime, nullable=False, default=get_now)
    comanda = relationship("Comanda", back_populates="pagamentos")

class ItemPedido(Base):
    __tablename__ = "itens_pedido"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"))
    produto_id = Column(Integer, ForeignKey("produtos.id"))
    setor_producao_id = Column(Integer, ForeignKey("setores_producao.id", ondelete="SET NULL"), nullable=True, index=True)
    quantidade = Column(Integer, default=1)
    custo_unitario = Column(Numeric(10, 2, asdecimal=False), default=0.0)
    valor_unitario = Column(Numeric(10, 2, asdecimal=False), default=0.0)
    subtotal = Column(Numeric(10, 2, asdecimal=False), default=0.0)
    produto_nome = Column(String, nullable=True)
    observacao = Column(Text, nullable=True)
    status_producao = Column(String, nullable=False, default="pendente", index=True)
    criado_em = Column(DateTime, nullable=False, default=get_now)
    iniciado_em = Column(DateTime, nullable=True)
    pronto_em = Column(DateTime, nullable=True)

    pedido = relationship("Pedido", back_populates="itens")
    produto = relationship("Produto")
    opcoes = relationship("ItemPedidoOpcao", back_populates="item", cascade="all, delete-orphan")

class ItemPedidoOpcao(Base):
    __tablename__ = "itens_pedido_opcoes"

    id = Column(Integer, primary_key=True)
    item_pedido_id = Column(Integer, ForeignKey("itens_pedido.id", ondelete="CASCADE"), nullable=False, index=True)
    opcao_id = Column(Integer, ForeignKey("opcoes_produto.id", ondelete="SET NULL"), nullable=True)
    produto_vinculado_id = Column(Integer, ForeignKey("produtos.id", ondelete="SET NULL"), nullable=True)
    grupo_nome = Column(String, nullable=False)
    opcao_nome = Column(String, nullable=False)
    preco_unitario = Column(Numeric(10, 2, asdecimal=False), nullable=False, default=0.0)
    quantidade = Column(Integer, nullable=False, default=1)
    subtotal = Column(Numeric(10, 2, asdecimal=False), nullable=False, default=0.0)
    item = relationship("ItemPedido", back_populates="opcoes")

class Configuracao(Base):
    __tablename__ = "configuracoes"

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=True, unique=True, index=True)
    nome_empresa = Column(String, default="BisBurger")
    telefone = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    logo = Column(String, nullable=True)
    taxa_entrega = Column(Numeric(10, 2, asdecimal=False), default=5.0)
    entrega_habilitada = Column(Boolean, nullable=False, default=True)
    entrega_modo = Column(String, nullable=False, default="fixa")
    pedido_minimo_entrega = Column(Numeric(10, 2, asdecimal=False), nullable=False, default=0.0)
    entrega_gratis_acima = Column(Numeric(10, 2, asdecimal=False), nullable=True)
    raio_entrega_km = Column(Float, nullable=True)
    taxa_base_entrega = Column(Numeric(10, 2, asdecimal=False), nullable=False, default=0.0)
    distancia_base_km = Column(Float, nullable=False, default=0.0)
    taxa_por_km = Column(Numeric(10, 2, asdecimal=False), nullable=False, default=0.0)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    tempo_medio_preparo = Column(Integer, default=30)
    whatsapp_auto_reply_enabled = Column(Boolean, default=False)
    whatsapp_auto_reply_text = Column(String, nullable=True)
    whatsapp_phone_number_id = Column(String, nullable=True, index=True)
    senha_admin = Column(String, default="burger123")

class AreaEntrega(Base):
    __tablename__ = "areas_entrega"
    __table_args__ = (UniqueConstraint("estabelecimento_id", "bairro_normalizado", name="uq_area_entrega_bairro"),)

    id = Column(Integer, primary_key=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id", ondelete="CASCADE"), nullable=False, index=True)
    bairro = Column(String, nullable=False)
    bairro_normalizado = Column(String, nullable=False)
    taxa = Column(Numeric(10, 2, asdecimal=False), nullable=False, default=0.0)
    pedido_minimo = Column(Numeric(10, 2, asdecimal=False), nullable=False, default=0.0)
    prazo_adicional_min = Column(Integer, nullable=False, default=0)
    ativo = Column(Boolean, nullable=False, default=True)

class Caixa(Base):
    __tablename__ = "caixas"

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=True, index=True)
    operador = Column(String)
    data_abertura = Column(DateTime, default=get_now)
    data_fechamento = Column(DateTime, nullable=True)
    saldo_inicial = Column(Numeric(10, 2, asdecimal=False), default=0.0)
    saldo_final = Column(Numeric(10, 2, asdecimal=False), nullable=True)
    status = Column(String, default="aberto") # "aberto" or "fechado"

    movimentacoes = relationship("MovimentacaoCaixa", back_populates="caixa")

class MovimentacaoCaixa(Base):
    __tablename__ = "movimentacoes_caixa"

    id = Column(Integer, primary_key=True, index=True)
    caixa_id = Column(Integer, ForeignKey("caixas.id"))
    tipo = Column(String) # "venda", "sangria", "suprimento"
    valor = Column(Numeric(10, 2, asdecimal=False), default=0.0)
    forma_pagamento = Column(String)
    descricao = Column(String, nullable=True)
    data = Column(DateTime, default=get_now)

    caixa = relationship("Caixa", back_populates="movimentacoes")

class WhatsAppContato(Base):
    __tablename__ = "whatsapp_contatos"

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=True, index=True)
    telefone = Column(String, index=True) # Ex: "5511999999999"
    nome = Column(String, nullable=True)
    ultima_interacao = Column(DateTime, default=get_now)
    
    mensagens = relationship("WhatsAppMensagem", back_populates="contato", order_by="WhatsAppMensagem.data")

class WhatsAppMensagem(Base):
    __tablename__ = "whatsapp_mensagens"

    id = Column(Integer, primary_key=True, index=True)
    contato_id = Column(Integer, ForeignKey("whatsapp_contatos.id"))
    direcao = Column(String) # "in" (recebida), "out" (enviada)
    texto = Column(String)
    status = Column(String, default="sent") # "sent", "delivered", "read", "received"
    data = Column(DateTime, default=get_now)
    meta_message_id = Column(String, nullable=True, unique=True) # ID da mensagem na Meta

    contato = relationship("WhatsAppContato", back_populates="mensagens")

class Insumo(Base):
    __tablename__ = "insumos"

    id = Column(Integer, primary_key=True, index=True)
    estabelecimento_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=True, index=True)
    nome = Column(String, index=True)
    unidade_medida = Column(String) # "UN", "KG", "G", "L", "ML"
    custo_unitario = Column(Numeric(10, 2, asdecimal=False), default=0.0)
    controlar_estoque = Column(Boolean, default=False)
    estoque = Column(Float, default=0.0)
    
    fichas_tecnicas = relationship("ProdutoInsumo", back_populates="insumo")

class ProdutoInsumo(Base):
    __tablename__ = "produto_insumos"

    id = Column(Integer, primary_key=True, index=True)
    produto_id = Column(Integer, ForeignKey("produtos.id", ondelete="CASCADE"))
    insumo_id = Column(Integer, ForeignKey("insumos.id", ondelete="CASCADE"))
    quantidade = Column(Float, default=1.0) # Quantity of the insumo used in the product
    
    produto = relationship("Produto", back_populates="fichas_tecnicas")
    insumo = relationship("Insumo", back_populates="fichas_tecnicas")
