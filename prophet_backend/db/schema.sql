-- Database schema for Prophet ML Backend
-- SQLite schema (compatible with PostgreSQL with minor modifications)

-- Forecasts table: stores all multi-metric, multi-group forecasts
CREATE TABLE IF NOT EXISTS forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    csv_id TEXT NOT NULL,                    -- file_id from upload
    metric TEXT NOT NULL,                    -- total_revenue, order_count, unique_customers, avg_order_value
    group_type TEXT NOT NULL,                -- overall, country, product_cluster, rfm
    group_key TEXT,                          -- NULL for overall, country code, cluster_id, segment name
    model_path TEXT,                         -- path to saved Prophet model
    forecast_data TEXT,                      -- JSON array of forecast points {ds, yhat, yhat_lower, yhat_upper}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(csv_id, metric, group_type, group_key)
);

CREATE INDEX IF NOT EXISTS idx_forecasts_csv_id ON forecasts(csv_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_metric ON forecasts(metric);
CREATE INDEX IF NOT EXISTS idx_forecasts_group ON forecasts(group_type, group_key);

-- Product clusters table: stores clustering results
CREATE TABLE IF NOT EXISTS product_clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    csv_id TEXT NOT NULL,
    cluster_id INTEGER NOT NULL,
    cluster_name TEXT,                       -- Human-readable cluster name
    top_terms TEXT,                          -- JSON array of top TF-IDF terms
    sample_products TEXT,                    -- JSON array of sample products
    cluster_size INTEGER,                    -- number of products in cluster
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(csv_id, cluster_id)
);

CREATE INDEX IF NOT EXISTS idx_clusters_csv_id ON product_clusters(csv_id);

-- RFM segments table: stores RFM segmentation results
CREATE TABLE IF NOT EXISTS rfm_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    csv_id TEXT NOT NULL,
    segment_name TEXT NOT NULL,              -- Champions, Loyal, At-Risk, etc.
    segment_stats TEXT,                      -- JSON with avg R, F, M and counts
    customer_count INTEGER,
    total_revenue REAL,
    avg_order_value REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(csv_id, segment_name)
);

CREATE INDEX IF NOT EXISTS idx_rfm_csv_id ON rfm_segments(csv_id);
