# PostgreSQL (Neon DB) Migration - Complete Summary

## Migration Overview
Successfully migrated Prophet Backend from SQLite to Neon PostgreSQL with company-based multi-tenancy.

## Database Details
- **Provider**: Neon (Serverless PostgreSQL)
- **Region**: AWS ap-southeast-1
- **Connection**: Pooled connection (1-20 connections)
- **Schema**: Integrated with existing companies/employees tables

## Migration Changes

### 1. Database Schema (`db/schema_postgres.sql`)
```sql
-- All tables now use:
- UUID primary keys (gen_random_uuid())
- company_id foreign key to companies table
- TIMESTAMP WITH TIME ZONE
- ON CONFLICT ... DO UPDATE for upserts
- Proper indexing on company_id + csv_id

Tables created:
✓ forecasts (with company_id)
✓ product_clusters (with company_id)
✓ rfm_segments (with company_id)
```

### 2. Database Layer (`db/database.py`)
**Changes:**
- Replaced `sqlite3` with `psycopg2`
- Implemented connection pooling (SimpleConnectionPool)
- Added `company_id` parameter to all CRUD functions
- Changed `INSERT OR REPLACE` to `ON CONFLICT ... DO UPDATE`
- Added context manager for connection handling
- Environment variable support via python-dotenv

**New Functions:**
- `get_company_by_id(company_id)`
- `get_all_companies()`

### 3. API Layer (`api/main.py`)
**New Endpoints:**
- `GET /companies` - List all companies
- `GET /companies/{company_id}` - Get company details

**Updated Endpoints (all now require `company_id` parameter):**
- `POST /run-all-forecasts?file_id=X&company_id=Y`
- `GET /forecast-results/{file_id}?company_id=Y`
- `GET /product-clusters/{file_id}?company_id=Y`
- `GET /rfm/{file_id}?company_id=Y`

### 4. Orchestrator (`api/orchestrator.py`)
**Changes:**
- Added `company_id` parameter to `ForecastPipeline.__init__()`
- Updated all database save calls to include `company_id`
- Updated `run_pipeline()` function signature

### 5. Environment Configuration
**New Files:**
- `.env` - Production environment variables
- `.env.example` - Template for configuration

**Environment Variables:**
```
DATABASE_URL=postgresql://...
LOG_LEVEL=INFO
PORT=8003
HOST=0.0.0.0
```

## Existing Neon Schema

### Companies Table
```sql
companies (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)

Existing Companies:
- Tech Innovations Ltd (Mumbai, India)
  ID: 306b5293-39bc-4cbc-bef0-9e9f87072e5c
- MediCare Health Systems (Hyderabad, India)
  ID: c96b8b3a-e979-4ca0-a28b-b772e730d46b
```

### Employees Table
```sql
employees (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    role TEXT,
    name TEXT,
    email TEXT,
    username TEXT,
    auth_user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
)
```

## Multi-Tenancy Implementation

### Data Isolation
- All Prophet tables include `company_id` column
- UNIQUE constraints include `company_id` for data segregation
- API endpoints require `company_id` parameter
- Queries filtered by `company_id` to ensure data isolation

### CSV Tagging
When uploading CSV and running forecasts:
```python
# Upload CSV (returns file_id)
POST /upload-csv
{file: retail_data.csv}

# Run forecasts with company association
POST /run-all-forecasts?file_id=xxx&company_id=306b5293...
```

## Testing

### Test Files Created
1. `inspect_neon_db.py` - Schema inspection tool
2. `create_tables.py` - Table creation script
3. `test_postgres_migration.py` - Comprehensive test suite
4. `test_simple.py` - Basic connectivity test

### Test Results
✓ Database connection successful
✓ Connection pooling working
✓ Tables created successfully
✓ Schema integrated with existing Neon structure
✓ Server starts successfully on port 8003

## API Examples

### List Companies
```bash
GET http://localhost:8003/companies

Response:
{
  "count": 2,
  "companies": [
    {
      "id": "306b5293-39bc-4cbc-bef0-9e9f87072e5c",
      "name": "Tech Innovations Ltd",
      "city": "Mumbai",
      "country": "India"
    },
    ...
  ]
}
```

### Run Forecasts
```bash
POST http://localhost:8003/run-all-forecasts?file_id=abc123&company_id=306b5293-39bc-4cbc-bef0-9e9f87072e5c

Response:
{
  "file_id": "abc123",
  "company_id": "306b5293-39bc-4cbc-bef0-9e9f87072e5c",
  "company_name": "Tech Innovations Ltd",
  "status": "success",
  "data_points": 1000,
  "product_clusters": 5,
  "rfm_segments": 8,
  "total_forecasts": 48
}
```

### Get Forecasts
```bash
GET http://localhost:8003/forecast-results/abc123?company_id=306b5293-39bc-4cbc-bef0-9e9f87072e5c

Response:
{
  "file_id": "abc123",
  "company_id": "306b5293-39bc-4cbc-bef0-9e9f87072e5c",
  "count": 48,
  "forecasts": [
    {
      "id": "uuid...",
      "metric": "total_revenue",
      "group_type": "overall",
      "forecast_data": [...]
    },
    ...
  ]
}
```

## File Structure Changes

```
prophet_backend/
├── db/
│   ├── database.py (NEW - PostgreSQL version)
│   ├── database_sqlite.py.backup (OLD - SQLite backup)
│   ├── schema_postgres.sql (NEW - PostgreSQL schema)
│   └── schema.sql (OLD - SQLite schema)
├── .env (NEW - Environment variables)
├── .env.example (NEW - Template)
├── inspect_neon_db.py (NEW - Schema inspection)
├── create_tables.py (NEW - Table creation)
├── test_postgres_migration.py (NEW - Test suite)
└── test_simple.py (NEW - Basic test)
```

## Benefits of Migration

1. **Multi-Tenancy**: Companies can share infrastructure while maintaining data isolation
2. **Scalability**: Cloud PostgreSQL handles concurrent users better than SQLite
3. **Connection Pooling**: Efficient database connection management
4. **UUID Primary Keys**: Better for distributed systems and data merging
5. **Proper Timestamps**: Timezone-aware timestamps for global operations
6. **Foreign Keys**: Referential integrity with companies table
7. **Upserts**: ON CONFLICT handling for re-running forecasts

## Next Steps for Production

1. **Authentication**: Add JWT authentication to verify company_id
2. **Authorization**: Ensure users can only access their company's data
3. **CSV Upload**: Tag uploaded files with company_id in metadata
4. **Monitoring**: Add PostgreSQL performance monitoring
5. **Backup**: Configure Neon automatic backups
6. **Migration Script**: Create data migration tool from SQLite to PostgreSQL (if needed)
7. **API Documentation**: Update Swagger docs with company_id requirements

## Notes

- Old SQLite database backed up as `database_sqlite.py.backup`
- Connection string in `.env` file (do not commit to git)
- Server running on http://localhost:8003
- Swagger docs available at http://localhost:8003/docs
- All AI insights functionality removed as requested
- Database auto-initializes on first connection
