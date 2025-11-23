import React, { useState, useEffect, useMemo } from 'react';
import ChartCard from '../charts/ChartCard';
import KPICard from '../widgets/KPICard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart } from 'recharts';
import { TrendingUp, Package, Clock, AlertCircle, Loader2, Activity, MapPin, Calendar } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useFilters } from '../../../contexts/FilterContext';
import { useChatbot } from '../../../contexts/ChatbotContext';
import { dataAPI } from '../../../services/api';

export default function OperationsDashboard() {
    const { fileId, isDataUploaded } = useData();
    const { user } = useAuth();
    const { dateRange, selectedRegion, selectedCategory } = useFilters();
    const { updatePageData } = useChatbot();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [operationsData, setOperationsData] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [regionalData, setRegionalData] = useState([]);
    const [demandAnalysis, setDemandAnalysis] = useState(null);

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
                console.log('🚚 Fetching Operations Dashboard data with filters:', {
                    dateRange,
                    selectedRegion,
                    selectedCategory
                });

                // Determine group type based on filters
                const groupType = selectedRegion !== 'all' ? 'country' : 
                                selectedCategory !== 'all' ? 'cluster' : 'overall';
                const groupKey = selectedRegion !== 'all' ? selectedRegion :
                               selectedCategory !== 'all' ? selectedCategory : null;

                // Fetch operational metrics in parallel
                const [orderData, customerData, revenueData] = await Promise.all([
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
                    ),
                    dataAPI.getForecastResults(
                        fileId,
                        user.company_id,
                        'total_revenue',
                        groupType,
                        groupKey
                    )
                ]);

                console.log('Operations data:', { orderData, customerData, revenueData });

                // Get forecasts
                let orderForecasts = orderData.forecasts || [];
                let customerForecasts = customerData.forecasts || [];
                let revenueForecasts = revenueData.forecasts || [];

                // Historical baselines
                const historicalOrders = orderData.historical_avg || 0;
                const historicalCustomers = customerData.historical_avg || 0;

                if (orderForecasts.length === 0) {
                    setError('No operational forecast data available.');
                    setLoading(false);
                    return;
                }

                // Filter by date range (week)
                let filteredOrders = orderForecasts;
                let filteredCustomers = customerForecasts;
                let filteredRevenue = revenueForecasts;

                if (dateRange !== 'all') {
                    const weekMap = { 
                        week1: [0, 7], 
                        week2: [7, 14], 
                        week3: [14, 21], 
                        week4: [21, 28] 
                    };
                    const [start, end] = weekMap[dateRange] || [0, orderForecasts.length];
                    const actualEnd = Math.min(end, orderForecasts.length);
                    
                    if (start < orderForecasts.length) {
                        filteredOrders = orderForecasts.slice(start, actualEnd);
                        filteredCustomers = customerForecasts.slice(start, actualEnd);
                        filteredRevenue = revenueForecasts.slice(start, actualEnd);
                    }
                }

                // Calculate operational metrics
                const totalOrders = filteredOrders.reduce((sum, day) => sum + (day.yhat || 0), 0);
                const avgDailyOrders = filteredOrders.length > 0 ? totalOrders / filteredOrders.length : 0;
                const peakDailyOrders = Math.max(...filteredOrders.map(d => d.yhat || 0));
                const avgCustomersPerDay = filteredCustomers.length > 0 
                    ? Math.round(filteredCustomers.reduce((sum, day) => sum + (day.yhat || 0), 0) / filteredCustomers.length)
                    : 0;

                // Calculate growth trends
                const orderGrowth = historicalOrders > 0 
                    ? ((avgDailyOrders - historicalOrders) / historicalOrders * 100)
                    : 0;

                const customerGrowth = historicalCustomers > 0
                    ? ((avgCustomersPerDay - historicalCustomers) / historicalCustomers * 100)
                    : 0;

                // Identify peak demand days
                const sortedDays = [...filteredOrders].sort((a, b) => (b.yhat || 0) - (a.yhat || 0));
                const peakDays = sortedDays.slice(0, 3);

                // Calculate capacity utilization (assuming 100 orders/day baseline capacity)
                const baselineCapacity = historicalOrders > 0 ? historicalOrders * 1.5 : 100;
                const capacityUtilization = (avgDailyOrders / baselineCapacity) * 100;

                // Calculate demand variability (standard deviation)
                const orderValues = filteredOrders.map(d => d.yhat || 0);
                const variance = orderValues.reduce((sum, val) => sum + Math.pow(val - avgDailyOrders, 2), 0) / orderValues.length;
                const stdDev = Math.sqrt(variance);
                const demandVariability = (stdDev / avgDailyOrders) * 100;

                console.log('Calculated operations metrics:', {
                    totalOrders: Math.round(totalOrders),
                    avgDailyOrders: Math.round(avgDailyOrders),
                    peakDailyOrders: Math.round(peakDailyOrders),
                    capacityUtilization: capacityUtilization.toFixed(1) + '%',
                    demandVariability: demandVariability.toFixed(1) + '%'
                });

                setOperationsData({
                    totalOrders: Math.round(totalOrders),
                    avgDailyOrders: Math.round(avgDailyOrders),
                    peakDailyOrders: Math.round(peakDailyOrders),
                    avgCustomersPerDay,
                    orderGrowth,
                    customerGrowth,
                    capacityUtilization,
                    demandVariability,
                    forecastDays: filteredOrders.length,
                    peakDays
                });

                // Update chatbot with Operations Dashboard data
                updatePageData('Operations Dashboard', {
                    totalOrders: Math.round(totalOrders),
                    avgDailyOrders: Math.round(avgDailyOrders),
                    peakDailyOrders: Math.round(peakDailyOrders),
                    avgCustomersPerDay,
                    orderGrowth: orderGrowth.toFixed(2),
                    customerGrowth: customerGrowth.toFixed(2),
                    capacityUtilization: capacityUtilization.toFixed(2),
                    demandVariability: demandVariability.toFixed(2),
                    forecastDays: filteredOrders.length,
                    peakDays,
                    filters: {
                        region: selectedRegion,
                        category: selectedCategory,
                        dateRange: dateRange
                    }
                });

                // Prepare chart data
                const dailyChart = filteredOrders.map((day, idx) => ({
                    day: `Day ${idx + 1}`,
                    date: day.ds,
                    orders: Math.round(day.yhat || 0),
                    customers: Math.round(filteredCustomers[idx]?.yhat || 0),
                    revenue: Math.round(filteredRevenue[idx]?.yhat || 0),
                    capacity: Math.round(baselineCapacity),
                    lower: Math.round(day.yhat_lower || 0),
                    upper: Math.round(day.yhat_upper || 0)
                }));

                // Weekly aggregation
                const weeklyChart = [];
                for (let i = 0; i < filteredOrders.length; i += 7) {
                    const weekSlice = filteredOrders.slice(i, i + 7);
                    const weekOrders = weekSlice.reduce((sum, day) => sum + (day.yhat || 0), 0);
                    weeklyChart.push({
                        week: `Week ${Math.floor(i / 7) + 1}`,
                        orders: Math.round(weekOrders),
                        avgDaily: Math.round(weekOrders / weekSlice.length)
                    });
                }

                setChartData({
                    daily: dailyChart,
                    weekly: weeklyChart
                });

                // Fetch regional breakdown if not filtered by region
                if (selectedRegion === 'all') {
                    await fetchRegionalBreakdown();
                }

                // Analyze demand patterns
                analyzeDemandPatterns(filteredOrders, avgDailyOrders);
                
            } catch (err) {
                console.error('Failed to fetch operations data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        debouncedFetch(fetchData);
    }, [fileId, user, dateRange, selectedRegion, selectedCategory]);

    // Fetch regional order distribution
    const fetchRegionalBreakdown = async () => {
        try {
            const filterOptions = await dataAPI.getFilterOptions(fileId, user.company_id);
            
            // Fetch order forecasts for top 5 regions
            const regionPromises = (filterOptions.regions || []).slice(0, 5).map(async (region) => {
                const data = await dataAPI.getForecastResults(
                    fileId,
                    user.company_id,
                    'order_count',
                    'country',
                    region
                );
                const total = (data.forecasts || []).reduce((sum, d) => sum + (d.yhat || 0), 0);
                return { region, orders: Math.round(total) };
            });

            const regions = await Promise.all(regionPromises);
            regions.sort((a, b) => b.orders - a.orders);
            
            setRegionalData(regions);
            console.log('Regional data:', regions);
        } catch (err) {
            console.error('Failed to fetch regional breakdown:', err);
        }
    };

    // Analyze demand patterns
    const analyzeDemandPatterns = (forecasts, avgDaily) => {
        const highDemandDays = forecasts.filter(d => (d.yhat || 0) > avgDaily * 1.2).length;
        const lowDemandDays = forecasts.filter(d => (d.yhat || 0) < avgDaily * 0.8).length;
        const normalDays = forecasts.length - highDemandDays - lowDemandDays;

        setDemandAnalysis({
            highDemandDays,
            lowDemandDays,
            normalDays,
            totalDays: forecasts.length
        });
    };

    if (!isDataUploaded) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        Upload a CSV file to view operations analytics
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
                    <p>Error loading operations data: {error}</p>
                </div>
            </div>
        );
    }
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Operations Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Order fulfillment forecasts, demand planning, and capacity optimization
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Expected Orders"
                    value={operationsData ? operationsData.totalOrders.toLocaleString() : '-'}
                    subtitle={`Next ${operationsData?.forecastDays || 0} days`}
                    icon={Package}
                    trend={operationsData?.orderGrowth ? parseFloat(operationsData.orderGrowth.toFixed(2)) : null}
                    trendLabel="vs historical avg"
                    description="Total forecasted order volume for the selected period based on Prophet ML predictions. Trend shows growth vs historical baseline to help you anticipate demand surges and plan operational resources accordingly."
                />
                <KPICard
                    title="Daily Order Volume"
                    value={operationsData ? Math.round(operationsData.avgDailyOrders).toLocaleString() : '-'}
                    subtitle="Average per day"
                    icon={Activity}
                    description="Average daily order processing capacity required to meet forecasted demand. Use this metric to plan workforce scheduling, warehouse capacity, and fulfillment resources for consistent service levels."
                />
                <KPICard
                    title="Peak Day Demand"
                    value={operationsData ? Math.round(operationsData.peakDailyOrders).toLocaleString() : '-'}
                    subtitle="Maximum orders/day"
                    icon={TrendingUp}
                    description="Highest expected single-day order volume during the forecast period. Critical for capacity planning—ensure adequate staffing, warehouse space, and processing capability to handle peak demand without service degradation."
                />
                <KPICard
                    title="Capacity Utilization"
                    value={operationsData ? `${operationsData.capacityUtilization.toFixed(1)}%` : '-'}
                    subtitle={operationsData?.capacityUtilization > 90 ? '⚠️ Near capacity' : '✓ Within limits'}
                    icon={Clock}
                    description="Forecasted demand as a percentage of operational capacity (calculated as 150% of historical baseline). >90% indicates capacity strain—consider scaling up operations, adding shifts, or optimizing processes to prevent bottlenecks."
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Order Volume Forecast */}
                <ChartCard
                    title="Daily Order Volume Forecast"
                    description={`Order processing demand${dateRange !== 'all' ? ` (${dateRange.replace('week', 'Week ')})` : ''}`}
                >
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={chartData?.daily || []}>
                            <defs>
                                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
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
                                formatter={(value) => [value.toLocaleString(), 'Orders']}
                            />
                            <Area type="monotone" dataKey="orders" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOrders)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Weekly Order Distribution */}
                <ChartCard
                    title="Weekly Order Distribution"
                    description="Total orders per week"
                >
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={chartData?.weekly || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="week" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [value.toLocaleString(), '']}
                            />
                            <Bar dataKey="orders" fill="#10b981" name="Total Orders" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Order Volume vs Capacity */}
                <ChartCard
                    title="Order Volume vs Capacity"
                    description="Daily demand against operational capacity threshold"
                >
                    <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart data={chartData?.daily || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="day" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                            />
                            <Legend />
                            <Bar dataKey="orders" fill="#3b82f6" name="Orders" />
                            <Line 
                                type="monotone" 
                                dataKey="capacity" 
                                stroke="#ef4444" 
                                strokeWidth={2} 
                                name="Capacity Limit"
                                strokeDasharray="5 5"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Regional Order Distribution */}
                {regionalData.length > 0 && (
                    <ChartCard
                        title="Order Distribution by Region"
                        description="Top 5 regions by order volume"
                    >
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={regionalData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis type="number" stroke="#9ca3af" />
                                <YAxis type="category" dataKey="region" stroke="#9ca3af" width={120} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                    labelStyle={{ color: '#f3f4f6' }}
                                    formatter={(value) => [value.toLocaleString(), 'Orders']}
                                />
                                <Bar dataKey="orders" fill="#8b5cf6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                )}

                {/* Demand Pattern Analysis */}
                {demandAnalysis && (
                    <ChartCard
                        title="Demand Pattern Analysis"
                        description="Distribution of demand levels across forecast period"
                    >
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'High Demand Days', value: demandAnalysis.highDemandDays, color: '#ef4444' },
                                        { name: 'Normal Days', value: demandAnalysis.normalDays, color: '#10b981' },
                                        { name: 'Low Demand Days', value: demandAnalysis.lowDemandDays, color: '#3b82f6' }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={120}
                                    dataKey="value"
                                >
                                    {[
                                        { color: '#ef4444' },
                                        { color: '#10b981' },
                                        { color: '#3b82f6' }
                                    ].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                    labelStyle={{ color: '#f3f4f6' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                )}

                {/* Forecast Confidence Interval */}
                <ChartCard
                    title="Order Volume Confidence Interval"
                    description="95% confidence bounds for order forecasts"
                    className="lg:col-span-2"
                >
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={chartData?.daily || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="day" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [value.toLocaleString(), '']}
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
                                dataKey="orders" 
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

            {/* Operational Insights */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Operational Planning Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Peak Demand Alert */}
                    {operationsData?.peakDays && operationsData.peakDays.length > 0 && (
                        <div className="flex items-start p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3" />
                            <div>
                                <h4 className="font-medium text-amber-900 dark:text-amber-300">Peak Demand Days Ahead</h4>
                                <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
                                    Expect peak order volume of <strong>{Math.round(operationsData.peakDailyOrders).toLocaleString()} orders/day</strong>. 
                                    Top 3 busy days identified. Ensure adequate staffing and processing capacity during these periods.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Capacity Planning */}
                    <div className={`flex items-start p-4 rounded-lg ${
                        operationsData?.capacityUtilization > 90 
                            ? 'bg-red-50 dark:bg-red-900/20' 
                            : operationsData?.capacityUtilization > 75
                            ? 'bg-yellow-50 dark:bg-yellow-900/20'
                            : 'bg-green-50 dark:bg-green-900/20'
                    }`}>
                        <Clock className={`h-5 w-5 mt-0.5 mr-3 ${
                            operationsData?.capacityUtilization > 90 
                                ? 'text-red-600 dark:text-red-400' 
                                : operationsData?.capacityUtilization > 75
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-green-600 dark:text-green-400'
                        }`} />
                        <div>
                            <h4 className={`font-medium ${
                                operationsData?.capacityUtilization > 90 
                                    ? 'text-red-900 dark:text-red-300' 
                                    : operationsData?.capacityUtilization > 75
                                    ? 'text-yellow-900 dark:text-yellow-300'
                                    : 'text-green-900 dark:text-green-300'
                            }`}>
                                Capacity Status: {operationsData?.capacityUtilization > 90 ? 'Critical' : operationsData?.capacityUtilization > 75 ? 'High' : 'Normal'}
                            </h4>
                            <p className={`text-sm mt-1 ${
                                operationsData?.capacityUtilization > 90 
                                    ? 'text-red-800 dark:text-red-400' 
                                    : operationsData?.capacityUtilization > 75
                                    ? 'text-yellow-800 dark:text-yellow-400'
                                    : 'text-green-800 dark:text-green-400'
                            }`}>
                                Operating at <strong>{operationsData?.capacityUtilization?.toFixed(1)}%</strong> capacity. 
                                {operationsData?.capacityUtilization > 90 
                                    ? ' Urgent: Scale operations immediately to prevent delays.'
                                    : operationsData?.capacityUtilization > 75
                                    ? ' Consider adding resources during peak periods.'
                                    : ' Capacity is adequate for forecasted demand.'}
                            </p>
                        </div>
                    </div>

                    {/* Demand Variability */}
                    <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
                        <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-300">Demand Variability</h4>
                            <p className="text-sm text-blue-800 dark:text-blue-400 mt-1">
                                Order volume variance: <strong>{operationsData?.demandVariability?.toFixed(1)}%</strong>. 
                                {operationsData?.demandVariability > 30 
                                    ? ' High variability - maintain flexible capacity and inventory buffers.'
                                    : operationsData?.demandVariability > 15
                                    ? ' Moderate variability - standard operational planning applies.'
                                    : ' Low variability - stable demand pattern detected.'}
                            </p>
                        </div>
                    </div>

                    {/* Regional Distribution */}
                    {regionalData.length > 0 && (
                        <div className="flex items-start p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 mr-3" />
                            <div>
                                <h4 className="font-medium text-purple-900 dark:text-purple-300">Regional Focus</h4>
                                <p className="text-sm text-purple-800 dark:text-purple-400 mt-1">
                                    <strong>{regionalData[0]?.region}</strong> represents highest order volume ({regionalData[0]?.orders.toLocaleString()} orders). 
                                    Ensure adequate logistics coverage and warehouse capacity in this region.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Growth Trend */}
                    <div className={`flex items-start p-4 rounded-lg ${
                        operationsData?.orderGrowth > 0 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20' 
                            : 'bg-gray-50 dark:bg-gray-900/20'
                    }`}>
                        <TrendingUp className={`h-5 w-5 mt-0.5 mr-3 ${
                            operationsData?.orderGrowth > 0 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : 'text-gray-600 dark:text-gray-400'
                        }`} />
                        <div>
                            <h4 className={`font-medium ${
                                operationsData?.orderGrowth > 0 
                                    ? 'text-emerald-900 dark:text-emerald-300' 
                                    : 'text-gray-900 dark:text-gray-300'
                            }`}>
                                Demand Trend
                            </h4>
                            <p className={`text-sm mt-1 ${
                                operationsData?.orderGrowth > 0 
                                    ? 'text-emerald-800 dark:text-emerald-400' 
                                    : 'text-gray-800 dark:text-gray-400'
                            }`}>
                                Order volume trending <strong>{operationsData?.orderGrowth > 0 ? 'up' : 'stable'}</strong> by {Math.abs(operationsData?.orderGrowth || 0).toFixed(1)}% vs historical baseline. 
                                {operationsData?.orderGrowth > 10 
                                    ? ' Significant growth - prepare for scale-up.'
                                    : operationsData?.orderGrowth > 0
                                    ? ' Positive growth momentum detected.'
                                    : ' Demand remains consistent.'}
                            </p>
                        </div>
                    </div>

                    {/* Demand Pattern Summary */}
                    {demandAnalysis && (
                        <div className="flex items-start p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 mr-3" />
                            <div>
                                <h4 className="font-medium text-indigo-900 dark:text-indigo-300">Planning Outlook</h4>
                                <p className="text-sm text-indigo-800 dark:text-indigo-400 mt-1">
                                    Forecast period: <strong>{demandAnalysis.totalDays} days</strong>. 
                                    Expect {demandAnalysis.highDemandDays} high-demand days, {demandAnalysis.normalDays} normal days, and {demandAnalysis.lowDemandDays} low-demand days. 
                                    Plan workforce scheduling and inventory accordingly.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
