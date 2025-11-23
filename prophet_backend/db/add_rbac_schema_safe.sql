-- Safe RBAC Schema Migration (handles existing constraints)
-- Run this in Neon Console SQL Editor

-- 1. Add columns if they don't exist
DO $$ 
BEGIN
    -- Add role column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'employee';
    END IF;

    -- Add is_active column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- Add created_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE users ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
END $$;

-- 2. Update existing admin user to super_admin
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'admin@techinnovations.com';

-- 3. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);

-- 4. Drop the constraint if it exists and recreate it (in case the role list changed)
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE users ADD CONSTRAINT valid_role CHECK (
    role IN (
        'super_admin',
        'admin',
        'marketing',
        'accounting_finance',
        'operations',
        'product_management',
        'sales',
        'employee'
    )
);

-- 5. Verify the setup
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('role', 'is_active', 'created_by')
ORDER BY column_name;

-- 6. Show a sample of users to verify
SELECT id, email, role, is_active, company_id 
FROM users 
LIMIT 5;

