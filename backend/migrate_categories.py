from database import SessionLocal
import models
from sqlalchemy import func

def run_migration():
    db = SessionLocal()
    try:
        targets = [
            ("Hambúrguer", 0, ["hamburguer", "hambúrguer"]),
            ("Hambúrguer Tradicional", 1, ["hamburguer tradicional", "hambúrguer tradicional"]),
            ("Acompanhamento", 2, ["acompanhamento", "acompanhamentos"]),
            ("Bebidas", 3, ["bebida", "bebidas"])
        ]
        
        # Get all categories for establishment 1 (BisBurger)
        categorias = db.query(models.Categoria).all()
        
        for target_name, target_ordem, aliases in targets:
            # Find all categories that match the aliases
            matches = [c for c in categorias if c.nome.strip().lower() in aliases]
            
            if not matches:
                continue
                
            # Pick the main category (the one that already has the exact name, or the first one)
            main_cat = next((c for c in matches if c.nome.strip() == target_name), matches[0])
            
            # Move products from other matches to the main category
            for duplicate in matches:
                if duplicate.id != main_cat.id:
                    produtos = db.query(models.Produto).filter(models.Produto.categoria_id == duplicate.id).all()
                    for p in produtos:
                        p.categoria_id = main_cat.id
                    # Delete the duplicate
                    db.delete(duplicate)
                    categorias.remove(duplicate)
            
            # Now rename and reorder the main category
            main_cat.nome = target_name
            main_cat.ordem = target_ordem
        
        # For any other categories not in the target list, push them to the end
        all_aliases = [alias for _, _, aliases in targets for alias in aliases]
        for cat in categorias:
            if cat.nome.strip().lower() not in all_aliases:
                cat.ordem = 99
                
        db.commit()
        print("Categorias migration and deduplication successful.")
    except Exception as e:
        db.rollback()
        print(f"Migration error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
