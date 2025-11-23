import React, { useState, useEffect, useMemo } from 'react';
import ChartCard from '../charts/ChartCard';
import KPICard from '../widgets/KPICard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Treemap, LineChart, Line, ComposedChart, Area } from 'recharts';
import { Package, TrendingUp, TrendingDown, Tag, Loader2, DollarSign, ShoppingCart } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useFilters } from '../../../contexts/FilterContext';
import { useChatbot } from '../../../contexts/ChatbotContext';
import { dataAPI, transformers } from '../../../services/api';

// Custom content for Treemap
const CustomizedContent = (props) => {
    const { x, y, width, height, name, size } = props;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: props.fill,
                    stroke: '#fff',
                    strokeWidth: 2,
                }}
            />
            {width > 60 && height > 40 ? (
                <>
                    <text 
                        x={x + width / 2} 
                        y={y + height / 2} 
                        textAnchor="middle" 
                        fill="#fff" 
                        fontSize={12}
                        fontWeight="bold"
                    >
                        {name}
                    </text>
                    <text 
                        x={x + width / 2} 
                        y={y + height / 2 + 16} 
                        textAnchor="middle" 
                        fill="#fff" 
                        fontSize={10}
                    >
                        ({size})
                    </text>
                </>
            ) : null}
        </g>
    );
};

