/**
 * API Service for backend communication
 * Handles authentication and data fetching from Prophet ML Backend
 */

const API_BASE_URL = 'http://localhost:8003';

/**
 * Get authentication headers with JWT token
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

/**
 * Authentication API endpoints
 */
export const authAPI = {
  /**
   * Request OTP code for login (hardcoded to 123456)
   */
  requestOTP: async (email) => {
    const response = await fetch(`${API_BASE_URL}/auth/request-otp?email=${encodeURIComponent(email)}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to request OTP');
    }
    
    return response.json();
  },

  /**
   * Verify OTP and get JWT token
   */
  verifyOTP: async (email, otpCode) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp?email=${encodeURIComponent(email)}&otp_code=${encodeURIComponent(otpCode)}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Invalid OTP');
    }
    
    return response.json();
  },

  /**
   * Get current user information
   */
  getMe: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get user info');
    }
    
    return response.json();
  },
};

/**
 * Company Management API endpoints
 */
export const companyAPI = {
  /**
   * Register a new company with super admin
   */
  registerCompany: async (companyName, city, country, adminEmail) => {
    const response = await fetch(`${API_BASE_URL}/company/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company_name: companyName,
        city,
        country,
        admin_email: adminEmail,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to register company');
    }
    
    return response.json();
  },

  /**
   * Create a new team member (Admin/Super Admin only)
   */
  createUser: async (email, role) => {
    const response = await fetch(`${API_BASE_URL}/company/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ email, role }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create user');
    }
    
    return response.json();
  },

  /**
   * List all team members (Admin/Super Admin only)
   */
  listUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/company/users`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to list users');
    }
    
    return response.json();
  },

  /**
   * Enable or disable a user (Admin/Super Admin only)
   */
  updateUserStatus: async (userId, isActive) => {
    const response = await fetch(`${API_BASE_URL}/company/users/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        user_id: userId,
        is_active: isActive,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update user status');
    }
    
    return response.json();
  },

  /**
   * Get available roles with permissions
   */
  getRoles: async () => {
    const response = await fetch(`${API_BASE_URL}/company/roles`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get roles');
    }
    
    return response.json();
  },
};

/**
 * Data API endpoints
 */
export const dataAPI = {
  /**
   * Upload CSV file
   */
  uploadCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/upload-csv`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload CSV');
    }
    
    return response.json();
  },

  /**
   * List all uploaded CSV files
   */
  listCSVFiles: async () => {
    const response = await fetch(`${API_BASE_URL}/csv-files`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to list CSV files');
    }
    
    return response.json();
  },

  /**
   * Check processing status of a file
   */
  checkProcessingStatus: async (fileId, companyId) => {
    const response = await fetch(`${API_BASE_URL}/processing-status/${fileId}?company_id=${companyId}`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to check processing status');
    }
    
    return response.json();
  },

  /**
   * Run forecasting pipeline for uploaded file
   */
  runForecasts: async (fileId, companyId) => {
    const response = await fetch(`${API_BASE_URL}/run-all-forecasts?file_id=${fileId}&company_id=${companyId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to run forecasts');
    }
    
    return response.json();
  },

  /**
   * Get forecast results with optional filters
   */
  getForecastResults: async (fileId, companyId, metric = null, groupType = null, groupKey = null) => {
    let url = `${API_BASE_URL}/forecast-results/${fileId}?company_id=${companyId}`;
    if (metric) url += `&metric=${metric}`;
    if (groupType) url += `&group_type=${groupType}`;
    if (groupKey) url += `&group_key=${groupKey}`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get forecast results');
    }
    
    return response.json();
  },

  /**
   * Get available filter options (regions and categories)
   */
  getFilterOptions: async (fileId, companyId) => {
    const response = await fetch(`${API_BASE_URL}/filter-options/${fileId}?company_id=${companyId}`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get filter options');
    }
    
    return response.json();
  },

  /**
   * Get product clusters for a file
   */
  getProductClusters: async (fileId, companyId) => {
    const response = await fetch(`${API_BASE_URL}/product-clusters/${fileId}?company_id=${companyId}`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get product clusters');
    }
    
    return response.json();
  },

  /**
   * Generate AI insights based on current data and filters
   */
  generateAIInsights: async (fileId, companyId, rfmData, forecastData, filters) => {
    const response = await fetch(`${API_BASE_URL}/ai-insights/${fileId}?company_id=${companyId}`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rfm_data: rfmData,
        forecast_data: forecastData,
        filters: filters
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate AI insights');
    }
    
    return response.json();
  },

  /**
   * Get RFM segments for a file
   */
  getRFMSegments: async (fileId, companyId, segment = null) => {
    let url = `${API_BASE_URL}/rfm/${fileId}?company_id=${companyId}`;
    if (segment) url += `&segment=${segment}`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get RFM segments');
    }
    
    return response.json();
  },

  /**
   * List all companies (admin endpoint)
   */
  listCompanies: async () => {
    const response = await fetch(`${API_BASE_URL}/companies`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to list companies');
    }
    
    return response.json();
  },
};

/**
 * Data transformation utilities
 */
export const transformers = {
  /**
   * Transform forecast data to chart format (weekly aggregation)
   */
  forecastToWeeklyChart: (forecastData) => {
    if (!forecastData || forecastData.length === 0) return [];
    
    const weeklyData = [];
    for (let i = 0; i < forecastData.length; i += 7) {
      const weekSlice = forecastData.slice(i, i + 7);
      const weekRevenue = weekSlice.reduce((sum, day) => sum + (day.yhat || 0), 0);
      weeklyData.push({
        week: `Week ${Math.floor(i / 7) + 1}`,
        predicted: Math.round(weekRevenue),
        date: weekSlice[0].ds
      });
    }
    
    return weeklyData;
  },

  /**
   * Transform forecast data to daily chart format
   */
  forecastToDailyChart: (forecastData) => {
    if (!forecastData || forecastData.length === 0) return [];
    
    return forecastData.map((day, index) => ({
      day: `Day ${index + 1}`,
      date: day.ds,
      revenue: Math.round(day.yhat || 0),
      lower: Math.round(day.yhat_lower || 0),
      upper: Math.round(day.yhat_upper || 0)
    }));
  },

  /**
   * Transform RFM segments to pie chart format
   */
  rfmToPieChart: (segments, totalCustomers) => {
    const colorMap = {
      'Champions': '#10b981',
      'Loyal': '#3b82f6',
      'Potential': '#8b5cf6',
      'At-Risk': '#f59e0b',
      'Hibernating': '#ef4444',
      'Big Spenders': '#ec4899',
      'Price Sensitive': '#6366f1'
    };
    
    return segments.map(seg => ({
      name: seg.segment_name,
      value: totalCustomers ? Math.round((seg.customer_count / totalCustomers) * 100) : seg.customer_count,
      color: colorMap[seg.segment_name] || '#8884d8',
      revenue: seg.total_revenue
    }));
  },

  /**
   * Transform product clusters to treemap format
   */
  clustersToTreemap: (clusters) => {
    const colors = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#ffc658', '#ff8042'];
    
    return clusters.map((cluster, idx) => ({
      name: cluster.cluster_name || `Cluster ${cluster.cluster_id}`,
      size: cluster.cluster_size,
      fill: colors[idx % colors.length],
      cluster_id: cluster.cluster_id,
      top_terms: cluster.top_terms
    }));
  },
};

export default {
  authAPI,
  dataAPI,
  transformers,
};

