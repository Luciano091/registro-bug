from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- Produto ---
class ProdutoBase(BaseModel):
    nome: str
    categoria: str
    descricao: Optional[str] = None
    imagem_url: Optional[str] = None
    preco_compra: Optional[float] = 0.0
    preco: float
    ativo: bool = True
    controlar_estoque: bool = False
    estoque: int = 0

class ProdutoCreate(ProdutoBase):
    pass

class Produto(ProdutoBase):
    id: int
    class Config:
        from_attributes = True

# --- Item Pedido ---
class ItemPedidoBase(BaseModel):
    produto_id: int
    quantidade: int

class ItemPedidoCreate(ItemPedidoBase):
    pass

class ItemPedido(ItemPedidoBase):
    id: int
    pedido_id: int
    custo_unitario: float = 0.0
    valor_unitario: float
    subtotal: float
    
    produto: Optional[Produto] = None
    
    class Config:
        from_attributes = True

# --- Pedido ---
class PedidoBase(BaseModel):
    uuid: Optional[str] = None
    cliente: str
    telefone: str
    endereco: Optional[str] = None
    tipo_entrega: str
    forma_pagamento: str
    observacao: Optional[str] = None

class PedidoCreate(PedidoBase):
    itens: List[ItemPedidoCreate]

class Pedido(PedidoBase):
    id: int
    numero: str
    status: str
    subtotal: float
    taxa_entrega: float
    total: float
    data: datetime
    itens: List[ItemPedido] = []

    class Config:
        from_attributes = True

# --- Configuracao ---
class ConfiguracaoBase(BaseModel):
    nome_empresa: str
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    logo: Optional[str] = None
    taxa_entrega: float
    tempo_medio_preparo: int
    whatsapp_auto_reply_enabled: bool = False
    whatsapp_auto_reply_text: Optional[str] = None
    senha_admin: Optional[str] = None

class ConfiguracaoCreate(ConfiguracaoBase):
    pass

class LoginRequest(BaseModel):
    senha: str

class Configuracao(ConfiguracaoBase):
    id: int
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
