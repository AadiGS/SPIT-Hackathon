import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import ProcessingModal from './ProcessingModal';

/**
 * ProcessingGuard - Blocks navigation while data is being processed
 * Shows processing modal on all pages until processing is complete
 */
export default function ProcessingGuard({ children }) {
    const { isProcessing, processingStage } = useData();
    const location = useLocation();
    const navigate = useNavigate();

    // Block navigation during processing (except to upload page)
    useEffect(() => {
        if (isProcessing && location.pathname !== '/dashboard/upload') {
            // Redirect to upload page if trying to access other pages during processing
            navigate('/dashboard/upload', { replace: true });
        }
    }, [isProcessing, location.pathname, navigate]);

    // Prevent page refresh/close during processing
    useEffect(() => {
        if (isProcessing) {
            const handleBeforeUnload = (e) => {
                e.preventDefault();
                e.returnValue = 'Processing in progress. Are you sure you want to leave?';
                return e.returnValue;
            };

            window.addEventListener('beforeunload', handleBeforeUnload);

            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, [isProcessing]);

    return <>{children}</>;
}

