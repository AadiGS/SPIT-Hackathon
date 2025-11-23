-- Add RBAC (Role-Based Access Control) to the database
-- Run this in Neon Console to add role support

-- 1. Add role column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'employee',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- 2. Update existing admin user to be super_admin
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'admin@techinnovations.com';

-- 3. Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);

-- 4. Add constraint to ensure valid roles
ALTER TABLE users
ADD CONSTRAINT valid_role CHECK (
    role IN (
        'super_admin',
        'admin',
        'marketing',
        'accounting_finance',
        'operations',
        'product_management',
        'sales'
    )
);

-- 5. Verify the changes
SELECT id, email, role, is_active, company_id 
FROM users 
LIMIT 5;

