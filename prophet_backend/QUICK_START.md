# Quick Start Guide - Prophet Backend with Neon PostgreSQL

## Prerequisites
- Python 3.10+
- PostgreSQL driver installed: `psycopg2-binary`
- `.env` file configured with DATABASE_URL

## Starting the Server

```bash
cd prophet_backend
python -m uvicorn api.main:app --host 0.0.0.0 --port 8003 --reload
```

Server will be available at: http://localhost:8003

## API Endpoints

### 1. Health Check
```bash
GET http://localhost:8003/
```

### 2. List Companies
```bash
GET http://localhost:8003/companies
```

**Response:**
```json
{
  "count": 2,
  "companies": [
    {
      "id": "306b5293-39bc-4cbc-bef0-9e9f87072e5c",
      "name": "Tech Innovations Ltd",
      "city": "Mumbai",
      "country": "India"
    }
  ]
}
```

### 3. Get Company Details
```bash
GET http://localhost:8003/companies/{company_id}
```

### 4. Upload CSV
```bash
POST http://localhost:8003/upload-csv
Content-Type: multipart/form-data

file: your_retail_data.csv
```

**Response:**
```json
{
  "file_id": "abc123...",
  "message": "File accepted. 1000 rows, 8 columns."
}
```

### 5. Run Complete Forecasting Pipeline
```bash
POST http://localhost:8003/run-all-forecasts?file_id=abc123&company_id=306b5293-39bc-4cbc-bef0-9e9f87072e5c
```

**What it does:**
1. Cleans data
2. Clusters products (TF-IDF + KMeans)
3. Segments customers (RFM analysis)
4. Generates Prophet forecasts (4 metrics × 4 groups = 16+ forecasts)
5. Saves all results to PostgreSQL

**Response:**
```json
{
  "file_id": "abc123",
  "company_id": "306b5293-39bc-4cbc-bef0-9e9f87072e5c",
  "company_name": "Tech Innovations Ltd",
  "status": "success",
  "data_points": 1000,
  "product_clusters": 5,
  "rfm_segments": 8,
  "total_forecasts": 48,
  "forecasts_by_group": {
    "overall": 4,
    "country": 12,
    "product_cluster": 20,
    "rfm": 12
  }
}
```

### 6. Get Forecast Results
```bash
GET http://localhost:8003/forecast-results/{file_id}?company_id={company_id}

# Optional filters:
&metric=total_revenue
&group_type=overall
&group_key=Champions
```

**Response:**
```json
{
  "file_id": "abc123",
  "company_id": "306b5293...",
  "count": 48,
  "forecasts": [
    {
      "id": "uuid...",
      "metric": "total_revenue",
      "group_type": "overall",
      "group_key": null,
      "forecast_data": [
        {"ds": "2024-01-01", "yhat": 15000, "yhat_lower": 12000, "yhat_upper": 18000},
        ...
      ],
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 7. Get Product Clusters
```bash
GET http://localhost:8003/product-clusters/{file_id}?company_id={company_id}
```

**Response:**
```json
{
  "file_id": "abc123",
  "company_id": "306b5293...",
  "cluster_count": 5,
  "clusters": [
    {
      "cluster_id": 0,
      "cluster_name": "Cluster 0",
      "cluster_size": 250,
      "top_terms": ["christmas", "decoration", "ornament"],
      "sample_products": ["RED CHRISTMAS ORNAMENT", "SANTA DECORATION"]
    }
  ]
}
```

### 8. Get RFM Segments
```bash
GET http://localhost:8003/rfm/{file_id}?company_id={company_id}

# Optional filter:
&segment=Champions
```

**Response:**
```json
{
  "file_id": "abc123",
  "company_id": "306b5293...",
  "count": 8,
  "segments": [
    {
      "segment_name": "Champions",
      "customer_count": 150,
      "total_revenue": 125000.50,
      "avg_order_value": 833.34,
      "stats": {
        "avg_recency": 5.2,
        "avg_frequency": 45.3,
        "avg_monetary": 2500.10
      }
    }
  ]
}
```

## Company IDs (Existing in Neon DB)

### Tech Innovations Ltd
```
ID: 306b5293-39bc-4cbc-bef0-9e9f87072e5c
Location: Mumbai, India
```

### MediCare Health Systems
```
ID: c96b8b3a-e979-4ca0-a28b-b772e730d46b
Location: Hyderabad, India
```

## Example Workflow

```bash
# 1. Check server health
curl http://localhost:8003/

# 2. List available companies
curl http://localhost:8003/companies

