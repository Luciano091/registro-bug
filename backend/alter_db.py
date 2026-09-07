from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DEFAULT_DB_URL = os.environ["DATABASE_URL"]
engine = create_engine(DEFAULT_DB_URL)
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE configuracoes ADD COLUMN whatsapp_auto_reply_enabled BOOLEAN DEFAULT FALSE;"))
        print("Added whatsapp_auto_reply_enabled")
    except Exception as e:
        print("Could not add whatsapp_auto_reply_enabled:", e)
        
    try:
        conn.execute(text("ALTER TABLE configuracoes ADD COLUMN whatsapp_auto_reply_text VARCHAR;"))
        print("Added whatsapp_auto_reply_text")
    except Exception as e:
        print("Could not add whatsapp_auto_reply_text:", e)
    
    conn.commit()
print("Done altering DB")
import os
