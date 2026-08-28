import { Link } from 'react-router-dom';
export function Logo({ light = false }) { return <Link to="/" className="inline-flex items-center gap-2.5 font-bold tracking-tight"><span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">C</span><span className={light ? 'text-white' : 'text-brand-950'}>Campus<span className="text-brand-500">Collab</span></span></Link>; }

