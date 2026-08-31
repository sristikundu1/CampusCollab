import { Link } from 'react-router-dom';
import { Logo } from '../Logo.jsx';
import { Spinner } from '../Spinner.jsx';
import { useAuth } from '../../context/auth-context.js';
import { AppShell } from '../../layouts/AppShell.jsx';

export function MarketplaceLayout({ children }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner label="Loading CampusCollab" /></div>;
  if (isAuthenticated) return <AppShell>{children}</AppShell>;
  return <div className="min-h-screen bg-slate-50"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6"><Logo/><div className="flex shrink-0 gap-1.5 sm:gap-2"><Link className="btn-secondary whitespace-nowrap px-3 py-2 text-xs sm:px-5 sm:py-3 sm:text-sm" to="/login">Sign in</Link><Link className="btn-primary whitespace-nowrap px-3 py-2 text-xs sm:px-5 sm:py-3 sm:text-sm" to="/register"><span className="sm:hidden">Join</span><span className="hidden sm:inline">Join CampusCollab</span></Link></div></div></header><main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">{children}</main></div>;
}
