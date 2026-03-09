import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import './WalletPage.css';

export default function WalletPage() {
    const navigate = useNavigate();
    const [balance, setBalance] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchWalletData = async () => {
            try {
                // We'll fetch both balance and transactions in parallel
                const [balanceRes, transactionsRes] = await Promise.all([
                    api.get('/wallet/balance'),
                    api.get('/wallet/transactions')
                ]);

                setBalance(balanceRes.data.balance);
                setTransactions(transactionsRes.data.transactions || []);
            } catch (err) {
                console.error('Failed to fetch wallet data:', err);
                setError('Failed to load wallet data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchWalletData();
    }, []);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit' };

        const formattedDate = date.toLocaleDateString(undefined, dateOptions);
        const formattedTime = date.toLocaleTimeString(undefined, timeOptions);

        return `${formattedDate} • ${formattedTime}`;
    };

    return (
        <div className="wallet-container">
            <div className="wallet-header">
                <button className="btn-back" onClick={() => navigate('/user/dashboard')}>
                    ← Back to Dashboard
                </button>
                <h1 className="wallet-title">My Wallet</h1>
            </div>

            <div className="wallet-content">
                {error && (
                    <div style={{ color: 'var(--accent-primary)', padding: '1rem', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '10px' }}>
                        {error}
                    </div>
                )}

                <div className="balance-card-featured">
                    <p className="balance-label">Available Balance</p>
                    <h2 className="balance-amount">
                        {loading ? '₹...' : `₹${balance?.toFixed(2) || '0.00'}`}
                    </h2>
                </div>

                <div className="transactions-card">
                    <h3 className="transactions-title">🧾 Transaction History</h3>

                    {loading ? (
                        <LoadingSpinner message="Loading transactions..." />
                    ) : transactions.length === 0 ? (
                        <div className="empty-state">
                            <p style={{ fontSize: '2rem', margin: '0 0 1rem' }}>📭</p>
                            <p style={{ margin: 0 }}>No transactions yet</p>
                            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Your recharge and charging history will appear here.</p>
                        </div>
                    ) : (
                        <div className="transactions-list">
                            {transactions.map((tx) => {
                                const isRecharge = tx.type === 'recharge';
                                return (
                                    <div key={tx._id || Math.random()} className="transaction-item">
                                        <div className="tx-left">
                                            <div className={`tx-icon ${isRecharge ? 'recharge' : 'charge'}`}>
                                                {isRecharge ? '✅' : '⚡'}
                                            </div>
                                            <div className="tx-details">
                                                <span className="tx-type">
                                                    {isRecharge ? 'Wallet Recharge' : 'Charging Session'}
                                                </span>
                                                <p className="tx-date">
                                                    {formatDate(tx.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`tx-amount ${isRecharge ? 'recharge' : 'charge'}`}>
                                            {isRecharge ? '+' : '-'}₹{tx.amount.toFixed(2)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
