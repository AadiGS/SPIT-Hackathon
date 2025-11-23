"""
RFM (Recency, Frequency, Monetary) segmentation.
"""

import pandas as pd
import numpy as np
import logging
from datetime import datetime, timedelta
from typing import Dict, List

logger = logging.getLogger(__name__)


def calculate_rfm(df: pd.DataFrame, reference_date: datetime = None) -> pd.DataFrame:
    """
    Calculate RFM scores for each customer.
    
    Args:
        df: Cleaned DataFrame with Customer ID, InvoiceDate, TotalAmount
        reference_date: Reference date for recency calculation (uses max date if None)
        
    Returns:
        DataFrame with Customer ID, R, F, M scores
    """
    df = df.copy()
    df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])
    
    if reference_date is None:
        reference_date = df['InvoiceDate'].max()
    
    # Calculate RFM metrics
    rfm = df.groupby('Customer ID').agg({
        'InvoiceDate': lambda x: (reference_date - x.max()).days,  # Recency
        'Invoice': 'nunique',                                       # Frequency
        'TotalAmount': 'sum'                                        # Monetary
    }).reset_index()
    
    rfm.columns = ['Customer ID', 'Recency', 'Frequency', 'Monetary']
    
    # Calculate RFM scores (1-5 scale, 5 is best)
    rfm['R_Score'] = pd.qcut(rfm['Recency'], q=5, labels=[5, 4, 3, 2, 1], duplicates='drop')
    rfm['F_Score'] = pd.qcut(rfm['Frequency'].rank(method='first'), q=5, labels=[1, 2, 3, 4, 5], duplicates='drop')
    rfm['M_Score'] = pd.qcut(rfm['Monetary'].rank(method='first'), q=5, labels=[1, 2, 3, 4, 5], duplicates='drop')
    
    rfm['R_Score'] = rfm['R_Score'].astype(int)
    rfm['F_Score'] = rfm['F_Score'].astype(int)
    rfm['M_Score'] = rfm['M_Score'].astype(int)
    
    rfm['RFM_Score'] = rfm['R_Score'].astype(str) + rfm['F_Score'].astype(str) + rfm['M_Score'].astype(str)
    
    logger.info(f"[OK] Calculated RFM for {len(rfm)} customers")
    
    return rfm


def segment_customers(rfm_df: pd.DataFrame) -> pd.DataFrame:
    """
    Segment customers based on RFM scores.
    
    Segments:
    - Champions: R=5, F=4-5, M=4-5
    - Loyal: F=4-5
    - Potential Loyalists: R=4-5, F=2-3, M=2-3
    - At Risk: R=2-3, F=2-5, M=2-5
    - Hibernating: R=1-2, F=1-2
    - Big Spenders: M=4-5
    - Price Sensitive: M=1-2
    
    Args:
        rfm_df: DataFrame with R_Score, F_Score, M_Score
        
    Returns:
        DataFrame with added 'Segment' column
    """
    df = rfm_df.copy()
    
    # Initialize segment
    df['Segment'] = 'Other'
    
    # Champions: Best customers (recent, frequent, high spending)
    df.loc[(df['R_Score'] >= 4) & (df['F_Score'] >= 4) & (df['M_Score'] >= 4), 'Segment'] = 'Champions'
    
    # Loyal: Frequent buyers
    df.loc[(df['F_Score'] >= 4) & (df['Segment'] == 'Other'), 'Segment'] = 'Loyal'
    
    # Potential Loyalists: Recent buyers with moderate frequency
    df.loc[(df['R_Score'] >= 4) & (df['F_Score'].between(2, 3)) & (df['Segment'] == 'Other'), 'Segment'] = 'Potential'
    
    # At Risk: Haven't purchased recently but were good customers
    df.loc[(df['R_Score'].between(2, 3)) & (df['F_Score'] >= 2) & (df['Segment'] == 'Other'), 'Segment'] = 'At-Risk'
    
    # Hibernating: Long time since last purchase
    df.loc[(df['R_Score'] <= 2) & (df['Segment'] == 'Other'), 'Segment'] = 'Hibernating'
    
    # Big Spenders: High monetary value
    df.loc[(df['M_Score'] >= 4) & (df['Segment'] == 'Other'), 'Segment'] = 'Big Spenders'
    
    # Price Sensitive: Low monetary value
    df.loc[(df['M_Score'] <= 2) & (df['Segment'] == 'Other'), 'Segment'] = 'Price Sensitive'
    
    logger.info(f"[OK] Segmented customers into {df['Segment'].nunique()} segments")
    logger.info(f"  Segment distribution:\n{df['Segment'].value_counts()}")
    
    return df


def get_segment_stats(rfm_df: pd.DataFrame) -> List[Dict]:
    """
    Calculate statistics for each RFM segment.
    
    Args:
        rfm_df: DataFrame with Segment column
        
    Returns:
        List of segment stat dictionaries
    """
    segment_stats = []
    
    for segment in rfm_df['Segment'].unique():
        seg_data = rfm_df[rfm_df['Segment'] == segment]
        
        stats = {
            'segment_name': segment,
            'customer_count': len(seg_data),
            'total_revenue': float(seg_data['Monetary'].sum()),
            'avg_order_value': float(seg_data['Monetary'].mean()),
            'stats': {
                'avg_recency': float(seg_data['Recency'].mean()),
                'avg_frequency': float(seg_data['Frequency'].mean()),
                'avg_monetary': float(seg_data['Monetary'].mean()),
                'median_recency': float(seg_data['Recency'].median()),
                'median_frequency': float(seg_data['Frequency'].median()),
                'median_monetary': float(seg_data['Monetary'].median())
            }
        }
        
        segment_stats.append(stats)
    
    # Sort by revenue
    segment_stats.sort(key=lambda x: x['total_revenue'], reverse=True)
    
    return segment_stats


def add_rfm_to_dataframe(df: pd.DataFrame, rfm_df: pd.DataFrame) -> pd.DataFrame:
    """
    Add RFM segment to main dataframe.
    
    Args:
        df: Main DataFrame
        rfm_df: RFM DataFrame with Customer ID and Segment
        
    Returns:
        DataFrame with rfm_segment column
    """
    df_rfm = df.merge(
        rfm_df[['Customer ID', 'Segment']].rename(columns={'Segment': 'rfm_segment'}),
        on='Customer ID',
        how='left'
    )
    
    df_rfm['rfm_segment'] = df_rfm['rfm_segment'].fillna('Unknown')
    
    logger.info(f"[OK] Added RFM segments to {len(df_rfm)} rows")
    
    return df_rfm
