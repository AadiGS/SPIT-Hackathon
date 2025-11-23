# Prophet ML Backend - Multi-Dimensional Forecasting Platform

An advanced, production-ready backend service that performs comprehensive retail analytics including Prophet time series forecasting, product clustering, RFM customer segmentation, and AI-powered insights.

## 🎯 Features

### Core Capabilities
- **Multi-Metric Forecasting**: Predict 4 key metrics (revenue, orders, customers, avg order value) 28 days ahead
- **Multi-Dimensional Analysis**: Forecast at overall, country, product cluster, and RFM segment levels
- **Product Clustering**: Automatic TF-IDF + KMeans clustering of products
- **RFM Segmentation**: Customer segmentation into 7 behavioral groups
- **AI Insights**: Natural language insights via LM Studio local LLM
- **Database Persistence**: SQLite storage for all results (upgradeable to PostgreSQL)

### Engineering Principles
- **KISS**: Simple, readable code over clever solutions
- **YAGNI**: No extra features or libraries unless required
- **DRY**: Extracted repeated logic into utils; config for repeated values
- **HAI**: Basic reliability with error handling, retries, and meaningful logs

## 📁 Project Structure

```
prophet_backend/
├── api/
│   ├── main.py              # FastAPI application with 8 endpoints
│   ├── models.py            # Pydantic models for validation
│   └── orchestrator.py      # Pipeline coordination
├── ml/
│   ├── cleaning.py          # Data cleaning (nulls, negatives, outliers)
│   ├── features.py          # Time series preparation
│   ├── prophet_model.py     # Prophet training (single metric)
│   ├── multi_forecast.py    # Multi-metric Prophet forecasting
│   ├── clustering.py        # Product clustering (TF-IDF + KMeans)
│   ├── rfm.py               # RFM customer segmentation
│   └── utils.py             # Metric aggregation utilities
├── ai/
│   └── insights.py          # LM Studio AI insights generation
├── db/
│   ├── schema.sql           # Database schema
│   ├── database.py          # SQLite operations
│   └── prophet_backend.db   # SQLite database
├── utils/
│   └── file_handler.py      # CSV upload and storage
├── tests/
│   ├── test_cleaning.py     # Unit tests for cleaning
│   ├── test_features.py     # Unit tests for features
│   └── test_integration.py  # Integration tests
├── models/                  # Saved Prophet models (.pkl)
├── data/                    # Uploaded CSV files
├── config.py                # Centralized configuration
├── requirements.txt         # Python dependencies
└── README.md                # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd prophet_backend
pip install -r requirements.txt
```

**Required packages:**
- fastapi==0.104.1
- uvicorn==0.24.0
- prophet==1.1.5 (compatible version)
- pandas==2.2.0
- numpy==1.26.3
- scikit-learn==1.4.0
- requests==2.31.0

### 2. Setup LM Studio (Optional but Recommended)

1. Download LM Studio from https://lmstudio.ai
2. Load a model (e.g., Llama 2, Mistral)
3. Start local server on port 1234
4. Verify: `curl http://localhost:1234/v1/models`

To disable AI insights: Set `AI_INSIGHTS_ENABLED = False` in `config.py`

### 3. Run the Server

```powershell
uvicorn api.main:app --reload --port 8001
```

Server will start at: `http://127.0.0.1:8001`

### 4. Check Health

```powershell
curl http://127.0.0.1:8001/
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Prophet ML Backend",
  "version": "1.0.0"
}
```

## 📡 API Endpoints

### Legacy Endpoints (Backward Compatible)

#### 1. Upload CSV

**Endpoint:** `POST /upload-csv`

**Description:** Upload and validate retail CSV file

**Request:**
```powershell
curl -X POST "http://127.0.0.1:8001/upload-csv" `
  -F "file=@online_retail_II.csv"
```

**Success Response (200):**
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "File accepted. 541909 rows, 8 columns."
}
```

#### 2. Generate Single Forecast (Legacy)

**Endpoint:** `POST /forecast`

**Description:** Original single-metric forecast endpoint (still supported)

**Request:**
```powershell
curl -X POST "http://127.0.0.1:8001/forecast" `
  -H "Content-Type: application/json" `
  -d '{\"file_id\": \"550e8400-e29b-41d4-a716-446655440000\", \"model\": \"prophet\"}'
```

---

### New Extended API Endpoints

#### 3. Run Complete Multi-Dimensional Analysis

**Endpoint:** `POST /run-all-forecasts`

**Description:** Execute complete pipeline with clustering, RFM, forecasting, and AI insights

