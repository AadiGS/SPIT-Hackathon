"""
Multi-metric and multi-group forecasting with Prophet.
"""

import pandas as pd
import numpy as np
import logging
import pickle
from pathlib import Path
from typing import Dict, List, Optional
from prophet import Prophet
from concurrent.futures import ThreadPoolExecutor, as_completed
import warnings

from config import PROPHET_CONFIG, FORECAST_DAYS, MODELS_DIR
from ml.utils import aggregate_metric, aggregate_metric_by_group, validate_time_series

logger = logging.getLogger(__name__)
warnings.filterwarnings('ignore', category=FutureWarning)


def train_prophet_for_metric(daily_df: pd.DataFrame, metric_name: str, 
                              file_id: str, group_type: str = "overall", 
                              group_key: Optional[str] = None) -> Dict:
    """
    Train Prophet model for a single metric/group combination.
    
    Args:
        daily_df: DataFrame with ds, y columns
        metric_name: Metric name
        file_id: File identifier
        group_type: Group type (overall, country, product_cluster, rfm)
        group_key: Group key (optional)
        
    Returns:
        Dictionary with forecast and model path
    """
    # Validate data
    if not validate_time_series(daily_df):
        logger.warning(f"Skipping {metric_name} ({group_type}:{group_key}) - insufficient data")
        return None
    
    # Remove any negative or zero values
    original_len = len(daily_df)
    daily_df = daily_df[daily_df['y'] > 0].copy()
    if len(daily_df) < original_len:
        logger.warning(f"{metric_name} ({group_type}:{group_key}): Removed {original_len - len(daily_df)} non-positive values")
    
    # Apply log transformation for revenue/count metrics to ensure positive predictions
    if metric_name in ['total_revenue', 'order_count', 'unique_customers', 'avg_order_value']:
        daily_df['y'] = np.log1p(daily_df['y'])  # log(1 + y)
        use_log_transform = True
    else:
        use_log_transform = False
    
    try:
        logger.info(f"Training Prophet for {metric_name} ({group_type}:{group_key})")
        
        # Initialize Prophet with optimized settings
        prophet_params = {k: v for k, v in PROPHET_CONFIG.items() if k != 'stan_backend'}
        model = Prophet(**prophet_params)
        
        # Fit model with reduced verbosity
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model.fit(daily_df[['ds', 'y']])
        
        # Generate forecast
        future = model.make_future_dataframe(periods=FORECAST_DAYS, freq='D')
        forecast = model.predict(future)
        
        # Extract future dates only
        forecast_future = forecast[forecast['ds'] > daily_df['ds'].max()].copy()
        
        # Handle confidence intervals (may not exist if uncertainty_samples=0)
        if 'yhat_lower' in forecast_future.columns and 'yhat_upper' in forecast_future.columns:
            forecast_future = forecast_future[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
        else:
            # Create approximate confidence intervals using standard error
            forecast_future = forecast_future[['ds', 'yhat']].copy()
            std_error = forecast_future['yhat'].std() * 0.1  # 10% std as approximation
            forecast_future['yhat_lower'] = forecast_future['yhat'] - 1.96 * std_error
            forecast_future['yhat_upper'] = forecast_future['yhat'] + 1.96 * std_error
        
        # Inverse log transformation if applied
        if use_log_transform:
            # Clip before expm1 to prevent negative values in log space
            forecast_future['yhat'] = np.expm1(forecast_future['yhat'].clip(lower=-0.5))  # exp(yhat) - 1
            forecast_future['yhat_lower'] = np.expm1(forecast_future['yhat_lower'].clip(lower=-0.5))
            forecast_future['yhat_upper'] = np.expm1(forecast_future['yhat_upper'].clip(lower=-0.5))
            
            # Final safety: ensure all predictions are >= 0
            forecast_future['yhat'] = forecast_future['yhat'].clip(lower=0)
            forecast_future['yhat_lower'] = forecast_future['yhat_lower'].clip(lower=0)
            forecast_future['yhat_upper'] = forecast_future['yhat_upper'].clip(lower=0)
            
            # For count metrics (unique_customers, order_count), round to integers
            if metric_name in ['unique_customers', 'order_count']:
                forecast_future['yhat'] = forecast_future['yhat'].round()
                forecast_future['yhat_lower'] = forecast_future['yhat_lower'].round()
                forecast_future['yhat_upper'] = forecast_future['yhat_upper'].round()
            
            logger.debug(f"Applied inverse log transform to {metric_name} (guaranteed non-negative)")
        
        # Save model
        model_filename = f"{file_id}_{metric_name}_{group_type}"
        if group_key:
            model_filename += f"_{group_key}"
        model_filename += ".pkl"
        
        model_path = Path(MODELS_DIR) / model_filename
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        
        logger.info(f"[OK] Trained {metric_name} ({group_type}:{group_key}): {len(forecast_future)} forecast points")
        
        return {
            'forecast': forecast_future,
            'model_path': str(model_path),
            'metric': metric_name,
            'group_type': group_type,
            'group_key': group_key
        }
        
    except Exception as e:
        logger.error(f"Failed to train {metric_name} ({group_type}:{group_key}): {e}")
        return None


def _prepare_training_tasks(df: pd.DataFrame, file_id: str, metrics: List[str], groups: List[str]) -> List[tuple]:
    """Prepare all training tasks for parallel execution."""
    tasks = []
    
    for metric in metrics:
        for group in groups:
            if group == 'overall':
                daily_df = aggregate_metric(df, metric)
                tasks.append((daily_df, metric, file_id, 'overall', None))
                
            elif group == 'country' and 'Country' in df.columns:
                group_data = aggregate_metric_by_group(df, metric, 'Country')
                for country, daily_df in group_data.items():
                    tasks.append((daily_df, metric, file_id, 'country', country))
                    
            elif group == 'product_cluster' and 'cluster_id' in df.columns:
                df_with_clusters = df[df['cluster_id'] >= 0]
                if len(df_with_clusters) > 0:
                    group_data = aggregate_metric_by_group(df_with_clusters, metric, 'cluster_id')
                    for cluster_id, daily_df in group_data.items():
                        tasks.append((daily_df, metric, file_id, 'product_cluster', cluster_id))
                        
            elif group == 'rfm' and 'rfm_segment' in df.columns:
                df_with_rfm = df[df['rfm_segment'] != 'Unknown']
                if len(df_with_rfm) > 0:
                    group_data = aggregate_metric_by_group(df_with_rfm, metric, 'rfm_segment')
                    for segment, daily_df in group_data.items():
                        tasks.append((daily_df, metric, file_id, 'rfm', segment))
    
    return tasks


def run_multi_metric_forecast(df: pd.DataFrame, file_id: str, 
                               metrics: List[str], groups: List[str]) -> Dict[str, List[Dict]]:
    """
    Run Prophet forecasts for multiple metrics and groups in parallel.
    
    Args:
        df: Cleaned and enriched DataFrame (with cluster_id and rfm_segment)
        file_id: File identifier
        metrics: List of metrics to forecast
        groups: List of group types (overall, country, product_cluster, rfm)
        
    Returns:
        Dictionary mapping group_type -> list of forecast results
    """
    all_results = {
        'overall': [],
        'country': [],
        'product_cluster': [],
        'rfm': []
    }
    
    logger.info(f"Starting optimized parallel forecast: {len(metrics)} metrics × {len(groups)} group types")
    
    # Prepare all tasks
    tasks = _prepare_training_tasks(df, file_id, metrics, groups)
    logger.info(f"Prepared {len(tasks)} training tasks for parallel execution")
    
    if len(tasks) == 0:
        logger.error("No tasks prepared! Checking data...")
        logger.error(f"  DataFrame shape: {df.shape}")
        logger.error(f"  DataFrame columns: {list(df.columns)}")
        logger.error(f"  cluster_id in columns: {'cluster_id' in df.columns}")
        logger.error(f"  rfm_segment in columns: {'rfm_segment' in df.columns}")
        return all_results
    
    # Execute in parallel with ThreadPoolExecutor
    max_workers = min(8, len(tasks))  # Use up to 8 parallel workers
    completed_count = 0
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_task = {
            executor.submit(train_prophet_for_metric, *task): task 
            for task in tasks
        }
        
        # Process completed tasks
        for future in as_completed(future_to_task):
            task = future_to_task[future]
            try:
                result = future.result()
                if result:
                    group_type = result['group_type']
                    all_results[group_type].append(result)
                    completed_count += 1
                    
                    # Log progress every 10 forecasts
                    if completed_count % 10 == 0:
                        logger.info(f"Progress: {completed_count}/{len(tasks)} forecasts completed")
                        
            except Exception as e:
                metric_name, group_type, group_key = task[1], task[3], task[4]
                logger.error(f"Task failed for {metric_name} ({group_type}:{group_key}): {e}")
    
    # Log summary
    total_forecasts = sum(len(results) for results in all_results.values())
    logger.info(f"[OK] Completed multi-metric forecast: {total_forecasts} total forecasts")
    for group_type, results in all_results.items():
        logger.info(f"  {group_type}: {len(results)} forecasts")
    
    return all_results
