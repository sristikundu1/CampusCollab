import { Bookmark, BriefcaseBusiness, CalendarDays, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export function formatBudget(budget) {
  if (!budget || budget.type === 'UNPAID') return 'Unpaid collaboration';
  const currency = budget.currency || 'BDT'; const format = (value) => new Intl.NumberFormat('en-BD', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value / 100);
  return budget.type === 'RANGE' ? `${format(budget.minMinor)} – ${format(budget.maxMinor)}` : format(budget.minMinor);
}

export function GigCard({ gig, onBookmark, busy = false, ownerActions }) {
  return <article className="surface flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
    <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">{gig.category}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{gig.status}</span></div><Link to={`/gigs/${gig.id}`} className="mt-3 block text-lg font-bold text-slate-950 hover:text-brand-700">{gig.title}</Link></div>{onBookmark&&<button disabled={busy} onClick={()=>onBookmark(gig)} className={`rounded-xl p-2 ${gig.isBookmarked?'bg-brand-50 text-brand-700':'text-slate-400 hover:bg-slate-100 hover:text-brand-700'}`} aria-label={gig.isBookmarked?'Remove bookmark':'Bookmark gig'}><Bookmark size={20} fill={gig.isBookmarked?'currentColor':'none'}/></button>}</div>
    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{gig.description}</p>
    <div className="mt-4 flex flex-wrap gap-2">{gig.skills.slice(0,4).map((skill)=><span key={skill.id} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">{skill.name}</span>)}</div>
    <div className="mt-5 grid gap-2 text-xs font-medium text-slate-500 sm:grid-cols-2"><span className="flex items-center gap-1.5"><MapPin size={14}/>{gig.workMode}{gig.locationText?` · ${gig.locationText}`:''}</span><span className="flex items-center gap-1.5"><Users size={14}/>{gig.capacity} position{gig.capacity===1?'':'s'}</span><span className="flex items-center gap-1.5"><BriefcaseBusiness size={14}/>{formatBudget(gig.budget)}</span><span className="flex items-center gap-1.5"><CalendarDays size={14}/>{gig.deadlineAt?new Date(gig.deadlineAt).toLocaleDateString():'Open deadline'}</span></div>
    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4"><Link to={`/students/${gig.owner.id}`} className="text-sm font-bold text-slate-700 hover:text-brand-700">{gig.owner.displayName}</Link><div className="flex gap-2">{ownerActions}<Link className="text-sm font-bold text-brand-700" to={`/gigs/${gig.id}`}>View details →</Link></div></div>
  </article>;
}
