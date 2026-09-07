import os
import urllib.parse
from sqlalchemy import create_engine, MetaData, text
import dotenv

dotenv.load_dotenv("backend/.env")
engine = create_engine(os.environ['DATABASE_URL'])
meta = MetaData()

def fix_sequences():
    meta.reflect(bind=engine)
    with engine.begin() as conn:
        for table in meta.tables.values():
            if 'id' in table.columns and str(table.columns['id'].type) == 'INTEGER':
                try:
                    conn.execute(text(f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM {table.name};"))
                    print(f"Fixed sequence for {table.name}")
                except Exception as e:
                    print(f"Could not fix {table.name}: {e}")

if __name__ == "__main__":
    fix_sequences()
