// RFM Segment definitions
export const RFM_SEGMENTS = {
    champions: { name: 'Champions', color: '#10b981', size: '12%' },
    loyal: { name: 'Loyal Customers', color: '#3b82f6', size: '20%' },
    potential: { name: 'Potential Loyalists', color: '#8b5cf6', size: '12%' },
    atRisk: { name: 'At Risk', color: '#f59e0b', size: '18%' },
    hibernating: { name: 'Hibernating', color: '#ef4444', size: '23%' },
    bigSpenders: { name: 'Big Spenders', color: '#ec4899', size: '5%' },
    priceSensitive: { name: 'Price Sensitive', color: '#6366f1', size: '10%' },
};

// Customer Segments Distribution
export const customerSegments = [
    { name: 'Champions', value: 12, color: '#10b981' },
    { name: 'Loyal Customers', value: 20, color: '#3b82f6' },
    { name: 'Potential Loyalists', value: 12, color: '#8b5cf6' },
    { name: 'At Risk', value: 18, color: '#f59e0b' },
    { name: 'Hibernating', value: 23, color: '#ef4444' },
    { name: 'Big Spenders', value: 5, color: '#ec4899' },
    { name: 'Price Sensitive', value: 10, color: '#6366f1' },
];

// Monthly Active Customers
export const monthlyActiveCustomers = [
    { month: 'Jan', customers: 4500 },
    { month: 'Feb', customers: 4800 },
    { month: 'Mar', customers: 5200 },
    { month: 'Apr', customers: 5600 },
    { month: 'May', customers: 5300 },
    { month: 'Jun', customers: 5800 },
    { month: 'Jul', customers: 6200 },
    { month: 'Aug', customers: 6500 },
    { month: 'Sep', customers: 6100 },
    { month: 'Oct', customers: 6800 },
    { month: 'Nov', customers: 7200 },
    { month: 'Dec', customers: 7500 },
];

// Top Countries by Orders
export const topCountries = [
    { country: 'United States', orders: 12500, code: 'US' },
    { country: 'United Kingdom', orders: 9800, code: 'GB' },
    { country: 'Germany', orders: 7600, code: 'DE' },
    { country: 'France', orders: 6800, code: 'FR' },
    { country: 'Canada', orders: 5400, code: 'CA' },
];

// Top Selling Categories
export const topCategories = [
    { category: 'Electronics', sales: 245000 },
    { category: 'Home & Garden', sales: 198000 },
    { category: 'Fashion', sales: 175000 },
    { category: 'Sports', sales: 142000 },
    { category: 'Toys', sales: 128000 },
    { category: 'Books', sales: 95000 },
];

// Sales Revenue Trend
export const salesRevenue = [
    { date: 'Week 1', revenue: 45000 },
    { date: 'Week 2', revenue: 52000 },
    { date: 'Week 3', revenue: 48000 },
    { date: 'Week 4', revenue: 61000 },
    { date: 'Week 5', revenue: 55000 },
    { date: 'Week 6', revenue: 67000 },
    { date: 'Week 7', revenue: 58000 },
    { date: 'Week 8', revenue: 72000 },
];

// Top Products
export const topProducts = [
    { name: 'Wireless Headphones', revenue: 45000, quantity: 1200 },
    { name: 'Smart Watch', revenue: 38000, quantity: 950 },
    { name: 'Laptop Stand', revenue: 28000, quantity: 1800 },
    { name: 'USB-C Hub', revenue: 22000, quantity: 2200 },
    { name: 'Webcam HD', revenue: 19000, quantity: 850 },
];

// Customer Lifetime Value Prediction
export const ltvPrediction = [
    { month: 'Month 1', value: 120 },
    { month: 'Month 2', value: 145 },
    { month: 'Month 3', value: 165 },
    { month: 'Month 4', value: 185 },
    { month: 'Month 5', value: 210 },
    { month: 'Month 6', value: 235 },
];

// Campaign Suggestions
export const campaignSuggestions = [
    { segment: 'Champions', campaign: 'Exclusive Early Access Event', priority: 'High' },
    { segment: 'At Risk', campaign: 'Winback Discount 20%', priority: 'High' },
    { segment: 'Hibernating', campaign: 'Reactivation SMS Campaign', priority: 'Medium' },
    { segment: 'Potential Loyalists', campaign: 'Nurturing Email Series', priority: 'Medium' },
    { segment: 'Big Spenders', campaign: 'Premium VIP Program', priority: 'High' },
];

// KPI Metrics
export const kpiMetrics = {
    totalCustomers: 45620,
    newCustomers: 3850,
    returningCustomers: 41770,
    avgOrderValue: 156.50,
    totalRevenue: 2450000,
    revenueGrowth: 12.5,
    churnRate: 5.2,
    customerSatisfaction: 4.6,
};

