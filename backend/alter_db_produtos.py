from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DEFAULT_DB_URL = "postgresql://neondb_owner:npg_PJaA6coCD2QY@ep-little-tree-ac1havuv-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"

engine = create_engine(DEFAULT_DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def upgrade():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE produtos ADD COLUMN descricao VARCHAR;"))
        db.execute(text("ALTER TABLE produtos ADD COLUMN imagem_url VARCHAR;"))
        db.commit()
        print("Columns added successfully.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    upgrade()
