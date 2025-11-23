"""
Configuration file for Prophet ML Backend.
Centralized constants following DRY principle.
"""

import os

# File handling
MAX_FILE_SIZE_MB = 100  # Maximum CSV upload size in MB
MAX_ROWS = 2_000_000   # Maximum rows to process
DATA_DIR = "data"
MODELS_DIR = "models"
DB_DIR = "db"

# Required CSV columns
REQUIRED_COLUMNS = [
    "Invoice", "StockCode", "Description", "Quantity", 
    "InvoiceDate", "Price", "Customer ID", "Country"
]

# Data cleaning
IQR_MULTIPLIER = 1.5  # For outlier detection (configurable)
MIN_QUANTITY = 1       # Minimum valid quantity
MIN_PRICE = 0.01       # Minimum valid price

# Time series requirements
MIN_DAYS_REQUIRED = 60  # Minimum days of historical data for training
FORECAST_DAYS = 28      # 4 weeks forecast horizon

# Prophet model parameters (optimized for speed + accuracy)
PROPHET_CONFIG = {
    "daily_seasonality": False,
    "weekly_seasonality": True,
    "yearly_seasonality": True,
    "changepoint_prior_scale": 0.05,
    "seasonality_prior_scale": 10.0,
    "interval_width": 0.95,  # 95% confidence intervals
    "uncertainty_samples": 100,  # Reduced from default 1000 for speed
}

# Multi-metric forecasting
FORECAST_METRICS = ['total_revenue', 'order_count', 'unique_customers', 'avg_order_value']
FORECAST_GROUPS = ['overall', 'country', 'product_cluster', 'rfm']

# Product clustering
MIN_PRODUCTS_FOR_CLUSTERING = 10
MAX_CLUSTERS = 10
MIN_CLUSTERS = 2

# RFM Segmentation
RFM_SEGMENTS = {
    'Champions': 'R>=4, F>=4, M>=4',
    'Loyal': 'F>=4',
    'Potential Loyalists': 'R>=3, F>=2, M>=2',
    'At Risk': 'R<=2, F>=3',
    'Hibernating': 'R<=2, F<=2',
    'Big Spenders': 'M>=4',
    'Price Sensitive': 'M<=2'
}

# AI Insights (LM Studio)
LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"
LM_STUDIO_TIMEOUT = 60  # seconds
AI_INSIGHTS_ENABLED = True  # Set to False to disable AI insights

# Database
DATABASE_PATH = os.path.join(DB_DIR, "prophet_backend.db")

# Blockchain
BLOCKCHAIN_ENABLED = True  # Set to False to disable blockchain logging
GANACHE_URL = "http://127.0.0.1:7545"  # Ganache RPC endpoint
BLOCKCHAIN_TIMEOUT = 30  # seconds

# Logging
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_LEVEL = "INFO"

# Create directories if they don't exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DB_DIR, exist_ok=True)