// Sales Dashboard Data
export const dailyRevenue = [
    { day: 'Mon', revenue: 12500 },
    { day: 'Tue', revenue: 15200 },
    { day: 'Wed', revenue: 14800 },
    { day: 'Thu', revenue: 18500 },
    { day: 'Fri', revenue: 22400 },
    { day: 'Sat', revenue: 25800 },
    { day: 'Sun', revenue: 21000 },
];

export const salesForecast = [
    { week: 'Week 1', actual: 45000, predicted: 44000 },
    { week: 'Week 2', actual: 52000, predicted: 51000 },
    { week: 'Week 3', actual: 48000, predicted: 49000 },
    { week: 'Week 4', actual: 61000, predicted: 60000 },
    { week: 'Week 5', predicted: 63000 },
    { week: 'Week 6', predicted: 65000 },
    { week: 'Week 7', predicted: 68000 },
    { week: 'Week 8', predicted: 70000 },
];

// Product Dashboard Data
export const categorySales = [
    { name: 'Electronics', size: 245000, fill: '#8884d8' },
    { name: 'Home', size: 198000, fill: '#83a6ed' },
    { name: 'Fashion', size: 175000, fill: '#8dd1e1' },
    { name: 'Sports', size: 142000, fill: '#82ca9d' },
    { name: 'Toys', size: 128000, fill: '#a4de6c' },
];

export const productPerformance = [
    { name: 'Product A', sales: 4000, returns: 240, rating: 4.5 },
    { name: 'Product B', sales: 3000, returns: 139, rating: 4.2 },
    { name: 'Product C', sales: 2000, returns: 980, rating: 3.8 },
    { name: 'Product D', sales: 2780, returns: 390, rating: 4.7 },
    { name: 'Product E', sales: 1890, returns: 480, rating: 4.0 },
];

// Operations Dashboard Data
export const inventoryStatus = [
    { name: 'In Stock', value: 85, color: '#10b981' },
    { name: 'Low Stock', value: 10, color: '#f59e0b' },
    { name: 'Out of Stock', value: 5, color: '#ef4444' },
];

export const shipmentPerformance = [
    { week: 'W1', onTime: 95, delayed: 5 },
    { week: 'W2', onTime: 92, delayed: 8 },
    { week: 'W3', onTime: 96, delayed: 4 },
    { week: 'W4', onTime: 88, delayed: 12 },
    { week: 'W5', onTime: 94, delayed: 6 },
];

// Finance Dashboard Data
export const revenueBreakdown = [
    { name: 'Direct Sales', value: 65, color: '#3b82f6' },
    { name: 'Wholesale', value: 25, color: '#8b5cf6' },
    { name: 'Affiliate', value: 10, color: '#10b981' },
];


export const profitMarginTrend = [
    { month: 'Jan', margin: 22 },
    { month: 'Feb', margin: 24 },
    { month: 'Mar', margin: 21 },
    { month: 'Apr', margin: 25 },
    { month: 'May', margin: 28 },
    { month: 'Jun', margin: 26 },
];

// RFM Scatter Data
export const rfmScatterData = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    recency: Math.floor(Math.random() * 365),
    frequency: Math.floor(Math.random() * 50),
    monetary: Math.floor(Math.random() * 5000),
    segment: ['Champions', 'Loyal', 'At Risk', 'Hibernating'][Math.floor(Math.random() * 4)],
}));

// Forecasting Model Comparison
export const forecastingComparison = [
    { date: '2023-01', actual: 4000, arima: 4100, prophet: 3950, lstm: 4050 },
    { date: '2023-02', actual: 4500, arima: 4400, prophet: 4550, lstm: 4480 },
    { date: '2023-03', actual: 4200, arima: 4300, prophet: 4150, lstm: 4220 },
    { date: '2023-04', actual: 4800, arima: 4700, prophet: 4850, lstm: 4790 },
    { date: '2023-05', actual: 5100, arima: 5000, prophet: 5150, lstm: 5120 },
    { date: '2023-06', actual: 5300, arima: 5200, prophet: 5350, lstm: 5280 },
    { date: '2023-07', arima: 5400, prophet: 5600, lstm: 5500 }, // Future
    { date: '2023-08', arima: 5500, prophet: 5800, lstm: 5700 }, // Future
    { date: '2023-09', arima: 5600, prophet: 5900, lstm: 5850 }, // Future
];



// Team Management Data
export const initialEmployees = [
    { id: 1, name: 'John Doe', username: 'johndoe', email: 'john@example.com', designation: 'Sales Manager', access: true },
    { id: 2, name: 'Jane Smith', username: 'janesmith', email: 'jane@example.com', designation: 'Marketing Lead', access: true },
    { id: 3, name: 'Mike Johnson', username: 'mikej', email: 'mike@example.com', designation: 'Analyst', access: false },
    { id: 4, name: 'Sarah Williams', username: 'sarahw', email: 'sarah@example.com', designation: 'Product Owner', access: true },
];
