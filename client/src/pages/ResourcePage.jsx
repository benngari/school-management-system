import { useEffect, useState, useCallback } from 'react'; import { useParams } from 'react-router-dom'; import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import api from '../services/api'; import { useAuth } from '../context/AuthContext'; import { RES } from './resources';
import { PageHeader, Modal, Field, Spinner, Err, Badge, toneFor, Pager } from '../components/ui'; import { exportXlsx } from '../utils/export';

const label = (o) => o.name || o.plate || o.title || `${o.firstName || ''} ${o.lastName || ''}`.trim() || o._id;
const idOf = (v) => (v && typeof v === 'object' ? v._id : v);
const toForm = (fields, rec) => Object.fromEntries(fields.map(([n, , t]) => {
  const v = rec?.[n];
  if (t === 'list') return [n, (v || []).join(', ')]; if (t === 'items') return [n, (v || []).map((i) => `${i.name}:${i.amount}`).join(', ')];
  if (t === 'date') return [n, v ? String(v).slice(0, 10) : '']; if (t === 'checkbox') return [n, v ?? false]; if (t === 'password') return [n, ''];
  if (t?.startsWith('ref:')) return [n, idOf(v) || '']; return [n, v ?? ''];
}));
const toBody = (fields, f, editing) => {
  const b = {};
  for (const [n, , t] of fields) {
    const v = f[n];
    if (t === 'list') b[n] = v.split(',').map((x) => x.trim()).filter(Boolean);
    else if (t === 'items') b[n] = v.split(',').map((x) => x.trim()).filter(Boolean).map((p) => { const [name, amt] = p.split(':'); return { name: name.trim(), amount: Number(amt) }; });
    else if (t === 'number') { if (v !== '') b[n] = Number(v); }
    else if (t === 'password') { if (v) b[n] = v; }
    else if (t?.startsWith('ref:')) { if (v) b[n] = v; else if (editing) b[n] = null; }
    else if (v !== '' || editing) b[n] = v === '' ? undefined : v;
  }
  return b;
};

export default function ResourcePage() {
  const { key } = useParams(); const cfg = RES[key]; const { can } = useAuth();
  const [rows, setRows] = useState([]); const [meta, setMeta] = useState({}); const [page, setPage] = useState(1); const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true); const [err, setErr] = useState(''); const [modal, setModal] = useState(null); const [form, setForm] = useState({}); const [refs, setRefs] = useState({}); const [fe, setFe] = useState('');

  const load = useCallback(() => {
    if (!cfg) return; setLoading(true); setErr('');
    api.get('/' + cfg.path, { params: { page, limit: 25, q: q || undefined } }).then((r) => { setRows(r.data.data); setMeta(r.data); }).catch((e) => setErr(e.userMessage)).finally(() => setLoading(false));
  }, [cfg, page, q]);
  useEffect(() => { setPage(1); setQ(''); }, [key]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  if (!cfg) return <div className="card p-6">Unknown module.</div>;
  const canWrite = can(`${cfg.perm}:write`) && !cfg.readOnly;
  const open = async (rec) => {
    setFe(''); setForm(toForm(cfg.fields, rec)); setModal(rec || {});
    for (const [, , t] of cfg.fields) if (t?.startsWith('ref:')) { const path = t.split(':')[1]; if (!refs[path]) api.get('/' + path, { params: { limit: 200 } }).then((r) => setRefs((s) => ({ ...s, [path]: r.data.data }))).catch(() => {}); }
  };
  const save = async (e) => {
    e.preventDefault(); setFe('');
    try { const body = toBody(cfg.fields, form, !!modal._id); if (modal._id) await api.put(`/${cfg.path}/${modal._id}`, body); else await api.post('/' + cfg.path, body); setModal(null); load(); } catch (x) { setFe(x.userMessage); }
  };
  const del = async (r) => { if (!confirm('Delete this record? This cannot be undone.')) return; try { await api.delete(`/${cfg.path}/${r._id}`); load(); } catch (x) { setErr(x.userMessage); } };
  const flat = () => rows.map((r) => Object.fromEntries(cfg.columns.map(([k, l, fn]) => [l, fn ? fn(r) : r[k]])));

  return (<div>
    <PageHeader title={cfg.title} sub={`${meta.total ?? rows.length} records`}>
      {cfg.search && <input className="input w-56" placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />}
      <button className="btn-ghost" onClick={() => exportXlsx(flat(), key)}><Download size={14} /> Excel</button><button className="btn-ghost" onClick={() => exportXlsx(flat(), key, true)}><Download size={14} /> CSV</button>
      {canWrite && <button className="btn-primary" onClick={() => open(null)}><Plus size={14} /> Add</button>}
    </PageHeader>
    <Err msg={err} />
    <div className="card overflow-x-auto">{loading ? <Spinner /> : (<table className="w-full"><thead><tr>{cfg.columns.map(([k, l]) => <th key={k} className="th">{l}</th>)}{canWrite && <th className="th" />}</tr></thead>
      <tbody>{rows.map((r) => (<tr key={r._id} className="hover:bg-slate-50">{cfg.columns.map(([k, , fn, kind]) => { const v = fn ? fn(r) : r[k]; return <td key={k} className="td">{kind === 'badge' ? <Badge tone={toneFor(v)}>{v}</Badge> : (v ?? '—')}</td>; })}
        {canWrite && <td className="td text-right whitespace-nowrap">{!cfg.noEdit && <button className="p-1 text-slate-500 hover:text-forest-600" onClick={() => open(r)}><Pencil size={15} /></button>}{!cfg.noDelete && <button className="p-1 text-slate-500 hover:text-red-600" onClick={() => del(r)}><Trash2 size={15} /></button>}</td>}</tr>))}
        {!rows.length && <tr><td className="td text-center text-slate-400" colSpan={9}>No records yet.</td></tr>}</tbody></table>)}
      {meta.pages > 1 && <Pager page={page} pages={meta.pages} total={meta.total} set={setPage} />}</div>
    {modal && <Modal title={`${modal._id ? 'Edit' : 'Add'} — ${cfg.title}`} onClose={() => setModal(null)}>
      <form onSubmit={save} className="space-y-3"><Err msg={fe} />
        {cfg.fields.map(([n, l, t, req, opts]) => (<Field key={n} label={l + (req ? ' *' : '')}>
          {t === 'textarea' ? <textarea className="input" rows={3} value={form[n]} onChange={(e) => setForm({ ...form, [n]: e.target.value })} />
            : t === 'select' ? <select className="input" value={form[n]} required={req} onChange={(e) => setForm({ ...form, [n]: e.target.value })}><option value="">—</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>
            : t === 'checkbox' ? <input type="checkbox" checked={!!form[n]} onChange={(e) => setForm({ ...form, [n]: e.target.checked })} />
            : t?.startsWith('ref:') ? <select className="input" value={form[n]} required={req} onChange={(e) => setForm({ ...form, [n]: e.target.value })}><option value="">—</option>{(refs[t.split(':')[1]] || []).map((o) => <option key={o._id} value={o._id}>{label(o)}</option>)}</select>
            : <input className="input" type={t === 'list' || t === 'items' ? 'text' : t || 'text'} required={req && !(t === 'password' && modal._id)} value={form[n]} onChange={(e) => setForm({ ...form, [n]: e.target.value })} />}</Field>))}
        <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn-primary">Save</button></div></form></Modal>}
  </div>);
}
