import os
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import WhatsAppContato, WhatsAppMensagem

DEFAULT_DB_URL = "postgresql://neondb_owner:npg_PJaA6coCD2QY@ep-little-tree-ac1havuv-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DEFAULT_DB_URL)
SessionLocal = sessionmaker(bind=engine)

def simulate_message():
    db = SessionLocal()
    phone = "5511999999999"
    name = "Cliente Simulado API"
    
    chat = db.query(WhatsAppContato).filter(WhatsAppContato.telefone == phone).first()
    if not chat:
        chat = WhatsAppContato(telefone=phone, nome=name)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        
    msg = WhatsAppMensagem(
        contato_id=chat.id,
        meta_message_id=f"wamid.test_{int(time.time())}",
        texto="Olá! Estou testando o atalho e a notificação global do sistema Burger Hause!",
        direcao="in"
    )
    db.add(msg)
    
    # Also update the chat modified time
    import datetime
    chat.ultima_interacao = datetime.datetime.utcnow()
    db.commit()
    print("✅ Nova mensagem (ao vivo) simulada injetada com sucesso no banco de dados!")
    db.close()

if __name__ == "__main__":
    simulate_message()
