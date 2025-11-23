-- Quick check for RFM data
-- Run this in Neon Console to verify RFM segments exist

-- 1. Check latest uploaded files
SELECT 
    id as csv_id,
    filename,
    company_id,
    status,
    uploaded_at
FROM csv_files
ORDER BY uploaded_at DESC
LIMIT 3;

-- 2. Check RFM segments count
SELECT 
    company_id,
    csv_id,
    COUNT(*) as segment_count,
    SUM(customer_count) as total_customers,
    SUM(total_revenue) as total_revenue
FROM rfm_segments
GROUP BY company_id, csv_id
ORDER BY csv_id;

-- 3. Check actual RFM segment data (most recent file)
SELECT 
    segment_name,
    customer_count,
    total_revenue,
    avg_order_value,
    segment_stats
FROM rfm_segments
WHERE csv_id = (SELECT id FROM csv_files ORDER BY uploaded_at DESC LIMIT 1)
ORDER BY customer_count DESC;

