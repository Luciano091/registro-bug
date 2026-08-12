from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DEFAULT_DB_URL = "postgresql://neondb_owner:npg_PJaA6coCD2QY@ep-little-tree-ac1havuv-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DEFAULT_DB_URL)
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE produtos ADD COLUMN is_promocao BOOLEAN DEFAULT FALSE;"))
        print("Added is_promocao to produtos")
    except Exception as e:
        print("Could not add is_promocao:", e)
        
    try:
        conn.execute(text("ALTER TABLE produtos ADD COLUMN preco_promocao FLOAT;"))
        print("Added preco_promocao to produtos")
    except Exception as e:
        print("Could not add preco_promocao:", e)
    
    conn.commit()
print("Done altering DB")
