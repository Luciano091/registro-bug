from database import engine
from sqlalchemy import text

print("Adding columns to insumos table...")
with engine.connect() as connection:
    try:
        connection.execute(text("ALTER TABLE insumos ADD COLUMN controlar_estoque BOOLEAN DEFAULT FALSE"))
        connection.commit()
        print("Column controlar_estoque added.")
    except Exception as e:
        print("Column controlar_estoque might already exist:", e)

    try:
        connection.execute(text("ALTER TABLE insumos ADD COLUMN estoque FLOAT DEFAULT 0.0"))
        connection.commit()
        print("Column estoque added.")
    except Exception as e:
        print("Column estoque might already exist:", e)
        
print("Done.")
