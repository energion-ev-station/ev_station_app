import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    // Close menu when clicking outside (simple version)
    const closeMenu = () => setIsMenuOpen(false);

    return (
        <nav className="navbar">
            <Link to="/" className="nav-brand">
                Energion <span>⚡</span>
            </Link>

            <div className="nav-right">
                {isAuthenticated ? (
                    <div className="user-menu-container">
                        <button className="user-menu-trigger" onClick={toggleMenu}>
                            <span className="user-icon">👤</span>
                        </button>

                        {isMenuOpen && (
                            <div className="user-dropdown">
                                {isAdmin && <div className="dropdown-item admin-link">Admin Panel</div>}
                                <button className="dropdown-item logout-link" onClick={handleLogout}>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link to="/login" className="nav-user" style={{ textDecoration: 'none' }}>
                        Login
                    </Link>
                )}
            </div>
        </nav>
    );
}
