from database import engine, SessionLocal
import models
import traceback

try:
    print("Creating tables...")
    models.Base.metadata.create_all(bind=engine)
    print("Tables created.")
    
    db = SessionLocal()
    caixa = models.Caixa(operador="Test", saldo_inicial=0.0)
    db.add(caixa)
    db.commit()
    print("Caixa test insert successful!")
    
    # Clean up
    db.delete(caixa)
    db.commit()
    
except Exception as e:
    print("Error:", e)
    traceback.print_exc()
