-- Run these queries in Neon Console to check data status

-- 1. Check CSV files and their processing status
SELECT 
    id as file_id,
    filename,
    status,
    forecasts_generated,
    uploaded_at
FROM csv_files
ORDER BY uploaded_at DESC
LIMIT 5;

-- 2. Check if forecasts exist (replace YOUR_COMPANY_ID)
SELECT 
    COUNT(*) as total_forecasts,
    COUNT(DISTINCT csv_id) as files_with_forecasts,
    COUNT(DISTINCT metric) as unique_metrics
FROM forecasts
WHERE company_id = 'YOUR_COMPANY_ID';  -- Replace with your company_id

-- 3. Check forecast details for a specific file (replace YOUR_FILE_ID)
SELECT 
    metric,
    group_type,
    group_key,
    COUNT(*) as forecast_rows
FROM forecasts
WHERE csv_id = 'YOUR_FILE_ID'  -- Replace with your file_id
GROUP BY metric, group_type, group_key;

-- 4. Check RFM segments exist
SELECT COUNT(*) as rfm_count
FROM rfm_segments
WHERE company_id = 'YOUR_COMPANY_ID';  -- Replace with your company_id

-- 5. Check product clusters exist
SELECT COUNT(*) as cluster_count
FROM product_clusters
WHERE company_id = 'YOUR_COMPANY_ID';  -- Replace with your company_id

