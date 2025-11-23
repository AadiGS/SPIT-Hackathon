"""
File handling utilities for CSV upload and storage.
"""

import uuid
import pandas as pd
from pathlib import Path
from fastapi import UploadFile, HTTPException
import logging
from config import MAX_FILE_SIZE_MB, MAX_ROWS, DATA_DIR

logger = logging.getLogger(__name__)


def generate_file_id() -> str:
    """Generate unique file ID."""
    return str(uuid.uuid4())


async def save_uploaded_file(file: UploadFile) -> tuple[str, Path]:
    """
    Save uploaded CSV file and return file_id and path.
    
    Args:
        file: FastAPI UploadFile object
        
    Returns:
        Tuple of (file_id, file_path)
        
    Raises:
        HTTPException: If file validation fails
    """
    # Validate file type
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")
    
    # Read file content
    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)
    
    logger.info(f"Received file: {file.filename}, size: {file_size_mb:.2f} MB")
    
    # Check file size
    if file_size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large: {file_size_mb:.2f} MB (max: {MAX_FILE_SIZE_MB} MB)"
        )
    
    # Generate file ID and path
    file_id = generate_file_id()
    file_path = Path(DATA_DIR) / f"{file_id}.csv"
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    logger.info(f"File saved: {file_path}")
    
    return file_id, file_path


def load_csv(file_path: Path) -> pd.DataFrame:
    """
    Load CSV file with validation.
    
    Args:
        file_path: Path to CSV file
        
    Returns:
        DataFrame
        
    Raises:
        HTTPException: If file cannot be loaded or exceeds limits
    """
    try:
        # Load with row limit check
        df = pd.read_csv(file_path, nrows=MAX_ROWS + 1, encoding='utf-8-sig')
        
        if len(df) > MAX_ROWS:
            raise HTTPException(
                status_code=400,
                detail=f"File contains {len(df)} rows (max: {MAX_ROWS} allowed)"
            )
        
        logger.info(f"Loaded CSV: {len(df)} rows, {len(df.columns)} columns")
        
        return df
        
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    except Exception as e:
        logger.error(f"Error loading CSV: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid CSV file: {str(e)}")


def get_file_path(file_id: str) -> Path:
    """
    Get file path from file_id.
    
    Args:
        file_id: Unique file identifier
        
    Returns:
        Path to CSV file
        
    Raises:
        HTTPException: If file not found
    """
    file_path = Path(DATA_DIR) / f"{file_id}.csv"
    
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"File not found for file_id: {file_id}"
        )
    
    return file_path
