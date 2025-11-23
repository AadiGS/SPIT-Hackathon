"""
FastAPI application for Prophet ML Backend.
Minimal, reliable backend following KISS, YAGNI, DRY, and HAI principles.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor
import logging
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from api.models import (
    UploadResponse, 
    ForecastRequest, 
    ForecastResponse, 
    ErrorResponse
)
from utils.file_handler import save_uploaded_file, load_csv, get_file_path
from utils.auth import create_access_token, get_current_user
from ml.cleaning import clean_data
from ml.features import prepare_timeseries
from ml.prophet_model import train_prophet_model
from api.orchestrator import run_pipeline
from db.database import (
    get_forecasts, get_product_clusters, get_rfm_segments,
    get_all_companies, get_company_by_id, get_connection,
    get_user_by_email, get_user_with_company
)
from utils.rbac import get_user_permissions, get_role_display_name
from config import LOG_FORMAT, LOG_LEVEL, REQUIRED_COLUMNS, FORECAST_DAYS, DATA_DIR

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format=LOG_FORMAT,
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Prophet ML Backend",
    description="Minimal, reliable backend for retail sales forecasting using Prophet",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include company management router
from api.company import router as company_router
app.include_router(company_router)

# Include chatbot router
from api.chatbot import router as chatbot_router
app.include_router(chatbot_router)


@app.on_event("startup")
async def startup_event():
    """Log startup information."""
    logger.info("="*60)
    logger.info("Prophet ML Backend - Starting")
    logger.info("="*60)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Prophet ML Backend",
        "version": "1.0.0",
        "database": "PostgreSQL (Neon)"
    }


# ==================== AUTHENTICATION ENDPOINTS ====================

@app.post("/auth/request-otp")
async def request_otp(email: str):
    """
    Request OTP code for login (hardcoded to 123456 for demo).
    
    Args:
        email: User email address
        
    Returns:
        Success message with hardcoded OTP
        
    Raises:
        HTTPException: 404 if user not found
    """
    logger.info(f"OTP request for email: {email}")
    
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()
            
            if not user:
                logger.warning(f"User not found: {email}")
                raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"OTP sent (hardcoded) for: {email}")
    return {
        "message": "OTP sent to your email",
        "otp": "123456"  # Hardcoded for demo - in production this would be sent via email
    }


@app.post("/auth/verify-otp")
async def verify_otp(email: str, otp_code: str):
    """
    Verify OTP code and return JWT token.
    
    Args:
        email: User email address
        otp_code: OTP code (must be "123456" for demo)
        
    Returns:
        JWT access token and user information
        
    Raises:
        HTTPException: 401 if OTP invalid, 404 if user not found
    """
    logger.info(f"OTP verification for email: {email}")
    
    # Hardcoded OTP check
    if otp_code != "123456":
        logger.warning(f"Invalid OTP attempt for: {email}")
        raise HTTPException(status_code=401, detail="Invalid OTP code")
    
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT u.id, u.email, u.name, u.role, u.is_active, u.company_id, c.name as company_name
                FROM users u
                JOIN companies c ON u.company_id = c.id
                WHERE u.email = %s
            """, (email,))
            user = cursor.fetchone()
            
            if not user:
                logger.warning(f"User not found: {email}")
                raise HTTPException(status_code=404, detail="User not found")
            
            if not user['is_active']:
                logger.warning(f"User account disabled: {email}")
                raise HTTPException(status_code=403, detail="User account is disabled")
    
    # Create JWT token with role
    token = create_access_token({
        "user_id": str(user['id']),
        "email": user['email'],
        "company_id": str(user['company_id']),
        "role": user['role']
    })
    
    logger.info(f"Login successful for: {email}, company: {user['company_name']}, role: {user['role']}")
    
    # Get permissions for the role
    permissions = get_user_permissions(user['role'])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user['id']),
            "email": user['email'],
            "role": user['role'],
            "role_display": get_role_display_name(user['role']),
            "permissions": list(permissions),
            "name": user['name'],
            "company_id": str(user['company_id']),
            "company_name": user['company_name'],
            "role": user['role']
        }
    }


@app.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current user information from JWT token.
    
    Args:
        current_user: User data extracted from JWT token
        
    Returns:
        User information with role and permissions
    """
    logger.info(f"Fetching user info for: {current_user.get('email')}")
    
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT u.id, u.email, u.name, u.role, u.is_active, u.company_id, c.name as company_name
                FROM users u
                JOIN companies c ON u.company_id = c.id
                WHERE u.id = %s
            """, (current_user['user_id'],))
            user = cursor.fetchone()
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            if not user['is_active']:
                raise HTTPException(status_code=403, detail="User account is disabled")
    
    # Get permissions for the role
    permissions = get_user_permissions(user['role'])
    
    return {
        "id": str(user['id']),
        "email": user['email'],
        "name": user['name'],
        "company_id": str(user['company_id']),
        "company_name": user['company_name'],
        "role": user['role'],
        "role_display": get_role_display_name(user['role']),
        "permissions": list(permissions),
        "is_active": user['is_active']
    }


