"""
Database operations module for PostgreSQL (Neon DB).
Implements connection pooling and company-based multi-tenancy.
"""

import psycopg2
from psycopg2 import pool, sql
from psycopg2.extras import RealDictCursor
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import os
from contextlib import contextmanager
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

# Database connection string from environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required. Please set it in .env file.")

# Connection pool (initialized on first use)
_connection_pool = None


def get_connection_pool():
    """Get or create the connection pool."""
    global _connection_pool
    if _connection_pool is None:
        try:
            _connection_pool = psycopg2.pool.SimpleConnectionPool(
                minconn=1,
                maxconn=20,
                dsn=DATABASE_URL
            )
            logger.info("[OK] PostgreSQL connection pool created")
        except Exception as e:
            logger.error(f"[ERROR] Failed to create connection pool: {e}")
            raise
    return _connection_pool


@contextmanager
def get_connection():
    """Context manager for database connections from pool with automatic reconnection."""
    global _connection_pool
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            pool = get_connection_pool()
            conn = pool.getconn()
            
            # Test the connection
            try:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
            except Exception as test_error:
                # Connection is stale, close it and get a new one
                logger.warning(f"Stale connection detected, recycling: {test_error}")
                try:
                    pool.putconn(conn, close=True)
                except:
                    pass
                raise test_error
            
            try:
                yield conn
                return
            finally:
                pool.putconn(conn)
                
        except Exception as e:
            retry_count += 1
            logger.warning(f"Database connection error (attempt {retry_count}/{max_retries}): {e}")
            
            # Reset the connection pool on SSL or connection errors
            if "SSL" in str(e) or "connection" in str(e).lower():
                logger.info("Resetting connection pool due to connection error")
                try:
                    if _connection_pool:
                        _connection_pool.closeall()
                except:
                    pass
                _connection_pool = None
                
            if retry_count >= max_retries:
                logger.error(f"Failed to get database connection after {max_retries} retries")
                raise
            
            # Wait a bit before retrying
            import time
            time.sleep(0.5 * retry_count)


def init_database():
    """Initialize database and create tables from PostgreSQL schema."""
    schema_path = Path(__file__).parent / "schema_postgres.sql"
    
    if not schema_path.exists():
        logger.error(f"[ERROR] Schema file not found: {schema_path}")
        raise FileNotFoundError(f"Schema file not found: {schema_path}")
    
    with open(schema_path, 'r') as f:
        schema = f.read()
    
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(schema)
        conn.commit()
    
    logger.info(f"[OK] PostgreSQL database initialized from {schema_path}")


# ==================== FORECASTS ====================

def save_forecasts(
    company_id: str,
    csv_id: str,
    metric: str,
    group_type: str,
    group_key: Optional[str] = None,
    model_path: Optional[str] = None,
    forecast_data: Optional[List[Dict]] = None
):
    """
    Save forecast results to database.
    
    Args:
        company_id: Company UUID
        csv_id: File identifier (csv_id)
        metric: Metric name (total_revenue, order_count, etc.)
        group_type: Group type (overall, country, product_cluster, rfm)
        group_key: Optional group identifier (country code, cluster_id, etc.)
        model_path: Path to saved Prophet model
        forecast_data: List of forecast records with ds, yhat, yhat_lower, yhat_upper
    """
    forecast_json = json.dumps(forecast_data) if forecast_data else None
    
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO forecasts 
                (company_id, csv_id, metric, group_type, group_key, model_path, forecast_data)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (company_id, csv_id, metric, group_type, group_key)
                DO UPDATE SET 
                    model_path = EXCLUDED.model_path,
                    forecast_data = EXCLUDED.forecast_data,
                    created_at = now()
            """, (company_id, csv_id, metric, group_type, group_key, model_path, forecast_json))
        conn.commit()
    
    logger.info(f"[OK] Saved forecast for company {company_id}: {metric} ({group_type}:{group_key})")


def get_forecasts(
    company_id: str,
    csv_id: str,
    metric: Optional[str] = None,
    group_type: Optional[str] = None,
    group_key: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Retrieve forecasts from database with optional filters.
    
    Returns:
        List of forecast dictionaries with parsed forecast_data
    """
    query = """
        SELECT id, company_id, csv_id, metric, group_type, group_key, 
               model_path, forecast_data, created_at
        FROM forecasts
        WHERE company_id = %s AND csv_id = %s
    """
    params = [company_id, csv_id]
    
    if metric:
        query += " AND metric = %s"
        params.append(metric)
    
    if group_type:
        query += " AND group_type = %s"
        params.append(group_type)
    
    if group_key is not None:
        query += " AND group_key = %s"
        params.append(group_key)
    
    query += " ORDER BY created_at DESC"
    
    logger.debug(f"Executing forecast query with params: {params}")
    
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            results = cursor.fetchall()
    
    logger.debug(f"Found {len(results)} forecast records")
    
    # Convert to list of dicts and parse forecast_data
    forecast_list = []
    for row in results:
        result = dict(row)
        if result.get('forecast_data'):
            result['forecast_data'] = json.loads(result['forecast_data'])
        # Convert UUID to string for JSON serialization
        result['id'] = str(result['id'])
        result['company_id'] = str(result['company_id'])
        forecast_list.append(result)
    
    return forecast_list


