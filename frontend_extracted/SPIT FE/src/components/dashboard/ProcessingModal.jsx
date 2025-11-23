import React from 'react';
import { Loader2, TrendingUp, Users, Package, CheckCircle } from 'lucide-react';

export default function ProcessingModal({ stage = 'uploading', progress = 0 }) {
    const stages = [
        { id: 'uploading', label: 'Uploading CSV', icon: Package },
        { id: 'cleaning', label: 'Cleaning Data', icon: TrendingUp },
        { id: 'clustering', label: 'Product Clustering', icon: Package },
        { id: 'rfm', label: 'RFM Segmentation', icon: Users },
        { id: 'forecasting', label: 'Prophet Forecasting', icon: TrendingUp },
        { id: 'saving', label: 'Saving Results', icon: CheckCircle }
    ];

    const currentStageIndex = stages.findIndex(s => s.id === stage);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 max-w-md w-full shadow-2xl">
                {/* Title */}
                <div className="text-center mb-8">
                    <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Processing Your Data
                    </h2>
                    <p className="text-gray-400 text-sm">
                        Please wait while we analyze your retail data...
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Stages */}
                <div className="space-y-3">
                    {stages.map((stageItem, index) => {
                        const Icon = stageItem.icon;
                        const isComplete = index < currentStageIndex;
                        const isCurrent = index === currentStageIndex;
                        const isPending = index > currentStageIndex;

                        return (
                            <div 
                                key={stageItem.id}
                                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                    isCurrent ? 'bg-blue-900/30 border border-blue-700' :
                                    isComplete ? 'bg-green-900/20' :
                                    'bg-gray-800/50'
                                }`}
                            >
                                <div className={`flex-shrink-0 ${
                                    isComplete ? 'text-green-500' :
                                    isCurrent ? 'text-blue-500' :
                                    'text-gray-600'
                                }`}>
                                    {isComplete ? (
                                        <CheckCircle className="h-5 w-5" />
                                    ) : isCurrent ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Icon className="h-5 w-5" />
                                    )}
                                </div>
                                <span className={`font-medium ${
                                    isComplete ? 'text-green-400' :
                                    isCurrent ? 'text-blue-400' :
                                    'text-gray-500'
                                }`}>
                                    {stageItem.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Info */}
                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-300 text-center">
                        ⏱️ This usually takes 30-60 seconds
                    </p>
                </div>

                {/* Warning */}
                <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                        ⚠️ Please don't close this window or refresh the page
                    </p>
                </div>
            </div>
        </div>
    );
}

