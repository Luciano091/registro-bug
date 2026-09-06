filepath = 'backend/schemas.py'
with open(filepath, 'r') as f:
    content = f.read()

# Add Cliente schemas at the beginning
cliente_schemas = """from pydantic import BaseModel
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

"""

content = content.replace("from pydantic import BaseModel\nfrom typing import List, Optional\nfrom datetime import datetime\n", cliente_schemas)

# Update Pedido schemas
content = content.replace(
    "class PedidoBase(BaseModel):\n    uuid: Optional[str] = None",
    "class PedidoBase(BaseModel):\n    uuid: Optional[str] = None\n    cliente_id: Optional[int] = None"
)

with open(filepath, 'w') as f:
    f.write(content)
