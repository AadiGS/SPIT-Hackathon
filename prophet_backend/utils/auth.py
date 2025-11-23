"""
Authentication utilities for JWT token management.
Hardcoded OTP authentication for hackathon demo.
"""

from jose import jwt, JWTError
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import logging

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "hackathon-secret-key-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Security scheme for FastAPI
security = HTTPBearer()


def create_access_token(data: dict) -> str:
    """
    Create JWT access token with 24-hour expiration.
    
    Args:
        data: Dictionary with user data (user_id, email, company_id)
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    logger.info(f"Created access token for user: {data.get('email')}")
    
    return encoded_jwt


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verify JWT token from Authorization header.
    
    Args:
        credentials: Bearer token from Authorization header
        
    Returns:
        Decoded token payload
        
    Raises:
        HTTPException: 401 if token is invalid or expired
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        
        # Check if token has expired
        exp = payload.get("exp")
        if exp and datetime.utcnow() > datetime.fromtimestamp(exp):
            raise HTTPException(status_code=401, detail="Token has expired")
        
        return payload
        
    except JWTError as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")


def get_current_user(token_data: dict = Depends(verify_token)) -> dict:
    """
    Extract current user from verified token.
    
    Args:
        token_data: Decoded JWT payload
        
    Returns:
        User data dictionary with user_id, email, company_id, role
    """
    if not token_data.get("user_id") or not token_data.get("company_id"):
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    # Add 'email' key from 'sub' (JWT standard)
    if 'sub' in token_data and 'email' not in token_data:
        token_data['email'] = token_data['sub']
    
    return token_data

