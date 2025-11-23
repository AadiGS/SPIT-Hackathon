# Multi-Tenant AI-Powered Retail Analytics Platform
## Integration Analysis & Roadmap

---

## Executive Summary

**Project**: Multi-tenant retail analytics platform delivering descriptive, diagnostic, predictive, and prescriptive analytics with AI-powered insights.

**Key Requirements**:
- Multi-company CSV upload with data cleaning and validation
- Product clustering (TF-IDF + KMeans) and RFM customer segmentation
- Multi-metric Prophet forecasting across overall, country, product cluster, and RFM segment dimensions
- AI-generated insights via local LLM (meta-llama-3.1-8b-instruct at `http://127.0.0.1:1234`)
- Dashboard-ready REST APIs for Sales, Marketing, Operations, Product, and Finance departments
- Secure multi-tenant data isolation via PostgreSQL RLS

**Current Status**:
- ✅ **Backend**: 85% complete — Core ML pipeline, multi-metric forecasting, DB persistence (PostgreSQL/Neon), clustering, RFM implemented
- ⚠️ **Frontend**: 60% complete — React dashboards built with mock data; no backend integration yet
- ❌ **Integration**: 0% — Frontend and backend operate independently; data format mismatches exist
- ❌ **AI Insights**: Partially implemented in backend, no frontend display or proper endpoint integration
- ❌ **Auth & Security**: No authentication; localStorage-based frontend auth only

---

## PART 1: BACKEND ANALYSIS

### 1.1 Backend File Structure

```
prophet_backend/
├── api/
│   ├── main.py              ✅ FastAPI app with 8 endpoints
│   ├── models.py            ✅ Pydantic validation models
│   └── orchestrator.py      ✅ Pipeline coordination
├── ml/
│   ├── cleaning.py          ✅ Data cleaning (nulls, negatives, outliers)
│   ├── clustering.py        ✅ Product clustering (TF-IDF + KMeans)
│   ├── rfm.py               ✅ RFM segmentation (7 segments)
│   ├── multi_forecast.py    ✅ Multi-metric Prophet forecasting
│   ├── prophet_model.py     ✅ Single Prophet model training
│   ├── features.py          ✅ Time series preparation
│   └── utils.py             ✅ Metric aggregation
├── ai/
│   └── insights.py          ⚠️ AI insights generation (LM Studio)
├── db/
│   ├── database.py          ✅ PostgreSQL operations with connection pooling
│   ├── schema_postgres.sql  ✅ Schema: forecasts, product_clusters, rfm_segments
│   └── schema.sql           ✅ SQLite fallback schema
├── utils/
│   └── file_handler.py      ✅ CSV upload and storage
├── data/                    ✅ Uploaded CSV storage
├── models/                  ✅ Saved Prophet models (.pkl)
└── config.py                ✅ Centralized configuration
```

### 1.2 Implemented Backend Endpoints

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/` | GET | ✅ Complete | Health check |
| `/companies` | GET | ✅ Complete | List all companies |
| `/companies/{id}` | GET | ✅ Complete | Get company by ID |
| `/upload-csv` | POST | ✅ Complete | Upload and validate CSV |
| `/run-all-forecasts` | POST | ✅ Complete | Execute full pipeline |
| `/forecast-results/{file_id}` | GET | ✅ Complete | Retrieve forecasts with filters |
| `/product-clusters/{file_id}` | GET | ✅ Complete | Retrieve product clusters |
| `/rfm/{file_id}` | GET | ✅ Complete | Retrieve RFM segments |
| `/forecast` (legacy) | POST | ✅ Complete | Single-metric forecast |

**Sample Response Structures:**

**POST /run-all-forecasts:**
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "306b5293-39bc-4cbc-bef0-9e9f87072e5c",
  "company_name": "Tech Innovations Ltd",
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
  }
}
```

**GET /forecast-results/{file_id}?company_id=X&metric=total_revenue&group_type=overall:**
```json
{
  "file_id": "550e8400-...",
  "company_id": "306b5293-...",
  "count": 1,
  "forecasts": [
    {
      "id": "uuid-...",
      "metric": "total_revenue",
      "group_type": "overall",
      "group_key": null,
      "forecast_data": [
        {
          "ds": "2025-03-01",
          "yhat": 52000.45,
          "yhat_lower": 48000.20,
          "yhat_upper": 56000.80
        },
        ...
      ],
      "created_at": "2025-02-15T10:30:00"
    }
  ]
}
```

**GET /product-clusters/{file_id}?company_id=X:**
```json
{
  "file_id": "550e8400-...",
  "company_id": "306b5293-...",
  "cluster_count": 8,
  "clusters": [
    {
      "id": "uuid-...",
      "cluster_id": 0,
      "cluster_name": "Christmas & Holiday",
      "cluster_size": 145,
      "top_terms": ["christmas", "decoration", "vintage", "red"],
      "sample_products": [
        {
          "StockCode": "22423",
          "Description": "RED RETROSPOT CUSHION",
          "total_revenue": 4520.50
        }
      ],
      "created_at": "2025-02-15T10:25:00"
    }
  ]
}
```

**GET /rfm/{file_id}?company_id=X:**
```json
{
  "file_id": "550e8400-...",
  "company_id": "306b5293-...",
  "count": 7,
  "segments": [
    {
      "id": "uuid-...",
      "segment_name": "Champions",
      "customer_count": 892,
      "total_revenue": 452000.50,
      "avg_order_value": 506.73,
      "stats": {
        "avg_recency": 5.2,
        "avg_frequency": 45.3,
        "avg_monetary": 2500.10,
        "median_recency": 3.0,
        "median_frequency": 38.0,
        "median_monetary": 2100.00
      },
      "created_at": "2025-02-15T10:28:00"
    }
  ]
}
```

### 1.3 Backend ML Pipeline

**Pipeline Stages (orchestrator.py):**

1. **Data Cleaning** (`ml/cleaning.py`):
   - Validate required columns (Invoice, StockCode, Description, Quantity, InvoiceDate, Price, Customer ID, Country)
   - Drop duplicates, null Customer IDs, negative Quantity/Price
   - Parse InvoiceDate to datetime
   - Compute TotalAmount = Quantity × Price
   - Remove outliers using IQR method (configurable multiplier)

2. **Product Clustering** (`ml/clustering.py`):
   - Aggregate product-level data (StockCode + Description)
   - TF-IDF vectorization of descriptions (max_features=150, ngram_range=(1,2))
   - Elbow method for optimal cluster count (2-10)
   - KMeans clustering with automatic naming (e.g., "Christmas & Holiday", "Kitchen & Dining")
   - Extract top TF-IDF terms and sample products per cluster

