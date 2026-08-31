import { ArrowUpRight, Bookmark, CalendarDays, Clock3, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export function formatBudget(budget) {
  if (!budget || budget.type === 'UNPAID') return 'Unpaid collaboration';
  const currency = budget.currency || 'BDT';
  const format = (value) => new Intl.NumberFormat('en-BD', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value / 100);
  return budget.type === 'RANGE' ? `${format(budget.minMinor)} – ${format(budget.maxMinor)}` : format(budget.minMinor);
}

const statusStyles = {
  DRAFT: { label: 'Draft', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  PUBLISHED: { label: 'Published', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  ASSIGNED: { label: 'Assigned', className: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
  ACTIVE: { label: 'In progress', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  COMPLETION_PENDING: { label: 'Completion pending', className: 'border-violet-200 bg-violet-50 text-violet-700' },
  COMPLETED: { label: 'Completed', className: 'border-teal-200 bg-teal-50 text-teal-700' },
  CLOSED: { label: 'Closed', className: 'border-slate-200 bg-slate-100 text-slate-700' },
  CANCELLED: { label: 'Cancelled', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  ARCHIVED: { label: 'Archived', className: 'border-slate-300 bg-slate-100 text-slate-600' },
};

export function GigCard({ gig, onBookmark, busy = false, ownerActions }) {
  const initials=gig.owner.displayName.split(/\s+/).map((part)=>part[0]).slice(0,2).join('').toUpperCase();
  const status=statusStyles[gig.status]??{label:gig.status,className:'border-slate-200 bg-slate-100 text-slate-700'};
  return <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_20px_50px_rgba(37,86,204,.12)]">
    <div className="h-1.5 bg-gradient-to-r from-brand-600 via-blue-500 to-violet-500"/><div className="flex flex-1 flex-col p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-950 text-xs font-black text-white">{initials}</span><div className="min-w-0"><Link to={`/students/${gig.owner.id}`} className="block truncate text-sm font-bold text-slate-800 hover:text-brand-700">{gig.owner.displayName}</Link><span className="flex items-center gap-1 text-xs text-slate-500"><Clock3 size={12}/>{gig.publishedAt?`Posted ${new Date(gig.publishedAt).toLocaleDateString()}`:'Not published'}</span></div></div>{onBookmark&&<button disabled={busy} onClick={()=>onBookmark(gig)} className={`grid size-10 shrink-0 place-items-center rounded-full border transition ${gig.isBookmarked?'border-brand-200 bg-brand-50 text-brand-700':'border-slate-200 text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700'}`} aria-label={gig.isBookmarked?'Remove bookmark':'Bookmark gig'} title={gig.isBookmarked?'Remove bookmark':'Save gig'}><Bookmark size={18} fill={gig.isBookmarked?'currentColor':'none'}/></button>}</div>
    <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{gig.category}</span><span className={`rounded-full border px-3 py-1 text-xs font-bold ${status.className}`} aria-label={`Gig status: ${status.label}`}>{status.label}</span></div>
    <Link to={`/gigs/${gig.id}`} className="mt-3 block text-xl font-black leading-7 tracking-tight text-slate-950 transition group-hover:text-brand-700">{gig.title}</Link><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{gig.description}</p>
    <div className="mt-4 flex flex-wrap gap-2">{gig.skills.slice(0,4).map((skill)=><span key={skill.id} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{skill.name}</span>)}{gig.skills.length>4&&<span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">+{gig.skills.length-4}</span>}</div>
    <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><MapPin size={14} className="text-brand-600"/>{gig.workMode}{gig.locationText?` · ${gig.locationText}`:''}</span><span className="flex items-center gap-1.5"><Users size={14} className="text-brand-600"/>{gig.capacity} opening{gig.capacity===1?'':'s'}</span><span className="col-span-2 flex items-center gap-1.5"><CalendarDays size={14} className="text-brand-600"/>{gig.deadlineAt?`Apply by ${new Date(gig.deadlineAt).toLocaleDateString()}`:'Open deadline'}</span></div>
    <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-100 pt-5"><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Budget</p><p className="mt-1 font-black text-slate-950">{formatBudget(gig.budget)}</p></div><Link className="inline-flex items-center gap-1.5 text-sm font-black text-brand-700" to={`/gigs/${gig.id}`}>View details <ArrowUpRight size={16}/></Link></div>
    {ownerActions&&<div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4" aria-label="Gig management actions">{ownerActions}</div>}</div>
  </article>;
}
