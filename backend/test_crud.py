from database import SessionLocal
import crud
db = SessionLocal()
try:
    crud.get_relatorio_dados(db, 1)
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