3. **RFM Segmentation** (`ml/rfm.py`):
   - Calculate Recency (days since last purchase), Frequency (total orders), Monetary (total spend)
   - Score each dimension 1-5 (quintiles)
   - Assign segments: Champions, Loyal, Potential Loyalists, At-Risk, Hibernating, Big Spenders, Price Sensitive

4. **Multi-Metric Forecasting** (`ml/multi_forecast.py`):
   - **Metrics**: total_revenue, order_count, unique_customers, avg_order_value
   - **Groups**: overall, country, product_cluster, rfm
   - **Prophet Configuration**: yearly/weekly seasonality, log transformation for non-negative predictions, 28-day horizon
   - **Parallel Execution**: ThreadPoolExecutor (up to 8 workers) for faster training
   - **Output**: forecast_data with `ds`, `yhat`, `yhat_lower`, `yhat_upper`

5. **Database Persistence** (`db/database.py`):
   - Save forecasts, product_clusters, rfm_segments to PostgreSQL (Neon)
   - Connection pooling (1-20 connections)
   - Multi-tenant isolation via company_id foreign key

6. **AI Insights** (`ai/insights.py`):
   - **Status**: ⚠️ Implemented but not fully integrated
   - Calls LM Studio at `http://127.0.0.1:1234/v1/chat/completions`
   - Generates insights and prescriptive actions from forecast summaries
   - **Issue**: No dedicated endpoint to trigger or retrieve insights

### 1.4 Backend Database Schema

**Existing Tables (PostgreSQL/Neon):**

