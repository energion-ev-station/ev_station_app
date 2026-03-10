import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Register() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/auth/register', form);
            login(data.user, data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h2 style={styles.title}>Energion <span style={styles.titleAccent}>⚡</span></h2>
                <p style={styles.subtitle}>Create your account</p>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <label style={styles.label}>Name</label>
                    <input
                        style={styles.input}
                        type="text"
                        name="name"
                        placeholder="Your name"
                        value={form.name}
                        onChange={handleChange}
                        required
                    />

                    <label style={styles.label}>Email</label>
                    <input
                        style={styles.input}
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />

                    <label style={styles.label}>Password</label>
                    <input
                        style={styles.input}
                        type="password"
                        name="password"
                        placeholder="Min. 6 characters"
                        value={form.password}
                        onChange={handleChange}
                        required
                    />



                    {error && <p style={styles.error}>{error}</p>}

                    <button style={styles.button} type="submit" disabled={loading}>
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <p style={styles.footer}>
                    Already have an account?{' '}
                    <Link to="/login" style={styles.link}>Sign In</Link>
                </p>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        padding: '2rem 1rem',
    },
    card: {
        background: '#111111',
        padding: '2.5rem 2rem',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.08)',
        width: '100%',
        maxWidth: '400px',
    },
    title: { margin: 0, fontSize: '1.75rem', textAlign: 'center', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 },
    titleAccent: { color: '#4ecca3' },
    subtitle: { textAlign: 'center', color: '#cccccc', marginTop: '6px', marginBottom: '1.75rem', fontSize: '0.95rem' },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    label: { fontWeight: 600, fontSize: '0.8rem', color: '#cccccc', textTransform: 'uppercase', letterSpacing: '0.05em' },
    input: {
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        border: '1px solid #1a1a1a',
        fontSize: '1rem',
        outline: 'none',
        background: '#111111',
        color: '#ffffff',
    },
    error: {
        color: '#ff6b6b',
        fontSize: '0.85rem',
        background: 'rgba(255,107,107,0.1)',
        border: '1px solid rgba(255,107,107,0.3)',
        padding: '0.5rem 0.75rem',
        borderRadius: '8px',
    },
    button: {
        marginTop: '0.5rem',
        padding: '0.85rem 1.5rem',
        background: '#4ecca3',
        color: '#0a0a0a',
        fontWeight: 700,
        fontSize: '1rem',
        border: 'none',
        borderRadius: '999px',
        cursor: 'pointer',
    },
    footer: { textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#8a8a8a' },
    link: { color: '#4ecca3', fontWeight: 600, textDecoration: 'none' },
};
