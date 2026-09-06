filepath = 'backend/auth.py'
with open(filepath, 'r') as f:
    content = f.read()

new_auth = """    except jwt.PyJWTError:
        raise credentials_exception
        
    return True

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
    return None"""

content = content.replace("""    except jwt.PyJWTError:
        raise credentials_exception
        
    return True""", new_auth)

with open(filepath, 'w') as f:
    f.write(content)
