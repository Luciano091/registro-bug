from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ClienteBase(BaseModel):
    nome: str
    email: str
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    foto_url: Optional[str] = None

class ClienteCreate(ClienteBase):
    google_id: str

class ClienteUpdate(BaseModel):
    telefone: Optional[str] = None
    endereco: Optional[str] = None

class Cliente(ClienteBase):
    id: int
    data_cadastro: datetime

    class Config:
        from_attributes = True


# --- Produto ---
class ProdutoBase(BaseModel):
    nome: str
    categoria: str
    categoria_id: Optional[int] = None
    setor_producao_id: Optional[int] = None
    descricao: Optional[str] = None
    imagem_url: Optional[str] = None
    preco_compra: Optional[float] = 0.0
    preco: float
    ativo: bool = True
    controlar_estoque: bool = False
    estoque: int = 0
    is_promocao: bool = False
    preco_promocao: Optional[float] = None
    promocao_inicio: Optional[datetime] = None
    promocao_fim: Optional[datetime] = None
    dias_semana: str = "0,1,2,3,4,5,6"
    horario_inicio: Optional[str] = None
    horario_fim: Optional[str] = None
    disponivel_delivery: bool = True
    disponivel_retirada: bool = True
    disponivel_salao: bool = True
    is_combo: bool = False

class ProdutoCreate(ProdutoBase):
    pass

class SetorProducaoBase(BaseModel):
    nome: str = Field(min_length=1, max_length=80)
    cor: str = "#f97316"
    ordem: int = 0
    ativo: bool = True

class SetorProducaoCreate(SetorProducaoBase):
    pass

class SetorProducao(SetorProducaoBase):
    id: int
    class Config:
        from_attributes = True

class ProdutoSetorUpdate(BaseModel):
    setor_producao_id: Optional[int] = None

