import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import AdminPage from './pages/Admin/AdminPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route path="/login" element={<Login />} />

                <Route
                    path="/store"
                    element={
                        <ProtectedRoute allowedRoles={['store_incharge', 'admin']}>
                            <AdminPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/manager"
                    element={
                        <ProtectedRoute allowedRoles={['manager', 'admin']}>
                            <AdminPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminPage />
                        </ProtectedRoute>
                    }
                />

                <Route path="/" element={<Navigate to="/login" replace />} />

                <Route path="*" element={<Navigate to="/login" replace />} />

            </Routes>
        </BrowserRouter>
    );
}
