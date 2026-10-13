import { useEffect, useState, useCallback } from 'react'; import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Upload, Download, CreditCard } from 'lucide-react';
import api from '../services/api'; import { useAuth } from '../context/AuthContext';
import { PageHeader, Modal, Field, Spinner, Err, Badge, toneFor, Pager } from '../components/ui'; import { dmy, fullName } from '../utils/format';
import { exportXlsx, exportPdf, readSheet, downloadTemplate } from '../utils/export';

const HEAD = ['admissionNo', 'firstName', 'lastName', 'gender', 'className', 'stream', 'residence', 'dob', 'guardianName', 'guardianRelationship', 'guardianPhone'];
const blank = { firstName: '', lastName: '', gender: 'Male', className: '', stream: '', residence: 'Day', dob: '', gName: '', gRel: 'Parent', gPhone: '' };

export default function Students() {
  const { can } = useAuth(); const [sp] = useSearchParams();
  const [f, setF] = useState({ q: sp.get('q') || '', className: '', stream: '', status: 'Active', residence: '' }); const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]); const [meta, setMeta] = useState({}); const [classes, setClasses] = useState([]); const [loading, setLoading] = useState(true); const [err, setErr] = useState('');
  const [sel, setSel] = useState([]); const [modal, setModal] = useState(null); const [form, setForm] = useState(blank); const [fe, setFe] = useState(''); const [report, setReport] = useState(null);
  const [sort, setSort] = useState('className lastName');
  useEffect(() => { setF((x) => ({ ...x, q: sp.get('q') || x.q })); }, [sp]);
  useEffect(() => { api.get('/classes', { params: { limit: 100 } }).then((r) => setClasses(r.data.data)).catch(() => {}); }, []);
  const load = useCallback(() => { setLoading(true); api.get('/students', { params: { ...f, page, limit: 25, sort } }).then((r) => { setRows(r.data.data); setMeta(r.data); }).catch((e) => setErr(e.userMessage)).finally(() => setLoading(false)); }, [f, page, sort]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  const canW = can('students:write'); const streams = classes.find((c) => c.name === f.className)?.streams || [];

  const save = async (e) => {
    e.preventDefault(); setFe('');
    const body = { firstName: form.firstName, lastName: form.lastName, gender: form.gender, className: form.className, stream: form.stream, residence: form.residence, dob: form.dob || undefined, guardians: form.gName ? [{ name: form.gName, relationship: form.gRel, phone: form.gPhone || undefined }] : [] };
    try { await api.post('/students', body); setModal(null); setForm(blank); load(); } catch (x) { setFe(x.userMessage); }
  };
  const exportAll = async (kind) => {
    const { data } = await api.get('/students', { params: { ...f, limit: 500, sort } });
    const out = data.data.map((s) => ({ 'Adm No': s.admissionNo, Name: fullName(s), Gender: s.gender, Class: s.className, Stream: s.stream, Residence: s.residence, Status: s.status, DOB: dmy(s.dob), Guardian: s.guardians?.[0]?.name || '', Phone: s.guardians?.[0]?.phone || '' }));
    if (kind === 'pdf') exportPdf(out, 'Student List', 'students'); else exportXlsx(out, 'students', kind === 'csv');
  };
  const onFile = async (e) => {
    const file = e.target.files[0]; if (!file) return; setFe('');
    try { const rows = await readSheet(file); const { data } = await api.post('/students/import', { rows }); setReport({ total: rows.length, ...data.data }); load(); } catch (x) { setFe(x.userMessage || String(x)); } e.target.value = '';
  };
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const bulk = async (status) => { if (!confirm(`Set ${sel.length} student(s) to ${status}?`)) return; for (const id of sel) await api.post(`/students/${id}/status`, { status, note: 'Bulk action' }).catch(() => {}); setSel([]); load(); };
  const th = (label, key) => <th className="th cursor-pointer select-none" onClick={() => setSort(sort === key ? '-' + key : key)}>{label}{sort === key ? ' ▲' : sort === '-' + key ? ' ▼' : ''}</th>;

  return (<div>
    <PageHeader title="Students" sub={`${meta.total ?? 0} students`}>
      <button className="btn-ghost" onClick={() => exportAll('xlsx')}><Download size={14} />Excel</button><button className="btn-ghost" onClick={() => exportAll('csv')}>CSV</button><button className="btn-ghost" onClick={() => exportAll('pdf')}>PDF</button>
      <Link to="/id-cards" className="btn-ghost"><CreditCard size={14} /> ID Cards</Link>
      {canW && <><button className="btn-ghost" onClick={() => { setReport(null); setModal('import'); }}><Upload size={14} /> Import</button><button className="btn-primary" onClick={() => { setForm(blank); setFe(''); setModal('add'); }}><Plus size={14} /> Add student</button></>}
    </PageHeader>
    <Err msg={err} />
    <div className="card mb-3 flex flex-wrap items-center gap-2 p-3">
      <input className="input w-56" placeholder="Search name or adm no." value={f.q} onChange={(e) => { setF({ ...f, q: e.target.value }); setPage(1); }} />
      <select className="input w-36" value={f.className} onChange={(e) => { setF({ ...f, className: e.target.value, stream: '' }); setPage(1); }}><option value="">All classes</option>{classes.map((c) => <option key={c._id}>{c.name}</option>)}</select>
      <select className="input w-32" value={f.stream} onChange={(e) => setF({ ...f, stream: e.target.value })}><option value="">All streams</option>{streams.map((s) => <option key={s}>{s}</option>)}</select>
      <select className="input w-32" value={f.residence} onChange={(e) => setF({ ...f, residence: e.target.value })}><option value="">Day/Boarding</option><option>Day</option><option>Boarding</option></select>
      <div className="flex gap-1">{['Active', 'Transferred', 'Graduated', 'Withdrawn', ''].map((s) => <button key={s} className={`chip ${f.status === s ? 'border-forest-600 bg-forest-600 text-white' : 'bg-white'}`} onClick={() => { setF({ ...f, status: s }); setPage(1); }}>{s || 'All'}</button>)}</div>
      {sel.length > 0 && canW && <div className="ml-auto flex items-center gap-2 text-sm"><b>{sel.length}</b> selected <button className="btn-ghost" onClick={() => bulk('Graduated')}>Graduate</button><button className="btn-ghost" onClick={() => bulk('Transferred')}>Transfer</button><button className="btn-danger" onClick={() => bulk('Withdrawn')}>Withdraw</button></div>}
    </div>
    <div className="card overflow-x-auto">{loading ? <Spinner /> : (<table className="w-full"><thead><tr><th className="th w-8"><input type="checkbox" checked={rows.length > 0 && rows.every((r) => sel.includes(r._id))} onChange={(e) => setSel(e.target.checked ? rows.map((r) => r._id) : [])} /></th>{th('Adm No', 'admissionNo')}{th('Name', 'lastName')}{th('Class', 'className')}<th className="th">Gender</th><th className="th">Residence</th><th className="th">Guardian</th><th className="th">Status</th></tr></thead>
      <tbody>{rows.map((s) => (<tr key={s._id} className="hover:bg-slate-50"><td className="td"><input type="checkbox" checked={sel.includes(s._id)} onChange={() => toggle(s._id)} /></td><td className="td font-mono">{s.admissionNo}</td><td className="td"><Link className="font-medium text-forest-700 hover:underline" to={`/students/${s._id}`}>{fullName(s)}</Link></td><td className="td">{s.className} {s.stream}</td><td className="td">{s.gender}</td><td className="td">{s.residence}</td><td className="td">{s.guardians?.[0]?.name || '—'} <span className="text-xs text-slate-400">{s.guardians?.[0]?.phone}</span></td><td className="td"><Badge tone={toneFor(s.status)}>{s.status}</Badge></td></tr>))}
        {!rows.length && <tr><td colSpan={8} className="td text-center text-slate-400">No students match.</td></tr>}</tbody></table>)}
      <Pager page={page} pages={meta.pages} total={meta.total} set={setPage} /></div>

    {modal === 'add' && <Modal title="Admit student" onClose={() => setModal(null)} wide><form onSubmit={save} className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><Err msg={fe} /></div>
      <Field label="First name *"><input className="input" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
      <Field label="Last name *"><input className="input" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
      <Field label="Gender *"><select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option>Male</option><option>Female</option></select></Field>
      <Field label="Date of birth"><input type="date" className="input" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
      <Field label="Class *"><select className="input" required value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })}><option value="">Select…</option>{classes.map((c) => <option key={c._id}>{c.name}</option>)}</select></Field>
      <Field label="Stream"><select className="input" value={form.stream} onChange={(e) => setForm({ ...form, stream: e.target.value })}><option value="">—</option>{(classes.find((c) => c.name === form.className)?.streams || []).map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="Day / Boarding"><select className="input" value={form.residence} onChange={(e) => setForm({ ...form, residence: e.target.value })}><option>Day</option><option>Boarding</option></select></Field><div />
      <Field label="Guardian name"><input className="input" value={form.gName} onChange={(e) => setForm({ ...form, gName: e.target.value })} /></Field>
      <Field label="Guardian phone (07XX… / +254…)"><input className="input" value={form.gPhone} onChange={(e) => setForm({ ...form, gPhone: e.target.value })} /></Field>
      <p className="text-xs text-slate-500 sm:col-span-2">Admission number is generated automatically.</p>
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn-primary">Admit</button></div></form></Modal>}

    {modal === 'import' && <Modal title="Import students (CSV / Excel)" onClose={() => setModal(null)} wide><Err msg={fe} />
      <p className="mb-2 text-sm text-slate-600">Required columns: <code>firstName, lastName, gender, className</code>. Optional: {HEAD.filter((h) => !['firstName', 'lastName', 'gender', 'className'].includes(h)).join(', ')}. Leave <code>admissionNo</code> empty to auto-generate.</p>
      <div className="flex items-center gap-2"><button className="btn-ghost" onClick={() => downloadTemplate(HEAD, 'student-import-template.xlsx')}><Download size={14} /> Template</button><input type="file" accept=".csv,.xlsx,.xls" onChange={onFile} /></div>
      {report && <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><b>{report.created}</b> of {report.total} rows imported. {report.errors.length > 0 && <><div className="mt-2 font-semibold text-red-700">{report.errors.length} rows rejected:</div><ul className="max-h-48 overflow-auto text-xs">{report.errors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}</ul></>}</div>}</Modal>}
  </div>);
}
