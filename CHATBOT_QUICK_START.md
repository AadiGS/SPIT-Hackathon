# 🤖 AI Chatbot - Quick Start (3 Steps)

## ⚡ **Get Started in 3 Steps**

### **Step 1: Run Database Migration**

Open **Neon Console** → SQL Editor → Run:

```sql
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

1. Open **LM Studio**
2. Load **meta-llama-3.1-8b-instruct** model
3. Click **"Start Server"** (port 1234)

---

### **Step 3: Restart Everything**

```powershell
# Backend
cd D:\Hackathons\SPIT\prophet_backend
uvicorn api.main:app --reload --port 8003

# Frontend (new terminal)
cd "D:\Hackathons\SPIT\frontend_extracted\SPIT FE"
npm run dev
```

---

## ✅ **Test It!**

1. Login to any dashboard
2. Click the **blue chat icon** (bottom right)
3. Ask: "What's my revenue forecast?"
4. Get AI-powered insights! 🎉

---

## 🎯 **Key Features**

✅ **Works on ALL dashboards** (already integrated)
✅ **Remembers conversation history**
✅ **Context-aware** (knows what page you're on)
✅ **Multi-tenant** (each company's chats are private)
✅ **Role-based responses** (adapts to Marketing/Sales/etc.)

---

## 📝 **What to Ask**

- "What's driving my revenue?"
- "Which customer segment needs attention?"
- "Should I increase inventory?"
- "What's my forecast for next week?"
- "How can I improve retention?"

---

## ⚠️ **Important**

**LM Studio MUST be running** on http://127.0.0.1:1234

If chatbot says "Cannot connect to LM Studio", start LM Studio server!

---

**That's it! Your AI chatbot is ready!** 🚀