# ==================== COMPANY ENDPOINTS ====================

@app.get("/companies")
async def list_companies():
    """
    List all companies in the system.
    
    Returns:
        List of companies with id, name, city, country
    """
    try:
        companies = get_all_companies()
        return {
            "count": len(companies),
            "companies": companies
        }
    except Exception as e:
        logger.error(f"Failed to retrieve companies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/companies/{company_id}")
async def get_company(company_id: str):
    """
    Get company details by ID.
    
    Args:
        company_id: Company UUID
        
    Returns:
        Company details
    """
    try:
        company = get_company_by_id(company_id)
        if not company:
            raise HTTPException(status_code=404, detail=f"Company not found: {company_id}")
        return company
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve company: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Upload and validate retail CSV file (requires authentication).
    
    Steps:
    1. Validate file type and size
    2. Save file with unique file_id
    3. Load and validate CSV structure
    4. Save metadata to csv_files table
    5. Return file_id for forecasting
    
    Args:
        file: CSV file with retail transaction data
        current_user: Authenticated user from JWT token
        
    Returns:
        Upload response with file_id and metadata
        
    Raises:
        HTTPException: 400 if validation fails
    """
    company_id = current_user['company_id']
    logger.info(f"POST /upload-csv - File: {file.filename}, Company: {company_id}")
    
    try:
        # Save uploaded file
        file_id, file_path = await save_uploaded_file(file)
        
        # Load and validate CSV
        df = load_csv(file_path)
        
        # Quick validation - check if required columns exist
        missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        
        if missing_cols:
            error_msg = f"Missing required columns: {missing_cols}"
            logger.error(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Calculate file size
        import os
        file_size = os.path.getsize(file_path)
        
        # Save metadata to database
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO csv_files (company_id, file_id, filename, size_bytes, row_count, column_count, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (company_id, file_id, file.filename, file_size, len(df), len(df.columns), 'uploaded'))
            conn.commit()
        
        logger.info(f"[OK] File uploaded successfully. file_id={file_id}, rows={len(df)}, company={company_id}")
        
        return {
            "file_id": file_id,
            "filename": file.filename,
            "size_bytes": file_size,
            "row_count": len(df),
            "column_count": len(df.columns),
            "message": f"File accepted. {len(df)} rows, {len(df.columns)} columns."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")


@app.get("/csv-files")
async def list_csv_files(current_user: dict = Depends(get_current_user)):
    """
    List all CSV files uploaded by the authenticated user's company.
    
    Args:
        current_user: Authenticated user from JWT token
        
    Returns:
        List of uploaded CSV files with metadata
    """
    company_id = current_user['company_id']
    logger.info(f"GET /csv-files - Company: {company_id}")
    
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT file_id, filename, size_bytes, row_count, column_count, 
                           uploaded_at, status, forecasts_generated
                    FROM csv_files
                    WHERE company_id = %s
                    ORDER BY uploaded_at DESC
                """, (company_id,))
                files = cursor.fetchall()
        
        # Convert to list of dicts
        files_list = []
        for file_row in files:
            file_dict = dict(file_row)
            # Convert datetime to ISO string
            if file_dict.get('uploaded_at'):
                file_dict['uploaded_at'] = file_dict['uploaded_at'].isoformat()
            files_list.append(file_dict)
        
        logger.info(f"[OK] Retrieved {len(files_list)} files for company {company_id}")
        
        return {
            "company_id": company_id,
            "count": len(files_list),
            "files": files_list
        }
        
    except Exception as e:
        logger.error(f"Failed to list CSV files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/forecast", 
    response_model=ForecastResponse,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def forecast(request: ForecastRequest):
    """
    Run Prophet forecasting pipeline and return 28-day forecast.
    
    Pipeline:
    1. Load CSV by file_id
    2. Clean data (nulls, negatives, outliers)
    3. Prepare time series (daily aggregation)
    4. Train Prophet model
    5. Generate 28-day forecast
    6. Return forecast JSON
    
    Args:
        request: ForecastRequest with file_id and model type
        
    Returns:
        ForecastResponse with forecast data, model path, and notes
        
    Raises:
        HTTPException: 
        - 404 if file_id not found
        - 400 if data validation fails
        - 422 if insufficient data
        - 500 if model training fails
    """
    logger.info("="*60)
    logger.info(f"POST /forecast - file_id={request.file_id}, model={request.model}")
    logger.info("="*60)
    
    # Validate model type
    if request.model != "prophet":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported model: {request.model}. Only 'prophet' is supported."
        )
    
    try:
        # Step 1: Load CSV
        logger.info("[1/5] Loading CSV...")
        file_path = get_file_path(request.file_id)
        df = load_csv(file_path)
        logger.info(f"[OK] Loaded {len(df)} rows")
        
        # Step 2: Clean data
        logger.info("[2/5] Cleaning data...")
        try:
            df_clean = clean_data(df)
        except ValueError as e:
            # Data validation errors → 400
            logger.error(f"Data validation failed: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
        
        logger.info(f"[OK] Cleaned to {len(df_clean)} rows")
        
        # Step 3: Prepare time series
        logger.info("[3/5] Preparing time series...")
        try:
            daily_df = prepare_timeseries(df_clean)
        except ValueError as e:
            # Insufficient data → 422
            logger.error(f"Time series preparation failed: {str(e)}")
            raise HTTPException(status_code=422, detail=str(e))
        
        logger.info(f"[OK] Prepared {len(daily_df)} days of data")
        
        # Step 4 & 5: Train model and generate forecast
        logger.info("[4/5] Training Prophet model and generating forecast...")
        try:
            result = train_prophet_model(daily_df, request.file_id)
        except RuntimeError as e:
            # Model training failure → 500
            logger.error(f"Model training failed: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
        
        logger.info(f"[OK] Forecast generated: {len(result['forecast'])} days")
        
        # Step 5: Return response
        logger.info("[5/5] Returning forecast...")
        logger.info("="*60)
        logger.info("[OK] FORECAST COMPLETE")
        logger.info("="*60)
        
        return ForecastResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check logs for details."}
    )


# ==================== NEW EXTENDED API ENDPOINTS ====================

@app.get("/processing-status/{file_id}")
async def check_processing_status(file_id: str, company_id: str, current_user: dict = Depends(get_current_user)):
    """
    Check if a file has already been processed.
    
    Returns processing status: 'uploaded', 'processing', 'completed', 'failed'
    """
    logger.info(f"GET /processing-status/{file_id} - company={company_id}")
    
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT status, forecasts_generated, uploaded_at
                    FROM csv_files
                    WHERE file_id = %s AND company_id = %s
                """, (file_id, company_id))
                file_info = cursor.fetchone()
                
                if not file_info:
                    raise HTTPException(status_code=404, detail="File not found")
                
                return {
                    "file_id": file_id,
                    "status": file_info['status'],
                    "forecasts_generated": file_info['forecasts_generated'],
                    "uploaded_at": file_info['uploaded_at'].isoformat() if file_info['uploaded_at'] else None
                }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to check processing status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/run-all-forecasts")
async def run_all_forecasts(file_id: str, company_id: str, current_user: dict = Depends(get_current_user)):
    """
    Run complete multi-dimensional forecasting pipeline.
    
    Executes:
    1. Data cleaning and preparation
    2. Product clustering (TF-IDF + KMeans)
    3. RFM customer segmentation
    4. Multi-metric Prophet forecasting (4 metrics × 4 group types)
    5. Save all results to database
    
    Args:
        file_id: File identifier from upload-csv endpoint
        company_id: Company UUID
        
    Returns:
        Pipeline execution summary
    """
    logger.info(f"POST /run-all-forecasts - file_id={file_id}, company_id={company_id}")
    
    try:
        # Check if already processed
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT status, forecasts_generated
                    FROM csv_files
                    WHERE file_id = %s AND company_id = %s
                """, (file_id, company_id))
                file_info = cursor.fetchone()
                
                if file_info and file_info['forecasts_generated']:
                    logger.info(f"File {file_id} already processed, skipping")
                    return {
                        "status": "success",
                        "message": "File already processed",
                        "file_id": file_id,
                        "company_id": company_id,
                        "skipped": True
                    }
        
        # Update status to processing
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE csv_files 
                    SET status = 'processing'
                    WHERE file_id = %s AND company_id = %s
                """, (file_id, company_id))
            conn.commit()
        
        # Validate company exists
        company = get_company_by_id(company_id)
        if not company:
            raise HTTPException(status_code=404, detail=f"Company not found: {company_id}")
        
        # Get file path
        file_path = get_file_path(file_id)
        
        # Run pipeline with company_id
        result = run_pipeline(file_id, file_path, company_id)
        
        if result['status'] == 'error':
            # Update status to failed
            with get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        UPDATE csv_files 
                        SET status = 'failed'
                        WHERE file_id = %s AND company_id = %s
                    """, (file_id, company_id))
                conn.commit()
            raise HTTPException(status_code=500, detail=result.get('error', 'Pipeline failed'))
        
        # Update status to completed
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE csv_files 
                    SET status = 'completed', forecasts_generated = TRUE
                    WHERE file_id = %s AND company_id = %s
                """, (file_id, company_id))
            conn.commit()
        
        result['company_id'] = company_id
        result['company_name'] = company['name']
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pipeline execution failed: {e}", exc_info=True)
        # Update status to failed
        try:
            with get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        UPDATE csv_files 
                        SET status = 'failed'
                        WHERE file_id = %s AND company_id = %s
                    """, (file_id, company_id))
                conn.commit()
        except:
            pass
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/forecast-results/{file_id}")
async def get_forecast_results(file_id: str, company_id: str, metric: str = None, 
                                group_type: str = None, group_key: str = None):
    """
    Retrieve saved forecast results from database with historical comparison.
    
    Args:
        file_id: File identifier
        company_id: Company UUID
        metric: Optional filter by metric (total_revenue, order_count, unique_customers_per_day, avg_order_value)
        group_type: Optional filter by group type (overall, country, cluster, rfm)
        group_key: Optional filter by group key (country name, cluster ID, segment name)
        
    Returns:
        Forecast records with historical baseline for comparison
    """
    logger.info(f"GET /forecast-results/{file_id} - company_id={company_id}, metric={metric}, group={group_type}, key={group_key}")
    
    try:
        # Normalize metric name: frontend sends unique_customers_per_day, backend stores unique_customers
        db_metric = metric.replace('_per_day', '') if metric else None
        
        # Normalize group_type: frontend sends 'cluster', backend stores 'product_cluster'
        db_group_type = 'product_cluster' if group_type == 'cluster' else group_type
        
        logger.info(f"Normalized query: metric={db_metric}, group_type={db_group_type}, group_key={group_key}")
        
        forecasts = get_forecasts(company_id, file_id, db_metric, db_group_type, group_key)
        logger.info(f"Found {len(forecasts)} forecast records")
        
        # Get historical baseline from cache (much faster than recalculating)
        historical_avg = None
        historical_total = None
        
        if forecasts and len(forecasts) > 0:
            try:
                # Try to load from cache first
                import json
                cache_path = Path(DATA_DIR) / f"{file_id}_baselines.json"
                
                if cache_path.exists():
                    with open(cache_path, 'r') as f:
                        baseline_cache = json.load(f)
                    
                    # Build cache key based on filters
                    cache_key = f"{db_metric}_{db_group_type or 'overall'}"
                    if group_key and db_group_type:
                        cache_key += f"_{group_key}"
                    
                    if cache_key in baseline_cache:
                        historical_avg = baseline_cache[cache_key]['avg']
                        historical_total = baseline_cache[cache_key]['total']
                        logger.info(f"Loaded cached baseline for {cache_key}: avg={historical_avg:.2f}, total={historical_total:.2f}")
                    else:
                        logger.warning(f"No cached baseline found for {cache_key}")
                else:
                    logger.warning(f"Baseline cache not found at {cache_path}, historical baseline will be null")
                    
            except Exception as e:
                logger.warning(f"Could not load cached baseline: {e}")
        
        # Flatten forecast_data to match frontend expectations
        # Frontend expects forecasts to be an array of daily forecast points, not forecast records
        flattened_forecasts = []
        forecast_metadata = {}
        if forecasts and len(forecasts) > 0:
            # Get the first (and typically only) forecast record for this metric/group combination
            forecast_record = forecasts[0]
            if forecast_record.get('forecast_data'):
                flattened_forecasts = forecast_record['forecast_data']
                logger.info(f"Flattened {len(flattened_forecasts)} forecast days from forecast record")
            
            # Include metadata about the forecast
            forecast_metadata = {
                'metric': forecast_record.get('metric'),
                'group_type': forecast_record.get('group_type'),
                'group_key': forecast_record.get('group_key'),
                'created_at': str(forecast_record.get('created_at')) if forecast_record.get('created_at') else None
            }
        else:
            logger.warning(f"No forecasts found for file_id={file_id}, metric={db_metric}, group={db_group_type}, key={group_key}")
        
        return {
            "file_id": file_id,
            "company_id": company_id,
            "count": len(flattened_forecasts),  # Number of forecast days, not records
            "forecasts": flattened_forecasts,   # Array of daily forecast points
            "metadata": forecast_metadata,      # Forecast metadata
            "historical_avg": historical_avg,
            "historical_total": historical_total,
            "forecast_days": FORECAST_DAYS
        }
    except Exception as e:
        logger.error(f"Failed to retrieve forecasts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/filter-options/{file_id}")
