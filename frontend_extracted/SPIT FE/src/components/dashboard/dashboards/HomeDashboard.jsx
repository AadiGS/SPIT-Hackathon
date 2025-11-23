import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import KPICard from '../widgets/KPICard';
import { Users, Upload, TrendingUp, ShoppingCart, DollarSign, Activity, AlertCircle } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useChatbot } from '../../../contexts/ChatbotContext';

export default function HomeDashboard() {
    const { isDataUploaded, fileName } = useData();
    const { updatePageData } = useChatbot();

    // Update chatbot context when component mounts
    useEffect(() => {
        updatePageData('Home Dashboard', {
            isDataUploaded,
            fileName: fileName || 'No data uploaded',
            status: isDataUploaded ? 'Data processed and ready' : 'Waiting for data upload'
        });
    }, [isDataUploaded, fileName]);

    if (!isDataUploaded) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Home Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Overall business overview and key metrics
                    </p>
                </div>

                {/* Empty State */}
                <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="bg-card rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 max-w-2xl text-center">
                        <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                            No Data Available
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Upload your retail transaction CSV file to see analytics, forecasts, and insights.
                        </p>
                        <Link
                            to="/dashboard/upload"
                            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        >
                            <Upload className="h-5 w-5 mr-2" />
                            Upload CSV Data
                        </Link>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                                Getting Started
                            </h3>
                            <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-2 list-decimal list-inside">
                                <li>Upload your retail CSV file (must include: InvoiceNo, InvoiceDate, Description, Quantity, UnitPrice, CustomerID, Country)</li>
                                <li>Wait for processing (30-60 seconds) - Prophet ML will analyze your data</li>
                                <li>Explore dashboards: Sales forecasts, RFM segments, Product clusters</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Home Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Analytics for: {fileName || 'Uploaded data'}
                </p>
            </div>

            {/* KPI Grid - Show zeros until we have real data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Data Status"
                    value="Ready"
                    subtitle="CSV processed"
                    icon={TrendingUp}
                />
                <KPICard
                    title="Forecasts"
                    value="Active"
                    subtitle="Prophet models running"
                    icon={Activity}
                />
                <KPICard
                    title="RFM Segments"
                    value="Available"
                    subtitle="Customer analysis"
                    icon={Users}
                />
                <KPICard
                    title="Product Clusters"
                    value="Generated"
                    subtitle="ML grouping"
                    icon={ShoppingCart}
                />
            </div>

            {/* Quick Links */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Quick Access
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { name: 'Marketing Dashboard', description: 'Customer behavior & campaigns', href: '/dashboard/marketing' },
                        { name: 'Sales Dashboard', description: 'Revenue trends & forecasting', href: '/dashboard/sales' },
                        { name: 'RFM Segmentation', description: 'Customer segments analysis', href: '/dashboard/rfm' },
                    ].map((link) => (
                        <Link
                            key={link.name}
                            to={link.href}
                            className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                {link.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {link.description}
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
