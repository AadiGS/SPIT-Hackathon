# 🚀 RBAC Quick Start Guide

## ✅ **Backend Implementation Complete!**

Your backend now has full Role-Based Access Control with multi-tenancy!

---

## 📋 **Quick Summary**

### **What's Been Done:**
1. ✅ Database schema with `role`, `is_active`, `created_by` fields
2. ✅ 7 user roles with specific page permissions
3. ✅ Company registration API
4. ✅ User management API (create, list, enable/disable)
5. ✅ Updated auth endpoints with roles & permissions
6. ✅ Multi-tenancy data isolation (each company sees only their data)

---

## 🎯 **Immediate Next Steps**

### **Step 1: Run Database Migration** ⚠️ REQUIRED

Open **Neon Console** → SQL Editor and run:

```sql
-- File: prophet_backend/db/add_rbac_schema.sql

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
```

---

### **Step 2: Restart Backend**

```powershell
# Stop backend (Ctrl+C)
# Then restart:
cd D:\Hackathons\SPIT\prophet_backend
uvicorn api.main:app --reload --port 8003
```

You should see:
```
INFO:     Started server process
INFO:     Application startup complete.
```

---

### **Step 3: Test Company Registration (Optional)**

You can test the new endpoints using your browser console or Postman:

```javascript
// Test company registration
fetch('http://localhost:8003/company/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    company_name: 'Acme Corp',
    city: 'San Francisco',
    country: 'USA',
    admin_email: 'admin@acme.com'
  })
})
.then(r => r.json())
.then(data => console.log('Registration:', data));
```

---

## 📊 **New API Endpoints Available**

### **Company Management:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/company/register` | Register new company | No |
| POST | `/company/users` | Create team member | Admin+ |
| GET | `/company/users` | List all team members | Admin+ |
| PATCH | `/company/users/status` | Enable/disable user | Admin+ |
| GET | `/company/roles` | List available roles | Yes |

### **Updated Auth Endpoints:**

| Method | Endpoint | Response Includes |
|--------|----------|-------------------|
| POST | `/auth/verify-otp` | `role`, `role_display`, `permissions` |
| GET | `/auth/me` | `role`, `role_display`, `permissions`, `is_active` |

---

## 🎨 **Frontend Implementation Next**

After backend is tested, implement frontend:

### **Pages to Create:**
1. **Company Registration Page** (`/register`)
   - Form: company name, city, country, admin email
   - Submit to `/company/register`
   - Auto-login after registration

2. **Team Management Page** (`/team`)
   - Only accessible by Admin & Super Admin
   - List all users with role badges
   - Create user button
   - Enable/Disable toggle for each user
   - Cannot disable self

### **Components to Update:**
1. **AuthContext.jsx**
   - Store `user.role` and `user.permissions`
   - Add `hasPermission(page)` helper

2. **ProtectedRoute.jsx** (NEW)
   - Check if user has permission to access page
   - Redirect to home if not authorized

3. **Sidebar/Navigation**
   - Show only pages user has permission for
   - Hide Upload Data unless super_admin

4. **Login Flow**
   - Store role & permissions after login
   - Redirect based on role (admin → team, others → home)

---

## 🔐 **Role Permissions Reference**

| Role | Accessible Pages |
|------|------------------|
| **Super Admin** | 🟢 ALL pages + Team Management + Upload |
| **Admin** | 🟡 Team Management only |
| **Marketing** | 🔵 Home, Marketing, RFM, Forecasting |
| **Accounting & Finance** | 🟣 Home, Finance, RFM, Forecasting |
| **Operations** | 🟠 Home, Operations, RFM, Forecasting |
| **Product Management** | 🟤 Home, Product, RFM, Forecasting |
| **Sales** | 🔴 Home, Sales, RFM, Forecasting |

---

## ✅ **Testing Checklist**

### Backend:
- [ ] Database migration ran successfully
- [ ] Backend restarted without errors
- [ ] Can access `/company/register` endpoint
- [ ] Can access `/company/roles` endpoint
- [ ] Login returns `role` and `permissions`
- [ ] `/auth/me` returns complete user info

### Frontend (To Do):
- [ ] Company registration page created
- [ ] Team management page created
- [ ] Role-based routing implemented
- [ ] Navigation shows only allowed pages
- [ ] Login redirects based on role
- [ ] Cannot access unauthorized pages

---

## 🆘 **Troubleshooting**

### **Error: Column "role" already exists**
```sql
-- If migration fails, columns might already exist
-- Check if they exist:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('role', 'is_active', 'created_by');

-- If they exist, skip ALTER TABLE and just add the constraint
```

### **Backend Import Error**
```
ModuleNotFoundError: No module named 'api.company'
```
**Solution**: Make sure `prophet_backend/api/company.py` exists and restart backend

### **JWT Token Missing Role**
**Solution**: Clear browser cookies and login again with updated backend

---

## 📞 **Next Step**

**Once backend is running successfully, tell me and I'll build the frontend!**

1. Run database migration ✅
2. Restart backend ✅
3. Test one endpoint ✅
4. **Ready for frontend implementation!** 🚀

