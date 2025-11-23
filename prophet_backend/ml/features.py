"""
Feature engineering module for time series preparation.
Converts retail data to Prophet-ready format (ds, y).
"""

import pandas as pd
import logging
from config import MIN_DAYS_REQUIRED

logger = logging.getLogger(__name__)

# Alias for backward compatibility
prepare_prophet_data = None  # Will be set after function definition


def prepare_timeseries(df: pd.DataFrame) -> pd.DataFrame:
    """
    Prepare time series data for Prophet.
    
    Steps:
    1. Aggregate daily sales (TotalAmount)
    2. Convert to Prophet format (ds, y)
    3. Add date features (weekday, month) as optional regressors
    4. Validate minimum data requirements
    
    Args:
        df: Cleaned DataFrame with InvoiceDate and TotalAmount
        
    Returns:
        Prophet-ready DataFrame with columns: ds, y, weekday, month
        
    Raises:
        ValueError: If insufficient historical data
    """
    logger.info("Starting time series preparation...")
    
    # Validate required columns
    if "InvoiceDate" not in df.columns or "TotalAmount" not in df.columns:
        raise ValueError("DataFrame must contain 'InvoiceDate' and 'TotalAmount' columns")
    
    # Step 1: Normalize to date only (no time) and aggregate daily
    logger.info("Aggregating sales by date...")
    df["Date"] = df["InvoiceDate"].dt.date
    daily_sales = df.groupby("Date")["TotalAmount"].sum().reset_index()
    
    logger.info(f"Aggregated to {len(daily_sales)} unique dates")
    logger.info(f"Date range: {daily_sales['Date'].min()} to {daily_sales['Date'].max()}")
    
    # Step 2: Convert to Prophet format
    daily_sales.columns = ["ds", "y"]
    daily_sales["ds"] = pd.to_datetime(daily_sales["ds"])
    
    # Ensure float type for y
    daily_sales["y"] = daily_sales["y"].astype(float)
    
    # Sort by date
    daily_sales = daily_sales.sort_values("ds").reset_index(drop=True)
    
    logger.info(f"Prophet format: ds (datetime), y (float)")
    logger.info(f"Total sales sum: ${daily_sales['y'].sum():,.2f}")
    logger.info(f"Average daily sales: ${daily_sales['y'].mean():,.2f}")
    
    # Step 3: Add date features (optional regressors for Prophet)
    daily_sales["weekday"] = daily_sales["ds"].dt.dayofweek  # 0=Monday, 6=Sunday
    daily_sales["month"] = daily_sales["ds"].dt.month
    
    logger.info("[OK] Added date features: weekday, month")
    
    # Step 4: Validate minimum data requirement
    num_days = len(daily_sales)
    if num_days < MIN_DAYS_REQUIRED:
        error_msg = (
            f"Insufficient historical data: {num_days} days found, "
            f"but {MIN_DAYS_REQUIRED} days required for reliable forecasting"
        )
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    logger.info(f"[OK] Data validation passed: {num_days} days >= {MIN_DAYS_REQUIRED} required")
    
    # Check for missing dates (gaps in time series)
    date_range = pd.date_range(start=daily_sales["ds"].min(), end=daily_sales["ds"].max())
    missing_dates = len(date_range) - len(daily_sales)
    
    if missing_dates > 0:
        logger.warning(f"Found {missing_dates} missing dates in time series (gaps)")
    else:
        logger.info("[OK] No gaps in time series")
    
    logger.info(f"Time series preparation complete. Shape: {daily_sales.shape}")
    
    return daily_sales


# Alias for backward compatibility
prepare_prophet_data = prepare_timeseries
