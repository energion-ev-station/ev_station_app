import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import './UserDashboard.css';

export default function UserDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [minBalanceRequirement, setMinBalanceRequirement] = useState(10);

    useEffect(() => {
        const fetchBalanceAndConfig = async () => {
            try {
                const [balRes, healthRes] = await Promise.all([
                    api.get('/wallet/balance'),
                    api.get('/health', { baseURL: import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000' })
                ]);
                setBalance(balRes.data.balance);
                if (healthRes.data?.constants?.MINIMUM_WALLET_BALANCE) {
                    setMinBalanceRequirement(healthRes.data.constants.MINIMUM_WALLET_BALANCE);
                }
            } catch (err) {
                console.error('Failed to fetch balance:', err);
                setError('Failed to load wallet balance.');
                // Fallback to user context balance if API fails
                setBalance(user?.walletBalance ?? 0);
            } finally {
                setLoading(false);
            }
        };

        fetchBalanceAndConfig();
    }, [user]);

    const isLowBalance = balance !== null && balance < minBalanceRequirement;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1 className="welcome-title">Welcome back, {user?.name || user?.email || 'User'}!</h1>
                <p className="welcome-subtitle">Here is an overview of your EV charging account.</p>
            </div>

            <div className="dashboard-content">
                <div className="balance-card">
                    <div>
                        <div className="balance-label">Current Balance</div>
                        <h2 className="balance-amount">
                            {loading ? '₹...' : `₹${balance?.toFixed(2) || '0.00'}`}
                        </h2>
                    </div>
                    {isLowBalance && (
                        <div className="low-balance-notice">
                            ⚠️ Low balance. Please recharge soon.
                        </div>
                    )}
                </div>

                {error && <div style={{ color: 'var(--accent-primary)', padding: '1rem', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '10px' }}>{error}</div>}

                <div className="action-cards">
                    <div className="action-card" onClick={() => navigate('/user/wallet')}>
                        <div className="action-icon">💳</div>
                        <h3 className="action-title">Check Wallet</h3>
                        <p className="action-desc">View history and recharge</p>
                    </div>

                    <div className="action-card" onClick={() => navigate('/user/stations')}>
                        <div className="action-icon">🔌</div>
                        <h3 className="action-title">Start Charging</h3>
                        <p className="action-desc">Find stations nearby</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
