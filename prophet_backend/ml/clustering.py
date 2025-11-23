"""
Product clustering using TF-IDF and KMeans.
"""

import pandas as pd
import numpy as np
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from typing import Dict, List, Tuple
from collections import Counter

logger = logging.getLogger(__name__)


def _generate_cluster_name(top_terms: List[str], descriptions: List[str]) -> str:
    """
    Generate a human-readable name for a cluster based on top terms and descriptions.
    
    Args:
        top_terms: Top TF-IDF terms for the cluster
        descriptions: Product descriptions in the cluster
        
    Returns:
        Cluster name string
    """
    # Define keyword mappings for common themes
    theme_keywords = {
        'Christmas & Holiday': ['christmas', 'xmas', 'santa', 'tree', 'decoration', 'wreath', 'snowman', 'reindeer'],
        'Kitchen & Dining': ['mug', 'cup', 'plate', 'bowl', 'kitchen', 'spoon', 'fork', 'knife', 'dinner', 'lunch'],
        'Hearts & Romance': ['heart', 'love', 'pink', 'romantic', 'valentine', 'rose'],
        'Vintage & Retro': ['vintage', 'retro', 'shabby', 'chic', 'antique', 'classic'],
        'Garden & Outdoor': ['garden', 'outdoor', 'plant', 'flower', 'pot', 'watering'],
        'Lighting & Candles': ['light', 'candle', 'lantern', 'lamp', 'tealight', 'holder'],
        'Storage & Organization': ['box', 'jar', 'tin', 'storage', 'container', 'basket'],
        'Home Decor': ['cushion', 'pillow', 'frame', 'wall', 'mirror', 'decor', 'decoration'],
        'Party & Celebration': ['party', 'bunting', 'banner', 'balloon', 'celebration', 'birthday'],
        'Bags & Accessories': ['bag', 'purse', 'pouch', 'tote', 'shopper'],
        'Kids & Toys': ['toy', 'kids', 'children', 'baby', 'nursery', 'playroom'],
        'Stationery & Paper': ['paper', 'notebook', 'card', 'stationery', 'pen', 'pencil'],
    }
    
    # Score each theme
    theme_scores = {}
    for theme, keywords in theme_keywords.items():
        score = sum(1 for term in top_terms[:5] if any(kw in term.lower() for kw in keywords))
        if score > 0:
            theme_scores[theme] = score
    
    # If we found a strong theme match, use it
    if theme_scores:
        best_theme = max(theme_scores.items(), key=lambda x: x[1])[0]
        return best_theme
    
    # Otherwise, create name from top 2 terms
    if len(top_terms) >= 2:
        return f"{top_terms[0].title()} & {top_terms[1].title()}"
    elif len(top_terms) == 1:
        return top_terms[0].title()
    else:
        return "General Products"


