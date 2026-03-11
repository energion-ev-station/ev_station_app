import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import LoadingSpinner from '../../components/LoadingSpinner';
import './StationListPage.css';

export default function StationListPage() {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [stations, setStations] = useState([]);
    const [plugStatuses, setPlugStatuses] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStations = async () => {
            try {
                const response = await api.get('/stations');
                const fetchedStations = response.data.stations || [];
                setStations(fetchedStations);
                
                // Initialize plug statuses based on API
                const initialStatuses = {};
                fetchedStations.forEach(s => {
                    const sId = s.id || s._id;
                    if (s.isPluggedIn !== undefined) {
                        initialStatuses[sId] = s.isPluggedIn;
                    }
                });
                setPlugStatuses(initialStatuses);
            } catch (err) {
                console.error('Failed to fetch stations:', err);
                setError('Failed to load stations. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchStations();
    }, []);

    // Listen for live plug status updates from the server
    useEffect(() => {
        if (!token) return;

        const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        const socket = io(socketUrl, { transports: ['websocket'] });

        socket.on('connect', () => {
            // Join user room just like the charging dashboard
            socket.emit('join', { token });
        });

        socket.on('plug:status', (data) => {
            if (data && data.stationId) {
                setPlugStatuses(prev => ({
                    ...prev,
                    [data.stationId]: data.isPluggedIn
                }));
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [token]);

    const handleStationClick = (station) => {
        if (station.name === 'Station 02' || station.status !== 'available') {
            alert('This station is not available right now.');
            return;
        }
        if (station.status === 'available') {
            navigate(`/user/charging/${station.id || station._id}`);
        }
    };

    return (
        <div className="station-list-container">
            <div className="station-list-header">
                <button className="btn-back" onClick={() => navigate('/user/dashboard')}>
                    ← Back
                </button>
                <h1 className="station-list-title">Select a Station</h1>
            </div>

            {error && (
                <div style={{ color: 'var(--accent-primary)', padding: '1rem', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '10px', maxWidth: '600px', margin: '0 auto 2rem' }}>
                    {error}
                </div>
            )}

            {loading ? (
                <LoadingSpinner message="Searching for nearby stations..." />
            ) : stations.length === 0 && !error ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '14px', maxWidth: '600px', margin: '0 auto' }}>
                    <p style={{ fontSize: '3rem', margin: '0 0 1rem' }}>🗺️</p>
                    <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-heading)' }}>No Stations Found</h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>There are currently no charging stations available in the system.</p>
                </div>
            ) : (
                <div className="station-grid">
                    {/* Hardcoded Station 01 logic pulling the ID from backend */}
                    {stations.length > 0 && (() => {
                        const s1 = stations[0];
                        const s1Id = s1.id || s1._id;
                        const isPlugged = plugStatuses[s1Id] || false;
                        
                        return (
                            <div
                                key={s1Id}
                                className={`station-card available`}
                                onClick={() => handleStationClick({ ...s1, name: "Station 01", status: 'available' })}
                            >
                                <div className="station-header" style={{ marginBottom: 0 }}>
                                    <div>
                                        <h3 className="station-name" style={{ margin: 0 }}>Station 01</h3>
                                        {/* Requirement 1: Live plug indicator */}
                                        <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: isPlugged ? '#10b981' : 'var(--text-muted)', fontWeight: 500 }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isPlugged ? '#10b981' : 'var(--text-muted)' }}></span>
                                            {isPlugged ? 'Plugged In' : 'Not Plugged In'}
                                        </div>
                                    </div>
                                    <span className={`status-badge available`}>
                                        Available
                                    </span>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Hardcoded Station 02 */}
                    <div
                        key="hardcoded-station-02"
                        className="station-card busy"
                        onClick={() => handleStationClick({ name: 'Station 02', status: 'busy' })}
                    >
                        <div className="station-header" style={{ marginBottom: 0 }}>
                            <div>
                                <h3 className="station-name" style={{ margin: 0 }}>Station 02</h3>
                                <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: plugStatuses['hardcoded-station-02'] ? '#10b981' : 'var(--text-muted)', fontWeight: 500 }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: plugStatuses['hardcoded-station-02'] ? '#10b981' : 'var(--text-muted)' }}></span>
                                    {plugStatuses['hardcoded-station-02'] ? 'Plugged In' : 'Not Plugged In'}
                                </div>
                            </div>
                            <span className="status-badge busy">
                                Not Available
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
