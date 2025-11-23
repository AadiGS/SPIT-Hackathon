-- Check cluster forecasts in the database
-- Run this in your Neon Console SQL Editor to debug category filter issues

-- 1. See all unique group_type values
SELECT DISTINCT group_type, COUNT(*) as count
FROM forecasts
GROUP BY group_type
ORDER BY group_type;

-- 2. Check cluster forecasts specifically
SELECT 
    metric,
    group_type,
    group_key,
    LENGTH(forecast_data) as forecast_data_size
FROM forecasts
WHERE group_type = 'product_cluster'
ORDER BY metric, group_key;

-- 3. Check what cluster IDs exist in product_clusters table
SELECT 
    cluster_id,
    cluster_name,
    cluster_size
FROM product_clusters
ORDER BY cluster_id;

-- 4. Compare: which clusters have forecasts vs which don't
SELECT 
    pc.cluster_id,
    pc.cluster_name,
    CASE 
        WHEN f.group_key IS NOT NULL THEN 'Has Forecasts'
        ELSE 'No Forecasts'
    END as forecast_status
FROM product_clusters pc
LEFT JOIN (
    SELECT DISTINCT group_key
    FROM forecasts
    WHERE group_type = 'product_cluster'
) f ON pc.cluster_id::text = f.group_key
ORDER BY pc.cluster_id;

