import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 * Wraps a route and enforces:
 *  1. Authentication — unauthenticated users go to /login
 *  2. Role — if `requiredRole` is set, wrong-role users go to their home page
 *
 * Usage:
 *   <ProtectedRoute>               — any logged-in user
 *   <ProtectedRoute role="recruiter"> — recruiters only
 *   <ProtectedRoute role="user">   — job seekers only
 */
export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();

  // Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wrong role → redirect to their correct home
  if (role && user.role !== role) {
    const home = user.role === 'recruiter' ? '/recruiter-dashboard' : '/jobs';
    return <Navigate to={home} replace />;
  }

  return children;
}