**Request:**
```powershell
curl -X POST "http://127.0.0.1:8001/run-all-forecasts?file_id=550e8400-e29b-41d4-a716-446655440000"
```

**Success Response (200):**
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "data_points": 541909,
  "product_clusters": 8,
  "rfm_segments": 7,
  "total_forecasts": 64,
  "forecasts_by_group": {
    "overall": 4,
    "country": 16,
    "product_cluster": 32,
    "rfm": 12
  },
  "insights_generated": true
}
```

**Pipeline Stages:**
1. Data cleaning and validation
2. Product clustering (TF-IDF + KMeans)
3. RFM customer segmentation
4. Multi-metric Prophet forecasting (4 metrics × multiple groups)
5. AI-powered insights generation
6. Database persistence

---

#### 4. Get Forecast Results

**Endpoint:** `GET /forecast-results/{file_id}`

**Description:** Retrieve saved forecast results with optional filtering

**Query Parameters:**
- `metric` (optional): Filter by metric (`total_revenue`, `order_count`, `unique_customers`, `avg_order_value`)
- `group_type` (optional): Filter by group (`overall`, `country`, `product_cluster`, `rfm`)
- `group_key` (optional): Filter by specific group key (e.g., `USA`, `cluster_2`, `Champions`)

**Request:**
```powershell
# Get all forecasts
curl "http://127.0.0.1:8001/forecast-results/550e8400-e29b-41d4-a716-446655440000"

# Get revenue forecasts for USA
curl "http://127.0.0.1:8001/forecast-results/550e8400-e29b-41d4-a716-446655440000?metric=total_revenue&group_type=country&group_key=USA"
```

```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "count": 64,
  "forecasts": [
    {
      "id": 1,
      "metric": "total_revenue",
      "group_type": "country",
      "group_key": "USA",
      "forecast_data": [
        {"ds": "2025-03-01", "yhat": 52000.45, "yhat_lower": 48000.20, "yhat_upper": 56000.80},
        ...
      ],
      "created_at": "2025-02-15T10:30:00"
    }
  ]
}
```

---

#### 5. Get Product Clusters

**Endpoint:** `GET /product-clusters/{file_id}`

**Description:** Retrieve product clustering results

**Request:**
```powershell
curl "http://127.0.0.1:8001/product-clusters/550e8400-e29b-41d4-a716-446655440000"
```

**Success Response (200):**
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "cluster_count": 8,
  "clusters": [
    {
      "cluster_id": 0,
      "product_count": 145,
      "top_terms": ["red", "christmas", "decoration", "vintage"],
      "sample_products": ["RED RETROSPOT CUSHION", "CHRISTMAS LIGHTS"],
      "created_at": "2025-02-15T10:25:00"
    }
  ]
}
```

---

#### 6. Get RFM Segments

**Endpoint:** `GET /rfm/{file_id}`

**Description:** Retrieve RFM customer segmentation

**Query Parameters:**
- `segment` (optional): Filter by segment (`Champions`, `Loyal`, `At Risk`, etc.)

**Request:**
```powershell
curl "http://127.0.0.1:8001/rfm/550e8400-e29b-41d4-a716-446655440000?segment=Champions"
```

**Success Response (200):**
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_customers": 4372,
  "segments_summary": {
    "Champions": {"count": 892, "total_monetary": 452000.50},
    "Loyal": {"count": 654, "total_monetary": 280000.30},
    "At Risk": {"count": 310, "total_monetary": 95000.20}
  },
  "rfm_data": [
    {
      "customer_id": "12345",
      "recency": 5,
      "frequency": 28,
      "monetary": 5240.50,
      "r_score": 5,
      "f_score": 5,
      "m_score": 5,
      "segment": "Champions"
    }
  ]
}
```

**RFM Segments:**
- **Champions**: R≥4, F≥4, M≥4 - Best customers
- **Loyal**: F≥4 - Frequent buyers
- **Potential Loyalists**: R≥3, F≥2, M≥2 - Growing customers
- **At Risk**: R≤2, F≥3 - Used to be good, need attention
- **Hibernating**: R≤2, F≤2 - Inactive customers
- **Big Spenders**: M≥4 - High value per transaction
- **Price Sensitive**: M≤2 - Low value per transaction

---

#### 7. Get AI Insights

**Endpoint:** `GET /ai-insights/{file_id}`

**Description:** Retrieve AI-generated insights and recommendations

**Request:**
```powershell
curl "http://127.0.0.1:8001/ai-insights/550e8400-e29b-41d4-a716-446655440000"
```

**Success Response (200):**
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "insights": [
    {
      "insights": [
        "Total forecasted revenue shows 12% growth compared to previous period",
        "USA and UK account for 65% of total forecast, indicating strong market concentration",
        "Product cluster 2 (holiday decorations) shows seasonal spike in forecast"
      ],
      "actions": [
        "Increase inventory for top-performing product clusters before peak season",
        "Launch targeted campaigns for At-Risk segment to prevent churn",
        "Expand marketing in underperforming countries with growth potential"
      ],
      "generated_at": "2025-02-15T10:32:00"
    }
  ]
}
```