```sql
-- forecasts table
CREATE TABLE forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    csv_id TEXT NOT NULL,
    metric TEXT NOT NULL,
    group_type TEXT NOT NULL,
    group_key TEXT,
    model_path TEXT,
    forecast_data TEXT NOT NULL,  -- JSON array
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(company_id, csv_id, metric, group_type, group_key)
);

-- product_clusters table
CREATE TABLE product_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    csv_id TEXT NOT NULL,
    cluster_id INTEGER NOT NULL,
    cluster_name TEXT,
    top_terms TEXT NOT NULL,      -- JSON array
    sample_products TEXT NOT NULL, -- JSON array
    cluster_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(company_id, csv_id, cluster_id)
);

-- rfm_segments table
CREATE TABLE rfm_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    csv_id TEXT NOT NULL,
    segment_name TEXT NOT NULL,
    segment_stats TEXT NOT NULL,  -- JSON with avg R, F, M
    customer_count INTEGER,
    total_revenue REAL,
    avg_order_value REAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(company_id, csv_id, segment_name)
);

-- companies table (assumed to exist)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT,
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## PART 2: FRONTEND ANALYSIS

### 2.1 Frontend File Structure

```
SPIT FE/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthContainer.jsx       ✅ Auth wrapper
│   │   │   ├── LoginFlow.jsx           ✅ Login form
│   │   │   └── SignUpWizard.jsx        ✅ Multi-step signup
│   │   ├── dashboard/
│   │   │   ├── dashboards/
│   │   │   │   ├── HomeDashboard.jsx          ✅ Overview
│   │   │   │   ├── SalesDashboard.jsx         ✅ Revenue & forecasts
│   │   │   │   ├── MarketingDashboard.jsx     ✅ Customer segments
│   │   │   │   ├── ProductDashboard.jsx       ✅ Product performance
│   │   │   │   ├── OperationsDashboard.jsx    ✅ Inventory & shipments
│   │   │   │   ├── FinanceDashboard.jsx       ✅ Revenue breakdown
│   │   │   │   ├── RFMSegmentation.jsx        ✅ RFM scatter plot
│   │   │   │   ├── Forecasting.jsx            ✅ Model comparison
│   │   │   │   ├── UploadData.jsx             ⚠️ JSON upload only
│   │   │   │   └── TeamManagement.jsx         ✅ Employee management
│   │   │   ├── layout/
│   │   │   │   ├── DashboardLayout.jsx    ✅ Layout wrapper
│   │   │   │   ├── Sidebar.jsx            ✅ Navigation
│   │   │   │   ├── FilterBar.jsx          ✅ Date/company filters
│   │   │   │   └── FloatingAIChatbot.jsx  ⚠️ Chatbot UI (not connected)
│   │   │   ├── charts/
│   │   │   │   └── ChartCard.jsx          ✅ Reusable chart container
│   │   │   └── widgets/
│   │   │       └── KPICard.jsx            ✅ Metric display card
│   │   └── ui/                            ✅ Reusable UI components
│   ├── contexts/
│   │   ├── AuthContext.jsx     ⚠️ localStorage-based auth (1hr session)
│   │   ├── DataContext.jsx     ⚠️ localStorage JSON data management
│   │   └── ThemeContext.jsx    ✅ Dark/light theme
│   └── data/
│       └── mockData.js         ⚠️ All data is currently mock/hardcoded
```

### 2.2 Frontend Data Expectations by Component

#### **UploadData.jsx**
- **Current**: Expects JSON file upload
- **Backend Provides**: CSV upload endpoint
- **Gap**: Frontend expects JSON; backend expects CSV
- **Expected JSON Shape (mock)**:
  ```json
  {
    "kpiMetrics": { "totalCustomers": 45620, "totalRevenue": 2450000, ... },
    "dailyRevenue": [{"day": "Mon", "revenue": 12500}, ...],
    "salesForecast": [{"week": "Week 1", "actual": 45000, "predicted": 44000}, ...],
    "topProducts": [{"name": "...", "revenue": 45000, "quantity": 1200}, ...],
    ...
  }
  ```

#### **SalesDashboard.jsx**
- **Required Data**:
  - KPI metrics: `totalRevenue`, `avgOrderValue`, `orderCount`, `conversionRate`
  - Daily revenue trend: `[{day, revenue}]`
  - Sales forecast: `[{week, actual, predicted}]`
  - Top products: `[{name, revenue, quantity}]`
- **Backend Provides**: `/forecast-results` with `{ds, yhat, yhat_lower, yhat_upper}`
- **Gap**: Frontend expects weekly aggregates with `actual` vs `predicted`; backend returns daily Prophet forecasts

#### **MarketingDashboard.jsx**
- **Required Data**:
  - Customer segments pie chart: `[{name, value, color}]`
  - Monthly active customers: `[{month, customers}]`
  - Top countries: `[{country, orders, code}]`
  - Top categories: `[{category, sales}]`
  - LTV prediction: `[{month, value}]`
  - Campaign suggestions: `[{segment, campaign, priority}]`
- **Backend Provides**: RFM segments, country-level forecasts
- **Gap**: Backend doesn't aggregate by category; no campaign suggestion endpoint

#### **RFMSegmentation.jsx**
- **Required Data**:
  - RFM segment definitions: `{champions: {name, color, size}, loyal: {...}, ...}`
  - Scatter data: `[{id, recency, frequency, monetary, segment}]`
- **Backend Provides**: `/rfm/{file_id}` with segment-level aggregates only
- **Gap**: Backend doesn't return individual customer RFM scores; only aggregated segment stats

#### **Forecasting.jsx**
- **Required Data**:
  - Model comparison: `[{date, actual, arima, prophet, lstm}]`
  - Model accuracy KPIs: `prophetAccuracy`, `arimaAccuracy`, `lstmAccuracy`
- **Backend Provides**: Prophet forecasts only
- **Gap**: Backend has no ARIMA/LSTM; no model accuracy metrics

#### **ProductDashboard.jsx**
- **Required Data**:
  - Category sales (treemap): `[{name, size, fill}]`
  - Product performance: `[{name, sales, returns, rating}]`
- **Backend Provides**: Product clusters with top_terms and sample_products
- **Gap**: Backend doesn't track returns or ratings; no category-level aggregation

### 2.3 Frontend Authentication

**Current Implementation (AuthContext.jsx)**:
- localStorage-based session (1-hour expiry)
- No backend authentication
- No JWT or session tokens
- No user/company association
- **Security Risk**: Anyone can access any company's data with company_id

**Expected Backend Integration**:
- Login endpoint: `POST /auth/login` → returns JWT
- Auth middleware: Verify JWT on all protected endpoints
- User → Company mapping: Validate user belongs to company_id

---

## PART 3: GAP ANALYSIS

### A) WHAT EXISTS (Complete)

| Feature | Evidence | Status |
|---------|----------|--------|
| **CSV Upload & Validation** | `api/main.py:112-162` (upload-csv endpoint) | ✅ Complete |
| **Data Cleaning** | `ml/cleaning.py:20-119` (remove nulls, negatives, outliers) | ✅ Complete |
| **Product Clustering** | `ml/clustering.py:152-253` (TF-IDF + KMeans) | ✅ Complete |
| **RFM Segmentation** | `ml/rfm.py:14-143` (R/F/M scores + 7 segments) | ✅ Complete |
| **Multi-Metric Forecasting** | `ml/multi_forecast.py:162-233` (4 metrics × 4 groups) | ✅ Complete |
| **PostgreSQL Persistence** | `db/database.py` (forecasts, clusters, RFM) | ✅ Complete |
| **Multi-Tenant Data Isolation** | `db/schema_postgres.sql` (company_id foreign keys) | ✅ Complete |
| **Forecast Retrieval API** | `api/main.py:327-356` (GET /forecast-results with filters) | ✅ Complete |
| **Prophet Model Training** | `ml/multi_forecast.py:22-128` (log transform, 28-day horizon) | ✅ Complete |
| **Connection Pooling** | `db/database.py:32-46` (1-20 connections) | ✅ Complete |

### B) WHAT IS PARTIAL (Incomplete)

| Feature | What Exists | What's Missing | Priority |
|---------|-------------|----------------|----------|
| **AI Insights** | `ai/insights.py` has LM Studio integration | ❌ No GET endpoint to retrieve insights<br>❌ No POST endpoint to trigger generation<br>❌ Not called in orchestrator pipeline | **P0** |
| **CSV Metadata Persistence** | File saved to `data/{file_id}.csv` | ❌ No `csv_files` table to track uploads<br>❌ No metadata (filename, size, row count, upload date)<br>❌ No way to list company's uploaded files | **P0** |
| **Frontend Data Upload** | `UploadData.jsx` expects JSON | ❌ No CSV upload UI<br>❌ No backend integration for file upload<br>❌ No progress/status display | **P0** |
| **Authentication** | Frontend has localStorage auth | ❌ No backend auth endpoints<br>❌ No JWT generation/validation<br>❌ No user → company mapping | **P0** |
| **Dashboard Bootstrap Endpoint** | Individual endpoints exist | ❌ No single endpoint to fetch all dashboard data at once<br>❌ Frontend makes multiple round trips | **P1** |
| **Country-Level Forecasts** | Backend generates them | ❌ Frontend has no dedicated country dashboard<br>❌ No map visualization | **P1** |

### C) WHAT IS MISSING ENTIRELY

| Feature | Requirement | Priority |
|---------|-------------|----------|
| **AI Insights Endpoint** | `POST /ai-insights` to trigger, `GET /ai-insights/{file_id}` to retrieve | **P0** |
| **CSV Files Table** | Track uploaded CSVs per company with metadata | **P0** |
| **Auth Endpoints** | `POST /auth/login`, `POST /auth/signup`, `GET /auth/me` | **P0** |
| **Dashboard Bootstrap** | `GET /dashboard/bootstrap?file_id=X&company_id=Y` returning all data | **P1** |
| **CSV Upload Frontend** | Replace UploadData.jsx JSON upload with CSV upload to backend | **P0** |
| **Frontend-Backend Integration** | API client to call backend endpoints | **P0** |
| **Historical Data Comparison** | Compare current forecast with previous uploads | **P2** |
| **Anomaly Detection** | Flag unusual patterns in forecasts | **P2** |
| **ARIMA/LSTM Models** | Frontend expects them; backend doesn't have them | **P2** |
| **Product Returns/Ratings Tracking** | Frontend shows returns and ratings; backend doesn't track | **P2** |
| **Category-Level Aggregation** | Group products by business categories (not just clusters) | **P2** |

### D) SECURITY & INFRASTRUCTURE GAPS

| Gap | Impact | Priority |
|-----|--------|----------|
| **No Authentication** | Anyone with company_id can access data | **P0** |
| **No RLS in PostgreSQL** | All data accessible if DB compromised | **P0** |
| **No Rate Limiting** | API vulnerable to DoS | **P1** |
| **No File Size Validation** | Large CSVs can crash server | **P1** |
| **No Input Sanitization** | SQL injection risk (mitigated by psycopg2 parameterization) | **P1** |
| **No CORS Configuration** | Frontend on different port blocked | **P1** |
| **No HTTPS** | Data transmitted in plain text | **P1** |
| **API Keys in Code** | LM Studio URL hardcoded | **P1** |
| **No Error Tracking** | No Sentry/logging service | **P2** |
| **No Backup Strategy** | Database loss = total data loss | **P2** |

### E) PERFORMANCE & HAI GAPS

| Gap | Impact | Priority |
|-----|--------|----------|
| **Blocking Forecast Calls** | Frontend waits 30-120s for `/run-all-forecasts` | **P0** |
| **No Job Queue** | Cannot handle concurrent uploads or long-running tasks | **P0** |
| **No Progress Updates** | User doesn't know if pipeline is running or stuck | **P0** |
| **Large JSON Responses** | `/forecast-results` can return 10MB+ of forecast data | **P1** |
| **No Pagination** | All forecasts returned at once | **P1** |
| **No Caching** | Same forecast fetched multiple times | **P1** |
| **Prophet Model Size** | .pkl files can be 5-50MB each; not production-ready | **P1** |
| **No Retry Logic** | LM Studio failures are silent | **P1** |
| **Memory Usage** | Loading 500K+ rows into pandas can consume 2GB+ RAM | **P2** |
| **No Model Versioning** | Overwriting forecasts loses historical predictions | **P2** |

---

## PART 4: INTEGRATION-READY API CONTRACTS

### 4.1 Authentication Endpoints (TO BE IMPLEMENTED)

#### **POST /auth/login**

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "company_id": "306b5293-39bc-4cbc-bef0-9e9f87072e5c",
    "company_name": "Tech Innovations Ltd",
    "role": "admin"
  }
}
```

