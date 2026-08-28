import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Spinner } from '../Spinner.jsx';

export function SkillsEditor({ profileSkills, catalogue, saving, onSave }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(() => Object.fromEntries(profileSkills.map((skill) => [skill.id, { skillId: skill.id, level: skill.level, evidence: skill.evidence ?? '' }])));
  const visible = useMemo(() => catalogue.filter((skill) => `${skill.name} ${skill.category}`.toLowerCase().includes(query.toLowerCase())), [catalogue, query]);
  const toggle = (skill) => setSelected((current) => current[skill.id] ? Object.fromEntries(Object.entries(current).filter(([id]) => id !== skill.id)) : { ...current, [skill.id]: { skillId: skill.id, level: 'BEGINNER', evidence: '' } });
  const setLevel = (id, level) => setSelected((current) => ({ ...current, [id]: { ...current[id], level } }));
  return <section className="surface p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Skills</p><h2 className="mt-1 text-xl font-bold">What you bring</h2></div><button className="btn-primary" disabled={saving} onClick={() => onSave(Object.values(selected))}>{saving?<Spinner label="Saving"/>:<><Check size={17}/> Save skills</>}</button></div>
    <div className="relative mt-5"><Search className="absolute left-3 top-3.5 text-slate-400" size={17}/><input className="field pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the skill catalogue" aria-label="Search skills"/></div>
    <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{visible.map((skill) => {const active=selected[skill.id];return <div key={skill.id} className={`rounded-xl border p-3 ${active?'border-brand-300 bg-brand-50':'border-slate-200 bg-white'}`}><div className="flex items-center justify-between gap-2"><button type="button" onClick={()=>toggle(skill)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><span className={`grid size-6 shrink-0 place-items-center rounded-md ${active?'bg-brand-600 text-white':'border border-slate-300'}`}>{active&&<Check size={14}/>}</span><span><span className="block truncate text-sm font-bold">{skill.name}</span><span className="block text-xs text-slate-500">{skill.category}</span></span></button>{active&&<button aria-label={`Remove ${skill.name}`} onClick={()=>toggle(skill)} className="text-slate-400 hover:text-rose-600"><X size={16}/></button>}</div>{active&&<select aria-label={`${skill.name} level`} className="mt-3 w-full rounded-lg border border-brand-200 bg-white px-2 py-2 text-xs font-semibold" value={active.level} onChange={(event)=>setLevel(skill.id,event.target.value)}><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select>}</div>})}</div>
    {!visible.length&&<p className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No matching catalogue skills.</p>}
  </section>;
}