---

## 📊 Expected CSV Schema

Your CSV must have these columns:

| Column | Type | Description |
|--------|------|-------------|
| Invoice | string | Invoice number |
| StockCode | string | Product code |
| Description | string | Product description |
| Quantity | int | Quantity sold |
| InvoiceDate | datetime | Transaction timestamp |
| Price | float | Unit price |
| Customer ID | float | Customer identifier |
| Country | string | Country name |

## 🔄 Complete Workflow Example

```powershell
# 1. Upload CSV
$uploadResponse = curl -X POST "http://127.0.0.1:8001/upload-csv" `
  -F "file=@online_retail_II.csv" | ConvertFrom-Json
$fileId = $uploadResponse.file_id

# 2. Run complete multi-dimensional analysis
curl -X POST "http://127.0.0.1:8001/run-all-forecasts?file_id=$fileId"

# 3. Get overall revenue forecast
curl "http://127.0.0.1:8001/forecast-results/$fileId?metric=total_revenue&group_type=overall"

# 4. Get product clusters
curl "http://127.0.0.1:8001/product-clusters/$fileId"

# 5. Get Champions segment customers
curl "http://127.0.0.1:8001/rfm/$fileId?segment=Champions"

# 6. Get AI insights
curl "http://127.0.0.1:8001/ai-insights/$fileId"
```

## 🧹 Data Processing Pipeline

### Stage 1: Data Cleaning (`clean_data()`)

1. ✅ Validates required columns
2. ✅ Drops exact duplicates
3. ✅ Filters null Customer IDs
4. ✅ Removes non-positive Quantity/Price
5. ✅ Parses InvoiceDate to datetime
6. ✅ Computes `total = Quantity × Price`
7. ✅ Removes outliers using IQR (1.5× configurable)

### Stage 2: Product Clustering (`cluster_products()`)

1. ✅ Aggregates product-level data
2. ✅ TF-IDF vectorization of descriptions
3. ✅ Elbow method for optimal cluster count (2-10)
4. ✅ KMeans clustering
5. ✅ Extracts cluster metadata (top terms, samples)

### Stage 3: RFM Segmentation (`calculate_rfm()`)

1. ✅ Calculates Recency (days since last purchase)
2. ✅ Calculates Frequency (total purchases)
3. ✅ Calculates Monetary (total spend)
4. ✅ Scores each dimension 1-5 (quintiles)
5. ✅ Assigns segments based on RFM scores

### Stage 4: Multi-Metric Forecasting (`run_multi_metric_forecast()`)

**Forecasts 4 metrics:**
- `total_revenue`: Sum of daily revenue
- `order_count`: Count of daily orders
- `unique_customers`: Count of unique customers per day
- `avg_order_value`: Average order value per day

**Across 4 group types:**
- `overall`: Global forecast
- `country`: Per-country forecasts
- `product_cluster`: Per-cluster forecasts (if clustering enabled)
- `rfm`: Per-segment forecasts (if RFM enabled)

**Total forecasts:** Up to 4 metrics × (1 overall + N countries + M clusters + K segments) series

### Stage 5: AI Insights (`generate_insights()`)

1. ✅ Aggregates forecast summary
2. ✅ Builds context with clusters and RFM stats
3. ✅ Calls LM Studio with structured prompt
4. ✅ Parses response into insights and actions
5. ✅ Fallback to basic insights if LM Studio unavailable

## 🤖 Prophet Model Configuration

1. ✅ Fits Prophet with yearly/weekly seasonality
2. ✅ Creates 28-day future dataframe
3. ✅ Generates forecast with confidence intervals
4. ✅ Persists model to `models/{file_id}_prophet.pkl`
5. ✅ Returns forecast with yhat (prediction), yhat_lower, yhat_upper

**Prophet Parameters (configurable in `config.py`):**
- `daily_seasonality`: False
- `weekly_seasonality`: True
- `yearly_seasonality`: True
- `changepoint_prior_scale`: 0.05
- `seasonality_prior_scale`: 10.0

## 🧪 Running Tests

```powershell
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_cleaning.py -v
pytest tests/test_integration.py -v

