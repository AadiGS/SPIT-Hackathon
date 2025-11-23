import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/Card';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { dataAPI } from '../../../services/api';
import ProcessingModal from '../ProcessingModal';
import { cn } from '@/lib/utils';

export default function UploadData() {
    const { setUploadedFile, startProcessing, updateProcessingStage, completeProcessing, isProcessing, processingStage, fileId } = useData();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', 'uploading'
    const [errorMessage, setErrorMessage] = useState('');
    const [fileName, setFileName] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const inputRef = useRef(null);

    // Check if already processing on mount
    useEffect(() => {
        if (fileId && user) {
            checkExistingProcessing();
        }
    }, [fileId, user]);

    const checkExistingProcessing = async () => {
        try {
            const status = await dataAPI.checkProcessingStatus(fileId, user.company_id);
            
            if (status.status === 'processing') {
                // Still processing, show modal
                startProcessing('forecasting');
                pollProcessingStatus();
            } else if (status.status === 'completed' && status.forecasts_generated) {
                // Already done
                completeProcessing();
            }
        } catch (error) {
            console.error('Failed to check processing status:', error);
        }
    };

    const pollProcessingStatus = async () => {
        const checkStatus = async () => {
            try {
                const status = await dataAPI.checkProcessingStatus(fileId, user.company_id);
                
                if (status.status === 'completed') {
                    completeProcessing();
                    setProgress(100);
                    return true; // Stop polling
                } else if (status.status === 'failed') {
                    completeProcessing();
                    setUploadStatus('error');
                    setErrorMessage('Processing failed. Please try uploading again.');
                    return true; // Stop polling
                }
                
                // Update progress (increment by 10% each check, max 90%)
                setProgress(prev => Math.min(prev + 10, 90));
                return false; // Continue polling
            } catch (error) {
                console.error('Error checking status:', error);
                return false;
            }
        };

        // Poll every 3 seconds
        const poll = async () => {
            const shouldStop = await checkStatus();
            if (!shouldStop) {
                setTimeout(poll, 3000);
            }
        };
        
        poll();
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleFile = async (file) => {
        // Validate CSV file
        if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
            setUploadStatus('error');
            setErrorMessage('Please upload a valid CSV file.');
            setFileName('');
            return;
        }

        setFileName(file.name);
        setUploadStatus('uploading');
        startProcessing('uploading');
        setProgress(10);
        
        try {
            // Step 1: Upload CSV
            updateProcessingStage('uploading');
            const uploadResponse = await dataAPI.uploadCSV(file);
            console.log('Upload response:', uploadResponse);
            setProgress(20);
            
            // Step 2: Trigger forecasting pipeline
            updateProcessingStage('cleaning');
            setProgress(30);
            
            updateProcessingStage('clustering');
            setProgress(40);
            
            updateProcessingStage('rfm');
            setProgress(50);
            
            updateProcessingStage('forecasting');
            setProgress(60);
            
            const forecastResponse = await dataAPI.runForecasts(
                uploadResponse.file_id, 
                user.company_id
            );
            
            console.log('Forecast response:', forecastResponse);
            
            // If it was skipped (already processed), go straight to 100%
            if (forecastResponse.skipped) {
                setProgress(100);
                updateProcessingStage('saving');
            } else {
                setProgress(80);
                updateProcessingStage('saving');
                // Simulate final stage
                await new Promise(resolve => setTimeout(resolve, 2000));
                setProgress(100);
            }
            
            // Store file info
            setUploadedFile(uploadResponse.file_id, file.name, uploadResponse);
            
            // Complete processing
            completeProcessing();
            setUploadStatus('success');
            setErrorMessage('');
            
            // Navigate to home dashboard after 1 second
            setTimeout(() => {
                navigate('/dashboard/home');
            }, 1500);
            
        } catch (error) {
            console.error('Upload/forecast failed:', error);
            completeProcessing();
            setUploadStatus('error');
            setErrorMessage(error.message || 'Failed to upload and process file. Please try again.');
            setProgress(0);
        }
    };

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            const file = e.dataTransfer.files?.[0];
            if (file) {
                handleFile(file);
            }
        },
        [user]
    );

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleRemove = () => {
        setFileName('');
        setUploadStatus(null);
        setErrorMessage('');
        setProgress(0);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const onButtonClick = () => {
        inputRef.current?.click();
    };

    return (
        <>
            {/* Processing Modal */}
            {isProcessing && (
                <ProcessingModal stage={processingStage} progress={progress} />
            )}

            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Upload Dataset
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Upload your retail transaction CSV file for analysis and forecasting.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Data Upload</CardTitle>
                        <CardDescription>
                            Supported format: CSV with required columns (InvoiceNo, InvoiceDate, Description, Quantity, UnitPrice, CustomerID, Country)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <input
                            ref={inputRef}
                            type="file"
                            className="hidden"
                            accept=".csv,text/csv"
                            onChange={handleChange}
                            disabled={isProcessing}
                        />

                        {!fileName ? (
                            <div
                                onClick={isProcessing ? null : onButtonClick}
                                onDragOver={handleDragOver}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={cn(
                                    "flex h-64 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed transition-colors",
                                    isProcessing ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                                    isDragging
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                        : "border-border bg-card/50 hover:bg-card"
                                )}
                            >
                                <div className="rounded-full bg-card p-4 shadow-sm">
                                    <FileSpreadsheet className="h-8 w-8 text-blue-500" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {isProcessing ? 'Processing...' : 'Click to select CSV file'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {isProcessing ? 'Please wait' : 'or drag and drop file here'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="group relative h-64 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                        <div className="rounded-full bg-card p-6 shadow-lg">
                                            {uploadStatus === 'uploading' || isProcessing ? (
                                                <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
                                            ) : uploadStatus === 'success' ? (
                                                <CheckCircle className="h-16 w-16 text-green-500" />
                                            ) : uploadStatus === 'error' ? (
                                                <XCircle className="h-16 w-16 text-red-500" />
                                            ) : (
                                                <FileSpreadsheet className="h-16 w-16 text-blue-500" />
                                            )}
                                        </div>
                                        <div className="text-center px-4">
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-md">
                                                {fileName}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                CSV File
                                            </p>
                                        </div>
                                    </div>

                                    {!isProcessing && uploadStatus !== 'uploading' && (
                                        <>
                                            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
                                            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={onButtonClick}
                                                    className="h-10 px-4 bg-card"
                                                >
                                                    <Upload className="h-4 w-4 mr-2" />
                                                    Replace
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleRemove}
                                                    className="h-10 px-4 bg-card text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Remove
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {uploadStatus === 'success' && (
                            <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                <div>
                                    <h4 className="font-medium text-green-900 dark:text-green-300">Processing Complete!</h4>
                                    <p className="text-sm text-green-700 dark:text-green-400">
                                        Your data has been analyzed. Forecasts, RFM segments, and product clusters are ready!
                                    </p>
                                </div>
                            </div>
                        )}

                        {uploadStatus === 'error' && (
                            <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
                                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-red-900 dark:text-red-300">Upload Failed</h4>
                                    <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
                                </div>
                                <button
                                    onClick={handleRemove}
                                    className="ml-auto rounded-full p-1 hover:bg-red-100 dark:hover:bg-red-900/30"
                                >
                                    <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </button>
                            </div>
                        )}

                        {!uploadStatus && (
                            <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <div>
                                    <h4 className="font-medium text-blue-900 dark:text-blue-300">Required Columns</h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-400">
                                        InvoiceNo, InvoiceDate, Description, Quantity, UnitPrice, CustomerID, Country
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