# ==================== PRODUCT CLUSTERS ====================

def save_product_clusters(company_id: str, csv_id: str, clusters: List[Dict[str, Any]]):
    """
    Save product clustering results.
    
    Args:
        company_id: Company UUID
        csv_id: File identifier
        clusters: List of cluster dictionaries with cluster_id, cluster_name, top_terms, sample_products, cluster_size
    """
    records = []
    for cluster in clusters:
        records.append((
            company_id,
            csv_id,
            cluster['cluster_id'],
            cluster.get('cluster_name', f"Cluster {cluster['cluster_id']}"),
            json.dumps(cluster['top_terms']),
            json.dumps(cluster['sample_products']),
            cluster['cluster_size']
        ))
    
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.executemany("""
                INSERT INTO product_clusters 
                (company_id, csv_id, cluster_id, cluster_name, top_terms, sample_products, cluster_size)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (company_id, csv_id, cluster_id)
                DO UPDATE SET 
                    cluster_name = EXCLUDED.cluster_name,
                    top_terms = EXCLUDED.top_terms,
                    sample_products = EXCLUDED.sample_products,
                    cluster_size = EXCLUDED.cluster_size,
                    created_at = now()
            """, records)
        conn.commit()
    
    logger.info(f"[OK] Saved {len(records)} product clusters for company {company_id}")


def get_product_clusters(company_id: str, csv_id: str) -> List[Dict[str, Any]]:
    """Retrieve product clusters for a CSV."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT id, cluster_id, cluster_name, top_terms, sample_products, cluster_size, created_at
                FROM product_clusters
                WHERE company_id = %s AND csv_id = %s
                ORDER BY cluster_size DESC
            """, (company_id, csv_id))
            results = cursor.fetchall()
    
    # Convert to list of dicts and parse JSON
    clusters = []
    for row in results:
        cluster = dict(row)
        cluster['id'] = str(cluster['id'])
        cluster['top_terms'] = json.loads(cluster['top_terms'])
        cluster['sample_products'] = json.loads(cluster['sample_products'])
        clusters.append(cluster)
    
    return clusters


# ==================== RFM SEGMENTS ====================

def save_rfm_segments(company_id: str, csv_id: str, segments: List[Dict[str, Any]]):
    """
    Save RFM segmentation results.
    
    Args:
        company_id: Company UUID
        csv_id: File identifier
        segments: List of segment dictionaries with stats
    """
    records = []
    for seg in segments:
        records.append((
            company_id,
            csv_id,
            seg['segment_name'],
            json.dumps(seg['stats']),
            seg['customer_count'],
            seg['total_revenue'],
            seg['avg_order_value']
        ))
    
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.executemany("""
                INSERT INTO rfm_segments 
                (company_id, csv_id, segment_name, segment_stats, customer_count, total_revenue, avg_order_value)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (company_id, csv_id, segment_name)
                DO UPDATE SET 
                    segment_stats = EXCLUDED.segment_stats,
                    customer_count = EXCLUDED.customer_count,
                    total_revenue = EXCLUDED.total_revenue,
                    avg_order_value = EXCLUDED.avg_order_value,
                    created_at = now()
            """, records)
        conn.commit()
    
    logger.info(f"[OK] Saved {len(records)} RFM segments for company {company_id}")


