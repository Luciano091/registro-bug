import os
import urllib.parse
from sqlalchemy import create_engine, MetaData, text

import dotenv
dotenv.load_dotenv("backend/.env")
OLD_URL = os.environ.get("DATABASE_URL")

pw = urllib.parse.quote('3Pj*yvP#BD.nTSR')
NEW_URL = f"postgresql://postgres.fkyradvexnmpdjbeveir:{pw}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

old_engine = create_engine(OLD_URL)
new_engine = create_engine(NEW_URL)

meta = MetaData()

def migrate():
    print("Reflecting old database...")
    meta.reflect(bind=old_engine)
    
    print("Creating tables in new database...")
    meta.create_all(bind=new_engine)
    
    with old_engine.connect() as old_conn, new_engine.begin() as new_conn:
        new_conn.execute(text("SET session_replication_role = 'replica';"))
        
        for table in meta.sorted_tables:
            print(f"Migrating table {table.name}...")
            new_conn.execute(table.delete())
            rows = old_conn.execute(table.select()).fetchall()
            
            if rows:
                print(f" Inserting {len(rows)} rows into {table.name}...")
                # Use insert().values() with list of dicts, but it's easier to just use execute(insert(), list_of_dicts)
                # But sometimes it raises error if rows is empty.
                dicts = [row._mapping for row in rows]
                new_conn.execute(table.insert(), dicts)
                
        new_conn.execute(text("SET session_replication_role = 'origin';"))
    
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
