-- Check if forecasts exist for a company
-- Replace 'YOUR_FILE_ID_HERE' with your actual file_id from csv_files table

-- 1. Check csv_files status
SELECT 
    id as file_id,
    filename,
    status,
    forecasts_generated,
    uploaded_at
FROM csv_files
ORDER BY uploaded_at DESC
LIMIT 5;

-- 2. Check forecast count per file (replace file_id in WHERE clause)
SELECT 
    file_id,
    metric_name,
    group_type,
    COUNT(*) as forecast_rows,
    MIN(ds) as first_date,
    MAX(ds) as last_date
FROM forecasts
-- WHERE file_id = 'YOUR_FILE_ID_HERE'  -- Uncomment and replace with your file_id
GROUP BY file_id, metric_name, group_type
ORDER BY file_id, metric_name;

-- 3. Check a sample of forecast values
SELECT 
    file_id,
    metric_name,
    group_type,
    group_key,
    ds,
    yhat,
    yhat_lower,
    yhat_upper
FROM forecasts
-- WHERE file_id = 'YOUR_FILE_ID_HERE'  -- Uncomment and replace with your file_id
ORDER BY metric_name, ds
LIMIT 20;

-- 4. Check RFM segments exist
SELECT 
    file_id,
    segment,
    customer_count,
    total_revenue,
    avg_recency,
    avg_frequency,
    avg_monetary
FROM rfm_segments
-- WHERE file_id = 'YOUR_FILE_ID_HERE'  -- Uncomment and replace with your file_id
ORDER BY customer_count DESC;

