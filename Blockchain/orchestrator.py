"""
API orchestrator - coordinates the full forecasting pipeline.
"""

import pandas as pd
import logging
from typing import Dict, List, Optional
from pathlib import Path

from ml.cleaning import clean_data
from ml.features import prepare_timeseries
from ml.clustering import cluster_products
from ml.rfm import calculate_rfm, segment_customers, get_segment_stats, add_rfm_to_dataframe
from ml.multi_forecast import run_multi_metric_forecast
from db.database import (
    save_forecasts, save_product_clusters, save_rfm_segments
)
from blockchain.blockchain_logger import BlockchainLogger

logger = logging.getLogger(__name__)


class ForecastPipeline:
    """Orchestrates the complete forecasting pipeline."""
    
    def __init__(self, file_id: str, file_path: str):
        self.file_id = file_id
        self.file_path = file_path
        self.metrics = ['total_revenue', 'order_count', 'unique_customers', 'avg_order_value']
        self.groups = ['overall', 'country', 'product_cluster', 'rfm']
        
    def run(self) -> Dict:
        """
        Execute the complete pipeline.
        
        Returns:
            Dictionary with results summary
        """
        logger.info(f"Starting pipeline for file: {self.file_id}")
        
        try:
            # Step 1: Load and clean data
            logger.info("Step 1/6: Loading and cleaning data")
            df = pd.read_csv(self.file_path, encoding='ISO-8859-1')
            df_clean = clean_data(df)
            logger.info(f"[OK] Cleaned data: {len(df_clean)} rows")
            
            # Step 2: Product clustering
            logger.info("Step 2/6: Clustering products")
            cluster_result = self._run_product_clustering(df_clean)
            if cluster_result:
                df_clean = cluster_result['df_with_clusters']
                logger.info(f"[OK] Created {cluster_result['n_clusters']} product clusters")
            
            # Step 3: RFM segmentation
            logger.info("Step 3/6: Calculating RFM segments")
            rfm_result = self._run_rfm_segmentation(df_clean)
            if rfm_result:
                df_clean = rfm_result['df_with_segments']
                logger.info(f"[OK] Segmented customers into {len(rfm_result['segment_stats'])} RFM groups")
            
            # Step 4: Run multi-metric forecasts
            logger.info("Step 4/6: Running Prophet forecasts")
            forecast_results = run_multi_metric_forecast(
                df_clean, self.file_id, self.metrics, self.groups
            )
            total_forecasts = sum(len(results) for results in forecast_results.values())
            logger.info(f"[OK] Generated {total_forecasts} forecasts")
            
            # Step 5: Save forecasts to database
            logger.info("Step 5/6: Saving results to database")
            self._save_forecast_results(forecast_results)
            
            # Step 6: Log to blockchain
            logger.info("Step 6/6: Logging forecast to blockchain")
            blockchain_result = self._log_to_blockchain(forecast_results)
            
            # Build summary
            summary = {
                'file_id': self.file_id,
                'status': 'success',
                'data_points': len(df_clean),
                'product_clusters': cluster_result['n_clusters'] if cluster_result else 0,
                'rfm_segments': len(rfm_result['segment_stats']) if rfm_result else 0,
                'total_forecasts': total_forecasts,
                'forecasts_by_group': {k: len(v) for k, v in forecast_results.items()},
                'blockchain': blockchain_result  # Add blockchain details
            }
            
            logger.info(f"[OK] Pipeline completed successfully for {self.file_id}")
            return summary
            
        except Exception as e:
            logger.error(f"Pipeline failed: {e}", exc_info=True)
            return {
                'file_id': self.file_id,
                'status': 'error',
                'error': str(e)
            }
    
    def _run_product_clustering(self, df: pd.DataFrame) -> Optional[Dict]:
        """Run product clustering and save to database."""
        try:
            if 'Description' not in df.columns or 'StockCode' not in df.columns:
                logger.warning("Missing required columns for clustering")
                return None
            
            df_with_clusters, cluster_metadata = cluster_products(df)
            
            # Save to database
            save_product_clusters(
                csv_id=self.file_id,
                clusters=cluster_metadata
            )
            
            return {
                'df_with_clusters': df_with_clusters,
                'n_clusters': len(cluster_metadata),
                'cluster_metadata': cluster_metadata
            }
            
        except Exception as e:
            logger.error(f"Clustering failed: {e}")
            return None
    
    def _run_rfm_segmentation(self, df: pd.DataFrame) -> Optional[Dict]:
        """Run RFM segmentation and save to database."""
        try:
            required_cols = ['InvoiceDate', 'Customer ID', 'TotalAmount']
            if not all(col in df.columns for col in required_cols):
                logger.warning("Missing required columns for RFM")
                return None
            
            # Calculate RFM
            rfm_df = calculate_rfm(df)
            rfm_df = segment_customers(rfm_df)
            segment_stats = get_segment_stats(rfm_df)
            df_with_segments = add_rfm_to_dataframe(df, rfm_df)
            
            # Save to database
            save_rfm_segments(
                csv_id=self.file_id,
                segments=segment_stats
            )
            
            return {
                'df_with_segments': df_with_segments,
                'rfm_df': rfm_df,
                'segment_stats': segment_stats
            }
            
        except Exception as e:
            logger.error(f"RFM segmentation failed: {e}")
            return None
    
    def _save_forecast_results(self, forecast_results: Dict[str, List[Dict]]) -> None:
        """Save forecast results to database."""
        for group_type, results in forecast_results.items():
            for result in results:
                forecast_df = result['forecast']
                
                # Convert timestamps to strings for JSON serialization
                forecast_df_copy = forecast_df.copy()
                if 'ds' in forecast_df_copy.columns:
                    forecast_df_copy['ds'] = forecast_df_copy['ds'].astype(str)
                
                # Convert to list of records
                forecast_data = forecast_df_copy.to_dict('records')
                
                save_forecasts(
                    csv_id=self.file_id,
                    metric=result['metric'],
                    group_type=result['group_type'],
                    group_key=result.get('group_key'),
                    model_path=result['model_path'],
                    forecast_data=forecast_data
                )
    
    def _log_to_blockchain(self, forecast_results: Dict[str, List[Dict]]) -> Dict:
        """
        Log the overall revenue forecast to blockchain.
        
        Args:
            forecast_results: All forecast results
            
        Returns:
            Blockchain transaction details
        """
        try:
            # Find the overall revenue forecast
            overall_results = forecast_results.get('overall', [])
            revenue_forecast = None
            
            for result in overall_results:
                if result['metric'] == 'total_revenue':
                    revenue_forecast = result
                    break
            
            if not revenue_forecast:
                logger.warning("No overall revenue forecast found for blockchain logging")
                return {'success': False, 'reason': 'No revenue forecast available'}
            
            # Calculate total 4-week forecast value
            forecast_df = revenue_forecast['forecast']
            total_forecast = forecast_df['yhat'].sum()
            
            logger.info(f"Total 4-week forecast: ${total_forecast:,.2f}")
            
            # Initialize blockchain logger
            bc_logger = BlockchainLogger()
            
            # Deploy contract (or reuse if already deployed)
            bc_logger.compile_and_deploy()
            
            # Log forecast to blockchain
            result = bc_logger.log_forecast(total_forecast)
            
            logger.info(f"[OK] Forecast logged to blockchain at block {result['block_number']}")
            
            return result
            
        except Exception as e:
            logger.error(f"Blockchain logging failed: {e}")
            # Don't fail the entire pipeline if blockchain fails
            return {
                'success': False,
                'error': str(e)
            }


def run_pipeline(file_id: str, file_path: str) -> Dict:
    """
    Convenience function to run the complete pipeline.
    
    Args:
        file_id: Unique file identifier
        file_path: Path to CSV file
        
    Returns:
        Summary of pipeline execution
    """
    pipeline = ForecastPipeline(file_id, file_path)
    return pipeline.run()
