import React, { useState, useEffect, useMemo } from 'react';
import ChartCard from '../charts/ChartCard';
import KPICard from '../widgets/KPICard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart } from 'recharts';
import { DollarSign, TrendingUp, Users, ShoppingCart, Loader2, Target, Calendar, Percent } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useFilters } from '../../../contexts/FilterContext';
import { useChatbot } from '../../../contexts/ChatbotContext';
import { dataAPI } from '../../../services/api';

export default function FinanceDashboard() {
    const { fileId, isDataUploaded } = useData();
    const { user } = useAuth();
    const { dateRange, selectedRegion, selectedCategory } = useFilters();
    const { updatePageData } = useChatbot();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [financialData, setFinancialData] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [categoryBreakdown, setCategoryBreakdown] = useState([]);
    const [regionalBreakdown, setRegionalBreakdown] = useState([]);

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
                console.log('💰 Fetching Finance Dashboard data with filters:', {
                    dateRange,
                    selectedRegion,
                    selectedCategory
                });

                // Determine group type based on filters
                const groupType = selectedRegion !== 'all' ? 'country' : 
                                selectedCategory !== 'all' ? 'cluster' : 'overall';
                const groupKey = selectedRegion !== 'all' ? selectedRegion :
                               selectedCategory !== 'all' ? selectedCategory : null;

                // Fetch financial metrics in parallel
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

                console.log('Financial data:', { revenueData, orderData, customerData });

                // Get forecasts
                let revenueForecasts = revenueData.forecasts || [];
                let orderForecasts = orderData.forecasts || [];
                let customerForecasts = customerData.forecasts || [];

                // Historical baselines
                const historicalRevenue = revenueData.historical_avg || 0;
                const historicalOrders = orderData.historical_avg || 0;
                const historicalCustomers = customerData.historical_avg || 0;

                if (revenueForecasts.length === 0) {
                    setError('No financial forecast data available.');
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
                    }
                }

                // Calculate financial metrics
                const totalRevenue = filteredRevenue.reduce((sum, day) => sum + (day.yhat || 0), 0);
                const totalOrders = filteredOrders.reduce((sum, day) => sum + (day.yhat || 0), 0);
                const totalCustomers = filteredCustomers.reduce((sum, day) => sum + (day.yhat || 0), 0);
                
                const avgDailyRevenue = filteredRevenue.length > 0 ? totalRevenue / filteredRevenue.length : 0;
                const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
                const revenuePerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

                // Calculate growth trends
                const revenueGrowth = historicalRevenue > 0 
                    ? ((avgDailyRevenue - historicalRevenue) / historicalRevenue * 100)
                    : 0;

                const historicalAOV = historicalOrders > 0 ? historicalRevenue / historicalOrders : 0;
                const aovGrowth = historicalAOV > 0
                    ? ((avgOrderValue - historicalAOV) / historicalAOV * 100)
                    : 0;

                // Calculate cumulative revenue
                let cumulativeRevenue = 0;
                const cumulativeData = filteredRevenue.map((day, idx) => {
                    cumulativeRevenue += day.yhat || 0;
                    return {
                        day: `Day ${idx + 1}`,
                        cumulative: Math.round(cumulativeRevenue)
                    };
                });

                console.log('Calculated financial metrics:', {
                    totalRevenue: Math.round(totalRevenue),
                    avgDailyRevenue: Math.round(avgDailyRevenue),
                    avgOrderValue: Math.round(avgOrderValue),
                    revenuePerCustomer: Math.round(revenuePerCustomer),
                    revenueGrowth: revenueGrowth.toFixed(2) + '%'
                });

                setFinancialData({
                    totalRevenue: Math.round(totalRevenue),
                    avgDailyRevenue: Math.round(avgDailyRevenue),
                    avgOrderValue: Math.round(avgOrderValue),
                    revenuePerCustomer: Math.round(revenuePerCustomer),
                    totalOrders: Math.round(totalOrders),
                    totalCustomers: Math.round(totalCustomers),
                    revenueGrowth,
                    aovGrowth,
                    forecastDays: filteredRevenue.length
                });

                // Update chatbot with Finance Dashboard data
                updatePageData('Finance Dashboard', {
                    totalRevenue: Math.round(totalRevenue),
                    avgDailyRevenue: Math.round(avgDailyRevenue),
                    avgOrderValue: Math.round(avgOrderValue),
                    revenuePerCustomer: Math.round(revenuePerCustomer),
                    totalOrders: Math.round(totalOrders),
                    totalCustomers: Math.round(totalCustomers),
                    revenueGrowth: revenueGrowth.toFixed(2),
                    aovGrowth: aovGrowth.toFixed(2),
                    forecastDays: filteredRevenue.length,
                    filters: {
                        region: selectedRegion,
                        category: selectedCategory,
                        dateRange: dateRange
                    }
                });

                // Prepare chart data
                const dailyChart = filteredRevenue.map((day, idx) => ({
                    day: `Day ${idx + 1}`,
                    date: day.ds,
                    revenue: Math.round(day.yhat || 0),
                    lower: Math.round(day.yhat_lower || 0),
                    upper: Math.round(day.yhat_upper || 0),
                    historical: Math.round(historicalRevenue)
                }));

                // Weekly aggregation
                const weeklyChart = [];
                for (let i = 0; i < revenueForecasts.length; i += 7) {
                    const weekSlice = revenueForecasts.slice(i, i + 7);
                    const weekRevenue = weekSlice.reduce((sum, day) => sum + (day.yhat || 0), 0);
                    weeklyChart.push({
                        week: `Week ${Math.floor(i / 7) + 1}`,
                        revenue: Math.round(weekRevenue),
                        avgDaily: Math.round(weekRevenue / weekSlice.length)
                    });
                }

                setChartData({
                    daily: dailyChart,
                    weekly: weeklyChart,
                    cumulative: cumulativeData
                });

                // Fetch revenue breakdown if not filtered
                if (selectedRegion === 'all') {
                    await fetchCategoryBreakdown();
                    await fetchRegionalBreakdown();
                }
                
            } catch (err) {
                console.error('Failed to fetch financial data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        debouncedFetch(fetchData);
    }, [fileId, user, dateRange, selectedRegion, selectedCategory]);

    // Fetch revenue by category
    const fetchCategoryBreakdown = async () => {
        try {
            const filterOptions = await dataAPI.getFilterOptions(fileId, user.company_id);
            
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

            const categories = await Promise.all(categoryPromises);
            categories.sort((a, b) => b.revenue - a.revenue);
            
            setCategoryBreakdown(categories);
            console.log('Category breakdown:', categories);
        } catch (err) {
            console.error('Failed to fetch category breakdown:', err);
        }
    };

    // Fetch revenue by region
    const fetchRegionalBreakdown = async () => {
        try {
            const filterOptions = await dataAPI.getFilterOptions(fileId, user.company_id);
            
            const regionPromises = (filterOptions.regions || []).slice(0, 5).map(async (region) => {
                const data = await dataAPI.getForecastResults(
                    fileId,
                    user.company_id,
                    'total_revenue',
                    'country',
                    region
                );
                const total = (data.forecasts || []).reduce((sum, d) => sum + (d.yhat || 0), 0);
                return { region, revenue: Math.round(total) };
            });

            const regions = await Promise.all(regionPromises);
            regions.sort((a, b) => b.revenue - a.revenue);
            
            setRegionalBreakdown(regions);
            console.log('Regional breakdown:', regions);
        } catch (err) {
            console.error('Failed to fetch regional breakdown:', err);
        }
    };

    if (!isDataUploaded) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        Upload a CSV file to view financial analytics
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
                    <p>Error loading financial data: {error}</p>
                </div>
            </div>
        );
    }
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Finance Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Revenue forecasts, financial metrics, and performance analysis
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Forecasted Revenue"
                    value={financialData ? `$${(financialData.totalRevenue / 1000).toFixed(0)}K` : '-'}
                    subtitle={`Next ${financialData?.forecastDays || 0} days`}
                    icon={DollarSign}
                    trend={financialData?.revenueGrowth ? parseFloat(financialData.revenueGrowth.toFixed(2)) : null}
                    trendLabel="vs historical avg"
                    description="Total predicted revenue for the selected forecast period, based on Prophet ML time-series forecasting. Trend compares daily average vs historical baseline to assess business growth trajectory and financial health."
                />
                <KPICard
                    title="Avg Order Value"
                    value={financialData ? `$${financialData.avgOrderValue.toLocaleString()}` : '-'}
                    subtitle="Per transaction"
                    icon={ShoppingCart}
                    trend={financialData?.aovGrowth ? parseFloat(financialData.aovGrowth.toFixed(2)) : null}
                    trendLabel="vs historical avg"
                    description="Average revenue per transaction (Total Revenue ÷ Order Count). Key metric for pricing strategy effectiveness, upselling success, and product mix optimization. Growing AOV indicates successful value optimization."
                />
                <KPICard
                    title="Revenue per Customer"
                    value={financialData ? `$${financialData.revenuePerCustomer.toLocaleString()}` : '-'}
                    subtitle="Customer value indicator"
                    icon={Users}
                    description="Average revenue generated per unique customer (Total Revenue ÷ Unique Customers). Proxy for customer lifetime value (CLV)—higher values indicate strong customer retention, repeat purchases, and effective customer relationship management."
                />
                <KPICard
                    title="Daily Revenue"
                    value={financialData ? `$${(financialData.avgDailyRevenue / 1000).toFixed(1)}K` : '-'}
                    subtitle="Average per day"
                    icon={Calendar}
                    description="Average daily revenue for the forecast period. Critical for cash flow planning, working capital management, and expense budgeting. Use this to set daily sales targets and monitor burn rate vs income."
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Revenue Forecast */}
                <ChartCard
                    title="Daily Revenue Forecast"
                    description={`Revenue trend${dateRange !== 'all' ? ` (${dateRange.replace('week', 'Week ')})` : ''}`}
                >
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={chartData?.daily || []}>
                            <defs>
                                <linearGradient id="colorRevenueFin" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                            <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenueFin)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Weekly Revenue Forecast */}
                <ChartCard
                    title="Weekly Revenue Forecast"
                    description="4-week revenue projection"
                >
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={chartData?.weekly || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="week" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [`$${(value / 1000).toFixed(1)}K`, '']}
                            />
                            <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Revenue by Category */}
                {categoryBreakdown.length > 0 && (
                    <ChartCard
                        title="Revenue by Product Category"
                        description="Category contribution to total revenue"
                    >
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie
                                    data={categoryBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={120}
                                    dataKey="revenue"
                                >
                                    {categoryBreakdown.map((entry, index) => {
                                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                    })}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                    labelStyle={{ color: '#f3f4f6' }}
                                    formatter={(value) => [`$${(value / 1000).toFixed(1)}K`, 'Revenue']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                )}

                {/* Revenue by Region */}
                {regionalBreakdown.length > 0 && (
                    <ChartCard
                        title="Revenue by Region"
                        description="Top 5 regions by revenue"
                    >
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={regionalBreakdown} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis type="number" stroke="#9ca3af" />
                                <YAxis type="category" dataKey="region" stroke="#9ca3af" width={120} />
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

                {/* Cumulative Revenue */}
                <ChartCard
                    title="Cumulative Revenue Growth"
                    description="Running total over forecast period"
                    className="lg:col-span-2"
                >
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={chartData?.cumulative || []}>
                            <defs>
                                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
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
                                formatter={(value) => [`$${(value / 1000).toFixed(1)}K`, 'Cumulative Revenue']}
                            />
                            <Area type="monotone" dataKey="cumulative" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCumulative)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Revenue Forecast vs Historical */}
                <ChartCard
                    title="Revenue Forecast vs Historical Baseline"
                    description="Predicted revenue compared to historical average"
                    className="lg:col-span-2"
                >
                    <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart data={chartData?.daily || []}>
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
                                dataKey="revenue" 
                                fill="#10b981" 
                                stroke="#10b981" 
                                fillOpacity={0.3} 
                                name="Forecasted Revenue" 
                            />
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
            </div>

            {/* Financial Insights */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Financial Performance Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Revenue Growth Insight */}
                    <div className={`flex items-start p-4 rounded-lg ${
                        financialData?.revenueGrowth > 0 
                            ? 'bg-green-50 dark:bg-green-900/20' 
                            : 'bg-gray-50 dark:bg-gray-900/20'
                    }`}>
                        <TrendingUp className={`h-5 w-5 mt-0.5 mr-3 ${
                            financialData?.revenueGrowth > 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-gray-600 dark:text-gray-400'
                        }`} />
                        <div>
                            <h4 className={`font-medium ${
                                financialData?.revenueGrowth > 0 
                                    ? 'text-green-900 dark:text-green-300' 
                                    : 'text-gray-900 dark:text-gray-300'
                            }`}>
                                Revenue Growth {financialData?.revenueGrowth > 0 ? 'Trajectory' : 'Status'}
                            </h4>
                            <p className={`text-sm mt-1 ${
                                financialData?.revenueGrowth > 0 
                                    ? 'text-green-800 dark:text-green-400' 
                                    : 'text-gray-800 dark:text-gray-400'
                            }`}>
                                Forecasted revenue is <strong>${(financialData?.totalRevenue / 1000).toFixed(0)}K</strong> over {financialData?.forecastDays} days, 
                                {financialData?.revenueGrowth !== undefined && ` trending ${Math.abs(financialData.revenueGrowth).toFixed(1)}% ${financialData.revenueGrowth > 0 ? 'above' : 'at'} historical baseline.`}
                                {financialData?.revenueGrowth > 15 ? ' Exceptional growth momentum!' : financialData?.revenueGrowth > 0 ? ' Positive outlook maintained.' : ' Stable revenue performance.'}
                            </p>
                        </div>
                    </div>

                    {/* AOV Analysis */}
                    <div className={`flex items-start p-4 rounded-lg ${
                        financialData?.aovGrowth > 0 
                            ? 'bg-blue-50 dark:bg-blue-900/20' 
                            : 'bg-amber-50 dark:bg-amber-900/20'
                    }`}>
                        <ShoppingCart className={`h-5 w-5 mt-0.5 mr-3 ${
                            financialData?.aovGrowth > 0 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-amber-600 dark:text-amber-400'
                        }`} />
                        <div>
                            <h4 className={`font-medium ${
                                financialData?.aovGrowth > 0 
                                    ? 'text-blue-900 dark:text-blue-300' 
                                    : 'text-amber-900 dark:text-amber-300'
                            }`}>
                                Average Order Value
                            </h4>
                            <p className={`text-sm mt-1 ${
                                financialData?.aovGrowth > 0 
                                    ? 'text-blue-800 dark:text-blue-400' 
                                    : 'text-amber-800 dark:text-amber-400'
                            }`}>
                                AOV is <strong>${financialData?.avgOrderValue?.toLocaleString() || 0}</strong> per transaction, 
                                {financialData?.aovGrowth !== undefined && ` ${Math.abs(financialData.aovGrowth).toFixed(1)}% ${financialData.aovGrowth > 0 ? 'higher' : 'lower'} than historical average.`}
                                {financialData?.aovGrowth > 0 ? ' Upselling and bundling strategies are working!' : ' Consider product bundling to increase basket size.'}
                            </p>
                        </div>
                    </div>

                    {/* Top Revenue Category */}
                    {categoryBreakdown.length > 0 && categoryBreakdown[0] && (
                        <div className="flex items-start p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <Target className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 mr-3" />
                            <div>
                                <h4 className="font-medium text-purple-900 dark:text-purple-300">
                                    Top Revenue Category
                                </h4>
                                <p className="text-sm text-purple-800 dark:text-purple-400 mt-1">
                                    <strong>{categoryBreakdown[0].name}</strong> generates ${(categoryBreakdown[0].revenue / 1000).toFixed(0)}K 
                                    ({((categoryBreakdown[0].revenue / financialData?.totalRevenue) * 100).toFixed(1)}% of total revenue). 
                                    Focus inventory and marketing investment here for maximum ROI.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Top Revenue Region */}
                    {regionalBreakdown.length > 0 && regionalBreakdown[0] && (
                        <div className="flex items-start p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <DollarSign className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 mr-3" />
                            <div>
                                <h4 className="font-medium text-indigo-900 dark:text-indigo-300">
                                    Top Revenue Region
                                </h4>
                                <p className="text-sm text-indigo-800 dark:text-indigo-400 mt-1">
                                    <strong>{regionalBreakdown[0].region}</strong> leads with ${(regionalBreakdown[0].revenue / 1000).toFixed(0)}K forecasted revenue 
                                    ({((regionalBreakdown[0].revenue / financialData?.totalRevenue) * 100).toFixed(1)}% of total). 
                                    Ensure adequate supply chain and logistics support for this market.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Cash Flow Planning */}
                    <div className="flex items-start p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 mr-3" />
                        <div>
                            <h4 className="font-medium text-emerald-900 dark:text-emerald-300">
                                Cash Flow Planning
                            </h4>
                            <p className="text-sm text-emerald-800 dark:text-emerald-400 mt-1">
                                Average daily revenue of <strong>${(financialData?.avgDailyRevenue / 1000).toFixed(1)}K</strong> provides predictable cash flow. 
                                Total {financialData?.forecastDays}-day revenue forecast: ${(financialData?.totalRevenue / 1000).toFixed(0)}K. 
                                Use this for working capital planning and expense budgeting.
                            </p>
                        </div>
                    </div>

                    {/* Customer Value */}
                    <div className="flex items-start p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                        <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400 mt-0.5 mr-3" />
                        <div>
                            <h4 className="font-medium text-cyan-900 dark:text-cyan-300">
                                Customer Lifetime Value
                            </h4>
                            <p className="text-sm text-cyan-800 dark:text-cyan-400 mt-1">
                                Revenue per customer: <strong>${financialData?.revenuePerCustomer?.toLocaleString() || 0}</strong>. 
                                With {financialData?.totalCustomers?.toLocaleString() || 0} expected customers and {financialData?.totalOrders?.toLocaleString() || 0} orders, 
                                focus on retention and repeat purchases to maximize customer value.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