class CategoriaBase(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    descricao: Optional[str] = Field(default=None, max_length=255)
    ordem: int = 0
    ativo: bool = True
    dias_semana: str = "0,1,2,3,4,5,6"
    horario_inicio: Optional[str] = None
    horario_fim: Optional[str] = None

class CategoriaCreate(CategoriaBase):
    pass

class Categoria(CategoriaBase):
    id: int
    class Config:
        from_attributes = True

class CupomBase(BaseModel):
    codigo: str = Field(min_length=2, max_length=40)
    descricao: Optional[str] = Field(default=None, max_length=255)
    tipo: str = "percentual"
    valor: float = Field(gt=0)
    pedido_minimo: float = Field(default=0, ge=0)
    inicio: Optional[datetime] = None
    fim: Optional[datetime] = None
    limite_usos: Optional[int] = Field(default=None, ge=1)
    ativo: bool = True

class CupomCreate(CupomBase):
    pass

class Cupom(CupomBase):
    id: int
    usos: int
    class Config:
        from_attributes = True

class CupomValidar(BaseModel):
    codigo: str
    subtotal: float = Field(ge=0)

class CupomValidado(BaseModel):
    codigo: str
    desconto: float
    total: float
    descricao: Optional[str] = None

class OpcaoProdutoBase(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    preco_adicional: float = Field(default=0, ge=0)
    ativo: bool = True
    ordem: int = 0
    produto_vinculado_id: Optional[int] = None

class OpcaoProdutoCreate(OpcaoProdutoBase):
    pass

class OpcaoProduto(OpcaoProdutoBase):
    id: int
    grupo_id: int
    class Config:
        from_attributes = True

class GrupoOpcaoBase(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    minimo: int = Field(default=0, ge=0)
    maximo: int = Field(default=1, ge=1)
    obrigatorio: bool = False
    ativo: bool = True
    ordem: int = 0

class GrupoOpcaoCreate(GrupoOpcaoBase):
    opcoes: List[OpcaoProdutoCreate] = Field(default_factory=list)

class GrupoOpcao(GrupoOpcaoBase):
    id: int
    opcoes: List[OpcaoProduto] = Field(default_factory=list)
    class Config:
        from_attributes = True

class ProdutoGruposUpdate(BaseModel):
    grupo_ids: List[int] = Field(default_factory=list)

class Produto(ProdutoBase):
    id: int
    promocao_ativa: bool = False
    grupos_opcoes: List[GrupoOpcao] = Field(default_factory=list)
    class Config:
        from_attributes = True

# --- Item Pedido ---
class ItemPedidoBase(BaseModel):
    produto_id: int
    quantidade: int

class ItemPedidoOpcaoCreate(BaseModel):
    opcao_id: int
    quantidade: int = Field(default=1, ge=1, le=20)

class ItemPedidoCreate(ItemPedidoBase):
    observacao: Optional[str] = Field(default=None, max_length=500)
    opcoes: List[ItemPedidoOpcaoCreate] = Field(default_factory=list)

class ItemPedidoOpcao(BaseModel):
    id: int
    opcao_id: Optional[int] = None
    produto_vinculado_id: Optional[int] = None
    grupo_nome: str
    opcao_nome: str
    preco_unitario: float
    quantidade: int
    subtotal: float
    class Config:
        from_attributes = True

class ItemPedido(ItemPedidoBase):
    id: int
    pedido_id: int
    custo_unitario: float = 0.0
    valor_unitario: float
    subtotal: float
    produto_nome: Optional[str] = None
    observacao: Optional[str] = None
    setor_producao_id: Optional[int] = None
    status_producao: str = "pendente"
    criado_em: Optional[datetime] = None
    iniciado_em: Optional[datetime] = None
    pronto_em: Optional[datetime] = None
    opcoes: List[ItemPedidoOpcao] = Field(default_factory=list)
    
    produto: Optional[Produto] = None
    
    class Config:
        from_attributes = True

class EntregadorResumo(BaseModel):
    id: int
    nome: str
    telefone: Optional[str] = None
    veiculo: Optional[str] = None
    placa: Optional[str] = None
    status_entrega: str = "disponivel"
    class Config:
        from_attributes = True

class EntregaResumo(BaseModel):
    id: int
    status: str
    observacao: Optional[str] = None
    atribuido_em: Optional[datetime] = None
    retirado_em: Optional[datetime] = None
    entregue_em: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    localizacao_atualizada_em: Optional[datetime] = None
    entregador: Optional[EntregadorResumo] = None
    class Config:
        from_attributes = True

class EntregaAtribuir(BaseModel):
    entregador_id: int

class EntregaStatusUpdate(BaseModel):
    status: str
    observacao: Optional[str] = Field(default=None, max_length=500)

class EntregaLocalizacao(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

class DispositivoPushCreate(BaseModel):
    token: str = Field(min_length=20, max_length=4096)
    plataforma: str = Field(default="android", max_length=30)
    app_version: Optional[str] = Field(default=None, max_length=30)

class DispositivoPush(BaseModel):
    id: int
    plataforma: str
    app_version: Optional[str] = None
    ativo: bool
    atualizado_em: datetime
    class Config:
        from_attributes = True

# --- Pedido ---
class PedidoBase(BaseModel):
    uuid: Optional[str] = None
    cliente_id: Optional[int] = None
    cliente: str
    telefone: str
    endereco: Optional[str] = None
    bairro: Optional[str] = None
    latitude_entrega: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude_entrega: Optional[float] = Field(default=None, ge=-180, le=180)
    tipo_entrega: str
    forma_pagamento: str
    observacao: Optional[str] = None
    cupom_codigo: Optional[str] = None
    motivo_cancelamento: Optional[str] = None
    estornado: bool = False

class PedidoCreate(PedidoBase):
    itens: List[ItemPedidoCreate]

class PedidoAdminCreate(PedidoCreate):
    taxa_entrega_manual: Optional[float] = Field(default=None, ge=0)

class Pedido(PedidoBase):
    id: int
    numero: str
    status: str
    subtotal: float
    taxa_entrega: float
    taxa_servico: float = 0.0
    desconto: float = 0.0
    total: float
    data: datetime
    itens: List[ItemPedido] = Field(default_factory=list)
    entrega: Optional[EntregaResumo] = None

    class Config:
        from_attributes = True

# --- Salão, mesas e comandas ---
class MesaBase(BaseModel):
    numero: str = Field(min_length=1, max_length=20)
    nome: Optional[str] = Field(default=None, max_length=80)
    capacidade: int = Field(default=4, ge=1, le=100)
    ativo: bool = True
    ordem: int = 0

class MesaCreate(MesaBase):
    pass

class Mesa(MesaBase):
    id: int
    status: str
    class Config:
        from_attributes = True

class ComandaItemAdicionar(BaseModel):
    produto_id: int
    quantidade: int = Field(default=1, ge=1, le=100)
    observacao: Optional[str] = Field(default=None, max_length=500)
    opcoes: List[ItemPedidoOpcaoCreate] = Field(default_factory=list)

class ComandaItemStatus(BaseModel):
    status: str

class ComandaItem(BaseModel):
    id: int
    produto_id: int
    produto_nome: str
    quantidade: int
    custo_unitario: float
    valor_unitario: float
    subtotal: float
    observacao: Optional[str] = None
    opcoes_json: Optional[str] = None
    status: str
    criado_em: datetime
    setor_producao_id: Optional[int] = None
    iniciado_em: Optional[datetime] = None
    pronto_em: Optional[datetime] = None
    class Config:
        from_attributes = True

class ComandaPagamentoCreate(BaseModel):
    forma_pagamento: str = Field(min_length=2, max_length=50)
    valor: float = Field(gt=0)

class ComandaPagamento(BaseModel):
    id: int
    forma_pagamento: str
    valor: float
    criado_em: datetime
    class Config:
        from_attributes = True

class ComandaAbrir(BaseModel):
    mesa_id: int
    cliente: Optional[str] = Field(default=None, max_length=120)
    pessoas: int = Field(default=1, ge=1, le=100)
    observacao: Optional[str] = Field(default=None, max_length=500)

class ComandaTransferir(BaseModel):
    mesa_destino_id: int

class ComandaUnir(BaseModel):
    comanda_origem_id: int

class ComandaFechar(BaseModel):
    desconto: float = Field(default=0, ge=0)
    taxa_servico_percentual: float = Field(default=0, ge=0, le=100)
    pagamentos: List[ComandaPagamentoCreate] = Field(min_length=1)

class Comanda(BaseModel):
    id: int
    mesa_id: int
    numero: str
    cliente: Optional[str] = None
    pessoas: int
    status: str
    observacao: Optional[str] = None
    aberta_por_nome: str
    aberta_em: datetime
    fechada_em: Optional[datetime] = None
    subtotal: float
    desconto: float
    taxa_servico: float
    total: float
    itens: List[ComandaItem] = Field(default_factory=list)
    pagamentos: List[ComandaPagamento] = Field(default_factory=list)
    class Config:
        from_attributes = True

class MesaVisao(Mesa):
    comanda: Optional[Comanda] = None

class CozinhaStatusUpdate(BaseModel):
    status: str

class CozinhaOpcao(BaseModel):
    grupo: str
    opcao: str
    quantidade: int = 1

class CozinhaItem(BaseModel):
    id: int
    origem: str
    produto_nome: str
    quantidade: int
    observacao: Optional[str] = None
    opcoes: List[CozinhaOpcao] = Field(default_factory=list)
    status: str
    setor_producao_id: Optional[int] = None
    criado_em: datetime
    iniciado_em: Optional[datetime] = None
    pronto_em: Optional[datetime] = None

class CozinhaTicket(BaseModel):
    chave: str
    origem: str
    referencia: str
    cliente: Optional[str] = None
    tipo: str
    mesa: Optional[str] = None
    criado_em: datetime
    itens: List[CozinhaItem] = Field(default_factory=list)

# --- Configuracao ---
class ConfiguracaoBase(BaseModel):
    nome_empresa: str
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    logo: Optional[str] = None
    taxa_entrega: float
    entrega_habilitada: bool = True
    entrega_modo: str = "fixa"
    pedido_minimo_entrega: float = Field(default=0.0, ge=0)
    entrega_gratis_acima: Optional[float] = Field(default=None, ge=0)
    raio_entrega_km: Optional[float] = Field(default=None, gt=0)
    taxa_base_entrega: float = Field(default=0.0, ge=0)
    distancia_base_km: float = Field(default=0.0, ge=0)
    taxa_por_km: float = Field(default=0.0, ge=0)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    tempo_medio_preparo: int
    whatsapp_auto_reply_enabled: bool = False
    whatsapp_auto_reply_text: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None
    senha_admin: Optional[str] = None

class ConfiguracaoCreate(ConfiguracaoBase):
    pass

class AreaEntregaBase(BaseModel):
    bairro: str = Field(min_length=2, max_length=120)
    taxa: float = Field(default=0.0, ge=0)
    pedido_minimo: float = Field(default=0.0, ge=0)
    prazo_adicional_min: int = Field(default=0, ge=0, le=240)
    ativo: bool = True

class AreaEntrega(AreaEntregaBase):
    id: int
    class Config:
        from_attributes = True

class EntregaConfiguracaoUpdate(BaseModel):
    entrega_habilitada: bool = True
    entrega_modo: str = "fixa"
    taxa_fixa: float = Field(default=0.0, ge=0)
    pedido_minimo: float = Field(default=0.0, ge=0)
    entrega_gratis_acima: Optional[float] = Field(default=None, ge=0)
    raio_km: Optional[float] = Field(default=None, gt=0)
    taxa_base: float = Field(default=0.0, ge=0)
    distancia_base_km: float = Field(default=0.0, ge=0)
    taxa_por_km: float = Field(default=0.0, ge=0)
    latitude_origem: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude_origem: Optional[float] = Field(default=None, ge=-180, le=180)
    areas: List[AreaEntregaBase] = Field(default_factory=list)

class EntregaConfiguracao(EntregaConfiguracaoUpdate):
    areas: List[AreaEntrega] = Field(default_factory=list)

class EntregaCotacaoRequest(BaseModel):
    subtotal: float = Field(ge=0)
    bairro: Optional[str] = Field(default=None, max_length=120)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)

class EntregaCotacao(BaseModel):
    atendido: bool
    taxa: float = 0.0
    pedido_minimo: float = 0.0
    faltam_para_minimo: float = 0.0
    distancia_km: Optional[float] = None
    prazo_estimado_min: Optional[int] = None
    mensagem: str

class LoginRequest(BaseModel):
    senha: str
    estabelecimento: str = "bisburger"
    email: Optional[str] = None

class UsuarioCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    senha: str = Field(min_length=8, max_length=72)
    perfil: str
    telefone: Optional[str] = None
    veiculo: Optional[str] = None
    placa: Optional[str] = None

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    senha: Optional[str] = Field(default=None, min_length=8, max_length=72)
    perfil: Optional[str] = None
    ativo: Optional[bool] = None
    telefone: Optional[str] = None
    veiculo: Optional[str] = None
    placa: Optional[str] = None
    status_entrega: Optional[str] = None

class Usuario(BaseModel):
    id: int
    nome: str
    email: str
    perfil: str
    ativo: bool
    criado_em: datetime
    ultimo_acesso_em: Optional[datetime] = None
    telefone: Optional[str] = None
    veiculo: Optional[str] = None
    placa: Optional[str] = None
    status_entrega: str = "disponivel"

    class Config:
        from_attributes = True

class SessaoUsuario(BaseModel):
    id: Optional[int] = None
    nome: str
    email: Optional[str] = None
    perfil: str
    permissoes: List[str]

class PlatformLoginRequest(BaseModel):
    email: str
    senha: str

class EstabelecimentoBase(BaseModel):
    nome: str
    slug: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    documento: Optional[str] = None
    logo: Optional[str] = None
    plano: str = "Essencial"
    status: str = "trial"
    trial_ate: Optional[datetime] = None

class EstabelecimentoCreate(EstabelecimentoBase):
    senha_inicial: str

class EstabelecimentoUpdate(BaseModel):
    nome: Optional[str] = None
    slug: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    documento: Optional[str] = None
    logo: Optional[str] = None
    plano: Optional[str] = None
    status: Optional[str] = None
    trial_ate: Optional[datetime] = None

class Estabelecimento(EstabelecimentoBase):
    id: int
    data_cadastro: datetime
    configuracao_id: Optional[int] = None
    class Config:
        from_attributes = True

class LeadComercialCreate(BaseModel):
    nome: str
    estabelecimento: str
    telefone: str
    email: Optional[str] = None
    cidade: Optional[str] = None
    mensagem: Optional[str] = None

class LeadComercialUpdate(BaseModel):
    status: str

class LeadComercial(LeadComercialCreate):
    id: int
    status: str
    data_cadastro: datetime
    class Config:
        from_attributes = True

class Configuracao(ConfiguracaoBase):
    id: int
    loja_aberta: Optional[bool] = False
    senha_admin: Optional[str] = Field(default=None, exclude=True)
    class Config:
        from_attributes = True

class ConfiguracaoPublica(BaseModel):
    nome_empresa: str
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    logo: Optional[str] = None
    taxa_entrega: float
    entrega_habilitada: bool = True
    entrega_modo: str = "fixa"
    pedido_minimo_entrega: float = 0.0
    entrega_gratis_acima: Optional[float] = None
    raio_entrega_km: Optional[float] = None
    tempo_medio_preparo: int
    loja_aberta: Optional[bool] = False
    class Config:
        from_attributes = True

# --- Caixa ---
class MovimentacaoCaixaBase(BaseModel):
    tipo: str
    valor: float
    forma_pagamento: str
    descricao: Optional[str] = None

class MovimentacaoCaixaCreate(MovimentacaoCaixaBase):
    pass

class MovimentacaoCaixa(MovimentacaoCaixaBase):
    id: int
    caixa_id: int
    data: datetime

    class Config:
        from_attributes = True

class CaixaBase(BaseModel):
    operador: str
    saldo_inicial: float

class CaixaCreate(CaixaBase):
    pass

class Caixa(CaixaBase):
    id: int
    data_abertura: datetime
    data_fechamento: Optional[datetime] = None
    saldo_final: Optional[float] = None
    status: str
    movimentacoes: List[MovimentacaoCaixa] = []

    class Config:
        from_attributes = True

# --- WhatsApp ---
class WhatsAppMensagemBase(BaseModel):
    direcao: str
    texto: str
    status: Optional[str] = "sent"
    meta_message_id: Optional[str] = None

class WhatsAppMensagemCreate(WhatsAppMensagemBase):
    pass

class WhatsAppMensagem(WhatsAppMensagemBase):
    id: int
    contato_id: int
    data: datetime

    class Config:
        from_attributes = True

class WhatsAppContatoBase(BaseModel):
    telefone: str
    nome: Optional[str] = None

class WhatsAppContatoCreate(WhatsAppContatoBase):
    pass

class WhatsAppContato(WhatsAppContatoBase):
    id: int
    ultima_interacao: datetime
    mensagens: List[WhatsAppMensagem] = []

    class Config:
        from_attributes = True

# --- Insumo ---
class InsumoCreate(BaseModel):
    nome: str
    unidade_medida: str
    custo_unitario: float
    controlar_estoque: bool = False
    estoque: float = 0.0

class Insumo(InsumoCreate):
    id: int
    class Config:
        from_attributes = True

# --- ProdutoInsumo (Ficha Tecnica) ---
class ProdutoInsumoBase(BaseModel):
    insumo_id: int
    quantidade: float

class ProdutoInsumoCreate(ProdutoInsumoBase):
    pass

class ProdutoInsumo(ProdutoInsumoBase):
    id: int
    produto_id: int
    insumo: Optional[Insumo] = None
    
    class Config:
        from_attributes = True


class PedidoCancelamento(BaseModel):
    motivo: str = Field(min_length=3, max_length=500)
    estornado: bool = False

class PasswordResetRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    estabelecimento: str = Field(min_length=1, max_length=120)

class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=20)
    nova_senha: str = Field(min_length=8, max_length=128)
