"""
Role-Based Access Control (RBAC) utilities.
Defines roles, permissions, and access control logic.
"""

from typing import List, Set
from enum import Enum

class UserRole(str, Enum):
    """User role definitions."""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MARKETING = "marketing"
    ACCOUNTING_FINANCE = "accounting_finance"
    OPERATIONS = "operations"
    PRODUCT_MANAGEMENT = "product_management"
    SALES = "sales"


class Page(str, Enum):
    """Page/route definitions."""
    HOME = "home"
    UPLOAD = "upload"
    MARKETING = "marketing"
    SALES = "sales"
    PRODUCT = "product"
    OPERATIONS = "operations"
    FINANCE = "finance"
    FORECASTING = "forecasting"
    RFM = "rfm"
    TEAM_MANAGEMENT = "team_management"


# Role-to-Pages mapping
ROLE_PERMISSIONS = {
    UserRole.SUPER_ADMIN: {
        Page.HOME,
        Page.UPLOAD,
        Page.MARKETING,
        Page.SALES,
        Page.PRODUCT,
        Page.OPERATIONS,
        Page.FINANCE,
        Page.FORECASTING,
        Page.RFM,
        Page.TEAM_MANAGEMENT,
    },
    UserRole.ADMIN: {
        Page.HOME,
        Page.UPLOAD,
        Page.TEAM_MANAGEMENT,
    },
    UserRole.MARKETING: {
        Page.HOME,
        Page.MARKETING,
        Page.RFM,
        Page.FORECASTING,
    },
    UserRole.ACCOUNTING_FINANCE: {
        Page.HOME,
        Page.FINANCE,
        Page.RFM,
        Page.FORECASTING,
    },
    UserRole.OPERATIONS: {
        Page.HOME,
        Page.OPERATIONS,
        Page.RFM,
        Page.FORECASTING,
    },
    UserRole.PRODUCT_MANAGEMENT: {
        Page.HOME,
        Page.PRODUCT,
        Page.RFM,
        Page.FORECASTING,
    },
    UserRole.SALES: {
        Page.HOME,
        Page.SALES,
        Page.RFM,
        Page.FORECASTING,
    },
}


def get_user_permissions(role: str) -> Set[str]:
    """
    Get the set of pages a user role can access.
    
    Args:
        role: User role string
        
    Returns:
        Set of page names the role can access
    """
    try:
        user_role = UserRole(role)
        return {page.value for page in ROLE_PERMISSIONS.get(user_role, set())}
    except ValueError:
        return set()


def can_access_page(role: str, page: str) -> bool:
    """
    Check if a user role can access a specific page.
    
    Args:
        role: User role string
        page: Page name
        
    Returns:
        True if role has access to page, False otherwise
    """
    permissions = get_user_permissions(role)
    return page in permissions


def is_super_admin(role: str) -> bool:
    """Check if role is super admin."""
    return role == UserRole.SUPER_ADMIN.value


def is_admin_or_above(role: str) -> bool:
    """Check if role is admin or super admin (can manage users)."""
    return role in [UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value]


def get_role_display_name(role: str) -> str:
    """Get user-friendly display name for role."""
    role_names = {
        UserRole.SUPER_ADMIN.value: "Super Admin",
        UserRole.ADMIN.value: "Admin",
        UserRole.MARKETING.value: "Marketing",
        UserRole.ACCOUNTING_FINANCE.value: "Accounting & Finance",
        UserRole.OPERATIONS.value: "Operations",
        UserRole.PRODUCT_MANAGEMENT.value: "Product Management",
        UserRole.SALES.value: "Sales",
    }
    return role_names.get(role, role.replace("_", " ").title())