# Run with coverage
pytest tests/ --cov=ml --cov-report=html

# Skip slow tests (Prophet training)
pytest tests/ -v -m "not slow"
```

**Test Coverage:**
- ✅ Data cleaning (nulls, negatives, outliers)
- ✅ Time series preparation and validation
- ✅ Product clustering (TF-IDF, KMeans)
- ✅ RFM segmentation (scoring, segments)
- ✅ Multi-metric forecasting (requires Prophet)
- ✅ Metric aggregation utilities

## ⚙️ Configuration

Edit `config.py` to customize:

```python
# Time series requirements
MIN_DAYS_REQUIRED = 60      # Minimum days for training
FORECAST_DAYS = 28          # Forecast horizon

# Data cleaning
IQR_MULTIPLIER = 1.5        # Outlier detection sensitivity
MIN_QUANTITY = 1
MIN_PRICE = 0.01

# Product clustering
MIN_PRODUCTS_FOR_CLUSTERING = 10
MAX_CLUSTERS = 10
MIN_CLUSTERS = 2

# AI Insights
LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"
AI_INSIGHTS_ENABLED = True  # Set False to disable

# Database
DATABASE_PATH = "db/prophet_backend.db"
```

## 🗃️ Database Schema

SQLite database with 4 tables:

### 1. `forecasts`
- `id`: Auto-increment primary key
- `file_id`: File identifier
- `metric`: Metric name (total_revenue, order_count, etc.)
- `group_type`: Group type (overall, country, product_cluster, rfm)
- `group_key`: Group identifier (country name, cluster ID, segment)
- `model_path`: Path to saved Prophet model
- `forecast_data`: JSON array of forecast points
- `created_at`: Timestamp

### 2. `product_clusters`
- `id`: Auto-increment primary key
- `file_id`: File identifier
- `cluster_id`: Cluster identifier (0, 1, 2, ...)
- `product_count`: Number of products in cluster
- `sample_products`: JSON array of sample product names
- `top_terms`: JSON array of top TF-IDF terms
- `created_at`: Timestamp

### 3. `rfm_segments`
- `id`: Auto-increment primary key
- `file_id`: File identifier
- `customer_id`: Customer identifier
- `recency`: Days since last purchase
- `frequency`: Total purchases
- `monetary`: Total spend
- `r_score`: Recency score (1-5)
- `f_score`: Frequency score (1-5)
- `m_score`: Monetary score (1-5)
- `segment`: Segment name (Champions, Loyal, etc.)
- `created_at`: Timestamp

### 4. `ai_insights`
- `id`: Auto-increment primary key
- `file_id`: File identifier
- `insights`: JSON array of insight strings
- `actions`: JSON array of recommended actions
- `raw_response`: Full LLM response
- `generated_at`: Timestamp

## 🔧 Troubleshooting

### Prophet Installation Issues

If you encounter `'Prophet' object has no attribute 'stan_backend'`:

```powershell
pip uninstall prophet holidays cmdstanpy
pip install prophet==1.1.5 holidays==0.38 cmdstanpy==1.2.0
python -m cmdstanpy.install_cmdstan --overwrite
```

### LM Studio Connection

If AI insights fail:

1. Verify LM Studio is running: `curl http://localhost:1234/v1/models`
2. Check model is loaded in LM Studio UI
3. Set `AI_INSIGHTS_ENABLED = False` in `config.py` to use fallback insights

### Database Issues

Database auto-initializes on first run. To reset:

```powershell
Remove-Item db/prophet_backend.db
```

### Port Conflicts

If port 8001 is in use:

```powershell
uvicorn api.main:app --reload --port 8002
```

## 📈 Performance Notes

- **Clustering**: O(n×k) for n products, k clusters
- **RFM**: O(n) for n customers
- **Forecasting**: O(m×g×t) for m metrics, g groups, t time points
- **Full Pipeline**: ~30-120 seconds for 500K rows (varies with data size and group counts)

**Optimization tips:**
- Reduce `MAX_CLUSTERS` for faster clustering
- Limit forecast groups to reduce Prophet training time
- Use SQLite for development, PostgreSQL for production

## 🚀 Production Deployment

### Switch to PostgreSQL

1. Install `psycopg2`: `pip install psycopg2-binary`
2. Update `db/database.py` to use PostgreSQL connection
3. Set environment variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

### Docker Deployment

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m cmdstanpy.install_cmdstan
COPY . .
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Environment Variables

