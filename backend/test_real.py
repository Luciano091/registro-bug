import sys, os
from database import SessionLocal
import main

db = SessionLocal()
try:
    res = main.get_dashboard_relatorios(periodo="mes", db=db)
    print("SUCCESS!")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
