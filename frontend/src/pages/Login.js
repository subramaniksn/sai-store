import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));

            const role = res.data.user.role;
            if (role === 'admin') navigate('/admin');
            else if (role === 'manager') navigate('/manager');
            else navigate('/store');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.wrapper}>
            <form onSubmit={handleSubmit} style={styles.card}>
                <h2 style={{ marginBottom: 4 }}>Store Material Management</h2>
                <p style={{ color: '#666', marginTop: 0 }}>Login to continue</p>

                <label style={styles.label}>Email</label>
                <input
                    style={styles.input}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <label style={styles.label}>Password</label>
                <input
                    style={styles.input}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                {error && <div style={styles.error}>{error}</div>}

                <button style={styles.button} type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
}

const styles = {
    wrapper: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f4f5f7' },
    card: { background: '#fff', padding: 32, borderRadius: 10, width: 340, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
    label: { display: 'block', marginTop: 14, marginBottom: 4, fontSize: 13, color: '#444' },
    input: { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14, boxSizing: 'border-box' },
    button: { width: '100%', marginTop: 22, padding: '10px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, cursor: 'pointer' },
    error: { color: '#d33', fontSize: 13, marginTop: 12 }
};
