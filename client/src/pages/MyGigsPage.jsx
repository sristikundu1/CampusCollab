import { AlertCircle, Archive, CircleStop, Eye, Pencil, Plus, Rocket, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GigCard } from '../components/gigs/GigCard.jsx';
import { useToast } from '../context/toast-context.js';
import { AppShell } from '../layouts/AppShell.jsx';
import { confirmAction } from '../lib/confirm-action.js';
import { apiError, gigApi } from '../services/api.js';

const confirmation = {
  publish: { title: 'Publish this gig?', text: 'It will become visible to eligible students and start accepting proposals.', confirmText: 'Publish gig', icon: 'question' },
  close: { title: 'Close this gig?', text: 'It will stop accepting proposals but remain in your history.', confirmText: 'Close gig', icon: 'warning', danger: true },
  archive: { title: 'Archive this gig?', text: 'It will be hidden from active views. Archived gigs cannot currently be republished.', confirmText: 'Archive gig', icon: 'warning', danger: true },
  remove: { title: 'Delete this gig permanently?', text: 'This cannot be undone. The gig and its bookmarks will be permanently removed.', confirmText: 'Delete permanently', icon: 'error', danger: true },
};
const actionClass = 'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition disabled:cursor-wait disabled:opacity-50';

export function MyGigsPage() {
  const { notify } = useToast();
  const [gigs, setGigs] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [pagination, setPagination] = useState({});
  const load = useCallback(async (cursor, append = false) => { if (!append) setLoading(true); setError(''); try { const response = await gigApi.mine({ ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) }); setGigs((current) => append ? [...current, ...response.data.data.gigs] : response.data.data.gigs); setPagination(response.data.meta.pagination); } catch (reason) { setError(apiError(reason).message); } finally { setLoading(false); } }, [status]);
  useEffect(() => { void load(); }, [load]);

  const transition = async (gig, action, body = {}) => { if (!await confirmAction(confirmation[action])) return; setBusy(gig.id); try { const updated = (await gigApi.transition(gig.id, action, body)).data.data.gig; setGigs((current) => current.map((item) => item.id === updated.id ? updated : item)); notify({ publish: 'Gig published.', close: 'Gig closed.', archive: 'Gig archived.' }[action]); } catch (reason) { notify(apiError(reason).message, 'error'); } finally { setBusy(''); } };
  const remove = async (gig) => { if (!await confirmAction(confirmation.remove)) return; setBusy(gig.id); try { await gigApi.remove(gig.id); setGigs((current) => current.filter((item) => item.id !== gig.id)); notify('Gig permanently deleted.'); } catch (reason) { notify(apiError(reason).message, 'error'); } finally { setBusy(''); } };

  const actions = (gig) => <>
    {['DRAFT', 'PUBLISHED'].includes(gig.status) && <Link className={`${actionClass} border-slate-200 text-slate-600 hover:bg-slate-50`} to={`/gigs/${gig.id}/edit`}><Pencil size={14}/> Edit</Link>}
    {gig.status === 'DRAFT' && <button disabled={busy === gig.id} className={`${actionClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`} onClick={() => transition(gig, 'publish')}><Rocket size={14}/> Publish</button>}
    {gig.status === 'PUBLISHED' && <button disabled={busy === gig.id} className={`${actionClass} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`} onClick={() => transition(gig, 'close', { reasonCode: 'OWNER_CLOSED' })}><CircleStop size={14}/> Close</button>}
    {['DRAFT', 'CLOSED', 'CANCELLED', 'COMPLETED'].includes(gig.status) && <button disabled={busy === gig.id} className={`${actionClass} border-slate-200 text-slate-600 hover:bg-slate-100`} onClick={() => transition(gig, 'archive')}><Archive size={14}/> Archive</button>}
    {['DRAFT', 'ARCHIVED'].includes(gig.status) && gig.proposalCount === 0 && gig.acceptedCount === 0 && <button disabled={busy === gig.id} className={`${actionClass} border-rose-200 text-rose-700 hover:bg-rose-50`} onClick={() => remove(gig)}><Trash2 size={14}/> Delete permanently</button>}
  </>;

  return <AppShell><div><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Owner workspace</p><h1 className="mt-2 text-3xl font-bold">My Gigs</h1><p className="mt-2 text-slate-600">Manage drafts, published opportunities, and retained history.</p></div><Link className="btn-primary" to="/gigs/new"><Plus size={18}/>Create Gig</Link></div><div className="mt-6 flex flex-wrap gap-2" aria-label="Filter gigs by status">{['', 'DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED', 'ARCHIVED'].map((value) => <button key={value || 'ALL'} className={`rounded-full px-4 py-2 text-sm font-bold transition ${status === value ? 'bg-brand-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50'}`} onClick={() => setStatus(value)}>{value || 'ALL'}</button>)}</div>{loading ? <div className="mt-7 grid gap-5 md:grid-cols-2"><div className="h-80 animate-pulse rounded-2xl bg-slate-200"/><div className="h-80 animate-pulse rounded-2xl bg-slate-200"/></div> : error ? <div className="surface mt-7 p-8 text-center"><AlertCircle className="mx-auto text-rose-600"/><p className="mt-3">{error}</p><button className="btn-primary mt-4" onClick={() => load()}>Try again</button></div> : gigs.length === 0 ? <div className="surface mt-7 p-10 text-center"><Eye className="mx-auto text-slate-400"/><h2 className="mt-4 text-xl font-bold">No gigs in this view</h2><p className="mt-2 text-slate-600">Create a draft or choose another lifecycle filter.</p><Link className="btn-primary mt-5" to="/gigs/new">Create your first gig</Link></div> : <><div className="mt-7 grid gap-5 xl:grid-cols-2">{gigs.map((gig) => <GigCard key={gig.id} gig={gig} ownerActions={actions(gig)}/>)}</div>{pagination.hasMore && <div className="mt-7 text-center"><button className="btn-secondary" onClick={() => load(pagination.nextCursor, true)}>Load more</button></div>}</>}</div></AppShell>;
}
