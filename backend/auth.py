import os
import hmac
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import crud

# Configurações de Segurança
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "b3986db89e7c3f3a1f94d934bb7d00f7e4a1a31d9b3d2b0e9b2512")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 dias

import bcrypt

# Como não estamos usando form-data e sim JSON no login, usamos uma verificação customizada ou o esquema padrão com URL falsa
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

PERFIS = ("proprietario", "gerente", "caixa", "atendente", "garcom", "cozinha", "entregador")

PERMISSOES_POR_PERFIL = {
    "proprietario": {"*"},
    "gerente": {
        "dashboard.visualizar", "pedidos.visualizar", "pedidos.criar", "pedidos.atualizar",
        "caixa.visualizar", "caixa.operar", "cardapio.visualizar", "cardapio.gerenciar",
        "estoque.visualizar", "estoque.gerenciar", "relatorios.visualizar",
        "configuracoes.visualizar", "configuracoes.gerenciar", "usuarios.visualizar",
        "usuarios.gerenciar", "whatsapp.visualizar", "whatsapp.enviar",
        "salao.operar", "salao.gerenciar",
        "cozinha.operar", "cozinha.gerenciar",
        "entregas.visualizar", "entregas.gerenciar",
    },
    "caixa": {
        "dashboard.visualizar", "pedidos.visualizar", "pedidos.criar", "pedidos.atualizar",
        "caixa.visualizar", "caixa.operar", "cardapio.visualizar", "relatorios.visualizar",
        "salao.operar", "entregas.visualizar", "configuracoes.visualizar",
    },
    "atendente": {"pedidos.visualizar", "pedidos.criar", "pedidos.atualizar", "cardapio.visualizar", "salao.operar", "entregas.visualizar", "configuracoes.visualizar"},
    "garcom": {"pedidos.visualizar", "pedidos.criar", "cardapio.visualizar", "salao.operar", "configuracoes.visualizar"},
    "cozinha": {"pedidos.visualizar", "pedidos.atualizar", "cozinha.operar", "configuracoes.visualizar"},
    "entregador": {"entregas.visualizar", "entregas.operar"},
}

@dataclass(frozen=True)
class UsuarioAutenticado:
    estabelecimento_id: int
    usuario_id: Optional[int]
    nome: str
    email: Optional[str]
    perfil: str
    permissoes: frozenset[str]

    def pode(self, permissao: str) -> bool:
        return "*" in self.permissoes or permissao in self.permissoes

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if isinstance(plain_password, str):
            plain_password = plain_password.encode('utf-8')
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        return bcrypt.checkpw(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    if isinstance(password, str):
        password = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UsuarioAutenticado:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Acesso Negado: Token inválido ou expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role: str = payload.get("role")
        estabelecimento_id = payload.get("estabelecimento_id")
        if role not in ("admin", "staff") or not estabelecimento_id:
            raise credentials_exception
        import models
        estabelecimento = db.query(models.Estabelecimento).filter(
            models.Estabelecimento.id == int(estabelecimento_id),
            models.Estabelecimento.status.in_(("ativo", "trial")),
        ).first()
        if not estabelecimento:
            raise credentials_exception
        if role == "admin":
            return UsuarioAutenticado(
                estabelecimento_id=int(estabelecimento_id), usuario_id=payload.get("usuario_id"),
                nome=payload.get("nome") or "Administrador", email=payload.get("email"),
                perfil=payload.get("perfil") or "proprietario", permissoes=frozenset({"*"}),
            )
        usuario_id = payload.get("usuario_id")
        usuario = db.query(models.Usuario).filter(
            models.Usuario.id == usuario_id,
            models.Usuario.estabelecimento_id == int(estabelecimento_id),
            models.Usuario.ativo == True,
        ).first()
        if not usuario:
            raise credentials_exception
        permissoes = PERMISSOES_POR_PERFIL.get(usuario.perfil, set())
        return UsuarioAutenticado(
            estabelecimento_id=int(estabelecimento_id), usuario_id=usuario.id, nome=usuario.nome,
            email=usuario.email, perfil=usuario.perfil, permissoes=frozenset(permissoes),
        )
    except (jwt.PyJWTError, TypeError, ValueError):
        raise credentials_exception

def serialize_user(usuario: UsuarioAutenticado) -> dict:
    return {
        "id": usuario.usuario_id,
        "nome": usuario.nome,
        "email": usuario.email,
        "perfil": usuario.perfil,
        "permissoes": sorted(usuario.permissoes),
    }

def get_current_admin(usuario: UsuarioAutenticado = Depends(get_current_user)) -> int:
    """Compatibilidade temporária para rotas ainda não associadas a uma permissão."""
    return usuario.estabelecimento_id

def require_permission(permissao: str):
    def dependency(usuario: UsuarioAutenticado = Depends(get_current_user)) -> int:
        if not usuario.pode(permissao):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Você não tem permissão para esta ação.")
        return usuario.estabelecimento_id
    return dependency

def require_user_permission(permissao: str):
    def dependency(usuario: UsuarioAutenticado = Depends(get_current_user)) -> UsuarioAutenticado:
        if not usuario.pode(permissao):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Você não tem permissão para esta ação.")
        return usuario
    return dependency

def authenticate_platform_admin(email: str, password: str) -> bool:
    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
    configured_email = os.getenv("RITMESA_ADMIN_EMAIL")
    configured_password = os.getenv("RITMESA_ADMIN_PASSWORD")
    if is_production and (not configured_email or not configured_password):
        return False
    expected_email = configured_email or "admin@ritmesa.com.br"
    expected_password = configured_password or "ritmesa-dev"
    return hmac.compare_digest(email.strip().lower(), expected_email.strip().lower()) and hmac.compare_digest(password, expected_password)

def get_current_platform_admin(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Acesso exclusivo da administração Ritmesa.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "platform_admin":
            raise credentials_exception
        return payload
    except jwt.PyJWTError:
        raise credentials_exception

def get_current_cliente_optional(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role: str = payload.get("role")
        if role == "cliente":
            return payload.get("sub") # cliente_id
    except jwt.PyJWTError:
        pass
    return None
