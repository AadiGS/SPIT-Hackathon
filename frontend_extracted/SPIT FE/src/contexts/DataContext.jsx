import React, { createContext, useContext, useState, useEffect } from 'react';
import { dataAPI } from '../services/api';

const DataContext = createContext();

export function useData() {
    return useContext(DataContext);
}

export function DataProvider({ children }) {
    const [fileId, setFileId] = useState(null);
    const [fileName, setFileName] = useState('');
    const [isDataUploaded, setIsDataUploaded] = useState(false);
    const [uploadedFileInfo, setUploadedFileInfo] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStage, setProcessingStage] = useState('uploading');

    useEffect(() => {
        // Fetch the latest uploaded file from backend
        const fetchLatestFile = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                return; // Not logged in
            }

            try {
                const response = await dataAPI.listCSVFiles();
                if (response.files && response.files.length > 0) {
                    // Get the most recent file
                    const latestFile = response.files[0];
                    setFileId(latestFile.file_id);
                    setFileName(latestFile.filename);
                    setIsDataUploaded(true);
                    setUploadedFileInfo(latestFile);
                    
                    // Also update localStorage for consistency
                    localStorage.setItem('currentFileId', latestFile.file_id);
                    localStorage.setItem('currentFileName', latestFile.filename);
                    localStorage.setItem('uploadedFileInfo', JSON.stringify(latestFile));
                    
                    console.log('Loaded latest file from backend:', latestFile.filename);
                }
            } catch (error) {
                console.error('Failed to fetch latest file:', error);
                
                // Fallback to localStorage
                const storedFileId = localStorage.getItem('currentFileId');
                const storedFileName = localStorage.getItem('currentFileName');
                const storedFileInfo = localStorage.getItem('uploadedFileInfo');
                const storedProcessing = localStorage.getItem('isProcessing');
                
                if (storedFileId) {
                    setFileId(storedFileId);
                    setFileName(storedFileName || '');
                    setIsDataUploaded(true);
                    setIsProcessing(storedProcessing === 'true');
                    
                    if (storedFileInfo) {
                        try {
                            setUploadedFileInfo(JSON.parse(storedFileInfo));
                        } catch (error) {
                            console.error("Failed to parse stored file info:", error);
                        }
                    }
                }
            }
        };

        fetchLatestFile();
    }, []);

    const setUploadedFile = (fileIdValue, fileNameValue, fileInfo) => {
        setFileId(fileIdValue);
        setFileName(fileNameValue);
        setUploadedFileInfo(fileInfo);
        setIsDataUploaded(true);
        
        localStorage.setItem('currentFileId', fileIdValue);
        localStorage.setItem('currentFileName', fileNameValue);
        if (fileInfo) {
            localStorage.setItem('uploadedFileInfo', JSON.stringify(fileInfo));
        }
    };

    const startProcessing = (stage = 'uploading') => {
        setIsProcessing(true);
        setProcessingStage(stage);
        localStorage.setItem('isProcessing', 'true');
    };

    const updateProcessingStage = (stage) => {
        setProcessingStage(stage);
    };

    const completeProcessing = () => {
        setIsProcessing(false);
        setProcessingStage('complete');
        localStorage.removeItem('isProcessing');
    };

    const clearData = () => {
        setFileId(null);
        setFileName('');
        setUploadedFileInfo(null);
        setIsDataUploaded(false);
        setIsProcessing(false);
        
        localStorage.removeItem('currentFileId');
        localStorage.removeItem('currentFileName');
        localStorage.removeItem('uploadedFileInfo');
        localStorage.removeItem('isProcessing');
        localStorage.removeItem('dashboardData'); // Clear old data
    };

    const value = {
        fileId,
        fileName,
        isDataUploaded,
        uploadedFileInfo,
        isProcessing,
        processingStage,
        setUploadedFile,
        startProcessing,
        updateProcessingStage,
        completeProcessing,
        clearData
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}
