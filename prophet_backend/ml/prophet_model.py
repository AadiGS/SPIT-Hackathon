"""
Prophet model training and forecasting module.
Handles model fitting, prediction, persistence, and validation.
"""

import pandas as pd
import numpy as np
import pickle
import logging
from pathlib import Path
from typing import Dict, Tuple
from prophet import Prophet
from prophet.diagnostics import cross_validation, performance_metrics
from config import PROPHET_CONFIG, FORECAST_DAYS, MODELS_DIR

logger = logging.getLogger(__name__)


def train_prophet_model(daily_df: pd.DataFrame, file_id: str) -> Dict:
    """
    Train Prophet model and generate 28-day forecast.
    
    Steps:
    1. Initialize Prophet with configured parameters
    2. Add optional regressors (weekday, month)
    3. Fit model on historical data
    4. Generate 28-day future dataframe
    5. Make predictions
    6. Persist model to disk
    7. Calculate validation metrics
    
    Args:
        daily_df: Prophet-ready DataFrame (ds, y, weekday, month)
        file_id: Unique identifier for this forecast job
        
    Returns:
        Dictionary containing:
        - forecast: List of forecast dictionaries
        - model_path: Path to saved model
        - notes: Training summary
        
    Raises:
        RuntimeError: If model training fails
    """
    logger.info(f"Starting Prophet model training for file_id={file_id}")
    logger.info(f"Training data: {len(daily_df)} days, from {daily_df['ds'].min()} to {daily_df['ds'].max()}")
    
    # Remove any negative or zero values (shouldn't happen after cleaning, but safety check)
    original_len = len(daily_df)
    daily_df = daily_df[daily_df['y'] > 0].copy()
    if len(daily_df) < original_len:
        logger.warning(f"Removed {original_len - len(daily_df)} non-positive values from training data")
    
    # Apply log transformation to ensure positive predictions
    daily_df['y_original'] = daily_df['y']
    daily_df['y'] = np.log1p(daily_df['y'])  # log(1 + y) to handle edge cases
    logger.info("[OK] Applied log transformation to target variable")
    
    try:
        # Step 1: Initialize Prophet model
        logger.info("Initializing Prophet model with config:")
        
        # Suppress cmdstanpy logs
        import logging as prophet_logging
        prophet_logging.getLogger('cmdstanpy').setLevel(prophet_logging.WARNING)
        
        # Configure Prophet without stan_backend parameter (let it auto-detect)
        prophet_params = {k: v for k, v in PROPHET_CONFIG.items() if k != 'stan_backend'}
        
        for key, value in prophet_params.items():
            logger.info(f"  {key}: {value}")
        
        model = Prophet(**prophet_params)
        
        # Step 2: Add optional regressors if present
        if "weekday" in daily_df.columns:
            model.add_regressor("weekday")
            logger.info("[OK] Added weekday regressor")
        
        if "month" in daily_df.columns:
            model.add_regressor("month")
            logger.info("[OK] Added month regressor")
        
        # Step 3: Fit model
        logger.info("Fitting model (this may take 30-60 seconds)...")
        
        # Prophet expects only ds, y, and regressors
        train_cols = ["ds", "y"]
        if "weekday" in daily_df.columns:
            train_cols.append("weekday")
        if "month" in daily_df.columns:
            train_cols.append("month")
        
        model.fit(daily_df[train_cols])
        logger.info("[OK] Model training complete")
        
        # Step 4: Create future dataframe for 28 days
        logger.info(f"Generating {FORECAST_DAYS}-day forecast...")
        future = model.make_future_dataframe(periods=FORECAST_DAYS, freq="D")
        
        # Add regressors to future dataframe
        if "weekday" in train_cols:
            future["weekday"] = future["ds"].dt.dayofweek
        if "month" in train_cols:
            future["month"] = future["ds"].dt.month
        
        # Step 5: Make predictions
        forecast = model.predict(future)
        
        # Extract only future dates (next 28 days)
        forecast_future = forecast[forecast["ds"] > daily_df["ds"].max()].copy()
        
        # Inverse log transformation to get actual values (always positive)
        # Clip in log space first to prevent exp(-large_negative) issues
        forecast_future['yhat'] = np.expm1(forecast_future['yhat'].clip(lower=-0.5))  # exp(yhat) - 1
        forecast_future['yhat_lower'] = np.expm1(forecast_future['yhat_lower'].clip(lower=-0.5))
        forecast_future['yhat_upper'] = np.expm1(forecast_future['yhat_upper'].clip(lower=-0.5))
        
        # Final safety: ensure all predictions are >= 0
        forecast_future['yhat'] = forecast_future['yhat'].clip(lower=0)
        forecast_future['yhat_lower'] = forecast_future['yhat_lower'].clip(lower=0)
        forecast_future['yhat_upper'] = forecast_future['yhat_upper'].clip(lower=0)
        
        logger.info("[OK] Applied inverse log transformation (predictions guaranteed non-negative)")
        
        logger.info(f"[OK] Generated {len(forecast_future)} forecast points")
        logger.info(f"Forecast range: {forecast_future['ds'].min()} to {forecast_future['ds'].max()}")
        
        # Step 6: Persist model
        model_path = Path(MODELS_DIR) / f"{file_id}_prophet.pkl"
        with open(model_path, "wb") as f:
            pickle.dump(model, f)
        
        logger.info(f"[OK] Model saved to {model_path}")
        
        # Step 7: Calculate validation metrics (simple approach)
        try:
            mae = calculate_simple_mae(model, daily_df)
            logger.info(f"[OK] Validation MAE: ${mae:,.2f}")
        except Exception as e:
            logger.warning(f"Could not calculate validation MAE: {str(e)}")
            mae = None
        
        # Prepare response
        forecast_list = forecast_future[["ds", "yhat", "yhat_lower", "yhat_upper"]].to_dict("records")
        
        # Convert datetime to string for JSON serialization
        for item in forecast_list:
            item["date"] = item.pop("ds").strftime("%Y-%m-%d")
            item["yhat"] = round(float(item["yhat"]), 2)
            item["yhat_lower"] = round(float(item["yhat_lower"]), 2)
            item["yhat_upper"] = round(float(item["yhat_upper"]), 2)
        
        # Summary statistics
        total_forecast = forecast_future["yhat"].sum()
        avg_daily = forecast_future["yhat"].mean()
        
        notes = (
            f"Model trained on {len(daily_df)} days of data. "
            f"Forecast: 28 days, total ${total_forecast:,.2f}, avg ${avg_daily:,.2f}/day."
        )
        
        # Log accuracy internally (not shown to user)
        if mae is not None:
            logger.info(f"Internal validation - MAE: ${mae:,.2f}")
        
        logger.info(f"Training complete. {notes}")
        
        return {
            "forecast": forecast_list,
            "model_path": str(model_path),
            "notes": notes
        }
        
    except Exception as e:
        logger.error(f"Model training failed: {str(e)}", exc_info=True)
        raise RuntimeError(f"Prophet model training failed: {str(e)}")


