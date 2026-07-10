import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NavBar({ title }) {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div style={styles.bar}>
            <div>
                <strong>{title}</strong>
                <span style={{ marginLeft: 12, color: '#666', fontSize: 13 }}>
                    {user.name} ({user.role})
                </span>
            </div>
            <button onClick={logout} style={styles.logout}>Logout</button>
        </div>
    );
}

const styles = {
    bar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', background: '#1e293b', color: '#fff' },
    logout: { background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer' }
};
