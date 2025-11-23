import React, { useState, useEffect, useMemo } from 'react';
import ChartCard from '../charts/ChartCard';
import KPICard from '../widgets/KPICard';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, Package, Loader2, Award } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useFilters } from '../../../contexts/FilterContext';
import { useChatbot } from '../../../contexts/ChatbotContext';
import { dataAPI, transformers } from '../../../services/api';

export default function SalesDashboard() {
    const { fileId, isDataUploaded } = useData();
    const { user } = useAuth();
    const { dateRange, selectedRegion, selectedCategory, dataMode } = useFilters();
    const { updatePageData } = useChatbot();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [salesData, setSalesData] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [topPerformers, setTopPerformers] = useState(null);

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
                console.log('📊 Fetching Sales Dashboard data with filters:', {
                    dateRange,
                    selectedRegion,
                    selectedCategory
                });

                // Determine group type based on filters
                const groupType = selectedRegion !== 'all' ? 'country' : 
                                selectedCategory !== 'all' ? 'cluster' : 'overall';
                const groupKey = selectedRegion !== 'all' ? selectedRegion :
                               selectedCategory !== 'all' ? selectedCategory : null;

                // Fetch multiple metrics in parallel
                const [revenueData, orderData, customerData] = await Promise.all([
                    dataAPI.getForecastResults(
                        fileId,
                        user.company_id,
                        'total_revenue',
                        groupType,
                        groupKey
                    ),
                    dataAPI.getForecastResults(
                        fileId,
                        user.company_id,
                        'order_count',
                        groupType,
                        groupKey
                    ),
                    dataAPI.getForecastResults(
                        fileId,
                        user.company_id,
                        'unique_customers_per_day',
                        groupType,
                        groupKey
                    )
                ]);

                console.log('Revenue data:', revenueData);
                console.log('Order data:', orderData);
                console.log('Customer data:', customerData);

                // Get forecasts
                let revenueForecasts = revenueData.forecasts || [];
                let orderForecasts = orderData.forecasts || [];
                let customerForecasts = customerData.forecasts || [];

                // Historical baselines
                const historicalRevenue = revenueData.historical_avg || 0;
                const historicalOrders = orderData.historical_avg || 0;
                const historicalCustomers = customerData.historical_avg || 0;

                console.log('Historical baselines:', {
                    revenue: historicalRevenue,
                    orders: historicalOrders,
                    customers: historicalCustomers
                });

                if (revenueForecasts.length === 0) {
                    setError('No forecast data available. Please ensure forecasts have been generated.');
                    setLoading(false);
                    return;
                }

                // Filter by date range (week)
                let filteredRevenue = revenueForecasts;
                let filteredOrders = orderForecasts;
                let filteredCustomers = customerForecasts;

                if (dateRange !== 'all') {
                    const weekMap = { 
                        week1: [0, 7], 
                        week2: [7, 14], 
                        week3: [14, 21], 
                        week4: [21, 28] 
                    };
                    const [start, end] = weekMap[dateRange] || [0, revenueForecasts.length];
                    const actualEnd = Math.min(end, revenueForecasts.length);
                    
                    if (start < revenueForecasts.length) {
                        filteredRevenue = revenueForecasts.slice(start, actualEnd);
                        filteredOrders = orderForecasts.slice(start, actualEnd);
                        filteredCustomers = customerForecasts.slice(start, actualEnd);
                        console.log(`Filtered to ${dateRange}: ${filteredRevenue.length} days`);
                    }
                }

                // Calculate metrics
                const totalRevenue = filteredRevenue.reduce((sum, day) => sum + (day.yhat || 0), 0);
                const totalOrders = filteredOrders.reduce((sum, day) => sum + (day.yhat || 0), 0);
                const avgCustomers = filteredCustomers.length > 0 
                    ? Math.round(filteredCustomers.reduce((sum, day) => sum + (day.yhat || 0), 0) / filteredCustomers.length)
                    : 0;
                
                const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
                const salesVelocity = filteredOrders.length > 0 ? totalOrders / filteredOrders.length : 0;

                // Calculate growth trends
                const revenueGrowth = historicalRevenue > 0 
                    ? ((totalRevenue / filteredRevenue.length - historicalRevenue) / historicalRevenue * 100)
                    : 0;
                
                const orderGrowth = historicalOrders > 0
                    ? ((totalOrders / filteredOrders.length - historicalOrders) / historicalOrders * 100)
                    : 0;

                const customerGrowth = historicalCustomers > 0
                    ? ((avgCustomers - historicalCustomers) / historicalCustomers * 100)
                    : 0;

                const historicalAOV = historicalOrders > 0 ? historicalRevenue / historicalOrders : 0;
                const aovGrowth = historicalAOV > 0
                    ? ((avgOrderValue - historicalAOV) / historicalAOV * 100)
                    : 0;

                console.log('Calculated metrics:', {
                    totalRevenue,
                    totalOrders,
                    avgCustomers,
                    avgOrderValue,
                    salesVelocity,
                    revenueGrowth: revenueGrowth.toFixed(2) + '%',
                    orderGrowth: orderGrowth.toFixed(2) + '%'
                });

                setSalesData({
                    totalRevenue: Math.round(totalRevenue),
                    totalOrders: Math.round(totalOrders),
                    avgCustomers,
                    avgOrderValue: Math.round(avgOrderValue),
                    salesVelocity: Math.round(salesVelocity),
                    revenueGrowth,
                    orderGrowth,
                    customerGrowth,
                    aovGrowth,
                    forecastDays: filteredRevenue.length
                });

                // Prepare chart data
                const dailyChart = filteredRevenue.map((day, idx) => ({
                    day: `Day ${idx + 1}`,
                    date: day.ds,
                    revenue: Math.round(day.yhat || 0),
                    orders: Math.round(filteredOrders[idx]?.yhat || 0),
                    customers: Math.round(filteredCustomers[idx]?.yhat || 0),
                    lower: Math.round(day.yhat_lower || 0),
                    upper: Math.round(day.yhat_upper || 0)
                }));

                const weeklyChart = transformers.forecastToWeeklyChart(revenueForecasts);

                setChartData({
                    daily: dailyChart,
                    weekly: weeklyChart
                });

                // Update chatbot with Sales Dashboard data
                updatePageData('Sales Dashboard', {
                    totalRevenue: Math.round(totalRevenue),
                    totalOrders: Math.round(totalOrders),
                    avgCustomers,
                    avgOrderValue: Math.round(avgOrderValue),
                    salesVelocity: Math.round(salesVelocity),
                    revenueGrowth: revenueGrowth.toFixed(2),
                    orderGrowth: orderGrowth.toFixed(2),
                    customerGrowth: customerGrowth.toFixed(2),
                    aovGrowth: aovGrowth.toFixed(2),
                    forecastDays: filteredRevenue.length,
                    filters: {
                        region: selectedRegion,
                        category: selectedCategory,
                        dateRange: dateRange
                    },
                    dailyForecasts: dailyChart
                });

                // Fetch top performers if not filtered
                if (selectedRegion === 'all' && selectedCategory === 'all') {
                    await fetchTopPerformers();
                }
                
            } catch (err) {
                console.error('Failed to fetch sales data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        debouncedFetch(fetchData);
    }, [fileId, user, dateRange, selectedRegion, selectedCategory]);

    // Fetch top performing regions and categories
    const fetchTopPerformers = async () => {
        try {
            const filterOptions = await dataAPI.getFilterOptions(fileId, user.company_id);
            
            // Fetch revenue for each region (top 5)
            const regionPromises = (filterOptions.regions || []).slice(0, 5).map(async (region) => {
                const data = await dataAPI.getForecastResults(
                    fileId,
                    user.company_id,
                    'total_revenue',
                    'country',
                    region
                );
                const total = (data.forecasts || []).reduce((sum, d) => sum + (d.yhat || 0), 0);
                return { name: region, revenue: Math.round(total) };
            });

            // Fetch revenue for each category
            const categoryPromises = (filterOptions.categories || []).map(async (cat) => {
                const data = await dataAPI.getForecastResults(
                    fileId,
                    user.company_id,
                    'total_revenue',
                    'cluster',
                    cat.id.toString()
                );
                const total = (data.forecasts || []).reduce((sum, d) => sum + (d.yhat || 0), 0);
                return { name: cat.name, revenue: Math.round(total) };
            });

            const [regions, categories] = await Promise.all([
                Promise.all(regionPromises),
                Promise.all(categoryPromises)
            ]);

            // Sort by revenue descending
            regions.sort((a, b) => b.revenue - a.revenue);
            categories.sort((a, b) => b.revenue - a.revenue);

            setTopPerformers({
                regions: regions.slice(0, 5),
                categories: categories.slice(0, 4)
            });

            console.log('Top performers:', { regions, categories });
        } catch (err) {
            console.error('Failed to fetch top performers:', err);
        }
    };

    if (!isDataUploaded) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        Upload a CSV file to view sales analytics
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
                    <p>Error loading sales data: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Sales Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Revenue forecasts, order trends, and sales performance analytics
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Predicted Revenue"
                    value={salesData ? `$${(salesData.totalRevenue / 1000).toFixed(0)}K` : '-'}
                    subtitle={`Next ${salesData?.forecastDays || 0} days`}
                    icon={DollarSign}
                    trend={salesData?.revenueGrowth ? parseFloat(salesData.revenueGrowth.toFixed(2)) : null}
                    trendLabel="vs historical avg"
                    description="Forecasted total revenue based on historical sales patterns and trends."
                />
                <KPICard
                    title="Expected Orders"
                    value={salesData ? salesData.totalOrders.toLocaleString() : '-'}
                    subtitle={`${salesData?.salesVelocity.toFixed(0) || 0} orders/day`}
                    icon={ShoppingBag}
                    trend={salesData?.orderGrowth ? parseFloat(salesData.orderGrowth.toFixed(2)) : null}
                    trendLabel="vs historical avg"
                    description="Predicted number of orders and daily sales velocity."
                />
                <KPICard
                    title="Avg Order Value"
                    value={salesData ? `$${salesData.avgOrderValue.toLocaleString()}` : '-'}
                    subtitle="Per transaction"
                    icon={TrendingUp}
                    trend={salesData?.aovGrowth ? parseFloat(salesData.aovGrowth.toFixed(2)) : null}
                    trendLabel="vs historical avg"
                    description="Average revenue per order, calculated from total revenue divided by order count."
                />
                <KPICard
                    title="Active Customers"
                    value={salesData ? salesData.avgCustomers.toLocaleString() : '-'}
                    subtitle="Daily average"
                    icon={Package}
                    trend={salesData?.customerGrowth ? parseFloat(salesData.customerGrowth.toFixed(2)) : null}
                    trendLabel="vs historical avg"
                    description="Average number of unique customers making purchases per day."
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Revenue Trend */}
                <ChartCard
                    title="Daily Revenue Forecast"
                    description={`Predicted daily revenue${dateRange !== 'all' ? ` (${dateRange.replace('week', 'Week ')})` : ''}`}
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData?.daily || []}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="day" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [`$${(value / 1000).toFixed(1)}K`, 'Revenue']}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Weekly Revenue Bars */}
                <ChartCard
                    title="Weekly Revenue Forecast"
                    description="4-week revenue projection"
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData?.weekly || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="week" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [`$${(value / 1000).toFixed(1)}K`, 'Predicted']}
                            />
                            <Bar dataKey="predicted" fill="#f59e0b" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Revenue & Orders Combined */}
                <ChartCard
                    title="Revenue & Order Volume"
                    description="Dual-axis comparison of revenue and order trends"
                    className="lg:col-span-2"
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={chartData?.daily || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="day" stroke="#9ca3af" />
                            <YAxis yAxisId="left" stroke="#9ca3af" />
                            <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                            />
                            <Legend />
                            <Area 
                                yAxisId="left" 
                                type="monotone" 
                                dataKey="revenue" 
                                fill="#3b82f6" 
                                stroke="#3b82f6" 
                                fillOpacity={0.3} 
                                name="Revenue ($)" 
                            />
                            <Line 
                                yAxisId="right" 
                                type="monotone" 
                                dataKey="orders" 
                                stroke="#10b981" 
                                strokeWidth={2} 
                                name="Orders" 
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Top Performing Regions */}
                {topPerformers && (
                    <ChartCard
                        title="Top Performing Regions"
                        description="Highest revenue by country (28-day forecast)"
                    >
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topPerformers?.regions || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis type="number" stroke="#9ca3af" />
                                <YAxis type="category" dataKey="name" stroke="#9ca3af" width={100} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                    labelStyle={{ color: '#f3f4f6' }}
                                    formatter={(value) => [`$${(value / 1000).toFixed(1)}K`, 'Revenue']}
                                />
                                <Bar dataKey="revenue" fill="#8b5cf6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                )}

                {/* Top Performing Categories */}
                {topPerformers && (
                    <ChartCard
                        title="Top Performing Categories"
                        description="Highest revenue by product cluster"
                    >
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topPerformers?.categories || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9ca3af" angle={-20} textAnchor="end" height={80} />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                    labelStyle={{ color: '#f3f4f6' }}
                                    formatter={(value) => [`$${(value / 1000).toFixed(1)}K`, 'Revenue']}
                                />
                                <Bar dataKey="revenue" fill="#ec4899" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                )}

                {/* Forecast Confidence Interval */}
                <ChartCard
                    title="Forecast Confidence Interval"
                    description="95% confidence bounds for revenue predictions"
                    className="lg:col-span-2"
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData?.daily || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="day" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [`$${(value / 1000).toFixed(1)}K`, '']}
                            />
                            <Legend />
                            <Area 
                                type="monotone" 
                                dataKey="upper" 
                                stroke="#10b981" 
                                fill="#10b981" 
                                fillOpacity={0.1} 
                                name="Upper Bound (97.5%)" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="revenue" 
                                stroke="#3b82f6" 
                                fill="#3b82f6" 
                                fillOpacity={0.3} 
                                name="Forecast" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="lower" 
                                stroke="#ef4444" 
                                fill="#ef4444" 
                                fillOpacity={0.1} 
                                name="Lower Bound (2.5%)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Sales Insights */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Sales Performance Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Revenue Trend */}
                    <div className={`flex items-start p-4 rounded-lg ${
                        salesData?.revenueGrowth && salesData.revenueGrowth > 0 
                            ? 'bg-green-50 dark:bg-green-900/20' 
                            : 'bg-amber-50 dark:bg-amber-900/20'
                    }`}>
                        <TrendingUp className={`h-5 w-5 mt-0.5 mr-3 ${
                            salesData?.revenueGrowth && salesData.revenueGrowth > 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-amber-600 dark:text-amber-400'
                        }`} />
                        <div>
                            <h4 className={`font-medium ${
                                salesData?.revenueGrowth && salesData.revenueGrowth > 0 
                                    ? 'text-green-900 dark:text-green-300' 
                                    : 'text-amber-900 dark:text-amber-300'
                            }`}>
                                Revenue {salesData?.revenueGrowth && salesData.revenueGrowth > 0 ? 'Growth' : 'Trend'}
                            </h4>
                            <p className={`text-sm mt-1 ${
                                salesData?.revenueGrowth && salesData.revenueGrowth > 0 
                                    ? 'text-green-800 dark:text-green-400' 
                                    : 'text-amber-800 dark:text-amber-400'
                            }`}>
                                {salesData?.revenueGrowth !== undefined 
                                    ? `Predicted revenue is ${Math.abs(salesData.revenueGrowth).toFixed(1)}% ${salesData.revenueGrowth > 0 ? 'higher' : 'lower'} than historical average. ${
                                        salesData.revenueGrowth > 0 
                                            ? 'Strong sales momentum expected!' 
                                            : 'Consider promotional campaigns to boost sales.'
                                    }` 
                                    : 'Analyzing revenue trends...'}
                            </p>
                        </div>
                    </div>

                    {/* Order Volume */}
                    <div className={`flex items-start p-4 rounded-lg ${
                        salesData?.orderGrowth && salesData.orderGrowth > 0 
                            ? 'bg-blue-50 dark:bg-blue-900/20' 
                            : 'bg-purple-50 dark:bg-purple-900/20'
                    }`}>
                        <ShoppingBag className={`h-5 w-5 mt-0.5 mr-3 ${
                            salesData?.orderGrowth && salesData.orderGrowth > 0 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-purple-600 dark:text-purple-400'
                        }`} />
                        <div>
                            <h4 className={`font-medium ${
                                salesData?.orderGrowth && salesData.orderGrowth > 0 
                                    ? 'text-blue-900 dark:text-blue-300' 
                                    : 'text-purple-900 dark:text-purple-300'
                            }`}>
                                Order Volume
                            </h4>
                            <p className={`text-sm mt-1 ${
                                salesData?.orderGrowth && salesData.orderGrowth > 0 
                                    ? 'text-blue-800 dark:text-blue-400' 
                                    : 'text-purple-800 dark:text-purple-400'
                            }`}>
                                Expecting {salesData?.totalOrders?.toLocaleString() || 0} orders at {salesData?.salesVelocity?.toFixed(1) || 0} orders/day. 
                                {salesData?.orderGrowth !== undefined && ` That's ${Math.abs(salesData.orderGrowth).toFixed(1)}% ${salesData.orderGrowth > 0 ? 'more' : 'less'} than usual.`}
                            </p>
                        </div>
                    </div>

                    {/* Top Region */}
                    {topPerformers?.regions?.[0] && (
                        <div className="flex items-start p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 mr-3" />
                            <div>
                                <h4 className="font-medium text-indigo-900 dark:text-indigo-300">
                                    Top Performing Region
                                </h4>
                                <p className="text-sm text-indigo-800 dark:text-indigo-400 mt-1">
                                    <strong>{topPerformers.regions[0].name}</strong> leads with ${(topPerformers.regions[0].revenue / 1000).toFixed(0)}K projected revenue. Focus marketing efforts here for maximum ROI.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Model Status */}
                    <div className="flex items-start p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                        <Package className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 mr-3" />
                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-300">
                                Prophet ML Model
                            </h4>
                            <p className="text-sm text-gray-800 dark:text-gray-400 mt-1">
                                {chartData?.weekly?.length || 0} weeks of sales forecasts generated with 95% confidence intervals. Predictions updated based on recent trends.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
