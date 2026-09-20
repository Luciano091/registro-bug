from database import SessionLocal
import models

def run_migration():
    db = SessionLocal()
    try:
        EST_ID = 1
        
        targets = [
            ("Hambúrguer", 0, ["hamburguer", "hambúrguer"]),
            ("Hambúrguer Tradicional", 1, ["hamburguer tradicional", "hambúrguer tradicional"]),
            ("Acompanhamento", 2, ["acompanhamento", "acompanhamentos"]),
            ("Bebidas", 3, ["bebida", "bebidas"])
        ]
        
        # Get ONLY BisBurger categories
        categorias = db.query(models.Categoria).filter(models.Categoria.estabelecimento_id == EST_ID).all()
        
        # We will track which ones to delete
        to_delete = []
        
        for target_name, target_ordem, aliases in targets:
            matches = [c for c in categorias if c.nome.strip().lower() in aliases]
            
            if not matches:
                # If target doesn't exist at all, create it!
                new_cat = models.Categoria(
                    estabelecimento_id=EST_ID,
                    nome=target_name,
                    ordem=target_ordem,
                    ativo=True,
                    dias_semana="0,1,2,3,4,5,6"
                )
                db.add(new_cat)
                db.flush() # get ID
                continue
                
            # Pick the main one
            main_cat = None
            for c in matches:
                if c.nome.strip() == target_name:
                    main_cat = c
                    break
            if not main_cat:
                main_cat = matches[0]
                
            main_cat.nome = target_name
            main_cat.ordem = target_ordem
            main_cat.ativo = True
            
            # Move products from duplicates
            for duplicate in matches:
                if duplicate.id != main_cat.id:
                    # update products
                    db.query(models.Produto).filter(models.Produto.categoria_id == duplicate.id).update({"categoria_id": main_cat.id})
                    if duplicate not in to_delete:
                        to_delete.append(duplicate)
        
        # Hide any other stray categories
        all_aliases = [alias for _, _, aliases in targets for alias in aliases]
        for cat in categorias:
            if cat.nome.strip().lower() not in all_aliases and cat not in to_delete:
                cat.ativo = False
                cat.ordem = 99
                
        # Delete duplicates
        for duplicate in to_delete:
            db.delete(duplicate)
            
        db.commit()
        print("Categorias FIX successful.")
    except Exception as e:
        db.rollback()
        print(f"Migration error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