def get_rfm_segments(company_id: str, csv_id: str) -> List[Dict[str, Any]]:
    """Retrieve RFM segments for a CSV."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT id, segment_name, segment_stats, customer_count, total_revenue, avg_order_value, created_at
                FROM rfm_segments
                WHERE company_id = %s AND csv_id = %s
                ORDER BY total_revenue DESC
            """, (company_id, csv_id))
            results = cursor.fetchall()
    
    # Convert to list of dicts and parse JSON
    segments = []
    for row in results:
        segment = dict(row)
        segment['id'] = str(segment['id'])
        
        # Parse segment_stats JSON and flatten into main object
        if segment['segment_stats']:
            stats = json.loads(segment['segment_stats'])
            segment['avg_recency'] = stats.get('avg_recency', 0)
            segment['avg_frequency'] = stats.get('avg_frequency', 0)
            segment['avg_monetary'] = stats.get('avg_monetary', 0)
        else:
            segment['avg_recency'] = 0
            segment['avg_frequency'] = 0
            segment['avg_monetary'] = 0
        
        del segment['segment_stats']  # Remove raw JSON field
        segments.append(segment)
    
    return segments


# ==================== COMPANY HELPERS ====================

def get_company_by_id(company_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve company by ID."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT id, name, city, country, created_at
                FROM companies
                WHERE id = %s
            """, (company_id,))
            result = cursor.fetchone()
    
    if result:
        company = dict(result)
        company['id'] = str(company['id'])
        return company
    return None


def get_all_companies() -> List[Dict[str, Any]]:
    """Retrieve all companies."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT id, name, city, country, created_at
                FROM companies
                ORDER BY name
            """)
            results = cursor.fetchall()
    
    companies = []
    for row in results:
        company = dict(row)
        company['id'] = str(company['id'])
        companies.append(company)
    
    return companies


# ==================== USER MANAGEMENT ====================

def create_company(name: str, city: str = None, country: str = None) -> Dict[str, Any]:
    """
    Create a new company.
    
    Args:
        name: Company name
        city: City
        country: Country
        
    Returns:
        Company dictionary with id
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                INSERT INTO companies (name, city, country)
                VALUES (%s, %s, %s)
                RETURNING id, name, city, country, created_at
            """, (name, city, country))
            result = cursor.fetchone()
        conn.commit()
    
    company = dict(result)
    company['id'] = str(company['id'])
    logger.info(f"[OK] Created company: {name} (ID: {company['id']})")
    return company


def create_user(email: str, company_id: str, role: str = 'employee', created_by: str = None) -> Dict[str, Any]:
    """
    Create a new user.
    
    Args:
        email: User email
        company_id: Company UUID
        role: User role (super_admin, admin, marketing, etc.)
        created_by: UUID of user who created this user
        
    Returns:
        User dictionary with id
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                INSERT INTO users (email, company_id, role, is_active, created_by)
                VALUES (%s, %s, %s, true, %s)
                RETURNING id, email, company_id, role, is_active, created_at
            """, (email, company_id, role, created_by))
            result = cursor.fetchone()
        conn.commit()
    
    user = dict(result)
    user['id'] = str(user['id'])
    user['company_id'] = str(user['company_id'])
    if user.get('created_by'):
        user['created_by'] = str(user['created_by'])
    
    logger.info(f"[OK] Created user: {email} with role {role}")
    return user


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user by email."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT id, email, company_id, role, is_active, created_at
                FROM users
                WHERE email = %s
            """, (email,))
            result = cursor.fetchone()
    
    if result:
        user = dict(result)
        user['id'] = str(user['id'])
        user['company_id'] = str(user['company_id'])
        return user
    return None


def get_users_by_company(company_id: str) -> List[Dict[str, Any]]:
    """Get all users for a company."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT id, email, role, is_active, created_at
                FROM users
                WHERE company_id = %s
                ORDER BY created_at DESC
            """, (company_id,))
            results = cursor.fetchall()
    
    users = []
    for row in results:
        user = dict(row)
        user['id'] = str(user['id'])
        users.append(user)
    
    return users


def update_user_status(user_id: str, is_active: bool) -> bool:
    """Enable or disable a user."""
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE users
                SET is_active = %s
                WHERE id = %s
            """, (is_active, user_id))
        conn.commit()
    
    logger.info(f"[OK] Updated user {user_id} status to {'active' if is_active else 'disabled'}")
    return True


def get_user_with_company(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user with company information."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT 
                    u.id, u.email, u.role, u.is_active, u.created_at,
                    c.id as company_id, c.name as company_name, c.city, c.country
                FROM users u
                JOIN companies c ON u.company_id = c.id
                WHERE u.id = %s
            """, (user_id,))
            result = cursor.fetchone()
    
    if result:
        user = dict(result)
        user['id'] = str(user['id'])
        user['company_id'] = str(user['company_id'])
        return user
    return None


# Initialize database on module import
try:
    init_database()
except Exception as e:
    logger.warning(f"Database initialization deferred: {e}")
