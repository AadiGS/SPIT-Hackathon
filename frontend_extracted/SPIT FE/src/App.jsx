import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/landing/LandingPage';
import AuthContainer from './components/auth/AuthContainer';
import DashboardLayout from './components/dashboard/layout/DashboardLayout';
import HomeDashboard from './components/dashboard/dashboards/HomeDashboard';
import MarketingDashboard from './components/dashboard/dashboards/MarketingDashboard';
import SalesDashboard from './components/dashboard/dashboards/SalesDashboard';
import ProductDashboard from './components/dashboard/dashboards/ProductDashboard';
import OperationsDashboard from './components/dashboard/dashboards/OperationsDashboard';
import FinanceDashboard from './components/dashboard/dashboards/FinanceDashboard';
import RFMSegmentation from './components/dashboard/dashboards/RFMSegmentation';
import Forecasting from './components/dashboard/dashboards/Forecasting';
import TeamManagement from './components/dashboard/dashboards/TeamManagement';
import UploadData from './components/dashboard/dashboards/UploadData';

import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page - Default Route */}
        <Route path="/" element={
          isAuthenticated ? <Navigate to="/dashboard/home" /> : <LandingPage />
        } />
        
        {/* Auth Routes */}
        <Route path="/auth" element={
          isAuthenticated ? <Navigate to="/dashboard/home" /> : <AuthContainer />
        } />

        {/* Dashboard Routes - Protected by Authentication */}
        <Route path="/dashboard" element={
          isAuthenticated ? <DashboardLayout /> : <Navigate to="/auth" />
        }>
          <Route index element={<Navigate to="/dashboard/home" />} />
          
          {/* Role-Based Protected Routes */}
          <Route path="home" element={
            <ProtectedRoute page="home"><HomeDashboard /></ProtectedRoute>
          } />
          
          <Route path="marketing" element={
            <ProtectedRoute page="marketing"><MarketingDashboard /></ProtectedRoute>
          } />
          
          <Route path="sales" element={
            <ProtectedRoute page="sales"><SalesDashboard /></ProtectedRoute>
          } />
          
          <Route path="product" element={
            <ProtectedRoute page="product"><ProductDashboard /></ProtectedRoute>
          } />
          
          <Route path="operations" element={
            <ProtectedRoute page="operations"><OperationsDashboard /></ProtectedRoute>
          } />
          
          <Route path="finance" element={
            <ProtectedRoute page="finance"><FinanceDashboard /></ProtectedRoute>
          } />
          
          <Route path="rfm" element={
            <ProtectedRoute page="rfm"><RFMSegmentation /></ProtectedRoute>
          } />
          
          <Route path="forecasting" element={
            <ProtectedRoute page="forecasting"><Forecasting /></ProtectedRoute>
          } />
          
          {/* Admin/Super Admin Only Pages */}
          <Route path="upload" element={
            <ProtectedRoute page="upload"><UploadData /></ProtectedRoute>
          } />
          
          <Route path="team" element={
            <ProtectedRoute page="team_management"><TeamManagement /></ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
