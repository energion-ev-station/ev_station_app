import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeSessions, setActiveSessions] = useState(0);

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const res = await api.get('/admin/sessions/active');
                setActiveSessions(res.data.count || 0);
            } catch (err) {
                console.error("Failed to fetch active sessions", err);
            }
        };
        fetchSessions();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <h2 style={styles.title}>Admin Dashboard</h2>
                    <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
                </div>

                <div style={styles.grid}>
                    {/* Management Card */}
                    <div style={{ ...styles.card, cursor: 'pointer' }} onClick={() => navigate('/admin/recharge')} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(78,204,163,0.4)'; e.currentTarget.style.background = 'rgba(78,204,163,0.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#111111'; }}>
                        <div style={styles.icon}>👥</div>
                        <h3>Manage Users / Recharge Wallets</h3>
                        <p style={styles.desc}>View users and recharge client balances.</p>
                    </div>

                    {/* Active Sessions Card (Info Only) */}
                    <div style={styles.card}>
                        <div style={styles.icon}>⚡</div>
                        <h3>Active Sessions</h3>
                        <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0', color: '#4ecca3' }}>
                            {activeSessions}
                        </h2>
                        <p style={styles.desc}>Currently charging EVs</p>
                    </div>

                    {/* Price Card */}
                    <div style={{ ...styles.card, cursor: 'pointer' }} onClick={() => navigate('/admin/price')} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(78,204,163,0.4)'; e.currentTarget.style.background = 'rgba(78,204,163,0.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#111111'; }}>
                        <div style={styles.icon}>💰</div>
                        <h3>Set Energy Price</h3>
                        <p style={styles.desc}>Configure the global per-kWh charging rate.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: { minHeight: '100vh', background: '#0a0a0a', padding: '2rem 1.5rem' },
    container: { maxWidth: '600px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
    title: { fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', margin: 0 },
    logoutBtn: { padding: '0.6rem 1.25rem', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: 700 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' },
    card: {
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '2rem',
        borderRadius: '14px',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'border-color 0.2s, background 0.2s',
    },
    icon: { fontSize: '2.5rem', marginBottom: '1rem' },
    desc: { color: '#8a8a8a', fontSize: '0.95rem', margin: 0 }
};
