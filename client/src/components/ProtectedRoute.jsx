import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
    const { isAuthenticated, user, activeSession } = useAuth();
    const location = useLocation();
    const path = location.pathname;

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    if (requiredRole && user?.role !== requiredRole) {
        // Redirect directly to user's own dashboard, bypassing /dashboard to avoid loops
        const fallback = user?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard';
        return <Navigate to={fallback} replace />;
    }

    // User with active session can only stay on their charging page — block other user routes
    if (requiredRole === 'user' && activeSession?.stationId) {
        const isChargingPage = path.startsWith('/user/charging/');
        if (!isChargingPage) {
            return <Navigate to={`/user/charging/${activeSession.stationId}`} replace />;
        }
    }

    return children;
}
