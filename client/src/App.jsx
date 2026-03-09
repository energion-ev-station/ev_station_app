import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import api from './api/axios';

import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

import UserDashboard from './pages/user/UserDashboard';
import WalletPage from './pages/user/WalletPage';
import StationListPage from './pages/user/StationListPage';
import ChargingDashboard from './pages/user/ChargingDashboard';

import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsersPage from './pages/admin/ManageUsersPage';
import RechargeWalletPage from './pages/admin/RechargeWalletPage';
import PriceConfigPage from './pages/admin/PriceConfigPage';
import Navbar from './components/Navbar';
import './App.css';

function DashboardRedirect() {
  const { user, isAuthenticated } = useAuth();
  const [redirect, setRedirect] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setRedirect('/login');
      setLoading(false);
      return;
    }
    if (user?.role === 'admin') {
      setRedirect('/admin/dashboard');
      setLoading(false);
      return;
    }
    // Regular user: check for active session and go to charging page if one exists
    api.get('/session/active')
      .then(({ data }) => {
        if (data?.session?.stationId) {
          setRedirect(`/user/charging/${data.session.stationId}`);
        } else {
          setRedirect('/user/dashboard');
        }
      })
      .catch(() => setRedirect('/user/dashboard'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  if (loading) return <LoadingSpinner />;
  return <Navigate to={redirect} replace />;
}

function AppContent() {
  const location = useLocation();
  const hideNavbar = ['/login', '/register'].includes(location.pathname);

  return (
    <div className="app-wrapper">
      <div className="announcement-banner">⚡ Swift Charge — EV Charging Platform</div>
      {!hideNavbar && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Role-based redirect */}
        <Route path="/dashboard" element={<DashboardRedirect />} />

        {/* User routes */}
        <Route path="/user/dashboard" element={
          <ProtectedRoute requiredRole="user"><UserDashboard /></ProtectedRoute>
        } />
        <Route path="/user/wallet" element={
          <ProtectedRoute requiredRole="user"><WalletPage /></ProtectedRoute>
        } />
        <Route path="/user/stations" element={
          <ProtectedRoute requiredRole="user"><StationListPage /></ProtectedRoute>
        } />
        <Route path="/user/charging/:stationId" element={
          <ProtectedRoute requiredRole="user"><ChargingDashboard /></ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute requiredRole="admin"><ManageUsersPage /></ProtectedRoute>
        } />
        <Route path="/admin/recharge" element={
          <ProtectedRoute requiredRole="admin"><RechargeWalletPage /></ProtectedRoute>
        } />
        <Route path="/admin/price" element={
          <ProtectedRoute requiredRole="admin"><PriceConfigPage /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