**Error (401 Unauthorized):**
```json
{
  "detail": "Invalid email or password"
}
```

**Frontend Usage:**
```javascript
const response = await fetch('http://localhost:8003/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { access_token, user } = await response.json();
localStorage.setItem('token', access_token);
localStorage.setItem('company_id', user.company_id);
```

---

#### **GET /auth/me**

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "company_id": "306b5293-39bc-4cbc-bef0-9e9f87072e5c",
  "company_name": "Tech Innovations Ltd",
  "role": "admin"
}
```

---

### 4.2 CSV Upload & Management (PARTIAL — NEEDS CSV FILES TABLE)

#### **POST /upload-csv**

**Status**: ✅ Implemented, needs metadata table

**Request:**
```
Content-Type: multipart/form-data

file: <CSV file>
company_id: 306b5293-39bc-4cbc-bef0-9e9f87072e5c
```

**Response (200 OK):**
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "File accepted. 541909 rows, 8 columns.",
  "filename": "retail_data.csv",
  "size_bytes": 45823948,
  "uploaded_at": "2025-02-15T10:00:00Z"
}
```

**Frontend Usage:**
```javascript
const formData = new FormData();
formData.append('file', csvFile);
formData.append('company_id', companyId);

const response = await fetch('http://localhost:8003/upload-csv', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

---

#### **GET /csv-files** (TO BE IMPLEMENTED)

**Request:**
```
GET /csv-files?company_id=306b5293-39bc-4cbc-bef0-9e9f87072e5c
Authorization: Bearer <token>
```

**Response:**
```json
{
  "company_id": "306b5293-39bc-4cbc-bef0-9e9f87072e5c",
  "count": 3,
  "files": [
    {
      "file_id": "550e8400-...",
      "filename": "retail_data_jan2024.csv",
      "size_bytes": 45823948,
      "row_count": 541909,
      "column_count": 8,
      "uploaded_at": "2025-02-15T10:00:00Z",
      "status": "processed",
      "forecasts_generated": true
    },
    ...
  ]
}
```

---

### 4.3 Forecasting Pipeline (NEEDS ASYNC + PROGRESS)

#### **POST /run-all-forecasts**

**Status**: ✅ Implemented, blocking (30-120s)

**Request:**
```
POST /run-all-forecasts
Authorization: Bearer <token>
Content-Type: application/json

{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "306b5293-39bc-4cbc-bef0-9e9f87072e5c",
  "options": {
    "generate_ai_insights": true,
    "metrics": ["total_revenue", "order_count"],
    "groups": ["overall", "country", "product_cluster", "rfm"]
  }
}
```

**Response (200 OK):**
```json
{
  "file_id": "550e8400-...",
  "company_id": "306b5293-...",
  "company_name": "Tech Innovations Ltd",
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
  "insights_generated": true,
  "processing_time_seconds": 87.3
}
```

**Recommended Improvement (P0): Make Async**
```json
// Immediate response
{
  "job_id": "job-uuid",
  "status": "processing",
  "estimated_completion": "2025-02-15T10:05:00Z"
}

