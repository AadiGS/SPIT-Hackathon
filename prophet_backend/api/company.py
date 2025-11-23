"""
Company and User Management API endpoints.
Handles company registration, user creation, and team management.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import logging

from utils.auth import create_access_token, get_current_user
from utils.rbac import UserRole, is_admin_or_above, get_user_permissions, get_role_display_name
from db.database import (
    create_company, create_user, get_user_by_email, get_users_by_company,
    update_user_status, get_company_by_id
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/company", tags=["company"])


# ==================== REQUEST MODELS ====================

class CompanyRegisterRequest(BaseModel):
    """Company registration request."""
    company_name: str
    city: Optional[str] = None
    country: Optional[str] = None
    admin_email: EmailStr


class CreateUserRequest(BaseModel):
    """Create user request."""
    email: EmailStr
    role: str


class UpdateUserStatusRequest(BaseModel):
    """Update user status request."""
    user_id: str
    is_active: bool


# ==================== ENDPOINTS ====================

@router.post("/register")
async def register_company(request: CompanyRegisterRequest):
    """
    Register a new company with super admin user.
    
    Creates:
    1. New company
    2. Super admin user for that company
    
    Returns:
        Company and user info with auth token
    """
    logger.info(f"POST /company/register - {request.admin_email} for {request.company_name}")
    
    try:
        # Check if user already exists
        existing_user = get_user_by_email(request.admin_email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create company
        company = create_company(
            name=request.company_name,
            city=request.city,
            country=request.country
        )
        
        # Create super admin user
        user = create_user(
            email=request.admin_email,
            company_id=company['id'],
            role=UserRole.SUPER_ADMIN.value
        )
        
        # Generate access token
        access_token = create_access_token(data={
            "sub": user['email'],
            "user_id": user['id'],
            "company_id": company['id'],
            "role": user['role']
        })
        
        return {
            "message": "Company registered successfully",
            "company": company,
            "user": {
                "id": user['id'],
                "email": user['email'],
                "role": user['role'],
                "role_display": get_role_display_name(user['role']),
                "permissions": list(get_user_permissions(user['role']))
            },
            "access_token": access_token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Company registration failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users")
async def create_team_member(request: CreateUserRequest, current_user: dict = Depends(get_current_user)):
    """
    Create a new user (team member) in the company.
    
    Requires: Admin or Super Admin role
    
    Args:
        request: User creation details
        current_user: Authenticated user (must be admin or super_admin)
        
    Returns:
        Created user info
    """
    logger.info(f"POST /company/users - {request.email} with role {request.role} by user_id={current_user.get('user_id', 'unknown')}")
    
    try:
        # Check if requester has permission to create users
        if not is_admin_or_above(current_user['role']):
            raise HTTPException(
                status_code=403,
                detail="Only Admin or Super Admin can create users"
            )
        
        # Validate role
        try:
            UserRole(request.role)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role. Valid roles: {[r.value for r in UserRole]}"
            )
        
        # Super Admin cannot be created by anyone
        if request.role == UserRole.SUPER_ADMIN.value and current_user['role'] != UserRole.SUPER_ADMIN.value:
            raise HTTPException(
                status_code=403,
                detail="Only Super Admin can create other Super Admins"
            )
        
        # Check if user already exists
        existing_user = get_user_by_email(request.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user in same company
        user = create_user(
            email=request.email,
            company_id=current_user['company_id'],
            role=request.role,
            created_by=current_user['user_id']
        )
        
        return {
            "message": "User created successfully",
            "user": {
                "id": user['id'],
                "email": user['email'],
                "role": user['role'],
                "role_display": get_role_display_name(user['role']),
                "is_active": user['is_active'],
                "created_at": str(user['created_at'])
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User creation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users")
async def list_team_members(current_user: dict = Depends(get_current_user)):
    """
    List all users in the company.
    
    Requires: Admin or Super Admin role
    
    Returns:
        List of users in the company
    """
    logger.info(f"GET /company/users - by user_id={current_user.get('user_id', 'unknown')}")
    
    try:
        # Check if requester has permission to view users
        if not is_admin_or_above(current_user['role']):
            raise HTTPException(
                status_code=403,
                detail="Only Admin or Super Admin can view team members"
            )
        
        # Get all users for the company
        users = get_users_by_company(current_user['company_id'])
        
        # Add display names and permissions
        for user in users:
            user['role_display'] = get_role_display_name(user['role'])
            user['permissions'] = list(get_user_permissions(user['role']))
            user['created_at'] = str(user['created_at'])
        
        # Get company info
        company = get_company_by_id(current_user['company_id'])
        
        return {
            "company": company,
            "users": users,
            "total": len(users)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list users: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/users/status")
async def toggle_user_status(request: UpdateUserStatusRequest, current_user: dict = Depends(get_current_user)):
    """
    Enable or disable a user.
    
    Requires: Admin or Super Admin role
    
    Args:
        request: User ID and new status
        current_user: Authenticated user
        
    Returns:
        Success message
    """
    logger.info(f"PATCH /company/users/status - user {request.user_id} to {'active' if request.is_active else 'disabled'}")
    
    try:
        # Check if requester has permission
        if not is_admin_or_above(current_user['role']):
            raise HTTPException(
                status_code=403,
                detail="Only Admin or Super Admin can manage users"
            )
        
        # Cannot disable yourself
        if request.user_id == current_user['user_id']:
            raise HTTPException(
                status_code=400,
                detail="Cannot disable your own account"
            )
        
        # Update user status
        update_user_status(request.user_id, request.is_active)
        
        return {
            "message": f"User {'enabled' if request.is_active else 'disabled'} successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update user status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/roles")
async def list_available_roles(current_user: dict = Depends(get_current_user)):
    """
    List all available roles and their permissions.
    
    Returns:
        List of roles with permissions and display names
    """
    try:
        roles = []
        for role in UserRole:
            # Super admins can assign any role, admins cannot assign super_admin
            if role == UserRole.SUPER_ADMIN and current_user['role'] != UserRole.SUPER_ADMIN.value:
                continue
            
            roles.append({
                "value": role.value,
                "display": get_role_display_name(role.value),
                "permissions": list(get_user_permissions(role.value))
            })
        
        return {
            "roles": roles
        }
        
    except Exception as e:
        logger.error(f"Failed to list roles: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

