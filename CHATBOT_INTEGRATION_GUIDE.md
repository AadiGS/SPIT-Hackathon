# 🤖 AI Chatbot Integration Guide

## ✅ **What's Been Implemented**

### **Backend (Complete)**
1. ✅ **Database Table** - `chat_history` table for persistent conversation storage
2. ✅ **Chatbot API** - `/chat/message`, `/chat/history`, `/chat/history` (DELETE)
3. ✅ **LM Studio Integration** - Uses local meta-llama-3.1-8b-instruct model
4. ✅ **Context-Aware** - Receives user role, chat history, page name, and page data
5. ✅ **Multi-Tenant** - Each company's chats are isolated

### **Frontend (Complete)**
1. ✅ **FloatingAIChatbot Component** - Updated to use real backend
2. ✅ **Page Context Support** - Accepts `pageName` and `pageData` props
3. ✅ **Chat History** - Persists across sessions
4. ✅ **Clear History** - Option to clear chat history

---

## 🚀 **Setup Instructions**

### **Step 1: Run Database Migration**

Open **Neon Console** → SQL Editor and run:

```sql
-- File: prophet_backend/db/add_chat_history_table.sql

CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    page_context TEXT,
    page_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_company ON chat_history(company_id, created_at DESC);
```

---

### **Step 2: Start LM Studio**

1. **Open LM Studio**
2. **Load Model**: meta-llama-3.1-8b-instruct
3. **Start Server**: Click "Start Server" (should run on http://127.0.0.1:1234)
4. **Verify**: Server should show "Running on port 1234"

---

### **Step 3: Restart Backend**

```powershell
cd D:\Hackathons\SPIT\prophet_backend
uvicorn api.main:app --reload --port 8003
```

---

### **Step 4: Restart Frontend**

```powershell
cd "D:\Hackathons\SPIT\frontend_extracted\SPIT FE"
npm run dev
```

---

## 📊 **How to Use Chatbot in Dashboards**

### **Option 1: Simple Usage (Default)**

The chatbot is already in `DashboardLayout`, so it's available on all pages:

```jsx
// Already works! No changes needed
```

### **Option 2: With Page Context (Recommended)**

To make the chatbot **context-aware** of your specific page data:

```jsx
// In any dashboard component (e.g., MarketingDashboard.jsx)
import FloatingAIChatbot from '../layout/FloatingAIChatbot';

export default function MarketingDashboard() {
    const [kpiData, setKpiData] = useState({});
    const [chartData, setChartData] = useState({});
    
    // Prepare page data for chatbot
    const pageData = {
        kpis: {
            totalCustomers: kpiData.totalCustomers,
            champions: kpiData.champions,
            atRisk: kpiData.atRisk,
            totalRevenue: kpiData.totalRevenue
        },
        segments: chartData.segments,
        forecasts: chartData.forecasts,
        // ... any other relevant data
    };
    
    return (
        <div>
            {/* Your dashboard content */}
            
            {/* Context-aware chatbot */}
            <FloatingAIChatbot 
                pageName="Marketing Dashboard"
                pageData={pageData}
            />
        </div>
    );
}
```

---

## 🎯 **What Data to Send**

### **Marketing Dashboard**
```javascript
{
    kpis: {
        totalCustomers: 5678,
        champions: 1239,
        atRisk: 1028,
        totalRevenue: 8671000
    },
    rfmSegments: [...],
    forecasts: {
        customerGrowth: 8.2,
        revenueGrowth: 3.5
    }
}
```

### **Sales Dashboard**
```javascript
{
    kpis: {
        predictedRevenue: 2450000,
        expectedOrders: 1250,
        avgOrderValue: 1960,
        activeCustomers: 890
    },
    topRegions: [...],
    dailyForecasts: [...]
}
```

### **Product Dashboard**
```javascript
{
    kpis: {
        totalProducts: 5256,
        categoryRevenue: 8671000
    },
    productClusters: [...],
    categoryPerformance: [...]
}
```

---

## 💬 **Example Conversations**

### **User asks about revenue:**
```
User: "What's driving my revenue growth?"

AI: "Based on your Marketing Dashboard data, your revenue is growing at 3.5%. 
The main drivers are:
1. Champions segment contributing $3.2M (37% of total)
2. Strong customer retention at 94.8%
3. Increasing average order value

I recommend focusing on the At-Risk segment (1,028 customers) with targeted 
win-back campaigns to further boost revenue."
```

### **User asks about forecasts:**
```
User: "Should I increase inventory?"

AI: "Looking at your Sales Dashboard, I see expected orders increasing to 
1,250 with predicted revenue of $2.45M. Given the 12% growth trend, I recommend:
1. Increase inventory by 15-20% for top-selling categories
2. Focus on your top 3 regions which account for 68% of sales
3. Prepare for peak demand in the next 2 weeks"
```

---

## 🔧 **API Endpoints**

### `POST /chat/message`
Send a chat message with page context.

**Request:**
```json
{
  "question": "What's my top performing segment?",
  "current_page": "Marketing Dashboard",
  "page_data": {
    "kpis": {...},
    "segments": [...]
  }
}
```

**Response:**
```json
{
  "answer": "Your top performing segment is Champions...",
  "memory_used": true,
  "messages_in_memory": 12
}
```

### `GET /chat/history`
Get chat history for current user.

### `DELETE /chat/history`
Clear chat history for current user.

---

## 🎨 **Features**

✅ **Context-Aware** - Knows what page you're on and what data you're viewing
✅ **Persistent Memory** - Remembers previous conversations
✅ **Role-Based** - Adapts responses based on user role (Marketing, Sales, etc.)
✅ **Multi-Tenant** - Each company's chats are isolated
✅ **Real-Time** - Uses LM Studio for instant responses
✅ **Clear History** - Users can clear their chat history

---

## 🆘 **Troubleshooting**

### **"Cannot connect to LM Studio"**
- Ensure LM Studio is running on http://127.0.0.1:1234
- Check that meta-llama-3.1-8b-instruct model is loaded
- Click "Start Server" in LM Studio

### **"Chat history not persisting"**
- Verify `chat_history` table exists in database
- Check backend logs for database errors
- Ensure user is authenticated (JWT token present)

### **"Chatbot button not showing"**
- Check that `FloatingAIChatbot` is imported in `DashboardLayout`
- Verify frontend is running on http://localhost:5173
- Clear browser cache and refresh

---

## 📚 **Next Steps**

1. ✅ Run database migration
2. ✅ Start LM Studio with model loaded
3. ✅ Restart backend and frontend
4. ✅ Test chatbot on any dashboard
5. ✅ Add page context to specific dashboards (optional)

**Chatbot is ready to use!** 🎉

