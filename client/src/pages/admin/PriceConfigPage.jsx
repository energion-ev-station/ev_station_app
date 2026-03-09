import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function PriceConfigPage() {
    const navigate = useNavigate();

    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Fetch current price on mount
    useEffect(() => {
        const fetchCurrentPrice = async () => {
            try {
                const res = await api.get('/admin/price');
                if (res.data.pricePerUnit) {
                    setPrice(res.data.pricePerUnit.toString());
                }
            } catch (err) {
                console.error('Failed to fetch price:', err);
                setErrorMsg('Error loading current price. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchCurrentPrice();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');

        const numericPrice = parseFloat(price);

        // Validation: between ₹0.01 and ₹1000
        if (isNaN(numericPrice) || numericPrice < 0.01 || numericPrice > 1000) {
            setErrorMsg('Price must be between ₹0.01 and ₹1000');
            return;
        }

        setUpdating(true);
        try {
            const res = await api.put('/admin/price', { pricePerUnit: numericPrice });
            setSuccessMsg(`✅ Price updated to ₹${res.data.pricePerUnit.toFixed(2)}/kWh`);

            // Format input nicely
            setPrice(res.data.pricePerUnit.toString());

            // Hide message after 5 seconds
            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (err) {
            console.error('Failed to update price:', err);
            setErrorMsg(err.response?.data?.message || 'Failed to update price');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <button style={styles.backBtn} onClick={() => navigate('/admin/dashboard')}>
                    ← Back to Dashboard
                </button>
                <h2 style={{ margin: 0, color: '#ffffff', fontWeight: 800 }}>Energy Pricing Configuration</h2>
            </div>

            <div style={styles.cardContainer}>
                <div style={styles.card}>
                    <div style={styles.warningBox}>
                        ⚠️ <strong>Note:</strong> Price changes only affect <em>new</em> charging sessions. Active sessions will continue at the rate they were started with.
                    </div>

                    {loading ? (
                        <LoadingSpinner message="Loading pricing configuration..." />
                    ) : (
                        <form onSubmit={handleSubmit} style={styles.formContainer}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>
                                    Global Energy Price (₹ / kWh)
                                </label>
                                <div style={styles.inputWrapper}>
                                    <span style={styles.currencyPrefix}>₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max="1000"
                                        required
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        style={styles.priceInput}
                                    />
                                    <span style={styles.unitSuffix}>/ kWh</span>
                                </div>
                            </div>

                            {errorMsg && <div style={styles.errorText}>{errorMsg}</div>}
                            {successMsg && <div style={styles.successText}>{successMsg}</div>}

                            <button
                                type="submit"
                                style={{ ...styles.submitBtn, opacity: updating ? 0.7 : 1 }}
                                disabled={updating}
                            >
                                {updating ? 'Updating...' : 'Update Price'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: { minHeight: '100vh', background: '#0a0a0a', padding: '2rem 1.5rem' },
    header: { maxWidth: '600px', margin: '0 auto 2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' },
    backBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#4ecca3', fontWeight: 600, cursor: 'pointer', fontSize: '1rem', padding: '0.5rem 1rem', borderRadius: '999px' },
    cardContainer: { maxWidth: '600px', margin: '0 auto' },
    card: { background: '#111111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '2rem' },

    warningBox: { background: 'rgba(245,166,35,0.1)', borderLeft: '4px solid #f5a623', color: '#f5a623', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.5' },
    loadingState: { textAlign: 'center', padding: '2rem', color: '#8a8a8a' },

    formContainer: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    label: { fontWeight: 600, color: '#cccccc', fontSize: '0.95rem' },

    inputWrapper: { display: 'flex', alignItems: 'center', border: '1px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden', background: '#111111' },
    currencyPrefix: { padding: '1rem', background: 'rgba(255,255,255,0.03)', color: '#8a8a8a', fontWeight: 700, fontSize: '1.2rem', borderRight: '1px solid #1a1a1a' },
    priceInput: { flex: 1, border: 'none', padding: '1rem', fontSize: '1.5rem', fontWeight: 700, color: '#4ecca3', outline: 'none', background: '#111111', textAlign: 'center' },
    unitSuffix: { padding: '1rem', color: '#8a8a8a', fontWeight: 600, background: '#111111' },

    submitBtn: { padding: '1rem', background: '#4ecca3', color: '#0a0a0a', border: 'none', borderRadius: '999px', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', outline: 'none' },

    errorText: { color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' },
    successText: { color: '#4ecca3', background: 'rgba(78,204,163,0.1)', border: '1px solid rgba(78,204,163,0.25)', padding: '0.75rem', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, textAlign: 'center' }
};
