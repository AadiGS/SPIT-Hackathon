# 🚀 Multi-Tenant AI Retail Analytics Platform (SPIT Hackathon)

> **Mission Accomplished!** A complete, multi-tenant AI-powered retail analytics platform built in a 3-4 hour sprint.

This project delivers a production-ready dashboard featuring real-time sales forecasting, customer segmentation (RFM), product clustering, and a context-aware AI chatbot—all secured by multi-tenant architecture.

---

## ✨ Key Features

### 📊 Advanced Analytics & ML
- **Real-Time Forecasting**: Facebook Prophet integration for sales predictions with 95% confidence intervals.
- **Customer Segmentation**: RFM (Recency, Frequency, Monetary) analysis to identify "Champions", "Loyal", and "At-Risk" customers.
- **Product Clustering**: Automated product grouping using TF-IDF and K-Means clustering.
- **Context-Aware AI Chatbot**: A smart assistant that understands your current dashboard view and data (powered by local LLM).

### 🛡️ Enterprise-Grade Architecture
- **Multi-Tenant Design**: Complete data isolation between companies (e.g., Tech Innovations Ltd vs. Medicare Plus).
- **Secure Authentication**: OTP-based login flow with JWT session management.
- **Scalable Backend**: FastAPI + PostgreSQL (Neon DB) infrastructure.

### 🎨 Interactive Frontend
- **8+ Dashboards**: Sales, Marketing, Product, RFM, Forecasting, and more.
- **Data Visualization**: Rich, interactive charts using Recharts.
- **CSV Upload**: Drag-and-drop interface for processing retail datasets.

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React, Vite, Tailwind CSS, Recharts |
| **Backend** | Python, FastAPI, Uvicorn |
| **Database** | PostgreSQL (Neon DB) |
| **ML & AI** | Facebook Prophet, Scikit-learn, LM Studio (Llama 3) |
| **Auth** | JWT, OTP (Hardcoded for demo) |

---

## 🚀 Quick Start Guide

Follow these steps to get the platform running locally.

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL Database (Neon DB recommended)
- LM Studio (for Chatbot)

### 1. Database Setup
Execute the migration script on your PostgreSQL instance:
```sql
-- Run contents of prophet_backend/db/add_missing_tables.sql
-- Run contents of prophet_backend/db/add_chat_history_table.sql
```

### 2. Backend Setup
```bash
cd prophet_backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8003
```

### 3. Frontend Setup
```bash
cd "frontend_extracted/SPIT FE"
npm install
npm run dev
```
> Access the frontend at: `http://localhost:5173`

### 4. AI Chatbot Setup (Optional)
1. Download and install **LM Studio**.
2. Load the `meta-llama-3.1-8b-instruct` model.
3. Start the local server on `http://127.0.0.1:1234`.

---

## 🧪 Demo Credentials

Use these credentials to log in and test the multi-tenant isolation:

| Role | Email | OTP | Company |
|------|-------|-----|---------|
| **Admin** | `admin@techinnovations.com` | `123456` | Tech Innovations Ltd |
| **Admin** | `admin@medicare.com` | `123456` | Medicare Plus |

---

## 📂 Project Structure

- **`prophet_backend/`**: FastAPI backend, database migrations, and ML logic.
- **`frontend_extracted/SPIT FE/`**: React frontend application.
- **`IMPLEMENTATION_SUMMARY.md`**: Detailed breakdown of the hackathon sprint.
- **`CHATBOT_INTEGRATION_GUIDE.md`**: Guide for setting up the AI assistant.

---

*Built with ❤️ and lots of ☕ for SPIT Hackathon.*