// Then poll GET /jobs/{job_id} for progress
{
  "job_id": "job-uuid",
  "status": "processing",
  "progress": 0.65,
  "stage": "Training Prophet models (32/64 complete)"
}
```

---

### 4.4 AI Insights (TO BE IMPLEMENTED)

#### **GET /ai-insights/{file_id}**

**Request:**
```
GET /ai-insights/{file_id}?company_id=306b5293-39bc-4cbc-bef0-9e9f87072e5c
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "file_id": "550e8400-...",
  "company_id": "306b5293-...",
  "insights": [
    {
      "id": "insight-uuid",
      "category": "revenue_trends",
      "insight": "Total forecasted revenue shows 12% growth compared to previous period. USA and UK account for 65% of total forecast, indicating strong market concentration.",
      "priority": "high",
      "generated_at": "2025-02-15T10:32:00Z"
    },
    {
      "id": "insight-uuid",
      "category": "customer_behavior",
      "insight": "Champions segment (12% of customer base) contributes 38% of revenue. At-Risk segment (18%) shows declining frequency.",
      "priority": "medium",
      "generated_at": "2025-02-15T10:32:00Z"
    }
  ],
  "actions": [
    {
      "id": "action-uuid",
      "title": "Reactivate At-Risk Customers",
      "description": "Launch targeted email campaign for At-Risk segment with 15% discount to prevent churn.",
      "priority": "high",
      "segment": "At-Risk",
      "estimated_impact": "+$45,000 revenue"
    },
    {
      "id": "action-uuid",
      "title": "Increase Inventory for Holiday Products",
      "description": "Product cluster 'Christmas & Holiday' shows 25% forecasted growth. Recommend 30% inventory increase before peak season.",
      "priority": "high",
      "cluster_id": 2
    }
  ],
  "raw_llm_response": "...",
  "model_used": "meta-llama-3.1-8b-instruct"
}
```

**Error (404 Not Found):**
```json
{
  "detail": "No insights generated for this file. Run /run-all-forecasts first."
}
```

---

### 4.5 Dashboard Bootstrap (TO BE IMPLEMENTED)

#### **GET /dashboard/bootstrap**

**Purpose**: Fetch all dashboard data in one call to reduce frontend round trips

**Request:**
```
GET /dashboard/bootstrap?file_id=550e8400-...&company_id=306b5293-...
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "file_id": "550e8400-...",
  "company_id": "306b5293-...",
  "company": {
    "id": "306b5293-...",
    "name": "Tech Innovations Ltd",
    "city": "Mumbai",
    "country": "India"
  },
  "csv_info": {
    "filename": "retail_data.csv",
    "uploaded_at": "2025-02-15T10:00:00Z",
    "row_count": 541909
  },
  "kpi_metrics": {
    "total_revenue": 2450000,
    "total_customers": 4372,
    "avg_order_value": 156.50,
    "order_count": 15648,
    "revenue_growth_percent": 12.5
  },
  "forecasts": {
    "overall_revenue": {
      "metric": "total_revenue",
      "forecast_28d_total": 1456000,
      "forecast_data": [
        {"ds": "2025-03-01", "yhat": 52000, "yhat_lower": 48000, "yhat_upper": 56000},
        ...
      ]
    },
    "top_countries": [
      {
        "country": "United Kingdom",
        "forecast_28d_total": 945000,
        "current_contribution_percent": 65
      },
      ...
    ]
  },
  "product_clusters": [
    {
      "cluster_id": 0,
      "cluster_name": "Christmas & Holiday",
      "cluster_size": 145,
      "top_terms": ["christmas", "decoration", "vintage"],
      "forecast_28d_revenue": 285000
    },
    ...
  ],
  "rfm_segments": [
    {
      "segment_name": "Champions",
      "customer_count": 892,
      "total_revenue": 452000.50,
      "avg_order_value": 506.73,
      "forecast_28d_revenue": 120000
    },
    ...
  ],
  "ai_insights": {
    "insights": [...],
    "actions": [...]
  }
}
```

---

### 4.6 Forecast Results (EXISTING — NEEDS PAGINATION)

#### **GET /forecast-results/{file_id}**

**Status**: ✅ Implemented, needs pagination

**Request:**
```
GET /forecast-results/{file_id}
  ?company_id=306b5293-...
  &metric=total_revenue
  &group_type=overall
  &page=1
  &page_size=10
