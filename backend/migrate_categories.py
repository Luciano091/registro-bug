from database import SessionLocal
import models

def run_migration():
    db = SessionLocal()
    try:
        mapping = {
            "hamburguer": ("Hambúrguer", 0),
            "hambúrguer": ("Hambúrguer", 0),
            "hamburguer tradicional": ("Hambúrguer Tradicional", 1),
            "hambúrguer tradicional": ("Hambúrguer Tradicional", 1),
            "acompanhamento": ("Acompanhamento", 2),
            "bebida": ("Bebidas", 3),
            "bebidas": ("Bebidas", 3)
        }
        
        categorias = db.query(models.Categoria).all()
        for cat in categorias:
            nome_lower = cat.nome.strip().lower()
            if nome_lower in mapping:
                novo_nome, nova_ordem = mapping[nome_lower]
                cat.nome = novo_nome
                cat.ordem = nova_ordem
                
        db.commit()
        print("Categorias migration successful.")
    except Exception as e:
        db.rollback()
        print(f"Migration error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