async def get_filter_options(file_id: str, company_id: str):
    """
    Get available filter options (regions, categories) for a file.
    
    Args:
        file_id: File identifier
        company_id: Company UUID
        
    Returns:
        Available regions (countries) and categories (product clusters)
    """
    logger.info(f"GET /filter-options/{file_id} - company_id={company_id}")
    
    try:
        # Get all forecast records for this file to extract unique regions
        from db.database import get_forecasts
        
        # Get country forecasts
        country_forecasts = get_forecasts(company_id, file_id, group_type='country')
        regions = list(set([f.get('group_key') for f in country_forecasts if f.get('group_key')]))
        regions.sort()
        
        # Get cluster forecasts to verify they exist
        cluster_forecasts = get_forecasts(company_id, file_id, group_type='product_cluster')
        cluster_ids_with_forecasts = list(set([f.get('group_key') for f in cluster_forecasts if f.get('group_key')]))
        logger.info(f"Cluster IDs with forecasts: {cluster_ids_with_forecasts}")
        
        # Get product clusters from metadata
        clusters = get_product_clusters(company_id, file_id)
        categories = [
            {
                'id': str(c['cluster_id']),
                'name': c['cluster_name'],
                'has_forecasts': str(c['cluster_id']) in cluster_ids_with_forecasts
            }
            for c in clusters
        ]
        
        logger.info(f"Returning {len(regions)} regions and {len(categories)} categories")
        
        return {
            "file_id": file_id,
            "company_id": company_id,
            "regions": regions,
            "categories": categories
        }
    except Exception as e:
        logger.error(f"Failed to retrieve filter options: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/product-clusters/{file_id}")
