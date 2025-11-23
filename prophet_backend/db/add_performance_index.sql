-- Performance optimization: Add composite index for fast forecast lookups
-- This index covers the most common query pattern and significantly speeds up filter changes
-- Run this in your Neon Console SQL Editor

CREATE INDEX IF NOT EXISTS idx_forecasts_lookup 
ON forecasts(company_id, csv_id, metric, group_type, group_key);

-- Verify the index was created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'forecasts'
ORDER BY indexname;

