-- Add chat_history table for AI chatbot
-- Run this in Neon Console

CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    page_context TEXT, -- Current page user was on
    page_data JSONB, -- Page-specific data (KPIs, graphs, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_company ON chat_history(company_id, created_at DESC);

-- Verify
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chat_history'
ORDER BY ordinal_position;