Authorization: Bearer <token>
```

**Response:**
```json
{
  "file_id": "550e8400-...",
  "company_id": "306b5293-...",
  "count": 1,
  "page": 1,
  "page_size": 10,
  "total_pages": 1,
  "forecasts": [...]
}
```

---

### 4.7 Product Clusters (EXISTING)

**Status**: ✅ Complete

*(See PART 1.2 for response structure)*

---

### 4.8 RFM Segments (EXISTING)

**Status**: ✅ Complete

*(See PART 1.2 for response structure)*

---

### 4.9 Error Response Format (STANDARDIZE)

**All endpoints should return:**

```json
{
  "error": true,
  "status_code": 400,
  "message": "Invalid file_id format",
  "detail": "file_id must be a valid UUID",
  "timestamp": "2025-02-15T10:00:00Z"
}
```

**HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (valid token but no access to resource)
- 404: Not Found
- 422: Unprocessable Entity (insufficient data for forecast)
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error

---

## PART 5: DATABASE TABLES & MIGRATIONS NEEDED

### 5.1 Missing Table: csv_files

```sql
CREATE TABLE IF NOT EXISTS csv_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    file_id TEXT NOT NULL UNIQUE,          -- Same as file_id used in filesystem
    filename TEXT NOT NULL,
    size_bytes BIGINT,
    row_count INTEGER,
    column_count INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'uploaded',        -- uploaded, processing, processed, failed
    error_message TEXT,
    forecasts_generated BOOLEAN DEFAULT FALSE,
    insights_generated BOOLEAN DEFAULT FALSE,
    UNIQUE(company_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_csv_files_company_id ON csv_files(company_id);
CREATE INDEX IF NOT EXISTS idx_csv_files_file_id ON csv_files(file_id);
CREATE INDEX IF NOT EXISTS idx_csv_files_status ON csv_files(status);
```

**Why Needed (P0)**:
- Track uploaded CSVs per company
- Display upload history in frontend
- Prevent duplicate file_id usage
- Track processing status for async jobs

---

### 5.2 Missing Table: ai_insights

```sql
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    csv_id TEXT NOT NULL,
    insights TEXT NOT NULL,             -- JSON array of insight objects
    actions TEXT NOT NULL,              -- JSON array of action objects
    raw_llm_response TEXT,
    model_used TEXT DEFAULT 'meta-llama-3.1-8b-instruct',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(company_id, csv_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_company_id ON ai_insights(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_csv_id ON ai_insights(csv_id);
```

**Why Needed (P0)**:
- Store AI-generated insights and actions
- Enable GET /ai-insights/{file_id} endpoint
- Track LLM model versions

---

### 5.3 Missing Table: users (FOR AUTH)

```sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,        -- bcrypt hash
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',           -- admin, user, viewer
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

**Why Needed (P0)**:
- Enable login/authentication
- Map users to companies
- Role-based access control

---

### 5.4 Missing Table: jobs (FOR ASYNC PROCESSING)

```sql
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    file_id TEXT NOT NULL,
    job_type TEXT NOT NULL,             -- forecast_pipeline, ai_insights
    status TEXT DEFAULT 'queued',       -- queued, processing, completed, failed
    progress REAL DEFAULT 0.0,          -- 0.0 to 1.0
    stage TEXT,                         -- Current stage description
    result TEXT,                        -- JSON result on completion
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_file_id ON jobs(file_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
```

**Why Needed (P0)**:
- Enable async forecast pipeline
- Track job progress
- Prevent blocking API calls

---

### 5.5 Row-Level Security (RLS) Policies

**Enable RLS on all tables:**

```sql
-- Enable RLS
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfm_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own company's data
CREATE POLICY company_isolation_policy ON forecasts
    FOR ALL
    USING (company_id = current_setting('app.current_company_id')::UUID);

-- Repeat for all tables
```

**Backend Implementation:**
```python
# Set company_id from JWT token for RLS
def set_rls_context(conn, company_id: str):
    with conn.cursor() as cursor:
        cursor.execute(f"SET app.current_company_id = '{company_id}'")
```

**Why Needed (P0)**:
- Database-level multi-tenant isolation
- Even if backend is compromised, data can't leak across companies

---

## PART 6: PRIORITISED WORKPLAN

### Phase 1: Critical Integration (P0) — 3-4 days
**Goal**: Enable basic frontend-backend communication and security

| # | Task | Owner | Effort | Details |
|---|------|-------|--------|---------|
| 1 | Add `csv_files` table + migration | Backend | Small | Create table, update `upload-csv` to persist metadata |
| 2 | Add `GET /csv-files` endpoint | Backend | Small | List company's uploaded CSVs |
| 3 | Add `ai_insights` table + migration | Backend | Small | Create table for insights storage |
| 4 | Add `POST /ai-insights` trigger endpoint | Backend | Small | Call `ai/insights.py`, save to DB |
| 5 | Add `GET /ai-insights/{file_id}` endpoint | Backend | Small | Retrieve saved insights |
| 6 | Integrate AI insights into orchestrator | Backend | Small | Call AI insights after forecasting in `run_all_forecasts` |
| 7 | Update `UploadData.jsx` to upload CSV | Frontend | Medium | Replace JSON upload with CSV form-data upload to `/upload-csv` |
| 8 | Create API client service | Frontend | Small | Axios/fetch wrapper with base URL, auth headers |
| 9 | Connect `SalesDashboard.jsx` to backend | Frontend | Medium | Fetch `/forecast-results` and transform to chart data |
| 10 | Add CORS middleware to FastAPI | Backend | Small | Allow frontend origin (localhost:5173) |
| 11 | Add basic auth endpoints | Backend | Large | `POST /auth/login`, `GET /auth/me`, JWT generation |
| 12 | Add `users` table + migration | Backend | Small | Create users table |
| 13 | Connect frontend auth to backend | Frontend | Medium | Replace localStorage auth with JWT from `/auth/login` |
| 14 | Add auth middleware to all endpoints | Backend | Medium | Verify JWT, extract company_id from token |

**Deliverables**:
- ✅ CSV upload works end-to-end
- ✅ Sales dashboard shows real forecasts
- ✅ Users can log in with email/password
- ✅ Multi-tenant isolation enforced

---

### Phase 2: Full Dashboard Integration (P1) — 4-5 days
**Goal**: Connect all dashboards to backend and improve UX

| # | Task | Owner | Effort | Details |
|---|------|-------|--------|---------|
| 15 | Add `GET /dashboard/bootstrap` endpoint | Backend | Large | Aggregate all data (forecasts, clusters, RFM, insights) into one response |
| 16 | Connect `MarketingDashboard.jsx` to backend | Frontend | Medium | Fetch RFM segments, country forecasts |
| 17 | Connect `RFMSegmentation.jsx` to backend | Frontend | Medium | Display RFM segment stats (no individual customer data yet) |
| 18 | Connect `ProductDashboard.jsx` to backend | Frontend | Medium | Display product clusters |
| 19 | Display AI insights in dashboard | Frontend | Medium | Add insights panel to Sales/Marketing dashboards |
| 20 | Add loading states & error handling | Frontend | Medium | Skeleton loaders, error toasts |
| 21 | Add pagination to `/forecast-results` | Backend | Medium | Page query params, paginated response |
| 22 | Add rate limiting | Backend | Small | SlowAPI or custom rate limiter |
| 23 | Add file size validation to upload | Backend | Small | Reject files > 100MB |
| 24 | Add RLS policies to PostgreSQL | Backend | Medium | Enable RLS on all tables |

**Deliverables**:
- ✅ All dashboards show real data
- ✅ AI insights visible in UI
- ✅ Rate limiting and file validation active

---

### Phase 3: Async Processing & Polish (P1) — 3-4 days
**Goal**: Handle long-running forecasts and improve performance

| # | Task | Owner | Effort | Details |
|---|------|-------|--------|---------|
| 25 | Add `jobs` table + migration | Backend | Small | Create jobs table |
| 26 | Implement job queue (Celery or arq) | Backend | Large | Queue `/run-all-forecasts` as async job |
| 27 | Add `GET /jobs/{job_id}` endpoint | Backend | Small | Poll job status and progress |
| 28 | Update frontend to poll job progress | Frontend | Medium | Show progress bar while forecast runs |
| 29 | Add caching to forecast results | Backend | Medium | Redis or in-memory cache for GET requests |
| 30 | Optimize forecast response size | Backend | Medium | Compress JSON, limit forecast points to 28 days |
| 31 | Add error tracking (Sentry) | Full-stack | Small | Integrate Sentry for error monitoring |
| 32 | Add logging service (Logtail) | Backend | Small | Ship logs to external service |

**Deliverables**:
- ✅ Forecasts run asynchronously
- ✅ Users see progress while pipeline runs
- ✅ Errors tracked and logged

---

### Phase 4: Nice-to-Have Features (P2) — Ongoing
**Goal**: Enhance analytics capabilities

| # | Task | Owner | Effort | Details |
|---|------|-------|--------|---------|
| 33 | Add ARIMA/LSTM models | Backend | Large | Implement additional forecasting models |
| 34 | Add model accuracy metrics | Backend | Medium | Calculate MAPE, RMSE, MAE per model |
| 35 | Add anomaly detection | Backend | Medium | Flag unusual patterns in forecasts |
| 36 | Add country map visualization | Frontend | Medium | Choropleth map for country forecasts |
| 37 | Add historical forecast comparison | Backend | Medium | Compare current forecast with previous |
| 38 | Track product returns & ratings | Backend | Medium | Add returns/ratings columns to products |
| 39 | Add category taxonomy | Backend | Medium | Map product clusters to business categories |
| 40 | Add email notifications | Backend | Medium | Email alerts for forecast completion |

---

## PART 7: FRONTEND-BACKEND DATA MAPPING SPECIFICATION

### 7.1 Sales Dashboard Data Transformation

**Frontend Expects:**
```javascript
{
  dailyRevenue: [
    { day: 'Mon', revenue: 12500 },
    { day: 'Tue', revenue: 15200 },
    ...
  ],
  salesForecast: [
    { week: 'Week 1', actual: 45000, predicted: 44000 },
    { week: 'Week 2', actual: 52000, predicted: 51000 },
    { week: 'Week 3', actual: null, predicted: 55000 },
    ...
  ]
}
```

**Backend Provides:**
```javascript
// GET /forecast-results/{file_id}?company_id=X&metric=total_revenue&group_type=overall
{
  forecasts: [
    {
      forecast_data: [
        { ds: '2025-03-01', yhat: 52000, yhat_lower: 48000, yhat_upper: 56000 },
        { ds: '2025-03-02', yhat: 53000, yhat_lower: 49000, yhat_upper: 57000 },
        ...
      ]
    }
  ]
}
```

**Frontend Transformation Function:**
```javascript
function transformForecastToChart(backendData) {
  const forecast = backendData.forecasts[0].forecast_data;
  
  // Group by week
  const weeklyData = [];
  for (let i = 0; i < forecast.length; i += 7) {
    const weekSlice = forecast.slice(i, i + 7);
    const weekRevenue = weekSlice.reduce((sum, day) => sum + day.yhat, 0);
    weeklyData.push({
      week: `Week ${Math.floor(i / 7) + 1}`,
      predicted: Math.round(weekRevenue)
    });
  }
  
  // For 'actual', fetch historical data (not in scope yet)
  // For now, show predicted only
  return weeklyData;
}
```

---

### 7.2 Marketing Dashboard Data Transformation

**Frontend Expects:**
```javascript
{
  customerSegments: [
    { name: 'Champions', value: 12, color: '#10b981' },
    { name: 'Loyal Customers', value: 20, color: '#3b82f6' },
    ...
  ]
}
```

**Backend Provides:**
```javascript
// GET /rfm/{file_id}?company_id=X
{
  count: 7,
  segments: [
    {
      segment_name: 'Champions',
      customer_count: 892,
      total_revenue: 452000.50
    },
    ...
  ]
}
```

**Frontend Transformation:**
```javascript
function transformRFMToPieChart(backendData, totalCustomers) {
  const colorMap = {
    'Champions': '#10b981',
    'Loyal': '#3b82f6',
    'Potential': '#8b5cf6',
    'At-Risk': '#f59e0b',
    'Hibernating': '#ef4444',
    'Big Spenders': '#ec4899',
    'Price Sensitive': '#6366f1'
  };
  
  return backendData.segments.map(seg => ({
    name: seg.segment_name,
    value: Math.round((seg.customer_count / totalCustomers) * 100),
    color: colorMap[seg.segment_name] || '#8884d8'
  }));
}
```

---

### 7.3 Product Dashboard Data Transformation

**Frontend Expects:**
```javascript
{
  categorySales: [
    { name: 'Electronics', size: 245000, fill: '#8884d8' },
    { name: 'Home', size: 198000, fill: '#83a6ed' },
    ...
  ]
}
```

**Backend Provides:**
```javascript
// GET /product-clusters/{file_id}?company_id=X
{
  clusters: [
    {
      cluster_id: 0,
      cluster_name: 'Christmas & Holiday',
      cluster_size: 145,
      top_terms: ['christmas', 'decoration']
    },
    ...
  ]
}
```

**Frontend Transformation:**
```javascript
function transformClustersToTreemap(clusters) {
  const colors = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c'];
  
  return clusters.map((cluster, idx) => ({
    name: cluster.cluster_name,
    size: cluster.cluster_size,  // Product count as size
    fill: colors[idx % colors.length]
  }));
}

// Note: Backend doesn't track sales per cluster yet.
// Need to fetch cluster forecast and sum yhat to get sales.
```

---

## PART 8: RECOMMENDED TECH STACK ADDITIONS

| Component | Recommended Tool | Purpose |
|-----------|------------------|---------|
| **Job Queue** | Celery + Redis | Async forecast processing |
| **Caching** | Redis | Cache forecast results |
| **Auth** | FastAPI-Users or custom JWT | User authentication |
| **Rate Limiting** | SlowAPI | Prevent DoS |
| **Error Tracking** | Sentry | Monitor production errors |
| **Logging** | Logtail or Papertrail | Centralized logs |
| **Database Migrations** | Alembic | Version-controlled schema changes |
| **API Docs** | FastAPI Swagger (built-in) | Interactive API testing |
| **Frontend HTTP Client** | Axios | HTTP requests with interceptors |
| **Frontend State** | React Query or SWR | Server state caching |

---

## PART 9: DEPLOYMENT CHECKLIST

### Backend Deployment (Render/Fly.io/Railway)

- [ ] Add `.env` file with `DATABASE_URL`, `JWT_SECRET`, `LM_STUDIO_URL`
- [ ] Run Alembic migrations: `alembic upgrade head`
- [ ] Start server: `uvicorn api.main:app --host 0.0.0.0 --port 8003`
- [ ] Configure CORS with production frontend URL
- [ ] Enable HTTPS (via platform SSL cert)
- [ ] Set up Celery worker for async jobs
- [ ] Configure Redis for caching
- [ ] Set up Sentry for error tracking

### Frontend Deployment (Vercel/Netlify)

- [ ] Update API base URL to production backend
- [ ] Build: `npm run build`
- [ ] Deploy `dist/` folder
- [ ] Configure environment variables: `VITE_API_URL`
- [ ] Enable HTTPS
- [ ] Set up error tracking (Sentry)

### Database (Neon/Supabase)

- [ ] Run all migrations (csv_files, ai_insights, users, jobs)
- [ ] Enable RLS policies
- [ ] Create admin user for each company
- [ ] Set up automated backups

---

## PART 10: CRITICAL RISK MITIGATION

| Risk | Impact | Mitigation | Priority |
|------|--------|------------|----------|
| **No Auth = Data Breach** | Anyone can access any company's data | Implement JWT auth immediately | **P0** |
| **Blocking Forecasts = Bad UX** | Users wait 2+ minutes for response | Make `/run-all-forecasts` async with job queue | **P0** |
| **Large CSV = Server Crash** | 500MB CSV can consume 10GB+ RAM | Add file size limit (100MB), stream processing | **P0** |
| **LM Studio Downtime** | AI insights fail silently | Add fallback insights, retry logic | **P1** |
| **No Rate Limiting** | API vulnerable to DoS | Add rate limiting (10 req/min per user) | **P1** |
| **No Input Validation** | Malicious CSV can crash pipeline | Add strict CSV validation (columns, data types) | **P1** |
| **No Error Tracking** | Production errors go unnoticed | Add Sentry immediately | **P1** |
| **No Backups** | Database loss = total data loss | Enable automated daily backups | **P1** |
| **Prophet Pickle Security** | .pkl files can execute arbitrary code | Use ONNX or JSON serialization in production | **P2** |
| **No Monitoring** | Server down = no alerts | Add uptime monitoring (UptimeRobot) | **P2** |

---

## PART 11: TESTING STRATEGY

### Backend Tests (P1)

| Test Type | Coverage | Tools |
|-----------|----------|-------|
| **Unit Tests** | ML modules (cleaning, clustering, RFM) | pytest |
| **Integration Tests** | API endpoints with DB | pytest + PostgreSQL test DB |
| **Forecast Accuracy** | Prophet model MAPE/RMSE | pytest fixtures |
| **Load Tests** | 100 concurrent uploads | Locust |
| **Security Tests** | SQL injection, XSS | OWASP ZAP |

**Existing Tests:**
- ✅ `tests/test_cleaning.py` — Data cleaning edge cases
- ✅ `tests/test_features.py` — Time series preparation
- ✅ `tests/test_integration.py` — Full pipeline test
- ⚠️ No auth tests
- ⚠️ No API endpoint tests

### Frontend Tests (P2)

| Test Type | Coverage | Tools |
|-----------|----------|-------|
| **Unit Tests** | Utility functions | Jest |
| **Component Tests** | Dashboard components | React Testing Library |
| **E2E Tests** | Login → Upload → View Dashboard | Playwright |

---

## PART 12: HACKATHON DEMO SCRIPT

**Goal**: Impress judges in 5 minutes

### Demo Flow (5 minutes)

1. **Login** (30s)
   - Show multi-company login
   - "Tech Innovations Ltd" vs "MediCare Health Systems"

2. **Upload CSV** (30s)
   - Drag-and-drop CSV file
   - Show validation messages
   - Display file metadata

3. **Trigger Forecasting** (15s)
   - Click "Run Forecasts" button
   - Show progress bar (if async implemented)

4. **Sales Dashboard** (1 min)
   - Overall revenue forecast (Prophet)
   - Daily vs weekly trends
   - **Highlight**: "AI predicts 12% revenue growth in next 28 days"

5. **Marketing Dashboard** (1 min)
   - Customer segment distribution (RFM pie chart)
   - Top countries by orders
   - **Highlight**: "Champions segment (12%) contributes 38% of revenue"

6. **Product Dashboard** (45s)
   - Product clusters treemap
   - **Highlight**: "AI identified 'Christmas & Holiday' cluster with 25% forecasted growth"

7. **AI Insights Panel** (1 min)
   - Show 3 key insights
   - Show 3 prescriptive actions
   - **Highlight**: "AI recommends: 'Launch targeted campaign for At-Risk segment to prevent $45K churn'"

8. **Multi-Tenancy** (30s)
   - Logout, login as different company
   - Show completely different data
   - **Highlight**: "Each company's data is 100% isolated"

**Key Selling Points**:
- ✅ Multi-tenant with DB-level isolation
- ✅ Prophet time-series forecasting (state-of-the-art)
- ✅ AI-powered prescriptive analytics (LLM insights)
- ✅ Automatic product clustering (no manual categorization)
- ✅ RFM customer segmentation (actionable segments)
- ✅ Department-specific dashboards (Sales, Marketing, Product, Finance, Ops)

---

## APPENDICES

### A. Complete API Endpoint Reference

| Endpoint | Method | Auth | Status | Description |
|----------|--------|------|--------|-------------|
| `/` | GET | No | ✅ | Health check |
| `/auth/login` | POST | No | ❌ | User login |
| `/auth/me` | GET | Yes | ❌ | Get current user |
| `/companies` | GET | No | ✅ | List companies |
| `/companies/{id}` | GET | No | ✅ | Get company |
| `/upload-csv` | POST | Yes | ⚠️ | Upload CSV (needs csv_files table) |
| `/csv-files` | GET | Yes | ❌ | List company's CSVs |
| `/run-all-forecasts` | POST | Yes | ⚠️ | Run pipeline (needs async) |
| `/jobs/{id}` | GET | Yes | ❌ | Get job status |
| `/forecast-results/{file_id}` | GET | Yes | ⚠️ | Get forecasts (needs pagination) |
| `/product-clusters/{file_id}` | GET | Yes | ✅ | Get clusters |
| `/rfm/{file_id}` | GET | Yes | ✅ | Get RFM segments |
| `/ai-insights/{file_id}` | GET | Yes | ❌ | Get AI insights |
| `/dashboard/bootstrap` | GET | Yes | ❌ | Get all dashboard data |

**Legend**: ✅ Complete | ⚠️ Partial | ❌ Missing

---

### B. Environment Variables

**Backend (.env):**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
JWT_SECRET=your-secret-key-here
LM_STUDIO_URL=http://127.0.0.1:1234/v1/chat/completions
REDIS_URL=redis://localhost:6379/0
SENTRY_DSN=https://...
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com
```

**Frontend (.env):**
```bash
VITE_API_URL=http://localhost:8003
VITE_ENABLE_AI_CHAT=true
```

---

### C. Sample cURL Commands

**Upload CSV:**
```bash
curl -X POST http://localhost:8003/upload-csv \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@retail_data.csv" \
  -F "company_id=306b5293-39bc-4cbc-bef0-9e9f87072e5c"
```

**Run Forecasts:**
```bash
curl -X POST "http://localhost:8003/run-all-forecasts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "550e8400-e29b-41d4-a716-446655440000",
    "company_id": "306b5293-39bc-4cbc-bef0-9e9f87072e5c"
  }'
```

**Get Forecasts:**
```bash
curl "http://localhost:8003/forecast-results/550e8400-e29b-41d4-a716-446655440000?company_id=306b5293-39bc-4cbc-bef0-9e9f87072e5c&metric=total_revenue&group_type=overall" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## CONCLUSION

**Summary:**
- Backend is 85% complete with robust ML pipeline and PostgreSQL persistence
- Frontend is 60% complete with beautiful dashboards but no backend integration
- Integration readiness: **3-4 days of focused work** for P0 items (auth, CSV upload, dashboard connections, AI insights)
- Key blockers: No authentication, no async jobs, frontend-backend data format mismatches

**Next Steps:**
1. Type "generate patch" to receive code changes for P0 items
2. Review and approve patches
3. Test integration locally
4. Deploy to staging for demo
5. Prepare hackathon demo script

**Estimated Timeline to Demo-Ready:**
- Phase 1 (P0 - Critical): 3-4 days
- Phase 2 (P1 - Full Dashboards): 4-5 days
- Phase 3 (P1 - Async & Polish): 3-4 days
- **Total**: 10-13 days to production-ready

For hackathon (MVP): **Focus on Phase 1 only (3-4 days)**

---

**Document Version**: 1.0  
**Last Updated**: November 22, 2025  
**Prepared For**: SPIT Hackathon Team

