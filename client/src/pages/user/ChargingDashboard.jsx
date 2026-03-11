import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import './ChargingDashboard.css';

export default function ChargingDashboard() {
    const { stationId } = useParams();
    const navigate = useNavigate();
    const { token, setActiveSession, clearActiveSession } = useAuth();

    // UI States: "idle" | "charging" | "ended"
    const [status, setStatus] = useState('idle');
    const [loading, setLoading] = useState(true);

    // Data state
    const [stationName, setStationName] = useState('Loading Station...');
    const [isPluggedIn, setIsPluggedIn] = useState(false);
    const [initialBalance, setInitialBalance] = useState(0);
    const [pricePerUnit, setPricePerUnit] = useState(15);
    const [minBalanceRequirement, setMinBalanceRequirement] = useState(10);

    // Live data
    const [energyConsumed, setEnergyConsumed] = useState(0.00);
    const [amountDeducted, setAmountDeducted] = useState(0.00);
    const [currentBalance, setCurrentBalance] = useState(0.00);
    const [voltage, setVoltage] = useState(0);
    const [current, setCurrent] = useState(0.0);
    const [elapsedTime, setElapsedTime] = useState('00:00');
    const [maxEnergy, setMaxEnergy] = useState(0);

    // End session
    const [finalEnergy, setFinalEnergy] = useState(0);
    const [finalCost, setFinalCost] = useState(0);
    const [finalReason, setFinalReason] = useState('');
    const [finalDuration, setFinalDuration] = useState('');

    // Error state
    const [error, setError] = useState(null);

    const socketRef = useRef(null);

    // Initial load: fetch wallet balance and check for active session
    useEffect(() => {
        const initDashboard = async () => {
            try {
                // 1. Check for active session
                const sessionRes = await api.get('/session/active');

                // 2. Fetch station info & config & health constants
                const [stationsRes, walletRes, priceRes, healthRes] = await Promise.all([
                    api.get('/stations').catch(() => ({ data: { stations: [] } })),
                    api.get('/wallet/balance').catch(() => ({ data: { balance: 0 } })),
                    api.get('/admin/price').catch(() => ({ data: { pricePerUnit: 15 } })),
                    api.get('/health', { baseURL: import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000' }).catch(() => ({ data: {} }))
                ]);

                // Find our station's name
                const stations = stationsRes.data.stations || [];
                const currentStation = stations.find(s => s._id === stationId || s.id === stationId);
                setStationName(currentStation ? currentStation.name : stationId);
                setIsPluggedIn(currentStation ? currentStation.isPluggedIn : false);

                // c. Is station busy (another user)?
                if (currentStation && currentStation.status === 'busy') {
                    // Check if *this* user has an active session on it (handled below).
                    // If not, we redirect out.
                    const isMySession = sessionRes.data.session && sessionRes.data.session.stationId === stationId;
                    if (!isMySession) {
                        navigate('/user/stations', { replace: true });
                        return;
                    }
                }

                const price = priceRes.data.pricePerUnit || 15;
                setPricePerUnit(price);

                if (healthRes.data?.constants?.MINIMUM_WALLET_BALANCE) {
                    setMinBalanceRequirement(healthRes.data.constants.MINIMUM_WALLET_BALANCE);
                }

                if (sessionRes.data.session) {
                    const sessionData = sessionRes.data.session;
                    // Active session at different station — redirect to correct one
                    if (sessionData.stationId && sessionData.stationId !== stationId) {
                        navigate(`/user/charging/${sessionData.stationId}`, { replace: true });
                        return;
                    }
                    setActiveSession({ stationId: sessionData.stationId });
                    setInitialBalance(sessionData.walletBalance || walletRes.data.balance);
                    setCurrentBalance(sessionData.walletBalance || walletRes.data.balance);
                    setMaxEnergy(sessionData.maxEnergyLimit || 0);
                    setStatus('charging'); // Force into live charging state if active session
                } else {
                    const bal = walletRes.data.balance;
                    setInitialBalance(bal);
                    setCurrentBalance(bal);
                    setStatus('idle');
                }

            } catch (err) {
                console.error('Error initializing dashboard:', err);
                setError('Could not connect to the station. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        if (status === 'idle') {
            initDashboard();
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [stationId]);

    // Format elapsed time helper
    const calculateElapsed = (startTimeStr) => {
        const diffMs = Date.now() - new Date(startTimeStr).getTime();
        const totalSec = Math.floor(diffMs / 1000);
        const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
        const s = (totalSec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const pricePerUnitRef = useRef(pricePerUnit);
    const energyConsumedRef = useRef(energyConsumed);
    const elapsedTimeRef = useRef(elapsedTime);

    useEffect(() => {
        pricePerUnitRef.current = pricePerUnit;
        energyConsumedRef.current = energyConsumed;
        elapsedTimeRef.current = elapsedTime;
    });

    // Socket Initialization Logic
    useEffect(() => {
        if (!token) return;
        if (socketRef.current) return;

        const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        const socket = io(socketUrl, {
            transports: ['websocket']
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            // Join the user room for private data emissions
            socket.emit('join', { token });
        });

        socket.on('joined', (data) => {
            console.log('Joined room:', data.room);
        });

        // Listen for live updates
        socket.on('session:update', (data) => {
            if (data.energyConsumed !== undefined) setEnergyConsumed(data.energyConsumed);
            if (data.amountDeducted !== undefined) setAmountDeducted(data.amountDeducted);
            if (data.voltage !== undefined) setVoltage(data.voltage);
            if (data.current !== undefined) setCurrent(data.current);
            if (data.walletBalance !== undefined) setCurrentBalance(data.walletBalance);

            if (data.startTime) {
                setElapsedTime(calculateElapsed(data.startTime));
            }
        });

        // Listen for plug status updates
        socket.on('plug:status', (data) => {
            if (data.stationId === stationId) {
                setIsPluggedIn(data.isPluggedIn);
            }
        });

        // Handle session auto-terminate or explicit end from backend
        socket.on('session:ended', (data) => {
            console.log('Session ended by backend:', data);
            clearActiveSession();
            
            const currentEnergy = energyConsumedRef.current;
            const currentPrice = pricePerUnitRef.current;
            const currentElapsed = elapsedTimeRef.current;

            // Read from either nested 'session' object or top-level props depending on backend emission structure
            if (data.session) {
                setFinalEnergy(data.session.energyConsumed || currentEnergy);
                setFinalCost(data.session.totalCost || (currentEnergy * currentPrice));
            } else {
                setFinalEnergy(data.totalEnergy !== undefined ? data.totalEnergy : currentEnergy);
                setFinalCost(data.totalCost !== undefined ? data.totalCost : (currentEnergy * currentPrice));
            }
            
            if (data.reasonEnded) {
                setFinalReason(data.reasonEnded);
            }
            
            if (data.startTime && data.endTime) {
                const diffMs = new Date(data.endTime).getTime() - new Date(data.startTime).getTime();
                const totalSec = Math.floor(diffMs / 1000);
                const h = Math.floor(totalSec / 3600);
                const m = Math.floor((totalSec % 3600) / 60);
                const s = totalSec % 60;
                let durationStr = '';
                if (h > 0) durationStr += `${h}h `;
                if (m > 0 || h > 0) durationStr += `${m}m `;
                durationStr += `${s}s`;
                setFinalDuration(durationStr);
            } else {
                setFinalDuration(prev => prev || currentElapsed);
            }

            if (data.walletBalance !== undefined) {
                setCurrentBalance(data.walletBalance);
            }

            setStatus('ended');

            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [token, stationId, clearActiveSession]);

    const handleStartChargingUI = async () => {
        try {
            setError(null);

            // Immediately attempt to start the session
            const res = await api.post('/session/start', { stationId });
            console.log('Session started:', res.data);

            const session = res.data.session;
            setMaxEnergy(session.maxEnergyLimit || 0);
            setActiveSession({ stationId });

            // If successful (no 400 error about plug), enter live charging state
            setStatus('charging');

        } catch (err) {
            console.error('Error starting charging:', err);
            // This will display the "Plug is not connected" message sent from the backend
            setError(err.response?.data?.message || 'Failed to start session.');
        }
    };

    const handleStopCharging = async () => {
        try {
            // Optimistically set the reason and duration in case socket takes a moment or race condition
            setFinalReason('Stopped by user');
            if (!finalDuration) setFinalDuration(elapsedTime);
            
            await api.post('/session/stop');
            clearActiveSession();
            // The backend 'stop' endpoint triggers endSession which emits 'session:ended' to socket.
            // But we eagerly reflect UI just in case:
            setFinalEnergy(energyConsumed);
            setFinalCost(energyConsumed * pricePerUnit);
            setStatus('ended');

            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        } catch (err) {
            console.error('Error stopping charging:', err);
            setError('Failed to stop charging. Please try again.');
        }
    };

    if (loading && status === 'idle') {
        return (
            <div className="charging-dashboard-container">
                <div className="charging-card" style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                    <p>Connecting to station...</p>
                </div>
            </div>
        );
    }

    const progressPercent = maxEnergy > 0 ? Math.min((energyConsumed / maxEnergy) * 100, 100) : 0;
    const isLowBalance = currentBalance < minBalanceRequirement;

    return (
        <div className="charging-dashboard-container">
            <div className="charging-card">

                {error && (
                    <div className="warning-card" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>{error}</div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button onClick={handleStartChargingUI} className="action-btn btn-green">
                                🔄 Try Again
                            </button>
                        </div>
                    </div>
                )}

                {status !== 'charging' && (
                    <button className="btn-back" onClick={() => navigate('/user/stations')} style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'none', border: 'none', color: '#64748b', fontSize: '1rem', cursor: 'pointer', padding: 0 }}>
                        ← Back
                    </button>
                )}

                {status !== 'charging' && status !== 'ended' && (
                    <div style={{ marginTop: '2rem' }}>
                        <h2 className="station-title">{stationName}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
                            <p className="station-subtitle" style={{ margin: 0 }}>Station ID: {stationId}</p>
                            {/* Requirement 2d: Show plug status live in charging card */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', backgroundColor: isPluggedIn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)', color: isPluggedIn ? '#10b981' : '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isPluggedIn ? '#10b981' : '#64748b' }}></span>
                                {isPluggedIn ? 'Plugged In' : 'Not Plugged In'}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- STATE 1: IDLE --- */}
                {status === 'idle' && !error && (
                    <>
                        <div className="balance-card">
                            <p className="balance-label">Current Wallet Balance</p>
                            <p className="balance-value">₹{initialBalance.toFixed(2)}</p>
                        </div>

                        {initialBalance >= minBalanceRequirement ? (
                            <div className="state-connected">
                                <div className="energy-limit-card">
                                    <p className="energy-label">Max Chargeable Energy</p>
                                    <p className="energy-value">
                                        {(initialBalance / pricePerUnit).toFixed(2)} <span style={{ fontSize: '1.25rem' }}>kWh</span>
                                    </p>
                                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                                        Based on your ₹{initialBalance.toFixed(2)} balance at ₹{pricePerUnit}/kWh
                                    </p>
                                </div>

                                {/* Requirement 3a & 3b: If not plugged in show warning, if plugged in show button */}
                                {!isPluggedIn ? (
                                    <div className="warning-card">
                                        ⚠️ Please plug in your EV to the station first.
                                    </div>
                                ) : (
                                    <button className="action-btn btn-green" onClick={handleStartChargingUI}>
                                        ⚡ Start Charging
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="warning-card">
                                    ⚠️ Insufficient balance. Please recharge at the admin desk.
                                </div>
                                <button className="action-btn" onClick={() => navigate('/user/wallet')} style={{ background: 'var(--accent-warning)', color: '#0a0a0a' }}>
                                    Go to Wallet
                                </button>
                            </>
                        )}
                    </>
                )}

                {/* --- STATE 4: CHARGING (LIVE) --- */}
                {status === 'charging' && (
                    <div className="state-charging">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <h2 className="station-title" style={{ margin: 0, textAlign: 'left' }}>{stationName}</h2>
                                {/* Requirement 4: Live plug status indicator */}
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '12px', backgroundColor: isPluggedIn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)', color: isPluggedIn ? '#10b981' : '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isPluggedIn ? '#10b981' : '#64748b' }}></span>
                                    {isPluggedIn ? 'Plugged In' : 'Not Plugged In'}
                                </div>
                            </div>
                            <div className="pulse-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-secondary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                <span className="badge badge-live" style={{ width: '8px', height: '8px', background: 'var(--accent-secondary)', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span>
                                LIVE
                            </div>
                        </div>

                        {/* Requirement 4: Progress Bar */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>
                                <span>Progress</span>
                                <span>{progressPercent.toFixed(1)}% ({maxEnergy > 0 ? maxEnergy.toFixed(2) : '0.00'} kWh limit)</span>
                            </div>
                            <div style={{ width: '100%', height: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '6px', overflow: 'hidden' }}>
                                <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: 'var(--accent-secondary)', transition: 'width 0.5s ease' }}></div>
                            </div>
                        </div>

                        <div className="live-stats-grid">
                            <div className="stat-card primary">
                                <span className="stat-label">Energy Consumed</span>
                                <span className="stat-value">{energyConsumed.toFixed(2)} <span className="stat-unit">kWh</span></span>
                            </div>

                            {/* Requirement 4: Amount Deducted live */}
                            <div className="stat-card primary">
                                <span className="stat-label">Amount Deducted</span>
                                <span className="stat-value">₹{amountDeducted.toFixed(2)}</span>
                            </div>

                            <div className="stat-card">
                                <span className="stat-label">Wallet Balance</span>
                                <span className={`stat-value ${isLowBalance ? 'balance-low' : ''}`}>
                                    ₹{currentBalance.toFixed(2)}
                                </span>
                            </div>

                            {/* Requirement 4: Remaining kWh estimate live */}
                            <div className="stat-card">
                                <span className="stat-label">Est. Remaining</span>
                                <span className="stat-value">{(currentBalance / pricePerUnit).toFixed(2)} <span className="stat-unit">kWh</span></span>
                            </div>

                            <div className="stat-card">
                                <span className="stat-label">Elapsed Time</span>
                                <span className="stat-value">{elapsedTime}</span>
                            </div>

                            {/* Requirement 4: Voltage and Current live */}
                            <div className="stat-card">
                                <span className="stat-label">V / A</span>
                                <span className="stat-value">{Math.round(voltage)}<span className="stat-unit">V</span> / {current.toFixed(1)}<span className="stat-unit">A</span></span>
                            </div>
                        </div>

                        <button className="action-btn btn-red" onClick={handleStopCharging} style={{ marginTop: '1.5rem' }}>
                            🛑 Stop Charging
                        </button>

                        <style>{`
                            @keyframes pulse {
                                0% { opacity: 1; transform: scale(1); }
                                50% { opacity: 0.5; transform: scale(1.2); }
                                100% { opacity: 1; transform: scale(1); }
                            }
                        `}</style>
                    </div>
                )}

                {/* --- STATE 5: ENDED --- */}
                {status === 'ended' && (
                    <div className="state-ended">
                        <h2 className="ended-title">✅ Session Completed</h2>
                        {finalReason && (
                            <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                                Reason: <span style={{ color: 'var(--text-heading)' }}>{finalReason}</span>
                            </p>
                        )}

                        <div className="summary-card">
                            <div className="summary-row">
                                <span className="summary-label">Duration</span>
                                <span className="summary-val">{finalDuration || elapsedTime || '--'}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-label">Total Energy</span>
                                <span className="summary-val">{finalEnergy.toFixed(2)} kWh</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-label">Total Cost</span>
                                <span className="summary-val" style={{ color: '#dc2626' }}>-₹{finalCost.toFixed(2)}</span>
                            </div>
                            <div className="summary-row" style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '2px solid #e2e8f0' }}>
                                <span className="summary-label">Final Balance</span>
                                <span className="summary-val" style={{ color: '#10b981' }}>₹{currentBalance.toFixed(2)}</span>
                            </div>
                        </div>

                        <button className="action-btn" onClick={() => navigate('/user/stations')} style={{ background: 'var(--text-heading)', color: 'var(--bg-page)' }}>
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
