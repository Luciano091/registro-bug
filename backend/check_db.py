from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Configuracao, WhatsAppMensagem, WhatsAppContato

DEFAULT_DB_URL = "postgresql://neondb_owner:npg_PJaA6coCD2QY@ep-little-tree-ac1havuv-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DEFAULT_DB_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

config = db.query(Configuracao).first()
print(f"Auto Reply Enabled: {config.whatsapp_auto_reply_enabled}")
print(f"Auto Reply Text: {config.whatsapp_auto_reply_text}")

contato = db.query(WhatsAppContato).filter(WhatsAppContato.telefone == "5511999999999").first()
if contato:
    print(f"Contato {contato.telefone} ultima_interacao: {contato.ultima_interacao}")
    mensagens = db.query(WhatsAppMensagem).filter(WhatsAppMensagem.contato_id == contato.id).order_by(WhatsAppMensagem.id.desc()).limit(3).all()
    for m in mensagens:
        print(f"Msg: {m.direcao} - {m.texto} - {m.data}")

db.close()
