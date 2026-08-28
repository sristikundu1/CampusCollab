import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/auth-context.js';
export function ProtectedRoute(){const {loading,isAuthenticated}=useAuth();const location=useLocation();if(loading)return <div className="grid min-h-screen place-items-center text-brand-600"><Spinner label="Loading CampusCollab"/></div>;return isAuthenticated?<Outlet/>:<Navigate to="/login" replace state={{from:location}}/>}
export function PublicOnlyRoute(){const {loading,isAuthenticated}=useAuth();if(loading)return <div className="grid min-h-screen place-items-center text-brand-600"><Spinner/></div>;return isAuthenticated?<Navigate to="/dashboard" replace/>:<Outlet/>}
