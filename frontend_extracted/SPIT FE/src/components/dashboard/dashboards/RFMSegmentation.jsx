import React, { useState, useEffect, useMemo } from 'react';
import ChartCard from '../charts/ChartCard';
import KPICard from '../widgets/KPICard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { Users, Target, Activity, Award, Loader2, TrendingUp, DollarSign, Percent } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useFilters } from '../../../contexts/FilterContext';
import { useChatbot } from '../../../contexts/ChatbotContext';
import { dataAPI } from '../../../services/api';

const SEGMENT_COLORS = {
    'Champions': '#10b981',
    'Loyal': '#3b82f6',
    'Potential': '#8b5cf6',
    'At-Risk': '#f59e0b',
    'Hibernating': '#ef4444',
    'Big Spenders': '#ec4899',
    'Price Sensitive': '#6366f1'
};

const SEGMENT_ACTIONS = {
    'Champions': "Reward them. They can be early adopters for new products. Will promote your brand.",
    'Loyal': "Upsell higher value products. Ask for reviews. Engage them.",
    'Potential': "Offer membership / loyalty program. Recommend other products.",
    'At-Risk': "Send personalized emails to reconnect, offer renewals, provide helpful resources.",
    'Hibernating': "Recreate brand value. Offer relevant products and good deals.",
    'Big Spenders': "Market your most expensive products. Premium support.",
    'Price Sensitive': "Only buy when there is a discount. Send them promo codes."
};

