import re

with open('main.py', 'r') as f:
    main_content = f.read()

auth_endpoints = """
@app.post("/auth/forgot-password")
def forgot_password(email: str = Body(..., embed=True), db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not usuario:
        return {"msg": "Se o e-mail existir, um link de recuperação foi enviado."}
    
    # Generate token
    token = auth.create_access_token(data={"sub": str(usuario.id), "type": "reset"}, expires_delta=timedelta(minutes=15))
    
    # In a real scenario, we send an email here.
    # We will log it to the console for now until SMTP is configured.
    print(f"\\n\\n=== EMAIL DE RECUPERAÇÃO ===")
    print(f"Para: {email}")
    print(f"Link: https://painel.ritmesa.com.br/reset-password?token={token}")
    print(f"============================\\n\\n")
    
    return {"msg": "Se o e-mail existir, um link de recuperação foi enviado."}

class ResetPasswordPayload(BaseModel):
    token: str
    nova_senha: str

@app.post("/auth/reset-password")
def reset_password(payload: ResetPasswordPayload, db: Session = Depends(get_db)):
    try:
        payload_data = jwt.decode(payload.token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        if payload_data.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Token inválido")
        user_id = int(payload_data.get("sub"))
    except JWTError:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
        
    usuario = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    if len(payload.nova_senha) < 8:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 8 caracteres")
        
    usuario.senha_hash = auth.get_password_hash(payload.nova_senha)
    db.commit()
    return {"msg": "Senha alterada com sucesso"}
"""

if "@app.post(\"/auth/forgot-password\")" not in main_content:
    # Need to make sure timedelta, Body, etc are imported
    if "from fastapi import Body" not in main_content:
        main_content = main_content.replace("from fastapi import FastAPI, Depends, HTTPException", "from fastapi import FastAPI, Depends, HTTPException, Body")
    if "from jose import JWTError, jwt" not in main_content:
        main_content = "from jose import JWTError, jwt\n" + main_content
    main_content += "\n" + auth_endpoints
    with open('main.py', 'w') as f:
        f.write(main_content)
