import { useEffect, useState } from 'react'; import api from '../services/api'; import { PageHeader, Spinner, Err, Badge, toneFor } from '../components/ui'; import { todayISO } from '../utils/format';
const OPTS = ['Present', 'Absent', 'Late', 'Excused'];
export default function Attendance() {
  const [classes, setClasses] = useState([]); const [cls, setCls] = useState(''); const [stream, setStream] = useState(''); const [date, setDate] = useState(todayISO()); const [rows, setRows] = useState([]); const [loading, setLoading] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  useEffect(() => { api.get('/classes', { params: { limit: 100 } }).then((r) => { setClasses(r.data.data); if (r.data.data[0]) setCls(r.data.data[0].name); }).catch((e) => setErr(e.userMessage)); }, []);
  useEffect(() => { if (!cls) return; setLoading(true); setMsg(''); api.get('/attendance', { params: { date, className: cls, stream: stream || undefined } }).then((r) => setRows(r.data.data)).catch((e) => setErr(e.userMessage)).finally(() => setLoading(false)); }, [cls, stream, date]);
  const set = (i, status) => setRows((r) => r.map((x, j) => (i === j ? { ...x, status } : x)));
  const all = (status) => setRows((r) => r.map((x) => ({ ...x, status })));
  const save = async () => { setErr(''); try { const { data } = await api.post('/attendance', { date, records: rows.filter((r) => r.status).map((r) => ({ student: r.student._id, status: r.status })) }); setMsg(`Saved ${data.data.saved} records.`); } catch (e) { setErr(e.userMessage); } };
  const streams = classes.find((c) => c.name === cls)?.streams || [];
  return (<div><PageHeader title="Class Register" sub="Mark daily attendance">
    <select className="input w-36" value={cls} onChange={(e) => { setCls(e.target.value); setStream(''); }}>{classes.map((c) => <option key={c._id}>{c.name}</option>)}</select>
    <select className="input w-32" value={stream} onChange={(e) => setStream(e.target.value)}><option value="">All streams</option>{streams.map((s) => <option key={s}>{s}</option>)}</select>
    <input type="date" className="input w-40" value={date} onChange={(e) => setDate(e.target.value)} /></PageHeader>
    <Err msg={err} />{msg && <div className="mb-3 rounded-lg bg-green-50 p-2 text-sm text-green-800">{msg}</div>}
    <div className="card overflow-x-auto">{loading ? <Spinner /> : <><div className="flex gap-2 border-b border-slate-100 p-2 text-xs"><span className="self-center text-slate-500">Mark all:</span>{OPTS.map((o) => <button key={o} className="btn-ghost" onClick={() => all(o)}>{o}</button>)}</div>
      <table className="w-full"><thead><tr><th className="th">Adm</th><th className="th">Student</th><th className="th">Status</th></tr></thead><tbody>{rows.map((r, i) => (<tr key={r.student._id}><td className="td font-mono">{r.student.admissionNo}</td><td className="td">{r.student.firstName} {r.student.lastName} <span className="text-xs text-slate-400">{r.student.stream}</span></td><td className="td"><div className="flex gap-1">{OPTS.map((o) => <button key={o} onClick={() => set(i, o)} className={`chip ${r.status === o ? { Present: 'border-green-600 bg-green-600 text-white', Absent: 'border-red-600 bg-red-600 text-white', Late: 'border-amber-500 bg-amber-500 text-white', Excused: 'border-slate-500 bg-slate-500 text-white' }[o] : 'bg-white'}`}>{o}</button>)}</div></td></tr>))}{!rows.length && <tr><td className="td text-slate-400" colSpan={3}>No active students in this class.</td></tr>}</tbody></table></>}
      <div className="flex justify-end border-t border-slate-100 p-3"><button className="btn-primary" onClick={save} disabled={!rows.length}>Save register</button></div></div></div>);
}
