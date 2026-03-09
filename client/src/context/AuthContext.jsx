import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

// Lazy-load api to avoid circular deps (api uses interceptors that may need auth)
const getApi = () => import('../api/axios').then((m) => m.default);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const [token, setToken] = useState(() => localStorage.getItem('token') || null);

    // Active charging session — blocks navigation to other user pages until charging ends
    const [activeSession, setActiveSession] = useState(null);

    const login = (userData, authToken) => {
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', authToken);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        setActiveSession(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    const clearActiveSession = useCallback(() => setActiveSession(null), []);

    const fetchActiveSession = useCallback(async () => {
        if (!token || user?.role !== 'user') return null;
        try {
            const api = await getApi();
            const { data } = await api.get('/session/active');
            if (data?.session?.stationId) {
                setActiveSession({ stationId: data.session.stationId });
                return { stationId: data.session.stationId };
            }
            setActiveSession(null);
            return null;
        } catch {
            setActiveSession(null);
            return null;
        }
    }, [token, user?.role]);

    // Fetch active session on mount when user is logged in (e.g. page refresh while charging)
    useEffect(() => {
        if (token && user?.role === 'user') {
            fetchActiveSession();
        } else {
            setActiveSession(null);
        }
    }, [token, user?.role, fetchActiveSession]);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                login,
                logout,
                isAuthenticated: !!user && !!token,
                isAdmin: user?.role === 'admin',
                activeSession,
                setActiveSession,
                clearActiveSession,
                fetchActiveSession,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
