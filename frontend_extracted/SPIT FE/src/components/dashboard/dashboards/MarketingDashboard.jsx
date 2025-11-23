import React, { useState, useEffect } from 'react';
import ChartCard from '../charts/ChartCard';
import KPICard from '../widgets/KPICard';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, Target, DollarSign, Loader2, Filter, AlertCircle } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useFilters } from '../../../contexts/FilterContext';
import { useChatbot } from '../../../contexts/ChatbotContext';
import { dataAPI, transformers } from '../../../services/api';

// Helper function to render formatted text with bold support
const FormattedText = ({ text }) => {
    if (!text) return null;
    
    // Split by ** for bold text
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    // Bold text
                    return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
                }
                return <span key={index}>{part}</span>;
            })}
        </>
    );
};

export default function MarketingDashboard() {
    const { fileId, isDataUploaded } = useData();
    const { user } = useAuth();
    const { dateRange, selectedRegion, selectedCategory, dataMode } = useFilters();
    const { updatePageData } = useChatbot();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rfmData, setRfmData] = useState(null);
    const [forecastData, setForecastData] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [filteredSegments, setFilteredSegments] = useState([]);
    const [aiInsights, setAiInsights] = useState(null);
    const [insightsLoading, setInsightsLoading] = useState(false);

    // Generate AI insights based on current data and filters
    const generateAIInsights = async (rfm, forecast) => {
        if (!fileId || !user) return;
        
        try {
            setInsightsLoading(true);
            
            const filters = {
                region: selectedRegion,
                category: selectedCategory,
                dateRange: dateRange,
                dataMode: dataMode
            };
            
            const response = await dataAPI.generateAIInsights(
                fileId,
                user.company_id,
                rfm,
                forecast,
                filters
            );
            
            setAiInsights(response.insights);
            console.log('🤖 AI Insights generated:', response.insights);
        } catch (error) {
            console.error('Failed to generate AI insights:', error);
            // Use fallback insights if AI generation fails
            setAiInsights(null);
        } finally {
            setInsightsLoading(false);
        }
    };

    useEffect(() => {
        // Debounce filter changes to prevent rapid API calls
        const timeoutId = setTimeout(() => {
            fetchData();
        }, 300); // 300ms debounce delay
        
        return () => clearTimeout(timeoutId);
    }, [fileId, user, dateRange, selectedRegion, selectedCategory, dataMode]);

    const fetchData = async () => {
        if (!fileId || !user) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // PREDICTION MODE - Fetch forecasts based on filters
                const groupType = selectedRegion !== 'all' ? 'country' : 
                                selectedCategory !== 'all' ? 'cluster' : 'overall';
                const groupKey = selectedRegion !== 'all' ? selectedRegion :
                               selectedCategory !== 'all' ? selectedCategory : null;
                
                console.log('Filter selection:', {
                    selectedRegion,
                    selectedCategory,
                    groupType,
                    groupKey
                });
                
                // Fetch customer and revenue forecasts IN PARALLEL for speed
                const [customerForecast, revenueForecast] = await Promise.all([
                    dataAPI.getForecastResults(
                        fileId,
                        user.company_id,
                        'unique_customers_per_day',
                        groupType,
                        groupKey
                    ),
                    dataAPI.getForecastResults(
                        fileId,
                        user.company_id,
                        'total_revenue',
                        groupType,
                        groupKey
                    )
                ]);
                    
                    console.log('Customer forecast response:', customerForecast);
                    console.log('Revenue forecast response:', revenueForecast);
                    
                    // Get forecasts and historical data
                    let customerForecasts = customerForecast.forecasts || [];
                    let revenueForecasts = revenueForecast.forecasts || [];
                    const historicalCustomerAvg = customerForecast.historical_avg || 0;
                    const historicalRevenueAvg = revenueForecast.historical_avg || 0;
                    
                    console.log('Total forecast days available:', customerForecasts.length);
                    console.log('Historical baseline - Customers:', historicalCustomerAvg, 'Revenue:', historicalRevenueAvg);
                    
                    // Check if we have forecast data
                    if (customerForecasts.length === 0 || revenueForecasts.length === 0) {
                        console.error('No forecast data available');
                        setError('No forecast data available. Please ensure data has been processed and forecasts have been generated.');
                        setLoading(false);
                        return;
                    }
                    
                    // Filter forecasts by date range (week)
                    let filteredCustomerForecasts = customerForecasts;
                    let filteredRevenueForecasts = revenueForecasts;
                    
                    if (dateRange !== 'all') {
                        const weekMap = { 
                            week1: [0, 7], 
                            week2: [7, 14], 
                            week3: [14, 21], 
                            week4: [21, 28] 
                        };
                        const [start, end] = weekMap[dateRange] || [0, customerForecasts.length];
                        
                        // Ensure we don't slice beyond available data
                        const actualEnd = Math.min(end, customerForecasts.length);
                        
                        if (start < customerForecasts.length) {
                            filteredCustomerForecasts = customerForecasts.slice(start, actualEnd);
                            filteredRevenueForecasts = revenueForecasts.slice(start, actualEnd);
                            console.log(`Filtered to ${dateRange}: ${filteredCustomerForecasts.length} days (${start} to ${actualEnd})`);
                        } else {
                            console.warn(`Week ${dateRange} starts at day ${start}, but only ${customerForecasts.length} days available`);
                            // Use all available data as fallback
                            filteredCustomerForecasts = customerForecasts;
                            filteredRevenueForecasts = revenueForecasts;
                        }
                    }
                    
                    // Calculate predicted metrics from filtered data
                    const avgCustomers = filteredCustomerForecasts.length > 0 
                        ? Math.round(filteredCustomerForecasts.reduce((sum, day) => sum + (day.yhat || 0), 0) / filteredCustomerForecasts.length)
                        : 0;
                    
                    const totalRevenue = filteredRevenueForecasts.length > 0
                        ? filteredRevenueForecasts.reduce((sum, day) => sum + (day.yhat || 0), 0)
                        : 0;
                    
                    // Calculate growth trends (comparing predicted to historical)
                    const customerGrowth = historicalCustomerAvg > 0 
                        ? ((avgCustomers - historicalCustomerAvg) / historicalCustomerAvg * 100)
                        : 0;
                    
                    const revenueGrowth = historicalRevenueAvg > 0
                        ? ((totalRevenue / filteredRevenueForecasts.length - historicalRevenueAvg) / historicalRevenueAvg * 100)
                        : 0;
                    
                    console.log('Calculated metrics:', { 
                        avgCustomers, 
                        totalRevenue, 
                        customerGrowth: customerGrowth.toFixed(2) + '%',
                        revenueGrowth: revenueGrowth.toFixed(2) + '%',
                        days: filteredCustomerForecasts.length 
                    });
                    
                    // Fetch RFM for segment proportions (but use predicted totals)
                    const rfmResponse = await dataAPI.getRFMSegments(fileId, user.company_id);
                    const segments = rfmResponse.segments || [];
                    const historicalTotal = segments.reduce((sum, seg) => sum + seg.customer_count, 0);
                    
                    // Avoid division by zero
                    if (historicalTotal === 0) {
                        console.error('No historical RFM data available');
                        setError('Unable to calculate projections. Please ensure RFM segmentation has been completed.');
                        setLoading(false);
                        return;
                    }
                    
                    // Project segments based on predicted customer count
                    // Use the proportion of each segment from historical data
                    const projectedSegments = segments.map(seg => {
                        const historicalProportion = seg.customer_count / historicalTotal;
                        const projectedCount = avgCustomers > 0 ? Math.round(historicalProportion * avgCustomers) : 0;
                        const projectedRevenue = totalRevenue > 0 ? Math.round(historicalProportion * totalRevenue) : 0;
                        
                        return {
                            ...seg,
                            customer_count: projectedCount,
                            total_revenue: projectedRevenue
                        };
                    });
                    
                    console.log('Projected segments:', projectedSegments);
                    
                    // Transform for pie chart
                    const pieChartData = transformers.rfmToPieChart(projectedSegments, avgCustomers);
                    
                    setRfmData({
                        segments: projectedSegments,
                        totalCustomers: avgCustomers,
                        totalRevenue: Math.round(totalRevenue),
                        summary: {},
                        isFiltered: selectedRegion !== 'all' || selectedCategory !== 'all',
                        isPredicted: true,
                        customerGrowth: customerGrowth,
                        revenueGrowth: revenueGrowth
                    });
                    
                    setForecastData(customerForecast);
                    setFilteredSegments(projectedSegments);
                    setChartData({ pie: pieChartData });
                    
                    // Update chatbot with current page data
                    updatePageData('Marketing Dashboard', {
                        segments: projectedSegments,
                        totalCustomers: Math.round(avgCustomers),
                        totalRevenue: Math.round(totalRevenue),
                        customerGrowth: customerGrowth.toFixed(2),
                        revenueGrowth: revenueGrowth.toFixed(2),
                        filters: {
                            region: selectedRegion,
                            category: selectedCategory,
                            dateRange: dateRange
                        },
                        champions: projectedSegments.find(s => s.segment === 'Champions') || {},
                        atRisk: projectedSegments.find(s => s.segment === 'At-Risk') || {},
                        topSegments: projectedSegments.slice(0, 3)
                    });
                    
                    // Generate AI insights after data is loaded
                    await generateAIInsights(
                        {
                            segments: projectedSegments,
                            totalCustomers: avgCustomers,
                            totalRevenue: Math.round(totalRevenue),
                            customerGrowth: customerGrowth,
                            revenueGrowth: revenueGrowth
                        },
                        {
                            customerGrowth: customerGrowth,
                            revenueGrowth: revenueGrowth
                        }
                    );
                    
        } catch (err) {
            console.error('Failed to fetch marketing data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isDataUploaded) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        Upload a CSV file to view marketing analytics
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
                    <p>Error loading marketing data: {error}</p>
                </div>
            </div>
        );
    }

    // Calculate KPIs from RFM data
    const champions = filteredSegments.find(s => s.segment_name === 'Champions');
    const atRisk = filteredSegments.find(s => s.segment_name === 'At-Risk');
    const loyal = filteredSegments.find(s => s.segment_name === 'Loyal');
    
    // Calculate growth trends (comparing with overall average)
    const championsTrend = champions && rfmData ? 
        parseFloat((((champions.customer_count / rfmData.totalCustomers) * 100 - 20)).toFixed(2)) : 5.50;
    const atRiskTrend = atRisk && rfmData ? 
        parseFloat((-((atRisk.customer_count / rfmData.totalCustomers) * 100)).toFixed(2)) : -2.10;
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Marketing Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Customer behavior, RFM segmentation, and retention insights
                        {dataMode === 'predicted' && (
                            <span className="ml-2 text-blue-400">• Showing Predictions</span>
                        )}
                    </p>
                </div>
                {rfmData?.isFiltered && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-900/30 border border-blue-700 rounded-lg">
                        <Filter className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-blue-300">
                            {selectedRegion !== 'all' ? `Filtered: ${selectedRegion}` : 
                             selectedCategory !== 'all' ? `Category Filter Active` : 'Filters Active'}
                        </span>
                    </div>
                )}
            </div>

            {/* Filter Notice for Historical Mode */}
            {dataMode === 'historical' && (selectedRegion !== 'all' || selectedCategory !== 'all') && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-medium text-amber-900 dark:text-amber-300">Historical Data Note</h4>
                            <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
                                RFM segmentation shows all company customers. Region/category filters only apply in <strong>Prediction mode</strong>. 
                                Switch to predictions to see filtered forecasts.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Customers"
                    value={rfmData?.totalCustomers?.toLocaleString() || '0'}
                    subtitle="Predicted unique active customers"
                    icon={Users}
                    trend={rfmData?.customerGrowth ? parseFloat(rfmData.customerGrowth.toFixed(2)) : null}
                    trendLabel="vs historical avg"
                    description="Forecasted number of unique active customers based on historical purchase patterns and trends."
                />
                <KPICard
                    title="Champions"
                    value={champions?.customer_count?.toLocaleString() || '0'}
                    subtitle="Your best VIP customers"
                    icon={Target}
                    trend={championsTrend}
                    trendLabel="segment proportion"
                    description="Champions are your best customers: they purchased recently, buy frequently, and spend the most. Retain them with VIP rewards and exclusive offers."
                />
                <KPICard
                    title="At-Risk"
                    value={atRisk?.customer_count?.toLocaleString() || '0'}
                    subtitle="Previously good customers who haven't purchased recently"
                    icon={TrendingUp}
                    trend={atRiskTrend}
                    trendLabel="requires attention"
                    description="At-Risk customers were previously good buyers but haven't purchased recently. Act now with re-engagement campaigns and win-back offers to prevent churn."
                />
                <KPICard
                    title="Total Revenue"
                    value={`$${((rfmData?.totalRevenue || 0) / 1000).toFixed(0)}K`}
                    subtitle="Predicted revenue from all customer segments"
                    icon={DollarSign}
                    trend={rfmData?.revenueGrowth ? parseFloat(rfmData.revenueGrowth.toFixed(2)) : null}
                    trendLabel="vs historical avg"
                    description="Forecasted total revenue across all customer segments based on historical trends and customer behavior patterns."
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard
                    title="Customer Segments Distribution (RFM)"
                    description={`Projected segments${selectedRegion !== 'all' ? ` - ${selectedRegion}` : ''}${dateRange !== 'all' ? ` (${dateRange.replace('week', 'Week ')})` : ''}`}
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={chartData?.pie || []}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {(chartData?.pie || []).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value, name) => [
                                    `${value}% (${Math.round((value / 100) * (rfmData?.totalCustomers || 0))} customers)`,
                                    name
                                ]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                    title="Revenue by Customer Segment"
                    description={`Projected revenue${selectedRegion !== 'all' ? ` - ${selectedRegion}` : ''}`}
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={filteredSegments || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="segment_name" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [`$${(value / 1000).toFixed(1)}K`, 'Revenue']}
                            />
                            <Bar dataKey="total_revenue" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                    title="Customer Count by Segment"
                    description={`Projected customer distribution${selectedRegion !== 'all' ? ` (${selectedRegion})` : ''}`}
                    className="lg:col-span-2"
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={filteredSegments || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="segment_name" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [value.toLocaleString(), 'Customers']}
                            />
                            <Bar dataKey="customer_count" fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* AI-Generated Marketing Action Suggestions */}
            <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Suggested Actions
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-300 rounded">
                                Based on Forecasts
                            </span>
                            {insightsLoading && (
                                <span className="text-xs px-2 py-1 bg-purple-900/30 text-purple-300 rounded flex items-center gap-1">
                                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    AI Generating...
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Marketing campaigns to convert all customers into high-value, high-frequency buyers
                    </p>
                </div>
                <div className="space-y-4">
                    {/* Champions Insight */}
                    {(aiInsights?.champions?.[0] || champions) && (
                        <div className="flex items-start p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <Target className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3" />
                            <div className="flex-1">
                                <h4 className="font-medium text-green-900 dark:text-green-300">
                                    {aiInsights?.champions?.[0]?.title || 'Champions Retention'}
                                </h4>
                                <p className="text-sm text-green-800 dark:text-green-400 mt-1 whitespace-pre-line">
                                    <FormattedText text={aiInsights?.champions?.[0]?.description || 
                                        `${champions?.customer_count?.toLocaleString() || 0} champion customers projected. ${champions ? `Contributing $${(champions.total_revenue / 1000).toFixed(0)}K in revenue.` : ''} Reward with exclusive offers and early access.`} />
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {/* At-Risk Insight */}
                    {(aiInsights?.at_risk?.[0] || atRisk) && (
                        <div className="flex items-start p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3" />
                            <div className="flex-1">
                                <h4 className="font-medium text-amber-900 dark:text-amber-300">
                                    {aiInsights?.at_risk?.[0]?.title || 'At-Risk Recovery'}
                                </h4>
                                <p className="text-sm text-amber-800 dark:text-amber-400 mt-1 whitespace-pre-line">
                                    <FormattedText text={aiInsights?.at_risk?.[0]?.description || 
                                        `${atRisk?.customer_count?.toLocaleString() || 0} at-risk customers need reactivation campaigns. ${atRisk ? `Potential revenue at stake: $${(atRisk.total_revenue / 1000).toFixed(0)}K.` : ''} Consider personalized win-back offers.`} />
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {/* Loyal Customers Insight */}
                    {(aiInsights?.loyal?.[0] || loyal) && (
                        <div className="flex items-start p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <Users className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 mr-3" />
                            <div className="flex-1">
                                <h4 className="font-medium text-purple-900 dark:text-purple-300">
                                    {aiInsights?.loyal?.[0]?.title || 'Loyal Customers'}
                                </h4>
                                <p className="text-sm text-purple-800 dark:text-purple-400 mt-1 whitespace-pre-line">
                                    <FormattedText text={aiInsights?.loyal?.[0]?.description || 
                                        `${loyal?.customer_count?.toLocaleString() || 0} loyal customers ${loyal ? `generating $${(loyal.total_revenue / 1000).toFixed(0)}K` : ''}. Upsell premium products and request reviews.`} />
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {/* Overview Insight */}
                    {(aiInsights?.overview?.[0] || filteredSegments?.length) && (
                        <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
                            <div className="flex-1">
                                <h4 className="font-medium text-blue-900 dark:text-blue-300">
                                    {aiInsights?.overview?.[0]?.title || 'Segment Overview'}
                                </h4>
                                <p className="text-sm text-blue-800 dark:text-blue-400 mt-1 whitespace-pre-line">
                                    <FormattedText text={aiInsights?.overview?.[0]?.description || 
                                        `${filteredSegments?.length || 0} distinct customer segments analyzed using RFM (Recency, Frequency, Monetary). ${selectedRegion !== 'all' ? `Filtered for ${selectedRegion}.` : ''} Check RFM dashboard for detailed segment analysis.`} />
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
