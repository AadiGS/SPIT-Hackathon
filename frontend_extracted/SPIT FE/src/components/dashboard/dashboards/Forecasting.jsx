import React, { useState, useEffect, useMemo } from 'react';
import ChartCard from '../charts/ChartCard';
import KPICard from '../widgets/KPICard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from 'recharts';
import { TrendingUp, Calendar, BarChart2, AlertCircle, Loader2, Activity, Target, Zap } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useFilters } from '../../../contexts/FilterContext';
import { useChatbot } from '../../../contexts/ChatbotContext';
import { dataAPI, transformers } from '../../../services/api';

// Helper function to get human-readable metric names
const getMetricName = (metric) => {
    const names = {
        'total_revenue': 'Total Revenue',
        'order_count': 'Order Count',
        'unique_customers_per_day': 'Unique Customers',
        'avg_order_value': 'Average Order Value'
    };
    return names[metric] || metric;
};

export default function Forecasting() {
    const { fileId, isDataUploaded } = useData();
    const { user } = useAuth();
    const { dateRange, selectedRegion, selectedCategory } = useFilters();
    const { updatePageData } = useChatbot();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [forecastData, setForecastData] = useState(null);
    const [selectedMetric, setSelectedMetric] = useState('total_revenue');

    // Debounce filter changes
    const debouncedFetch = useMemo(
        () => {
            let timeoutId;
            return (fn) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(fn, 300);
            };
        },
        []
    );

    useEffect(() => {
        const fetchData = async () => {
            if (!fileId || !user) return;
            
            setLoading(true);
            setError(null);
            
            try {
                console.log('📊 Fetching Forecasting Dashboard data with filters:', {
                    dateRange,
                    selectedRegion,
                    selectedCategory,
                    selectedMetric
                });

                // Determine group type based on filters
                const groupType = selectedRegion !== 'all' ? 'country' : 
                                selectedCategory !== 'all' ? 'cluster' : 'overall';
                const groupKey = selectedRegion !== 'all' ? selectedRegion :
                               selectedCategory !== 'all' ? selectedCategory : null;

                // Fetch all key metrics in parallel
                const [revenueData, orderData, customerData, aovData] = await Promise.all([
                    dataAPI.getForecastResults(fileId, user.company_id, 'total_revenue', groupType, groupKey),
                    dataAPI.getForecastResults(fileId, user.company_id, 'order_count', groupType, groupKey),
                    dataAPI.getForecastResults(fileId, user.company_id, 'unique_customers_per_day', groupType, groupKey),
                    dataAPI.getForecastResults(fileId, user.company_id, 'avg_order_value', groupType, groupKey)
                ]);

                console.log('All metrics fetched:', { revenueData, orderData, customerData, aovData });

                // Get the selected metric data
                const metricMap = {
                    'total_revenue': revenueData,
                    'order_count': orderData,
                    'unique_customers_per_day': customerData,
                    'avg_order_value': aovData
                };

                const currentMetricData = metricMap[selectedMetric];
                let forecasts = currentMetricData.forecasts || [];
                const historicalAvg = currentMetricData.historical_avg || 0;

                if (forecasts.length === 0) {
                    setError('No forecast data available for selected metric.');
                    setLoading(false);
                    return;
                }

                // Filter by date range
                let filteredForecasts = forecasts;
                if (dateRange !== 'all') {
                    const weekMap = { 
                        week1: [0, 7], 
                        week2: [7, 14], 
                        week3: [14, 21], 
                        week4: [21, 28] 
                    };
                    const [start, end] = weekMap[dateRange] || [0, forecasts.length];
                    const actualEnd = Math.min(end, forecasts.length);
                    
                    if (start < forecasts.length) {
                        filteredForecasts = forecasts.slice(start, actualEnd);
                    }
                }

                // Calculate metrics
                const totalValue = filteredForecasts.reduce((sum, d) => sum + (d.yhat || 0), 0);
                const avgValue = filteredForecasts.length > 0 ? totalValue / filteredForecasts.length : 0;
                const minValue = Math.min(...filteredForecasts.map(d => d.yhat || 0));
                const maxValue = Math.max(...filteredForecasts.map(d => d.yhat || 0));
                const avgUpper = filteredForecasts.reduce((sum, d) => sum + (d.yhat_upper || 0), 0) / filteredForecasts.length;
                const avgLower = filteredForecasts.reduce((sum, d) => sum + (d.yhat_lower || 0), 0) / filteredForecasts.length;
                const confidenceWidth = ((avgUpper - avgLower) / avgValue) * 100;

                const growth = historicalAvg > 0 ? ((avgValue - historicalAvg) / historicalAvg * 100) : 0;

                // Prepare chart data
                const dailyChart = filteredForecasts.map((day, idx) => ({
                    day: `Day ${idx + 1}`,
                    date: day.ds,
                    value: Math.round(day.yhat || 0),
                    lower: Math.round(day.yhat_lower || 0),
                    upper: Math.round(day.yhat_upper || 0),
                    historical: Math.round(historicalAvg),
                    trend: Math.round(day.trend || day.yhat || 0)
                }));

                // Calculate accuracy score (narrower confidence = higher accuracy)
                const accuracyScore = Math.max(0, 100 - confidenceWidth);

                setForecastData({
                    daily: dailyChart,
                    forecasts: filteredForecasts,
                    metrics: {
                        total: Math.round(totalValue),
                        average: Math.round(avgValue),
                        min: Math.round(minValue),
                        max: Math.round(maxValue),
                        growth: growth,
                        confidenceWidth: confidenceWidth.toFixed(1),
                        accuracyScore: accuracyScore.toFixed(0),
                        days: filteredForecasts.length,
                        historical: Math.round(historicalAvg)
                    },
                    allMetrics: {
                        revenue: revenueData.forecasts || [],
                        orders: orderData.forecasts || [],
                        customers: customerData.forecasts || [],
                        aov: aovData.forecasts || []
                    }
                });

                // Update chatbot with Forecasting Dashboard data
                updatePageData('Forecasting Dashboard', {
                    selectedMetric,
                    metricName: getMetricName(selectedMetric),
                    total: Math.round(totalValue),
                    average: Math.round(avgValue),
                    min: Math.round(minValue),
                    max: Math.round(maxValue),
                    growth: growth.toFixed(2),
                    confidenceWidth: confidenceWidth.toFixed(1),
                    accuracyScore: accuracyScore.toFixed(0),
                    forecastDays: filteredForecasts.length,
                    historicalBaseline: Math.round(historicalAvg),
                    filters: {
                        region: selectedRegion,
                        category: selectedCategory,
                        dateRange: dateRange
                    },
                    dailyForecasts: dailyChart.slice(0, 7) // First week for context
                });
                
            } catch (err) {
                console.error('Failed to fetch forecast data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        debouncedFetch(fetchData);
    }, [fileId, user, dateRange, selectedRegion, selectedCategory, selectedMetric]);

    if (!isDataUploaded) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        Upload a CSV file to view forecasting analytics
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center text-red-500">
                    <p>Error loading forecast data: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Forecasting Analytics
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Prophet-powered predictions across all key business metrics
                    </p>
                </div>
                
                {/* Metric Selector */}
                <div className="mt-4 md:mt-0">
                    <select
                        value={selectedMetric}
                        onChange={(e) => setSelectedMetric(e.target.value)}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="total_revenue">Revenue Forecast</option>
                        <option value="order_count">Order Volume Forecast</option>
                        <option value="unique_customers_per_day">Customer Forecast</option>
                        <option value="avg_order_value">AOV Forecast</option>
                    </select>
                </div>
            </div>

            {/* Model Performance KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Forecast Value"
                    value={forecastData?.metrics?.average ? 
                        selectedMetric === 'total_revenue' || selectedMetric === 'avg_order_value' 
                            ? `$${forecastData.metrics.average.toLocaleString()}` 
                            : forecastData.metrics.average.toLocaleString()
                        : '-'
                    }
                    subtitle={`Avg per day${dateRange !== 'all' ? ` (${dateRange.replace('week', 'Week ')})` : ''}`}
                    icon={TrendingUp}
                    trend={forecastData?.metrics?.growth ? parseFloat(forecastData.metrics.growth.toFixed(2)) : null}
                    trendLabel="vs historical avg"
                    description="Average daily predicted value for the selected metric across the forecast period. Use dropdown above to switch between Revenue, Orders, Customers, or AOV forecasts. Trend compares prediction vs historical baseline."
                />
                <KPICard
                    title="Forecast Horizon"
                    value={forecastData?.metrics?.days || 0}
                    subtitle={`${forecastData?.metrics?.days || 0} days ahead`}
                    icon={Calendar}
                    description="Number of future days covered by the Prophet forecast. Typically 28 days (4 weeks) unless filtered. This defines your planning window for inventory, staffing, and resource allocation."
                />
                <KPICard
                    title="Model Accuracy"
                    value={forecastData?.metrics?.accuracyScore ? `${forecastData.metrics.accuracyScore}%` : '-'}
                    subtitle="Confidence score"
                    icon={Target}
                    description="Model confidence score calculated as (100 - confidence_interval_width). Higher scores (>80%) indicate tight prediction bounds and reliable forecasts. Lower scores suggest higher uncertainty due to volatile historical patterns."
                />
                <KPICard
                    title="Peak Prediction"
                    value={forecastData?.metrics?.max ? 
                        selectedMetric === 'total_revenue' || selectedMetric === 'avg_order_value' 
                            ? `$${forecastData.metrics.max.toLocaleString()}` 
                            : forecastData.metrics.max.toLocaleString()
                        : '-'
                    }
                    subtitle="Highest forecasted value"
                    icon={Zap}
                    description="Maximum predicted value for any single day in the forecast period. Critical for capacity planning—ensures you're prepared for peak demand days with adequate resources and inventory."
                />
            </div>

            {/* Forecasting Charts */}
            <div className="grid grid-cols-1 gap-6">
                {/* Main Forecast with Confidence Intervals */}
                <ChartCard
                    title={`${selectedMetric.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Forecast - Prophet Model`}
                    description="Daily predictions with 95% confidence intervals"
                >
                    <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={forecastData?.daily || []}>
                            <defs>
                                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="day" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value, name) => {
                                    const formatted = selectedMetric === 'total_revenue' || selectedMetric === 'avg_order_value' 
                                        ? `$${value.toLocaleString()}` 
                                        : value.toLocaleString();
                                    return [formatted, name];
                                }}
                            />
                            <Legend />
                            <Area 
                                type="monotone" 
                                dataKey="upper" 
                                stroke="#10b981" 
                                fill="transparent" 
                                strokeDasharray="3 3"
                                name="Upper Bound (97.5%)" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#3b82f6" 
                                fillOpacity={1} 
                                fill="url(#colorForecast)"
                                strokeWidth={3}
                                name="Predicted Value" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="lower" 
                                stroke="#ef4444" 
                                fill="transparent" 
                                strokeDasharray="3 3"
                                name="Lower Bound (2.5%)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Forecast vs Historical Baseline */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartCard
                        title="Forecast vs Historical Baseline"
                        description="Comparing predictions against historical average"
                    >
                        <ResponsiveContainer width="100%" height={350}>
                            <ComposedChart data={forecastData?.daily || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="day" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                    labelStyle={{ color: '#f3f4f6' }}
                                    formatter={(value, name) => {
                                        const formatted = selectedMetric === 'total_revenue' || selectedMetric === 'avg_order_value' 
                                            ? `$${value.toLocaleString()}` 
                                            : value.toLocaleString();
                                        return [formatted, name];
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="value" fill="#3b82f6" name="Forecast" />
                                <Line 
                                    type="monotone" 
                                    dataKey="historical" 
                                    stroke="#ef4444" 
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    name="Historical Avg" 
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard
                        title="Prediction Trend Line"
                        description="Simplified view of forecast trajectory"
                    >
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={forecastData?.daily || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="day" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                    labelStyle={{ color: '#f3f4f6' }}
                                    formatter={(value) => {
                                        const formatted = selectedMetric === 'total_revenue' || selectedMetric === 'avg_order_value' 
                                            ? `$${value.toLocaleString()}` 
                                            : value.toLocaleString();
                                        return [formatted, 'Forecast'];
                                    }}
                                />
                                <Legend />
                                <Line 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                    name="Prophet Forecast" 
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="trend" 
                                    stroke="#10b981" 
                                    strokeWidth={2}
                                    strokeDasharray="3 3"
                                    name="Trend Component" 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            </div>

            {/* Forecast Performance Insights */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Forecast Performance Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Growth Trend */}
                    <div className={`flex items-start p-4 rounded-lg ${
                        forecastData?.metrics?.growth > 0 
                            ? 'bg-green-50 dark:bg-green-900/20' 
                            : 'bg-gray-50 dark:bg-gray-900/20'
                    }`}>
                        <TrendingUp className={`h-5 w-5 mt-0.5 mr-3 ${
                            forecastData?.metrics?.growth > 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-gray-600 dark:text-gray-400'
                        }`} />
                        <div>
                            <h4 className={`font-medium ${
                                forecastData?.metrics?.growth > 0 
                                    ? 'text-green-900 dark:text-green-300' 
                                    : 'text-gray-900 dark:text-gray-300'
                            }`}>
                                Predicted Growth Trend
                            </h4>
                            <p className={`text-sm mt-1 ${
                                forecastData?.metrics?.growth > 0 
                                    ? 'text-green-800 dark:text-green-400' 
                                    : 'text-gray-800 dark:text-gray-400'
                            }`}>
                                Forecast shows <strong>{forecastData?.metrics?.growth >= 0 ? 'growth of' : 'change of'} {Math.abs(forecastData?.metrics?.growth || 0).toFixed(1)}%</strong> vs historical baseline.
                                {forecastData?.metrics?.growth > 10 ? ' Strong upward momentum detected!' : 
                                 forecastData?.metrics?.growth > 0 ? ' Positive outlook maintained.' : 
                                 ' Stable performance expected.'}
                            </p>
                        </div>
                    </div>

                    {/* Model Confidence */}
                    <div className={`flex items-start p-4 rounded-lg ${
                        parseFloat(forecastData?.metrics?.accuracyScore || 0) > 80 
                            ? 'bg-blue-50 dark:bg-blue-900/20' 
                            : 'bg-amber-50 dark:bg-amber-900/20'
                    }`}>
                        <Target className={`h-5 w-5 mt-0.5 mr-3 ${
                            parseFloat(forecastData?.metrics?.accuracyScore || 0) > 80 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-amber-600 dark:text-amber-400'
                        }`} />
                        <div>
                            <h4 className={`font-medium ${
                                parseFloat(forecastData?.metrics?.accuracyScore || 0) > 80 
                                    ? 'text-blue-900 dark:text-blue-300' 
                                    : 'text-amber-900 dark:text-amber-300'
                            }`}>
                                Model Confidence
                            </h4>
                            <p className={`text-sm mt-1 ${
                                parseFloat(forecastData?.metrics?.accuracyScore || 0) > 80 
                                    ? 'text-blue-800 dark:text-blue-400' 
                                    : 'text-amber-800 dark:text-amber-400'
                            }`}>
                                Accuracy score: <strong>{forecastData?.metrics?.accuracyScore}%</strong>. 
                                Confidence interval width: {forecastData?.metrics?.confidenceWidth}%.
                                {parseFloat(forecastData?.metrics?.accuracyScore || 0) > 80 ? ' High confidence predictions!' : ' Moderate confidence - consider historical variance.'}
                            </p>
                        </div>
                    </div>

                    {/* Forecast Range */}
                    <div className="flex items-start p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 mr-3" />
                        <div>
                            <h4 className="font-medium text-purple-900 dark:text-purple-300">
                                Forecast Range
                            </h4>
                            <p className="text-sm text-purple-800 dark:text-purple-400 mt-1">
                                {selectedMetric === 'total_revenue' || selectedMetric === 'avg_order_value' 
                                    ? `Range: $${forecastData?.metrics?.min?.toLocaleString()} - $${forecastData?.metrics?.max?.toLocaleString()}`
                                    : `Range: ${forecastData?.metrics?.min?.toLocaleString()} - ${forecastData?.metrics?.max?.toLocaleString()}`
                                }. Variability: {forecastData?.metrics?.max && forecastData?.metrics?.min 
                                    ? ((forecastData.metrics.max - forecastData.metrics.min) / forecastData.metrics.average * 100).toFixed(0) 
                                    : 0}% of average.
                            </p>
                        </div>
                    </div>

                    {/* Forecast Horizon */}
                    <div className="flex items-start p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 mr-3" />
                        <div>
                            <h4 className="font-medium text-indigo-900 dark:text-indigo-300">
                                Planning Horizon
                            </h4>
                            <p className="text-sm text-indigo-800 dark:text-indigo-400 mt-1">
                                <strong>{forecastData?.metrics?.days} days</strong> of predictions available
                                {dateRange !== 'all' ? ` (filtered to ${dateRange.replace('week', 'Week ')})` : ' (full 4-week view)'}. 
                                Use these forecasts for strategic planning and resource allocation.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Model Info & Features */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Prophet Model Features
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Time Series Decomposition</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Automatically separates trend, seasonality, and holiday effects for accurate predictions
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">95% Confidence Intervals</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Quantifies prediction uncertainty with upper and lower bounds for risk assessment
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Robust to Data Issues</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Handles missing data, outliers, and irregular time series automatically
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Multi-Metric Support</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Forecasts revenue, orders, customers, AOV, and more business metrics
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Current Forecast Summary
                    </h3>
                    <div className="space-y-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Model: Facebook Prophet</p>
                            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                Industry-leading time series forecasting developed by Meta's Core Data Science team
                            </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-sm font-medium text-green-900 dark:text-green-300">
                                Active Metric: {selectedMetric.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                                {forecastData?.metrics?.days || 0} days of predictions with {forecastData?.metrics?.accuracyScore}% confidence
                            </p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <p className="text-sm font-medium text-purple-900 dark:text-purple-300">Filter Context</p>
                            <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                                {selectedRegion !== 'all' ? `Region: ${selectedRegion}` : 
                                 selectedCategory !== 'all' ? `Category: ${selectedCategory}` : 
                                 'Overall forecasts across all regions and categories'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Info */}
            <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">About Prophet Forecasting</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            This platform uses <strong>Facebook Prophet</strong>, an open-source forecasting library developed by Meta's Core Data Science team. 
                            Prophet is specifically designed for business time series with strong seasonal patterns and multiple seasons of historical data. 
                            The model automatically detects trend changes, adjusts for outliers, and provides interpretable forecasts ideal for retail and e-commerce analytics. 
                            All predictions include 95% confidence intervals (2.5% to 97.5% quantiles) to support data-driven decision making under uncertainty.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
