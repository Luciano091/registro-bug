import re

filepath = 'backend/main.py'
with open(filepath, 'r') as f:
    content = f.read()

# Add imports
imports = """import crud, models, schemas, auth, relatorios
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests"""
content = content.replace("import crud, models, schemas, auth, relatorios", imports)

google_route = """

@app.post("/auth/google")
def auth_google(token_data: dict, db: Session = Depends(get_db)):
    # token_data must contain 'token' (the credential string from Google)
    token = token_data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token não fornecido")
    
    CLIENT_ID = "190788590463-vmt6leseuk1o1g8knrsi6f6he801ga1l.apps.googleusercontent.com"
    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), CLIENT_ID)
        
        google_id = idinfo['sub']
        email = idinfo['email']
        nome = idinfo.get('name', email)
        foto = idinfo.get('picture')
        
        cliente = crud.get_cliente_by_google_id(db, google_id)
        if not cliente:
            cliente = crud.get_cliente_by_email(db, email)
            if cliente:
                # Update existing user to link google_id
                cliente.google_id = google_id
                db.commit()
                db.refresh(cliente)
            else:
                # Create new
                novo_cliente = schemas.ClienteCreate(
                    google_id=google_id,
                    nome=nome,
                    email=email,
                    foto_url=foto
                )
                cliente = crud.create_cliente(db, novo_cliente)
                
        # Generate JWT for cliente
        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": str(cliente.id), "role": "cliente"}, expires_delta=access_token_expires
        )
        
        return {
            "token": access_token,
            "cliente": {
                "id": cliente.id,
                "nome": cliente.nome,
                "email": cliente.email,
                "foto_url": cliente.foto_url,
                "telefone": cliente.telefone,
                "endereco": cliente.endereco
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail="Token inválido")
"""
# Insert before @app.post("/pedidos")
content = content.replace("@app.post(\"/pedidos\", response_model=schemas.Pedido)", google_route + "@app.post(\"/pedidos\", response_model=schemas.Pedido)")

# Update create_pedido to accept user
old_create = """def create_pedido(pedido: schemas.PedidoCreate, db: Session = Depends(get_db)):"""
new_create = """def create_pedido(pedido: schemas.PedidoCreate, db: Session = Depends(get_db), cliente_id: Optional[str] = Depends(auth.get_current_cliente_optional)):
    if cliente_id:
        pedido.cliente_id = int(cliente_id)
"""
content = content.replace(old_create, new_create)

with open(filepath, 'w') as f:
    f.write(content)
