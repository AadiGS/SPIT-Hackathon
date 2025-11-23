"""
Create Prophet backend tables in Neon PostgreSQL database.
"""
import psycopg2
from pathlib import Path

DATABASE_URL = "postgresql://neondb_owner:npg_JI9GPt5gkNrp@ep-super-hat-a1xfyuuc-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

def create_tables():
    """Create all Prophet backend tables."""
    schema_path = Path(__file__).parent / "db" / "schema_postgres.sql"
    
    with open(schema_path, 'r') as f:
        schema = f.read()
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    try:
        cursor.execute(schema)
        conn.commit()
        print("✓ Tables created successfully!")
        
        # Verify tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('forecasts', 'product_clusters', 'rfm_segments')
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        print(f"\n✓ Verified tables ({len(tables)}):")
        for table in tables:
            print(f"  • {table[0]}")
            
    except Exception as e:
        print(f"✗ Error creating tables: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    create_tables()