export default function ProductDashboard() {
    const { fileId, isDataUploaded } = useData();
    const { user } = useAuth();
    const { dateRange, selectedRegion, selectedCategory } = useFilters();
    const { updatePageData } = useChatbot();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [clusterData, setClusterData] = useState(null);
    const [treemapData, setTreemapData] = useState([]);
    const [productMetrics, setProductMetrics] = useState(null);
    const [clusterPerformance, setClusterPerformance] = useState([]);
    const [chartData, setChartData] = useState(null);

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
                console.log('📦 Fetching Product Dashboard data with filters:', {
                    dateRange,
                    selectedRegion,
                    selectedCategory
                });

                // Fetch product clusters metadata
                const clusterResponse = await dataAPI.getProductClusters(fileId, user.company_id);
                console.log('Product clusters:', clusterResponse);
                
                const clusters = clusterResponse.clusters || [];
                const totalProducts = clusters.reduce((sum, c) => sum + c.cluster_size, 0);

                // If category filter is active, show only that cluster
                const activeClusters = selectedCategory !== 'all' 
                    ? clusters.filter(c => c.cluster_id.toString() === selectedCategory)
                    : clusters;

                // Fetch forecasts for each cluster (or selected cluster only)
                const clusterForecasts = await Promise.all(
                    activeClusters.map(async (cluster) => {
                        try {
                            const groupType = selectedRegion !== 'all' ? 'country' : 'cluster';
                            const groupKey = selectedRegion !== 'all' ? selectedRegion : cluster.cluster_id.toString();

                            const [revenueData, orderData] = await Promise.all([
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
                                )
                            ]);

                            // Filter by date range
                            let revenueForecasts = revenueData.forecasts || [];
                            let orderForecasts = orderData.forecasts || [];

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
                                    orderForecasts = orderForecasts.slice(start, actualEnd);
                                }
                            }

                            const totalRevenue = revenueForecasts.reduce((sum, d) => sum + (d.yhat || 0), 0);
                            const totalOrders = orderForecasts.reduce((sum, d) => sum + (d.yhat || 0), 0);
                            const avgDailyRevenue = revenueForecasts.length > 0 ? totalRevenue / revenueForecasts.length : 0;

                            // Calculate growth
                            const historicalRevenue = revenueData.historical_avg || 0;
                            const revenueGrowth = historicalRevenue > 0 
                                ? ((avgDailyRevenue - historicalRevenue) / historicalRevenue * 100)
                                : 0;

                            return {
                                cluster_id: cluster.cluster_id,
                                cluster_name: cluster.cluster_name,
                                cluster_size: cluster.cluster_size,
                                top_terms: cluster.top_terms,
                                revenue: Math.round(totalRevenue),
                                orders: Math.round(totalOrders),
                                avgDailyRevenue: Math.round(avgDailyRevenue),
                                growth: revenueGrowth,
                                forecasts: revenueForecasts,
                                orderForecasts: orderForecasts
                            };
                        } catch (err) {
                            console.error(`Failed to fetch forecasts for cluster ${cluster.cluster_id}:`, err);
                            return {
                                cluster_id: cluster.cluster_id,
                                cluster_name: cluster.cluster_name,
                                cluster_size: cluster.cluster_size,
                                top_terms: cluster.top_terms,
                                revenue: 0,
                                orders: 0,
                                avgDailyRevenue: 0,
                                growth: 0,
                                forecasts: [],
                                orderForecasts: []
                            };
                        }
                    })
                );

                console.log('Cluster forecasts:', clusterForecasts);

                // Sort by revenue descending
                clusterForecasts.sort((a, b) => b.revenue - a.revenue);

                // Calculate total metrics
                const totalRevenue = clusterForecasts.reduce((sum, c) => sum + c.revenue, 0);
                const totalOrders = clusterForecasts.reduce((sum, c) => sum + c.orders, 0);
                const avgGrowth = clusterForecasts.length > 0
                    ? clusterForecasts.reduce((sum, c) => sum + c.growth, 0) / clusterForecasts.length
                    : 0;

                // Identify trending clusters
                const growingClusters = clusterForecasts.filter(c => c.growth > 0).length;
                const decliningClusters = clusterForecasts.filter(c => c.growth < 0).length;

                setProductMetrics({
                    totalProducts,
                    totalClusters: activeClusters.length,
                    totalRevenue,
                    totalOrders,
                    avgGrowth,
                    growingClusters,
                    decliningClusters
                });

                setClusterPerformance(clusterForecasts);

                // Update chatbot with Product Dashboard data
                updatePageData('Product Dashboard', {
                    totalProducts,
                    totalClusters: activeClusters.length,
                    totalRevenue: Math.round(totalRevenue),
                    totalOrders: Math.round(totalOrders),
                    avgGrowth: avgGrowth.toFixed(2),
                    growingClusters,
                    decliningClusters,
                    clusters: clusterForecasts.map(c => ({
                        name: c.cluster_name,
                        revenue: Math.round(c.revenue),
                        growth: c.growth.toFixed(2),
                        productCount: c.cluster_size
                    })),
                    filters: {
                        region: selectedRegion,
                        category: selectedCategory,
                        dateRange: dateRange
                    }
                });

                // Transform for treemap (with revenue size)
                const treemap = clusterForecasts.map((cluster, idx) => {
                    const colors = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#ffc658', '#ff8042'];
                    return {
                        name: cluster.cluster_name || `Cluster ${cluster.cluster_id}`,
                        size: cluster.revenue > 0 ? cluster.revenue : cluster.cluster_size,
                        fill: colors[idx % colors.length],
                        cluster_id: cluster.cluster_id,
                        top_terms: cluster.top_terms,
                        revenue: cluster.revenue
                    };
                });

                setTreemapData(treemap);

                // Prepare daily trend chart (combine all clusters)
                if (clusterForecasts.length > 0 && clusterForecasts[0].forecasts.length > 0) {
                    const maxDays = Math.max(...clusterForecasts.map(c => c.forecasts.length));
                    const dailyTrend = [];

                    for (let i = 0; i < maxDays; i++) {
                        const dayData = {
                            day: `Day ${i + 1}`,
                            date: clusterForecasts[0].forecasts[i]?.ds
                        };

                        clusterForecasts.forEach(cluster => {
                            if (cluster.forecasts[i]) {
                                dayData[cluster.cluster_name || `Cluster ${cluster.cluster_id}`] = Math.round(cluster.forecasts[i].yhat || 0);
                            }
                        });

                        dailyTrend.push(dayData);
                    }

                    setChartData({ daily: dailyTrend });
                }

                setClusterData({
                    clusters: activeClusters,
                    summary: clusterResponse.summary || {}
                });
                
            } catch (err) {
                console.error('Failed to fetch product data:', err);
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
                        Upload a CSV file to view product analytics
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
                    <p>Error loading product data: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Product Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Product category performance, cluster forecasts, and trending analysis
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Products"
                    value={productMetrics?.totalProducts?.toLocaleString() || '0'}
                    subtitle={`Across ${productMetrics?.totalClusters || 0} categories`}
                    icon={Package}
                    description="Total unique products analyzed in your catalog, automatically grouped into categories using machine learning (K-Means clustering on TF-IDF vectorized descriptions). Each category represents a natural grouping of similar products."
                />
                <KPICard
                    title="Category Revenue"
                    value={productMetrics ? `$${(productMetrics.totalRevenue / 1000).toFixed(0)}K` : '-'}
                    subtitle={`${productMetrics?.totalOrders?.toLocaleString() || 0} orders`}
                    icon={DollarSign}
                    trend={productMetrics?.avgGrowth ? parseFloat(productMetrics.avgGrowth.toFixed(2)) : null}
                    trendLabel="avg category growth"
                    description="Total forecasted revenue across all product categories for the selected period. Trend shows average category growth compared to historical baseline, indicating overall portfolio performance."
                />
                <KPICard
                    title="Trending Up"
                    value={productMetrics?.growingClusters?.toString() || '0'}
                    subtitle={`of ${productMetrics?.totalClusters || 0} total categories`}
                    icon={TrendingUp}
                    description="Number of product categories showing positive revenue growth compared to historical performance. These are your best-performing categories—consider increasing inventory and marketing investment here."
                />
                <KPICard
                    title="Needs Attention"
                    value={productMetrics?.decliningClusters?.toString() || '0'}
                    subtitle="Categories declining"
                    icon={TrendingDown}
                    description="Product categories with declining or stagnant performance vs historical baseline. These categories may benefit from promotions, pricing adjustments, product bundling, or targeted marketing campaigns."
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by Category */}
                <ChartCard
                    title="Revenue by Product Category"
                    description={`Forecasted revenue per cluster${dateRange !== 'all' ? ` (${dateRange.replace('week', 'Week ')})` : ''}`}
                >
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={clusterPerformance}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="cluster_name" 
                                stroke="#9ca3af"
                                angle={-20}
                                textAnchor="end"
                                height={100}
                            />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [`$${(value / 1000).toFixed(1)}K`, 'Revenue']}
                            />
                            <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Product Clusters Treemap */}
                <ChartCard
                    title="Product Category Visualization"
                    description="Size represents revenue contribution per category"
                >
                    <ResponsiveContainer width="100%" height={350}>
                        <Treemap
                            data={treemapData}
                            dataKey="size"
                            aspectRatio={4 / 3}
                            stroke="#fff"
                            content={<CustomizedContent />}
                        />
                    </ResponsiveContainer>
                </ChartCard>

                {/* Category Growth Trends */}
                <ChartCard
                    title="Category Growth Trends"
                    description="Revenue growth rate by category"
                >
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={clusterPerformance}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="cluster_name" 
                                stroke="#9ca3af"
                                angle={-20}
                                textAnchor="end"
                                height={100}
                            />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [`${value.toFixed(1)}%`, 'Growth']}
                            />
                            <Bar 
                                dataKey="growth" 
                                fill="#10b981" 
                                name="Growth %" 
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Orders by Category */}
                <ChartCard
                    title="Order Volume by Category"
                    description="Expected orders per product cluster"
                >
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={clusterPerformance}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="cluster_name" 
                                stroke="#9ca3af"
                                angle={-20}
                                textAnchor="end"
                                height={100}
                            />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [value.toLocaleString(), 'Orders']}
                            />
                            <Bar dataKey="orders" fill="#f59e0b" name="Orders" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Daily Revenue Trend (All Categories) */}
                {chartData?.daily && chartData.daily.length > 0 && (
                    <ChartCard
                        title="Daily Revenue Trend by Category"
                        description="Revenue forecast breakdown by product cluster"
                        className="lg:col-span-2"
                    >
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={chartData.daily}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="day" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                                    labelStyle={{ color: '#f3f4f6' }}
                                    formatter={(value) => [`$${(value / 1000).toFixed(1)}K`, '']}
                                />
                                <Legend />
                                {clusterPerformance.map((cluster, idx) => {
                                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
                                    return (
                                        <Line 
                                            key={cluster.cluster_id}
                                            type="monotone" 
                                            dataKey={cluster.cluster_name || `Cluster ${cluster.cluster_id}`} 
                                            stroke={colors[idx % colors.length]} 
                                            strokeWidth={2}
                                        />
                                    );
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>
                )}
            </div>

            {/* Category Performance Table */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Category Performance Analysis
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Detailed breakdown of each product category with forecast metrics
                    </p>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {clusterPerformance.map((cluster) => {
                        const isGrowing = cluster.growth > 0;
                        const isTop = clusterPerformance.indexOf(cluster) === 0;
                        
                        return (
                            <div key={cluster.cluster_id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: treemapData.find(t => t.cluster_id === cluster.cluster_id)?.fill || '#8884d8' }} 
                                            />
                                            <h4 className="font-medium text-gray-900 dark:text-white text-lg">
                                                {cluster.cluster_name || `Cluster ${cluster.cluster_id}`}
                                            </h4>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                ({cluster.cluster_size} products)
                                            </span>
                                            {isTop && (
                                                <span className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full font-medium">
                                                    Top Performer
                                                </span>
                                            )}
                                        </div>

                                        {/* Metrics Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Forecasted Revenue</p>
                                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                                    ${(cluster.revenue / 1000).toFixed(1)}K
                                                </p>
                                            </div>
                                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Expected Orders</p>
                                                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                                    {cluster.orders.toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Daily Avg Revenue</p>
                                                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                                    ${(cluster.avgDailyRevenue / 1000).toFixed(1)}K
                                                </p>
                                            </div>
                                            <div className={`${isGrowing ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'} rounded-lg p-3`}>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Growth Trend</p>
                                                <p className={`text-lg font-bold flex items-center gap-1 ${isGrowing ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                    {isGrowing ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                    {Math.abs(cluster.growth).toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>

                                        {/* Top Terms */}
                                        <div className="mt-3">
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                                <span className="font-medium">Key Product Terms:</span>
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {cluster.top_terms?.map((term, idx) => (
                                                    <span 
                                                        key={idx}
                                                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
                                                    >
                                                        {term}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Product Insights */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Product Performance Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Top Category */}
                    {clusterPerformance[0] && (
                        <div className="flex items-start p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3" />
                            <div>
                                <h4 className="font-medium text-green-900 dark:text-green-300">Top Revenue Category</h4>
                                <p className="text-sm text-green-800 dark:text-green-400 mt-1">
                                    <strong>{clusterPerformance[0].cluster_name}</strong> leads with ${(clusterPerformance[0].revenue / 1000).toFixed(0)}K forecasted revenue ({clusterPerformance[0].cluster_size} products). 
                                    {clusterPerformance[0].growth > 0 ? ` Growing at ${clusterPerformance[0].growth.toFixed(1)}%!` : ' Consider promotional support.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Growing Categories */}
                    {productMetrics?.growingClusters > 0 && (
                        <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
                            <div>
                                <h4 className="font-medium text-blue-900 dark:text-blue-300">Trending Categories</h4>
                                <p className="text-sm text-blue-800 dark:text-blue-400 mt-1">
                                    {productMetrics.growingClusters} out of {productMetrics.totalClusters} categories showing positive growth. 
                                    Average growth rate: {productMetrics.avgGrowth > 0 ? '+' : ''}{productMetrics.avgGrowth.toFixed(1)}%. 
                                    Excellent category health!
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Declining Categories */}
                    {productMetrics?.decliningClusters > 0 && (
                        <div className="flex items-start p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3" />
                            <div>
                                <h4 className="font-medium text-amber-900 dark:text-amber-300">Categories Needing Attention</h4>
                                <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
                                    {productMetrics.decliningClusters} categories experiencing declining revenue. 
                                    Consider running promotions, bundling offers, or marketing campaigns to boost these product groups.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ML Clustering Info */}
                    <div className="flex items-start p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <Tag className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 mr-3" />
                        <div>
                            <h4 className="font-medium text-purple-900 dark:text-purple-300">ML-Powered Categorization</h4>
                            <p className="text-sm text-purple-800 dark:text-purple-400 mt-1">
                                {productMetrics?.totalProducts?.toLocaleString() || 0} products automatically grouped into {productMetrics?.totalClusters || 0} natural categories using K-Means clustering and TF-IDF vectorization.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
