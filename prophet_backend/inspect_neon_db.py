"""
Script to inspect Neon PostgreSQL database schema
"""
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = "postgresql://neondb_owner:npg_JI9GPt5gkNrp@ep-super-hat-a1xfyuuc-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

try:
    # Connect to Neon database
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    print("=" * 80)
    print("NEON DATABASE SCHEMA INSPECTION")
    print("=" * 80)
    
    # List all tables
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    tables = cursor.fetchall()
    
    print(f"\n📊 EXISTING TABLES ({len(tables)}):")
    print("-" * 80)
    for table in tables:
        print(f"  • {table['table_name']}")
    
    # For each table, show columns
    for table in tables:
        table_name = table['table_name']
        
        print(f"\n\n🔍 TABLE: {table_name}")
        print("-" * 80)
        
        cursor.execute(f"""
            SELECT 
                column_name, 
                data_type, 
                character_maximum_length,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = '{table_name}'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        
        for col in columns:
            nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
            col_type = col['data_type']
            if col['character_maximum_length']:
                col_type += f"({col['character_maximum_length']})"
            default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
            
            print(f"  {col['column_name']:30} {col_type:20} {nullable}{default}")
        
        # Show sample data (first 2 rows)
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 2;")
        samples = cursor.fetchall()
        if samples:
            print(f"\n  📄 Sample Data ({len(samples)} rows):")
            for idx, row in enumerate(samples, 1):
                print(f"    Row {idx}: {dict(row)}")
    
    # Check for company-related tables/columns
    print("\n\n" + "=" * 80)
    print("🔎 COMPANY-RELATED SCHEMA")
    print("=" * 80)
    
    cursor.execute("""
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE column_name ILIKE '%company%'
        ORDER BY table_name, column_name;
    """)
    company_cols = cursor.fetchall()
    
    if company_cols:
        print("\nFound company-related columns:")
        for col in company_cols:
            print(f"  • {col['table_name']}.{col['column_name']} ({col['data_type']})")
    else:
        print("\n⚠️  No company-related columns found")
    
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 80)
    print("✓ Inspection complete")
    print("=" * 80)

except Exception as e:
    print(f"\n❌ Error connecting to Neon database:")
    print(f"   {e}")
    import traceback
    traceback.print_exc()
