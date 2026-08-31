import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/auth-context.js';
import { showLoginRequired } from '../lib/confirm-action.js';

export function ProtectedRoute() {
  const { loading, isAuthenticated } = useAuth(); const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center text-brand-600"><Spinner label="Loading CampusCollab"/></div>;
  return isAuthenticated ? <Outlet/> : <Navigate to="/login" replace state={{ from: location }}/>;
}

export function LoginRequiredRoute() {
  const { loading, isAuthenticated } = useAuth(); const location = useLocation(); const navigate = useNavigate(); const prompted = useRef(false);
  useEffect(() => { if (!loading && !isAuthenticated && !prompted.current) { prompted.current = true; showLoginRequired().then(() => navigate('/login', { replace: true, state: { from: location } })); } }, [loading, isAuthenticated, location, navigate]);
  if (loading || !isAuthenticated) return <div className="grid min-h-screen place-items-center text-brand-600"><Spinner label="Preparing sign in"/></div>;
  return <Outlet/>;
}

export function PublicOnlyRoute() {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-brand-600"><Spinner/></div>;
  return isAuthenticated ? <Navigate to="/dashboard" replace/> : <Outlet/>;
}
