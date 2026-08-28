import { Link } from 'react-router-dom'; import { Logo } from '../components/Logo.jsx';
export function NotFoundPage(){return <main className="grid min-h-screen place-items-center bg-slate-50 px-5"><div className="text-center"><Logo/><p className="mt-10 text-7xl font-bold text-brand-100">404</p><h1 className="mt-2 text-2xl font-bold">This page isn’t on campus.</h1><p className="mt-3 text-slate-500">The page may have moved or never existed.</p><Link to="/" className="btn-primary mt-7">Return home</Link></div></main>}