def create_product_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create product-level features for clustering.
    
    Args:
        df: Cleaned DataFrame with Description and StockCode
        
    Returns:
        DataFrame with one row per unique product (StockCode + Description)
    """
    logger.info(f"🔍 Starting product aggregation from {len(df):,} total rows")
    logger.info(f"   Columns available: {df.columns.tolist()}")
    
    # Check for required columns
    if 'StockCode' not in df.columns or 'Description' not in df.columns:
        logger.error(f"[ERROR] Missing required columns! Have: {df.columns.tolist()}")
        raise ValueError("Missing StockCode or Description columns")
    
    # Show sample data
    logger.info(f"   Sample StockCodes: {df['StockCode'].head(5).tolist()}")
    logger.info(f"   Sample Descriptions: {df['Description'].head(3).tolist()}")
    
    # Aggregate product info
    products = df.groupby(['StockCode', 'Description']).agg({
        'Quantity': 'sum',
        'TotalAmount': 'sum',
        'Invoice': 'nunique'
    }).reset_index()
    
    products.columns = ['StockCode', 'Description', 'total_quantity', 'total_revenue', 'order_count']
    
    # Clean descriptions
    products['Description'] = products['Description'].fillna('').astype(str)
    products['text_features'] = products['StockCode'] + ' ' + products['Description']
    
    logger.info(f"[OK] Created features for {len(products):,} unique products")
    logger.info(f"   Top 3 products by revenue: {products.nlargest(3, 'total_revenue')[['StockCode', 'Description', 'total_revenue']].to_dict('records')}")
    
    return products


def determine_optimal_k(X, k_range=(3, 10), sample_size=5000):
    """
    Determine optimal number of clusters using elbow method.
    
    Args:
        X: Feature matrix
        k_range: Range of k values to try
        sample_size: Sample size for faster computation
        
    Returns:
        Optimal k value
    """
    if len(X) > sample_size:
        indices = np.random.choice(len(X), sample_size, replace=False)
        X_sample = X[indices]
    else:
        X_sample = X
    
    inertias = []
    silhouettes = []
    k_values = range(k_range[0], min(k_range[1], len(X_sample) // 10))
    
    for k in k_values:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(X_sample)
        inertias.append(kmeans.inertia_)
        
        if k < len(X_sample):
            sil_score = silhouette_score(X_sample, kmeans.labels_, sample_size=min(1000, len(X_sample)))
            silhouettes.append(sil_score)
        else:
            silhouettes.append(0)
    
    # Use elbow method: find point where improvement diminishes
    if len(inertias) > 2:
        diffs = np.diff(inertias)
        elbow_idx = np.argmax(diffs[:-1] - diffs[1:]) + 1
        optimal_k = list(k_values)[elbow_idx]
    else:
        optimal_k = k_range[0]
    
    logger.info(f"Optimal k determined: {optimal_k} (from range {k_range})")
    
    return optimal_k


def cluster_products(df: pd.DataFrame, n_clusters: int = None) -> Tuple[pd.DataFrame, List[Dict]]:
    """
    Cluster products using TF-IDF + KMeans.
    
    Args:
        df: Cleaned DataFrame
        n_clusters: Number of clusters (auto-determined if None)
        
    Returns:
        Tuple of (df_with_clusters, cluster_metadata)
    """
    logger.info("Starting product clustering...")
    
    # Create product features
    products = create_product_features(df)
    
    logger.info(f"📊 Total rows in dataset: {len(df):,}")
    logger.info(f"📦 Unique products found: {len(products):,}")
    
    if len(products) < 5:
        logger.error(f"[ERROR] Too few unique products ({len(products)}) for clustering. Need at least 5 products.")
        logger.error(f"   Your data has {len(df):,} rows but only {len(products)} unique (StockCode + Description) pairs")
        logger.error(f"   Check if Description column has valid data")
        products['cluster_id'] = 0
        df_clustered = df.merge(products[['StockCode', 'Description', 'cluster_id']], 
                                 on=['StockCode', 'Description'], how='left')
        return df_clustered, []
    
    # TF-IDF vectorization (relaxed constraints for better clustering)
    vectorizer = TfidfVectorizer(
        max_features=150,
        stop_words='english',
        ngram_range=(1, 2),
        min_df=1  # Changed from 2 to 1 to include more products
    )
    
    logger.info(f"🔤 Vectorizing product descriptions with TF-IDF...")
    
    X = vectorizer.fit_transform(products['text_features'])
    
    # Determine optimal k if not provided
    if n_clusters is None:
        n_clusters = determine_optimal_k(X.toarray(), k_range=(3, min(10, len(products) // 10)))
    
    # KMeans clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    products['cluster_id'] = kmeans.fit_predict(X)
    
    logger.info(f"[OK] Clustered {len(products)} products into {n_clusters} clusters")
    
    # Extract cluster metadata
    feature_names = vectorizer.get_feature_names_out()
    cluster_metadata = []
    
    for cluster_id in range(n_clusters):
        cluster_products = products[products['cluster_id'] == cluster_id]
        
        # Get top TF-IDF terms for this cluster
        cluster_indices = products[products['cluster_id'] == cluster_id].index
        cluster_tfidf = X[cluster_indices].toarray().mean(axis=0)
        top_indices = cluster_tfidf.argsort()[-10:][::-1]
        top_terms = [feature_names[i] for i in top_indices]
        
        # Generate cluster name from top terms
        cluster_name = _generate_cluster_name(top_terms, cluster_products['Description'].tolist())
        
        # Sample products
        sample_products = cluster_products.nlargest(5, 'total_revenue')[['StockCode', 'Description', 'total_revenue']].to_dict('records')
        
        cluster_metadata.append({
            'cluster_id': int(cluster_id),
            'cluster_name': cluster_name,
            'cluster_size': len(cluster_products),
            'top_terms': top_terms,
            'sample_products': sample_products,
            'total_revenue': float(cluster_products['total_revenue'].sum())
        })
        
        logger.info(f"  Cluster {cluster_id} ({cluster_name}): {len(cluster_products)} products, top terms: {top_terms[:3]}")
    
    # Merge clusters back to main dataframe
    logger.info(f"🔗 Merging cluster IDs back to {len(df):,} original rows...")
    df_clustered = df.merge(products[['StockCode', 'Description', 'cluster_id']], 
                             on=['StockCode', 'Description'], how='left')
    
    logger.info(f"   Before fillna: {df_clustered['cluster_id'].isna().sum()} null values")
    df_clustered['cluster_id'] = df_clustered['cluster_id'].fillna(-1).astype(int)
    
    cluster_dist = df_clustered['cluster_id'].value_counts().to_dict()
    logger.info(f"[OK] Clustering complete: {len(cluster_metadata)} clusters created")
    logger.info(f"📊 Cluster distribution across {len(df_clustered):,} rows:")
    for cid, count in sorted(cluster_dist.items()):
        if cid >= 0:
            cluster_name = next((c['cluster_name'] for c in cluster_metadata if c['cluster_id'] == cid), f"Cluster {cid}")
            logger.info(f"   Cluster {cid} ({cluster_name}): {count:,} rows")
    
    unclustered = cluster_dist.get(-1, 0)
    if unclustered > 0:
        logger.warning(f"⚠️  {unclustered:,} rows could not be clustered (cluster_id=-1)")
    
    return df_clustered, cluster_metadata