```bash
PROPHET_BACKEND_LOG_LEVEL=INFO
PROPHET_BACKEND_DB_PATH=/data/prophet_backend.db
PROPHET_BACKEND_LM_STUDIO_URL=http://lm-studio:1234/v1/chat/completions
```

## 📝 License

MIT License - Free for hackathon and production use

## 🤝 Contributing

Contributions welcome! Key areas:
- Add more forecasting models (ARIMA, LSTM)
- Enhance clustering algorithms
- Improve AI prompt engineering
- Add data visualization endpoints

## 📞 Support

For issues or questions:
1. Check logs in terminal output
2. Review `config.py` settings
3. Verify CSV format matches schema
4. Run tests: `pytest tests/ -v`

---

**Built with:** FastAPI, Prophet, scikit-learn, SQLite, LM Studio

**Architecture:** Clean separation of concerns (API → Orchestrator → ML modules → Database)
- ✅ `test_remove_outliers_iqr`
- ✅ `test_clean_data_missing_columns`
- ✅ `test_clean_data_computes_total_amount`
- ✅ `test_prepare_timeseries_converts_to_ds_y`
- ✅ `test_prepare_timeseries_adds_date_features`
- ✅ `test_prepare_timeseries_aggregates_daily`
- ✅ `test_prepare_timeseries_insufficient_data`
- ✅ `test_prepare_timeseries_sorts_by_date`

## ⚙️ Configuration

Edit `config.py` to customize:

```python
MAX_FILE_SIZE_MB = 100        # Max CSV upload size
MAX_ROWS = 2_000_000          # Max rows to process
IQR_MULTIPLIER = 1.5          # Outlier detection sensitivity
MIN_DAYS_REQUIRED = 60        # Min days for training
FORECAST_DAYS = 28            # Forecast horizon
```

## 📝 Logging

Logs are output to stdout with INFO level by default.

**Example logs:**
```
2025-11-22 10:30:15 - ml.cleaning - INFO - Starting data cleaning. Initial rows: 541909
2025-11-22 10:30:16 - ml.cleaning - INFO - ✓ All required columns present
2025-11-22 10:30:17 - ml.cleaning - INFO - Dropped 5268 duplicate rows. Remaining: 536641
2025-11-22 10:30:18 - ml.features - INFO - Aggregated to 365 unique dates
2025-11-22 10:30:45 - ml.prophet_model - INFO - ✓ Model training complete
```

## 🔒 Security Notes

- File size limit: 100 MB (configurable)
- Row limit: 2M rows (configurable)
- No external internet calls at runtime
- All processing is local

## ⚠️ Known Limitations

1. **Synchronous Processing**: Prophet training is blocking (can take 30-60s for large datasets)
2. **No Background Jobs**: Frontend must poll or wait for response
3. **File Storage**: Uploaded files stored locally in `data/` directory
4. **Model Persistence**: Models saved as pickle files (not production-grade serialization)
5. **No Authentication**: Add auth layer for production deployment
6. **Single Model**: Only Prophet supported (extensible architecture)

## 🛠️ Troubleshooting

**Issue:** Prophet installation fails
```powershell
# Install Microsoft C++ Build Tools first
# Then: pip install prophet
```

**Issue:** Module import errors
```powershell
# Ensure you're in prophet_backend directory
cd prophet_backend
python -m api.main
```

**Issue:** Port already in use
```powershell
# Use different port
uvicorn api.main:app --reload --port 8001
```

## 📚 Example Workflow

```powershell
# 1. Start server
uvicorn api.main:app --reload

# 2. Upload CSV (in new terminal)
curl -X POST "http://127.0.0.1:8000/upload-csv" `
  -F "file=@online_retail_II.csv"

# Response: {"file_id": "abc123...", "message": "..."}

# 3. Generate forecast
curl -X POST "http://127.0.0.1:8000/forecast" `
  -H "Content-Type: application/json" `
  -d '{\"file_id\": \"abc123\", \"model\": \"prophet\"}'

# 4. Check saved model
ls models/
# Output: abc123_prophet.pkl
```

## 🎓 Development Guidelines

- **Ask First**: Before adding non-essential files or libraries
- **Minimal Viable**: Build smallest thing that works end-to-end
- **No Premature Optimization**: Focus on correctness first
- **Test What Matters**: Unit tests for cleaning and pipeline logic
- **Clear Logs**: Include meaningful INFO/ERROR level logs

## 📄 License

MIT License - Hackathon Project

---

**Built with ❤️ following KISS, YAGNI, DRY, and HAI principles**
