from database import SessionLocal
from main import get_dashboard_relatorios
import traceback

db = SessionLocal()
try:
    print("Testing get_dashboard_relatorios...")
    get_dashboard_relatorios(periodo="mes", start=None, end=None, db=db, estabelecimento_id=1)
    print("Success")
except Exception as e:
    traceback.print_exc()