def calculate_simple_mae(model: Prophet, daily_df: pd.DataFrame) -> float:
    """
    Calculate Mean Absolute Error on last 28 days as validation.
    
    Simple validation: Train on all but last 28 days, predict last 28, compute MAE.
    
    Args:
        model: Trained Prophet model
        daily_df: Full training data
        
    Returns:
        MAE value
    """
    if len(daily_df) < 56:  # Need at least 2x forecast horizon
        logger.warning("Not enough data for validation (need 56+ days)")
        return None
    
    # Split: train on all but last 28 days
    split_point = len(daily_df) - FORECAST_DAYS
    train_subset = daily_df.iloc[:split_point].copy()
    validation = daily_df.iloc[split_point:].copy()
    
    # Train new model on subset (exclude stan_backend if present)
    prophet_params = {k: v for k, v in PROPHET_CONFIG.items() if k != 'stan_backend'}
    temp_model = Prophet(**prophet_params)
    
    train_cols = ["ds", "y"]
    if "weekday" in daily_df.columns:
        temp_model.add_regressor("weekday")
        train_cols.append("weekday")
    if "month" in daily_df.columns:
        temp_model.add_regressor("month")
        train_cols.append("month")
    
    temp_model.fit(train_subset[train_cols])
    
    # Predict validation period
    val_future = validation[["ds"]].copy()
    if "weekday" in train_cols:
        val_future["weekday"] = val_future["ds"].dt.dayofweek
    if "month" in train_cols:
        val_future["month"] = val_future["ds"].dt.month
    
    val_forecast = temp_model.predict(val_future)
    
    # Calculate MAE
    mae = np.mean(np.abs(validation["y"].values - val_forecast["yhat"].values))
    
    return mae