async def get_clusters(file_id: str, company_id: str):
    """
    Retrieve product clustering results.
    
    Args:
        file_id: File identifier
        company_id: Company UUID
        
    Returns:
        List of product clusters with metadata
    """
    logger.info(f"GET /product-clusters/{file_id} - company_id={company_id}")
    
    try:
        clusters = get_product_clusters(company_id, file_id)
        return {
            "file_id": file_id,
            "company_id": company_id,
            "cluster_count": len(clusters),
            "clusters": clusters
        }
    except Exception as e:
        logger.error(f"Failed to retrieve clusters: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai-insights/{file_id}")
async def generate_ai_insights(file_id: str, company_id: str, request: dict):
    """
    Generate AI-powered insights using local LLM based on current filter state
    
    Args:
        file_id: File identifier
        company_id: Company UUID
        request: Dictionary with rfm_data, forecast_data, and filters
        
    Returns:
        Structured AI insights for marketing actions
    """
    logger.info(f"POST /ai-insights/{file_id} - company_id={company_id}")
    
    try:
        from ai.insights_generator import generate_marketing_insights
        
        rfm_data = request.get('rfm_data', {})
        forecast_data = request.get('forecast_data', {})
        filters = request.get('filters', {})
        
        logger.info(f"Generating AI insights with filters: {filters}")
        
        insights = await generate_marketing_insights(rfm_data, forecast_data, filters)
        
        return {
            "file_id": file_id,
            "company_id": company_id,
            "insights": insights,
            "filters_applied": filters
        }
    except Exception as e:
        logger.error(f"Failed to generate AI insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/rfm/{file_id}")
async def get_rfm(file_id: str, company_id: str, segment: str = None):
    """
    Retrieve RFM segmentation results.
    
    Args:
        file_id: File identifier
        company_id: Company UUID
        segment: Optional filter by segment (Champions, Loyal, Potential, At-Risk, etc.)
        
    Returns:
        List of customer RFM scores and segments
    """
    logger.info(f"GET /rfm/{file_id} - company_id={company_id}, segment={segment}")
    
    try:
        rfm_data = get_rfm_segments(company_id, file_id)
        
        if not rfm_data:
            return {
                "file_id": file_id,
                "company_id": company_id,
                "count": 0,
                "segments": []
            }
        
        # Filter by segment if specified
        if segment:
            rfm_data = [row for row in rfm_data if row.get('segment_name') == segment]
        
        return {
            "file_id": file_id,
            "company_id": company_id,
            "count": len(rfm_data),
            "segments": rfm_data
        }
    except Exception as e:
        logger.error(f"Failed to retrieve RFM data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

