import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRoles }) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!token || !user) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const fallback = user.role === 'admin' ? '/admin' : user.role === 'manager' ? '/manager' : '/store';
        return <Navigate to={fallback} replace />;
    }
    return children;
}
