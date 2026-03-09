import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import './RechargeWalletPage.css';

export default function RechargeWalletPage() {
    const navigate = useNavigate();

    // Panel 1 State: Search
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [searching, setSearching] = useState(false);
    const debounceTimer = useRef(null);

    // Panel 2 State: Selected User & Recharge
    const [selectedUser, setSelectedUser] = useState(null);
    const [amount, setAmount] = useState('');
    const [recharging, setRecharging] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Fetch all users initially, then handle search input
    const fetchUsers = async (query = '') => {
        setSearching(true);
        try {
            const res = await api.get(`/admin/users?search=${query}`);
            setUsers(res.data.users || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Debounced Search Handler
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            fetchUsers(value);
        }, 300);
    };

    // Form Submit Handler
    const handleRecharge = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');

        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount < 1 || numericAmount > 10000) {
            setErrorMsg('Amount must be between ₹1 and ₹10,000');
            return;
        }

        if (!selectedUser) return;

        setRecharging(true);
        try {
            const res = await api.post('/admin/wallet/recharge', {
                userId: selectedUser._id,
                amount: numericAmount
            });

            const newBalance = res.data.walletBalance;

            // Show success message
            setSuccessMsg(`✅ Balance updated to ₹${newBalance.toFixed(2)}`);
            setAmount('');

            // Update the local selected user state and list state so UI reflects new balance
            setSelectedUser((prev) => ({ ...prev, walletBalance: newBalance }));
            setUsers((prevList) => prevList.map(u =>
                u._id === selectedUser._id ? { ...u, walletBalance: newBalance } : u
            ));

            // Hide success message after 4s
            setTimeout(() => setSuccessMsg(''), 4000);

        } catch (err) {
            console.error('Recharge failed:', err);
            setErrorMsg(err.response?.data?.message || 'Failed to recharge wallet');
        } finally {
            setRecharging(false);
        }
    };

    // Delete User Handler
    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        const confirmDelete = window.confirm(`Are you sure you want to PERMANENTLY delete the account for ${selectedUser.name} (${selectedUser.email})?\nThis action cannot be undone.`);
        if (!confirmDelete) return;

        setSuccessMsg('');
        setErrorMsg('');

        try {
            await api.delete(`/admin/users/${selectedUser._id}`);

            // Remove from list
            setUsers((prevList) => prevList.filter(u => u._id !== selectedUser._id));

            // Clear selection
            setSelectedUser(null);

            // In a real app we'd use a global toast, but here we can just alert or rely on UI reset
            alert('User deleted successfully.');

        } catch (err) {
            console.error('Failed to delete user:', err);
            setErrorMsg(err.response?.data?.message || 'Failed to delete user.');
        }
    };

    return (
        <div className="admin-recharge-container">
            <div className="admin-recharge-header">
                <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
                    ← Back to Dashboard
                </button>
                <h2 style={{ margin: 0, color: '#ffffff', fontWeight: 800 }}>Manage User Wallets</h2>
            </div>

            <div className="recharge-layout">
                {/* Panel 1: User Search */}
                <div className="glass-panel">
                    <h3 className="panel-title">1. Search Users</h3>

                    <div className="search-wrapper">
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="search-input"
                        />
                    </div>

                    <div className="user-list">
                        {searching ? (
                            <LoadingSpinner message="Searching users..." />
                        ) : users.length === 0 ? (
                            <p className="empty-state-text" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>No users found.</p>
                        ) : (
                            users.map((u) => (
                                <div
                                    key={u._id}
                                    className={`user-card ${selectedUser?._id === u._id ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedUser(u);
                                        setSuccessMsg('');
                                        setErrorMsg('');
                                        setAmount('');
                                    }}
                                >
                                    <div className="user-info">
                                        <div className="user-name">{u.name}</div>
                                        <div className="user-email">{u.email}</div>
                                    </div>
                                    <div className="user-balance">
                                        ₹{u.walletBalance?.toFixed(2) || '0.00'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Panel 2: Recharge Form */}
                <div className="glass-panel">
                    <h3 className="panel-title">2. Recharge Wallet</h3>

                    {!selectedUser ? (
                        <div className="empty-selection">
                            Select a user from the list to recharge their wallet.
                        </div>
                    ) : (
                        <div className="recharge-form-container">
                            <div className="selected-user-header">
                                <div className="selected-user-name">{selectedUser.name}</div>
                                <div className="selected-user-email">{selectedUser.email}</div>

                                <div className="balance-display">
                                    <span className="balance-label">Current Balance</span>
                                    <span className="balance-value">
                                        ₹{selectedUser.walletBalance?.toFixed(2) || '0.00'}
                                    </span>
                                </div>
                            </div>

                            <form onSubmit={handleRecharge} className="recharge-form">
                                <div className="form-group">
                                    <label>Enter recharge amount (₹)</label>
                                    <div className="amount-input-wrapper">
                                        <span className="currency-symbol">₹</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10000"
                                            required
                                            placeholder="500"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            onWheel={(e) => e.target.blur()}
                                            className="amount-input"
                                        />
                                    </div>
                                </div>

                                {errorMsg && <div className="status-msg error-msg">{errorMsg}</div>}
                                {successMsg && <div className="status-msg success-msg">{successMsg}</div>}

                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={recharging}
                                >
                                    {recharging ? 'Processing...' : 'Add Balance'}
                                </button>
                            </form>

                            {/* Delete User Section */}
                            <div className="danger-zone">
                                <button className="btn-delete" onClick={handleDeleteUser}>
                                    🗑️ Delete Account
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