# 3. Upload CSV for Tech Innovations Ltd
curl -X POST http://localhost:8003/upload-csv \
  -F "file=@retail_data.csv"

# Note: Save the returned file_id

# 4. Run forecasting pipeline
curl -X POST "http://localhost:8003/run-all-forecasts?file_id=YOUR_FILE_ID&company_id=306b5293-39bc-4cbc-bef0-9e9f87072e5c"

# 5. Get overall revenue forecast
curl "http://localhost:8003/forecast-results/YOUR_FILE_ID?company_id=306b5293-39bc-4cbc-bef0-9e9f87072e5c&metric=total_revenue&group_type=overall"

# 6. Get product clusters
curl "http://localhost:8003/product-clusters/YOUR_FILE_ID?company_id=306b5293-39bc-4cbc-bef0-9e9f87072e5c"

# 7. Get RFM segments
curl "http://localhost:8003/rfm/YOUR_FILE_ID?company_id=306b5293-39bc-4cbc-bef0-9e9f87072e5c"
```

## PowerShell Examples

```powershell
# List companies
Invoke-RestMethod -Uri "http://localhost:8003/companies" -Method Get

# Upload CSV
$file = Get-Item ".\retail_data.csv"
$form = @{
    file = $file
}
Invoke-RestMethod -Uri "http://localhost:8003/upload-csv" -Method Post -Form $form

# Run forecasts
$params = @{
    file_id = "abc123"
    company_id = "306b5293-39bc-4cbc-bef0-9e9f87072e5c"
}
Invoke-RestMethod -Uri "http://localhost:8003/run-all-forecasts" -Method Post -Body $params

# Get forecasts
Invoke-RestMethod -Uri "http://localhost:8003/forecast-results/abc123?company_id=306b5293-39bc-4cbc-bef0-9e9f87072e5c" -Method Get
```

## Python Examples

```python
import requests

BASE_URL = "http://localhost:8003"
COMPANY_ID = "306b5293-39bc-4cbc-bef0-9e9f87072e5c"

# List companies
response = requests.get(f"{BASE_URL}/companies")
companies = response.json()
print(f"Found {companies['count']} companies")

# Upload CSV
with open("retail_data.csv", "rb") as f:
    files = {"file": ("retail_data.csv", f, "text/csv")}
    response = requests.post(f"{BASE_URL}/upload-csv", files=files)
    file_id = response.json()["file_id"]
    print(f"File uploaded: {file_id}")

# Run forecasts
response = requests.post(
    f"{BASE_URL}/run-all-forecasts",
    params={"file_id": file_id, "company_id": COMPANY_ID}
)
result = response.json()
print(f"Forecasts generated: {result['total_forecasts']}")

# Get forecasts
response = requests.get(
    f"{BASE_URL}/forecast-results/{file_id}",
    params={"company_id": COMPANY_ID, "metric": "total_revenue"}
)
forecasts = response.json()
print(f"Retrieved {forecasts['count']} forecasts")
```

## Interactive API Documentation

Open in browser:
```
http://localhost:8003/docs
```

This provides:
- Swagger UI with all endpoints
- Try-it-out functionality
- Request/response schemas
- Example payloads

## Troubleshooting

### Port Already in Use
```bash
# Windows PowerShell
netstat -ano | Select-String "8003"
Stop-Process -Id <PID> -Force
```

### Database Connection Error
Check `.env` file:
```
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

### Module Import Errors
```bash
cd prophet_backend
python -m uvicorn api.main:app --host 0.0.0.0 --port 8003
```

### View Logs
Server logs show:
- Database initialization
- Request processing
- Error details
- Pipeline progress

## Data Isolation

Each company's data is completely isolated:
```python
# Company A uploads and runs forecasts
file_id = "abc123"
company_a = "306b5293..."

# Company B cannot access Company A's data
response = requests.get(
    f"{BASE_URL}/forecast-results/{file_id}",
    params={"company_id": company_b}  # Different company_id
)
# Returns: {"count": 0, "forecasts": []}  # No data leaked
```

## Performance Tips

1. **Connection Pooling**: Database uses 1-20 pooled connections
2. **Batch Processing**: Upload CSV once, run forecasts once
3. **Filter Results**: Use query parameters to reduce response size
4. **Caching**: Consider caching forecast results on client side

## Security Notes

- `.env` file contains sensitive DATABASE_URL - never commit to git
- Add to `.gitignore`: `.env`
- In production, add JWT authentication to verify company_id
- Validate users belong to the company they're querying
