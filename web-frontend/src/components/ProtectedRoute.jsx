/**
 * 🔒 Protected Route Component
 * 
 * Route wrapper with authentication and role-based access control (RBAC).
 * Redirects unauthenticated users to login.
 * Shows AccessDenied page for insufficient permissions.
 * 
 * @component
 * @requires react-router-dom - Navigation and state
 * @requires AuthContext - User authentication state
 * @requires AccessDenied - Permission denied page
 * 
 * @features
 * - Authentication check (redirect to login if not authenticated)
 * - Role-based access control (RBAC)
 * - Loading state with gradient spinner
 * - Preserves intended destination via location state
 * - Page-level access control via canAccess()
 * - Graceful permission denied UI
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Protected page component
 * @param {string[]} [props.allowedRoles=[]] - Array of allowed roles (empty = no role restriction)
 * 
 * @state
 * - user: Current user object from AuthContext
 * - loading: Auth loading state
 * - canAccess: Function to check page-level permissions
 * 
 * @navigation
 * - /login: Redirects if not authenticated (with from state)
 * - <AccessDenied>: Renders if role check fails
 * - children: Renders if authenticated and authorized
 * 
 * @roles
 * - ADMIN: Full system access
 * - MANAGER: Team management access
 * - AGENT: Basic messaging access
 * - VIEWER: Read-only access
 * 
 * @workflow
 * 1. Check if authentication is loading
 * 2. Check if user is authenticated (redirect to login)
 * 3. Check if user has required role (show AccessDenied)
 * 4. Check page-level access with canAccess() (show AccessDenied)
 * 5. Render protected content
 * 
 * @accessibility
 * - Loading state includes descriptive text
 * - Focus management on navigation
 * 
 * @note
 * Setup flow redirection is handled by Login and Dashboard components.
 * ProtectedRoute only checks authentication and role-based access.
 * 
 * @example
 * // Basic authentication (no role requirement)
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * 
 * @example
 * // Role-based access control
 * <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}>
 *   <AdminPanel />
 * </ProtectedRoute>
 * 
 * @example
 * // Public protected route (authenticated users only, any role)
 * <ProtectedRoute allowedRoles={[]}>
 *   <ProfilePage />
 * </ProtectedRoute>
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AccessDenied from '../pages/core/AccessDenied';
import LoadingSkeleton from './LoadingSkeleton';

/**
 * Protected Route Component with Role-Based Access Control
 * @param {Object} props
 * @param {React.ReactNode} props.children - Protected page component
 * @param {string[]} [props.allowedRoles=[]] - Allowed roles array
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, canAccess } = useAuth();
  const currentPath = window.location.pathname;

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <LoadingSkeleton type="dashboard" />
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
