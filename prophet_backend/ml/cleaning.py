"""
Data cleaning module following exact specification.
Handles validation, nulls, negatives, and outliers with detailed logging.
"""

import pandas as pd
import numpy as np
import logging
from typing import Tuple
from config import (
    REQUIRED_COLUMNS, 
    IQR_MULTIPLIER, 
    MIN_QUANTITY, 
    MIN_PRICE
)

logger = logging.getLogger(__name__)


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean retail data following exact specification.
    
    Steps:
    1. Validate required columns
    2. Drop exact duplicates
    3. Drop rows with missing Customer ID
    4. Filter non-positive Quantity (returns)
    5. Filter non-positive Price
    6. Convert InvoiceDate to datetime
    7. Drop null descriptions
    8. Compute TotalAmount
    9. Remove outliers using IQR method
    
    Args:
        df: Raw DataFrame from CSV
        
    Returns:
        Cleaned DataFrame
        
    Raises:
        ValueError: If required columns missing or date parsing fails
    """
    initial_rows = len(df)
    logger.info(f"Starting data cleaning. Initial rows: {initial_rows}")
    
    # Step 1: Validate required columns
    missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_cols:
        error_msg = f"Missing required columns: {missing_cols}. Available: {df.columns.tolist()}"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    logger.info("[OK] All required columns present")
    
    # Step 2: Drop exact duplicates
    before = len(df)
    df = df.drop_duplicates()
    duplicates_dropped = before - len(df)
    logger.info(f"Dropped {duplicates_dropped} duplicate rows. Remaining: {len(df)}")
    
    # Step 3: Drop rows with missing Customer ID
    before = len(df)
    df = df.dropna(subset=["Customer ID"])
    null_customer_dropped = before - len(df)
    logger.info(f"Dropped {null_customer_dropped} rows with null Customer ID. Remaining: {len(df)}")
    
    # Step 4: Filter non-positive Quantity (returns)
    before = len(df)
    df = df[df["Quantity"] >= MIN_QUANTITY]
    negative_qty_dropped = before - len(df)
    logger.info(f"Dropped {negative_qty_dropped} rows with Quantity < {MIN_QUANTITY}. Remaining: {len(df)}")
    
    # Step 5: Filter non-positive Price
    before = len(df)
    df = df[df["Price"] >= MIN_PRICE]
    negative_price_dropped = before - len(df)
    logger.info(f"Dropped {negative_price_dropped} rows with Price < {MIN_PRICE}. Remaining: {len(df)}")
    
    # Step 6: Convert InvoiceDate to datetime
    try:
        before = len(df)
        df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"], errors="coerce")
        
        # Drop rows with unparseable dates
        unparseable = df["InvoiceDate"].isnull().sum()
        if unparseable > 0:
            logger.warning(f"Found {unparseable} rows with invalid dates - dropping them")
            df = df.dropna(subset=["InvoiceDate"])
            date_dropped = before - len(df)
            logger.info(f"Dropped {date_dropped} rows with invalid dates. Remaining: {len(df)}")
        
        if len(df) == 0:
            raise ValueError("All rows have invalid dates. Cannot proceed.")
        
        logger.info("[OK] InvoiceDate converted to datetime successfully")
        
    except Exception as e:
        logger.error(f"Date parsing error: {str(e)}")
        raise ValueError(f"InvoiceDate parsing failed: {str(e)}")
    
    # Step 7: Drop null descriptions
    before = len(df)
    df = df.dropna(subset=["Description"])
    null_desc_dropped = before - len(df)
    logger.info(f"Dropped {null_desc_dropped} rows with null Description. Remaining: {len(df)}")
    
    # Step 8: Compute TotalAmount
    df["TotalAmount"] = df["Quantity"] * df["Price"]
    logger.info("[OK] Computed TotalAmount = Quantity × Price")
    
    # Step 9: Remove outliers using IQR method
    before = len(df)
    df = remove_outliers_iqr(df, "TotalAmount", multiplier=IQR_MULTIPLIER)
    outliers_dropped = before - len(df)
    logger.info(f"Dropped {outliers_dropped} outliers (IQR method, multiplier={IQR_MULTIPLIER}). Remaining: {len(df)}")
    
    # Final summary
    total_dropped = initial_rows - len(df)
    logger.info(f"Cleaning complete. Total rows dropped: {total_dropped} ({total_dropped/initial_rows*100:.1f}%)")
    logger.info(f"Final clean dataset: {len(df)} rows")
    
    return df


def remove_outliers_iqr(df: pd.DataFrame, column: str, multiplier: float = 1.5) -> pd.DataFrame:
    """
    Remove outliers using Interquartile Range (IQR) method.
    
    Formula: Keep values within [Q1 - multiplier*IQR, Q3 + multiplier*IQR]
    
    Args:
        df: DataFrame
        column: Column name to check for outliers
        multiplier: IQR multiplier (default 1.5 for standard outlier detection)
        
    Returns:
        DataFrame with outliers removed
    """
    Q1 = df[column].quantile(0.25)
    Q3 = df[column].quantile(0.75)
    IQR = Q3 - Q1
    
    lower_bound = Q1 - multiplier * IQR
    upper_bound = Q3 + multiplier * IQR
    
    logger.debug(f"IQR outlier bounds for {column}: [{lower_bound:.2f}, {upper_bound:.2f}]")
    
    return df[(df[column] >= lower_bound) & (df[column] <= upper_bound)]