export default function RFMSegmentation() {
    const { fileId, isDataUploaded } = useData();
    const { user } = useAuth();
    const { dateRange, selectedRegion, selectedCategory } = useFilters();
    const { updatePageData } = useChatbot();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rfmData, setRfmData] = useState(null);
    const [forecastData, setForecastData] = useState(null);

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
                console.log('📊 Fetching RFM Dashboard data with filters:', {
                    dateRange,
                    selectedRegion,
                    selectedCategory
                });

                // Determine group type based on filters
                const groupType = selectedRegion !== 'all' ? 'country' : 
                                selectedCategory !== 'all' ? 'cluster' : 'overall';
                const groupKey = selectedRegion !== 'all' ? selectedRegion :
                               selectedCategory !== 'all' ? selectedCategory : null;

                console.log('🔍 RFM Filter Config:', { groupType, groupKey, dateRange });

                // Fetch RFM segments (no filters - RFM is customer-level analysis)
                const rfmResponse = await dataAPI.getRFMSegments(
                    fileId, 
                    user.company_id
                );
                console.log('RFM segments:', rfmResponse);
                
                // Calculate total customers
                const totalCustomers = rfmResponse.segments.reduce((sum, seg) => sum + seg.customer_count, 0);
                const totalRevenue = rfmResponse.segments.reduce((sum, seg) => sum + seg.total_revenue, 0);
                
                // Calculate percentages
                const segmentsWithPercent = rfmResponse.segments.map(seg => ({
                    ...seg,
                    percentage: totalCustomers > 0 ? ((seg.customer_count / totalCustomers) * 100).toFixed(1) : 0,
                    revenue_percentage: totalRevenue > 0 ? ((seg.total_revenue / totalRevenue) * 100).toFixed(1) : 0
                }));

                // Sort by customer count for better visualization
                segmentsWithPercent.sort((a, b) => b.customer_count - a.customer_count);

                // Fetch forecast data for revenue by segment
                const [revenueData, customerData] = await Promise.all([
                    dataAPI.getForecastResults(fileId, user.company_id, 'total_revenue', groupType, groupKey),
                    dataAPI.getForecastResults(fileId, user.company_id, 'unique_customers_per_day', groupType, groupKey)
                ]);

                console.log('📊 Forecast data fetched:', {
                    revenueForecasts: revenueData.forecasts?.length,
                    customerForecasts: customerData.forecasts?.length,
                    historicalRevenue: revenueData.historical_avg,
                    historicalCustomers: customerData.historical_avg
                });

                // Calculate growth trends
                const historicalRevenue = revenueData.historical_avg || 0;
                const historicalCustomers = customerData.historical_avg || 0;

                let revenueForecasts = revenueData.forecasts || [];
                let customerForecasts = customerData.forecasts || [];

                // Filter by date range
                if (dateRange !== 'all' && revenueForecasts.length > 0) {
                    const weekMap = { 
                        week1: [0, 7], 
                        week2: [7, 14], 
                        week3: [14, 21], 
                        week4: [21, 28] 
                    };
                    const [start, end] = weekMap[dateRange] || [0, revenueForecasts.length];
                    const actualEnd = Math.min(end, revenueForecasts.length);
                    
                    if (start < revenueForecasts.length) {
                        revenueForecasts = revenueForecasts.slice(start, actualEnd);
                        customerForecasts = customerForecasts.slice(start, actualEnd);
                    }
                }

                const predictedRevenue = revenueForecasts.reduce((sum, d) => sum + (d.yhat || 0), 0);
                const predictedCustomers = customerForecasts.reduce((sum, d) => sum + (d.yhat || 0), 0);

                const revenueGrowth = historicalRevenue > 0 
                    ? ((predictedRevenue / revenueForecasts.length - historicalRevenue) / historicalRevenue * 100)
                    : 0;

                const customerGrowth = historicalCustomers > 0
                    ? ((predictedCustomers / customerForecasts.length - historicalCustomers) / historicalCustomers * 100)
                    : 0;

                console.log('💰 Calculated predictions:', {
                    predictedRevenue: Math.round(predictedRevenue),
                    predictedCustomers: Math.round(predictedCustomers),
                    revenueGrowth: revenueGrowth.toFixed(2) + '%',
                    customerGrowth: customerGrowth.toFixed(2) + '%',
                    forecastDays: revenueForecasts.length
                });
                
                setRfmData({
                    segments: segmentsWithPercent,
                    totalCustomers,
                    totalRevenue,
                    summary: rfmResponse.summary || {}
                });

                const newForecastData = {
                    predictedRevenue: Math.round(predictedRevenue),
                    predictedCustomers: Math.round(predictedCustomers),
                    revenueGrowth,
                    customerGrowth,
                    forecastDays: revenueForecasts.length
                };
                
                console.log('✅ Setting forecastData state to:', newForecastData);
                setForecastData(newForecastData);

                // Update chatbot with RFM Dashboard data
                updatePageData('RFM Segmentation', {
                    segments: segmentsWithPercent.map(s => ({
                        name: s.segment,
                        customers: s.customer_count,
                        revenue: Math.round(s.total_revenue || 0),
                        percentage: s.percentage // Already formatted as string
                    })),
                    totalCustomers,
                    totalRevenue: Math.round(totalRevenue),
                    predictedRevenue: Math.round(predictedRevenue),
                    predictedCustomers: Math.round(predictedCustomers),
                    revenueGrowth: revenueGrowth.toFixed(2),
                    customerGrowth: customerGrowth.toFixed(2),
                    filters: {
                        dateRange: dateRange
                    }
                });
                
            } catch (err) {
                console.error('Failed to fetch RFM data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        debouncedFetch(fetchData);
    }, [fileId, user, dateRange, selectedRegion, selectedCategory]);

    if (!isDataUploaded) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        Upload a CSV file to view RFM segmentation
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
                    <p>Error loading RFM data: {error}</p>
                </div>
            </div>
        );
    }

    // Find key segments
    const champions = rfmData.segments.find(s => s.segment_name === 'Champions') || { customer_count: 0, total_revenue: 0, percentage: 0 };
    const loyal = rfmData.segments.find(s => s.segment_name === 'Loyal') || { customer_count: 0, total_revenue: 0, percentage: 0 };
    const atRisk = rfmData.segments.find(s => s.segment_name === 'At-Risk') || { customer_count: 0, total_revenue: 0, percentage: 0 };
    const hibernating = rfmData.segments.find(s => s.segment_name === 'Hibernating') || { customer_count: 0, total_revenue: 0, percentage: 0 };

    // Calculate engagement metrics
    const highValueSegments = rfmData.segments.filter(s => 
        ['Champions', 'Loyal', 'Big Spenders'].includes(s.segment_name)
    );
    const highValueCount = highValueSegments.reduce((sum, s) => sum + s.customer_count, 0);
    const highValueRevenue = highValueSegments.reduce((sum, s) => sum + s.total_revenue, 0);
    const highValuePercentage = rfmData.totalCustomers > 0 ? ((highValueCount / rfmData.totalCustomers) * 100).toFixed(1) : 0;

    // Debug: Log what UI is rendering with
    console.log('🎨 UI Rendering with forecastData:', forecastData);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    RFM Segmentation Analysis
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Customer segmentation based on Recency, Frequency, and Monetary value with predictive insights
                </p>
            </div>

            {/* Info Banner - Explain Filter Behavior */}
            {(selectedRegion !== 'all' || selectedCategory !== 'all') && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                                About RFM Filters
                            </h3>
                            <p className="text-sm text-blue-800 dark:text-blue-400">
                                <strong>RFM Segments</strong> (Champions, Loyal, etc.) are calculated based on <strong>all customers</strong> and don't change with region/category filters. 
                                However, the <strong>predicted revenue/customers</strong> cards reflect your selected filters: 
                                {selectedRegion !== 'all' && <span className="font-semibold"> Region: {selectedRegion}</span>}
                                {selectedCategory !== 'all' && <span className="font-semibold"> Category: {selectedCategory}</span>}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Segment Summary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Champions"
                    value={champions.customer_count.toLocaleString()}
                    subtitle={`${champions.percentage}% of customers`}
                    icon={Award}
                    trend={champions.total_revenue > 0 ? parseFloat(((champions.total_revenue / rfmData.totalRevenue) * 100).toFixed(1)) : null}
                    trendLabel="of total revenue"
                    className="border-l-4 border-l-emerald-500"
                    description="Your best customers—bought recently, buy frequently, and spend the most. These are your brand advocates. Reward them with VIP programs, early access to new products, and exclusive offers to maintain loyalty."
                />
                <KPICard
                    title="At-Risk Customers"
                    value={atRisk.customer_count.toLocaleString()}
                    subtitle={`${atRisk.percentage}% of customers`}
                    icon={Activity}
                    trend={atRisk.total_revenue > 0 ? parseFloat(((atRisk.total_revenue / rfmData.totalRevenue) * 100).toFixed(1)) : null}
                    trendLabel="revenue contribution"
                    className="border-l-4 border-l-amber-500"
                    description="Previously high-value customers who haven't purchased recently. Risk of churn is high. Launch win-back campaigns with personalized offers, send re-engagement emails, and provide incentives to return before they become inactive."
                />
                <KPICard
                    title="High-Value Segments"
                    value={highValueCount.toLocaleString()}
                    subtitle={`${highValuePercentage}% (Champions + Loyal + Big Spenders)`}
                    icon={Users}
                    trend={forecastData?.revenueGrowth ? parseFloat(forecastData.revenueGrowth.toFixed(2)) : null}
                    trendLabel="predicted revenue growth"
                    description="Combined count of your most valuable customer segments (Champions, Loyal, Big Spenders). These customers generate the majority of revenue. Focus retention and upselling efforts here for maximum ROI."
                />
                <KPICard
                    title="Segment Revenue"
                    value={`$${(rfmData.totalRevenue / 1000).toFixed(0)}K`}
                    subtitle={`From ${rfmData.totalCustomers.toLocaleString()} customers`}
                    icon={DollarSign}
                    trend={forecastData?.customerGrowth ? parseFloat(forecastData.customerGrowth.toFixed(2)) : null}
                    trendLabel="predicted customer growth"
                    description="Total revenue across all RFM segments. Trend shows predicted customer base growth. Use segment-specific strategies to maximize revenue—Champions for upsells, At-Risk for retention, Hibernating for reactivation."
                />
            </div>

            {/* Segment Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Distribution */}
                <ChartCard
                    title="Customer Distribution by Segment"
                    description={`Distribution of ${rfmData.totalCustomers.toLocaleString()} customers across RFM segments`}
                >
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={rfmData.segments}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="segment_name" 
                                stroke="#9ca3af"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                            />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value, name) => [value.toLocaleString(), 'Customers']}
                            />
                            <Bar dataKey="customer_count" fill="#3b82f6" name="Customers">
                                {rfmData.segments.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[entry.segment_name] || '#8884d8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Segment Revenue Pie Chart */}
                <ChartCard
                    title="Revenue Distribution by Segment"
                    description="Percentage contribution of each segment to total revenue"
                >
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={rfmData.segments}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ segment_name, revenue_percentage }) => `${segment_name}: ${revenue_percentage}%`}
                                outerRadius={130}
                                dataKey="total_revenue"
                            >
                                {rfmData.segments.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[entry.segment_name] || '#8884d8'} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [`$${(value / 1000).toFixed(1)}K`, 'Revenue']}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Revenue Bar Chart */}
                <ChartCard
                    title="Total Revenue by Segment"
                    description="Revenue contribution from each customer segment"
                >
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={rfmData.segments}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="segment_name" 
                                stroke="#9ca3af"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                            />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [`$${(value / 1000).toFixed(1)}K`, 'Revenue']}
                            />
                            <Bar dataKey="total_revenue" fill="#10b981" name="Revenue">
                                {rfmData.segments.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[entry.segment_name] || '#8884d8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Average Monetary Value */}
                <ChartCard
                    title="Average Customer Value by Segment"
                    description="Average monetary value (spending) per customer in each segment"
                >
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={rfmData.segments}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="segment_name" 
                                stroke="#9ca3af"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                            />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [`$${value.toFixed(0)}`, 'Avg Monetary']}
                            />
                            <Bar dataKey="avg_monetary" fill="#8b5cf6" name="Avg Monetary Value" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Detailed Segment Analysis */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Segment Action Plan
                    </h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {rfmData.segments.map((segment) => (
                        <div key={segment.segment_name} className="p-6 flex items-start justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: SEGMENT_COLORS[segment.segment_name] || '#8884d8' }} 
                                    />
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                        {segment.segment_name}
                                    </h4>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        ({segment.customer_count} customers, {segment.percentage}%)
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                    {SEGMENT_ACTIONS[segment.segment_name] || "Engage with targeted campaigns."}
                                </p>
                                <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                                    <span>Revenue: ${segment.total_revenue.toLocaleString()}</span>
                                    <span>Avg R: {segment.avg_recency?.toFixed(0) || 'N/A'}</span>
                                    <span>Avg F: {segment.avg_frequency?.toFixed(1) || 'N/A'}</span>
                                    <span>Avg M: ${segment.avg_monetary?.toFixed(0) || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RFM Insights */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    RFM Performance Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Champions Insight */}
                    {champions.customer_count > 0 && (
                        <div className="flex items-start p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <Award className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3" />
                            <div>
                                <h4 className="font-medium text-green-900 dark:text-green-300">Champions Performance</h4>
                                <p className="text-sm text-green-800 dark:text-green-400 mt-1">
                                    <strong>{champions.customer_count.toLocaleString()} Champions</strong> ({champions.percentage}% of customers) contribute <strong>${(champions.total_revenue / 1000).toFixed(0)}K</strong> ({champions.revenue_percentage}% of revenue). 
                                    These are your VIP customers—reward with exclusive perks, early product access, and premium support.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* At-Risk Alert */}
                    {atRisk.customer_count > 0 && (
                        <div className="flex items-start p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <Activity className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3" />
                            <div>
                                <h4 className="font-medium text-amber-900 dark:text-amber-300">At-Risk Alert</h4>
                                <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
                                    <strong>{atRisk.customer_count.toLocaleString()} At-Risk customers</strong> ({atRisk.percentage}%) with <strong>${(atRisk.total_revenue / 1000).toFixed(0)}K revenue</strong>. 
                                    High churn risk! Launch win-back campaigns immediately—personalized emails, special discounts, and "we miss you" offers.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* High Value Concentration */}
                    <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
                        <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-300">High-Value Concentration</h4>
                            <p className="text-sm text-blue-800 dark:text-blue-400 mt-1">
                                Top 3 segments (Champions, Loyal, Big Spenders) represent <strong>{highValuePercentage}%</strong> of customers but generate <strong>${(highValueRevenue / 1000).toFixed(0)}K</strong> ({((highValueRevenue / rfmData.totalRevenue) * 100).toFixed(0)}%) of revenue. 
                                Focus retention efforts on this critical segment.
                            </p>
                        </div>
                    </div>

                    {/* Revenue Forecast */}
                    {forecastData && (
                        <div className="flex items-start p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 mr-3" />
                            <div>
                                <h4 className="font-medium text-purple-900 dark:text-purple-300">
                                    Forecast Outlook
                                    {(selectedRegion !== 'all' || selectedCategory !== 'all') && (
                                        <span className="ml-2 text-xs font-normal">
                                            ({selectedRegion !== 'all' ? selectedRegion : selectedCategory})
                                        </span>
                                    )}
                                </h4>
                                <p className="text-sm text-purple-800 dark:text-purple-400 mt-1">
                                    Next {forecastData.forecastDays} days: Predicted revenue <strong>${(forecastData.predictedRevenue / 1000).toFixed(0)}K</strong> ({forecastData.revenueGrowth > 0 ? '+' : ''}{forecastData.revenueGrowth.toFixed(1)}%), 
                                    active customers {forecastData.predictedCustomers.toLocaleString()} ({forecastData.customerGrowth > 0 ? '+' : ''}{forecastData.customerGrowth.toFixed(1)}%). 
                                    {forecastData.revenueGrowth > 0 ? 'Positive momentum!' : 'Consider activation campaigns.'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    RFM Analysis Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Total Customers</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {rfmData.totalCustomers.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Analyzed by RFM methodology
                        </p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            ${(rfmData.totalRevenue / 1000).toFixed(0)}K
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Across all segments
                        </p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Active Segments</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {rfmData.segments.length}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Customer classifications
                        </p>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Avg Customer Value</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            ${(rfmData.totalRevenue / rfmData.totalCustomers).toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Revenue per customer (CLV proxy)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
