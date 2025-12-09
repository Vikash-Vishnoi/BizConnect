import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AccessDenied from '../pages/core/AccessDenied';

/**
 * Protected Route Component with Role-Based Access Control
 * 
 * Usage:
 * <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}>
 *   <AdminPage />
 * </ProtectedRoute>
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, canAccess } = useAuth();
  const currentPath = window.location.pathname;

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #5e69ee 0%, #39AFEA 100%)',
        color: 'white',
        fontSize: '20px'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: currentPath }} replace />;
  }

  // Note: Setup flow redirection is handled by Login and Dashboard components
  // ProtectedRoute only checks authentication and role-based access

  // Check if user has access to this page
  // Allow access if no specific roles required OR user has the required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.log('❌ Access denied - Role mismatch:', { userRole: user.role, allowedRoles });
    return <AccessDenied />;
  }

  // Skip canAccess check if allowedRoles is empty (public protected route)
  // This prevents false positives from the canAccess function
  if (allowedRoles.length === 0) {
    return children;
  }

  // Check page-level access using canAccess function
  if (!canAccess(currentPath)) {
    console.log('❌ Access denied - canAccess failed:', { currentPath, userRole: user.role });
    return <AccessDenied />;
  }

  return children;
};

export default ProtectedRoute;
