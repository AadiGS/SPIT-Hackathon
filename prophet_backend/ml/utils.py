"""
Shared utility functions for ML pipeline.
"""

import pandas as pd
import numpy as np
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


def aggregate_metric(df: pd.DataFrame, metric: str, date_col: str = 'InvoiceDate') -> pd.DataFrame:
    """
    Aggregate data by date for a specific metric.
    
    Args:
        df: Cleaned DataFrame
        metric: Metric to aggregate (total_revenue, order_count, unique_customers, avg_order_value)
        date_col: Date column name
        
    Returns:
        DataFrame with ds (date) and y (metric value)
    """
    df = df.copy()
    df['Date'] = pd.to_datetime(df[date_col]).dt.date
    
    if metric == 'total_revenue':
        daily = df.groupby('Date')['TotalAmount'].sum().reset_index()
        daily.columns = ['ds', 'y']
        
    elif metric == 'order_count':
        daily = df.groupby('Date')['Invoice'].nunique().reset_index()
        daily.columns = ['ds', 'y']
        
    elif metric == 'unique_customers':
        daily = df.groupby('Date')['Customer ID'].nunique().reset_index()
        daily.columns = ['ds', 'y']
        
    elif metric == 'avg_order_value':
        # Group by date and invoice, sum amounts, then average per day
        invoice_totals = df.groupby(['Date', 'Invoice'])['TotalAmount'].sum().reset_index()
        daily = invoice_totals.groupby('Date')['TotalAmount'].mean().reset_index()
        daily.columns = ['ds', 'y']
        
    else:
        raise ValueError(f"Unknown metric: {metric}")
    
    daily['ds'] = pd.to_datetime(daily['ds'])
    daily = daily.sort_values('ds').reset_index(drop=True)
    
    logger.info(f"Aggregated {metric}: {len(daily)} days, range {daily['ds'].min()} to {daily['ds'].max()}")
    
    return daily


def aggregate_metric_by_group(df: pd.DataFrame, metric: str, group_col: str, 
                               date_col: str = 'InvoiceDate') -> Dict[str, pd.DataFrame]:
    """
    Aggregate metric by date for each group.
    
    Args:
        df: Cleaned DataFrame
        metric: Metric to aggregate
        group_col: Column to group by (Country, cluster_id, rfm_segment)
        date_col: Date column
        
    Returns:
        Dictionary mapping group_key -> DataFrame(ds, y)
    """
    df = df.copy()
    df['Date'] = pd.to_datetime(df[date_col]).dt.date
    
    results = {}
    
    for group_key, group_df in df.groupby(group_col):
        try:
            daily = aggregate_metric(group_df, metric, date_col)
            
            # Only include groups with sufficient data
            if len(daily) >= 30:  # Minimum 30 days
                results[str(group_key)] = daily
            else:
                logger.warning(f"Skipping {group_col}={group_key}: only {len(daily)} days")
                
        except Exception as e:
            logger.warning(f"Failed to aggregate {metric} for {group_col}={group_key}: {e}")
    
    logger.info(f"Aggregated {metric} for {len(results)} {group_col} groups")
    
    return results


def validate_time_series(df: pd.DataFrame, min_days: int = 60) -> bool:
    """
    Validate if time series has enough data for forecasting.
    
    Args:
        df: DataFrame with ds column
        min_days: Minimum required days
        
    Returns:
        True if valid, False otherwise
    """
    if len(df) < min_days:
        logger.warning(f"Insufficient data: {len(df)} days < {min_days} required")
        return False
    
    # Check for too many zeros
    if (df['y'] == 0).sum() / len(df) > 0.5:
        logger.warning(f"Too many zero values: {(df['y'] == 0).sum()} / {len(df)}")
        return False
    
    return True
