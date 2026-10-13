import { useEffect, useMemo, useState } from 'react'; import QRCode from 'qrcode'; import { jsPDF } from 'jspdf'; import { Printer, FileDown, School } from 'lucide-react';
import api from '../services/api'; import { useAuth } from '../context/AuthContext'; import { PageHeader, Spinner, Err } from '../components/ui'; import { fullName } from '../utils/format';

const THEMES = { green: ['#14532d', '#16a34a'], navy: ['#1e3a8a', '#3b82f6'], maroon: ['#7f1d1d', '#dc2626'] };
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const payload = (s, school) => JSON.stringify({ school: school?.name, adm: s.admissionNo, name: fullName(s), class: s.className });

function Card({ s, school, qr, side, w, h, theme, year }) {
  const [dark, light] = THEMES[theme] || THEMES.green; const scale = w / 85.6;
  const box = { width: `${w * 3.78}px`, height: `${h * 3.78}px`, fontSize: `${11 * scale}px` };
  if (side === 'back') return (<div className="overflow-hidden rounded-lg border border-slate-300 bg-white p-3 text-[0.8em] shadow-sm" style={box}>
    <div className="font-bold" style={{ color: dark }}>{school?.name}</div><p className="mt-1 text-slate-600">{school?.backNote || school?.idCard?.backNote}</p>
    <div className="mt-2 text-slate-600">{school?.phone && <div>Tel: {school.phone}</div>}{school?.email && <div>{school.email}</div>}{school?.address && <div>{school.address}</div>}</div>
    <div className="mt-2 text-[0.75em] text-slate-400">Valid for academic year {year}. Property of the school.</div></div>);
  return (<div className="flex flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm" style={box}>
    <div className="flex items-center gap-2 px-2 py-1 text-white" style={{ background: dark }}>{school?.logoUrl ? <img src={school.logoUrl} className="h-6 w-6 rounded bg-white object-contain" alt="" /> : <School size={16 * scale} />}<div className="leading-tight"><div className="truncate text-[0.85em] font-bold">{school?.name}</div><div className="text-[0.6em] opacity-80">STUDENT IDENTITY CARD</div></div></div>
    <div className="flex flex-1 gap-2 p-2">
      <div className="flex h-[3.4em] w-[2.9em] shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-100 text-[1.1em] font-bold text-slate-400" style={{ height: '5em', width: '4.2em' }}>{s.photoUrl ? <img src={s.photoUrl} alt="" className="h-full w-full object-cover" /> : (s.firstName?.[0] || '') + (s.lastName?.[0] || '')}</div>
      <div className="min-w-0 flex-1 leading-tight"><div className="truncate font-bold">{fullName(s)}</div><div className="text-[0.85em] text-slate-600">ADM: <b>{s.admissionNo}</b></div><div className="text-[0.85em] text-slate-600">{s.className} {s.stream}</div><div className="text-[0.85em] text-slate-600">Year: {year}</div></div>
      {qr && <img src={qr} alt="QR" className="self-end" style={{ width: '4em', height: '4em' }} />}</div>
    <div className="h-1.5" style={{ background: light }} /></div>);
}

export default function IdCards() {
  const { school } = useAuth(); const [counts, setCounts] = useState([]); const [cls, setCls] = useState(''); const [stream, setStream] = useState(''); const [students, setStudents] = useState([]); const [sel, setSel] = useState(new Set()); const [qrs, setQrs] = useState({});
  const [loading, setLoading] = useState(false); const [side, setSide] = useState('both'); const [theme, setTheme] = useState('green'); const [dim, setDim] = useState({ w: 85.6, h: 54 }); const [err, setErr] = useState(''); const [search, setSearch] = useState('');
  const year = new Date().getFullYear(); const sc = school ? { ...school, backNote: school.idCard?.backNote } : null;
  useEffect(() => { api.get('/students/class-counts').then((r) => setCounts(r.data.data)).catch((e) => setErr(e.userMessage)); }, []);
  useEffect(() => { if (school?.idCard) { setDim({ w: school.idCard.widthMm || 85.6, h: school.idCard.heightMm || 54 }); setTheme(school.idCard.template || 'green'); } }, [school]);
  const classTotals = useMemo(() => { const m = {}; counts.forEach((c) => { m[c._id.className] = (m[c._id.className] || 0) + c.count; }); return m; }, [counts]);
  const streamsOf = counts.filter((c) => c._id.className === cls && c._id.stream);
  useEffect(() => { if (!cls && !search) { setStudents([]); return; } setLoading(true); api.get('/students', { params: { status: 'Active', className: cls || undefined, stream: stream || undefined, q: search || undefined, limit: 200, sort: 'lastName' } }).then((r) => { setStudents(r.data.data); setSel(new Set(r.data.data.map((s) => s._id))); }).catch((e) => setErr(e.userMessage)).finally(() => setLoading(false)); }, [cls, stream, search]);
  useEffect(() => { let off = false; (async () => { const m = {}; for (const s of students) m[s._id] = await QRCode.toDataURL(payload(s, school), { margin: 0, width: 160 }); if (!off) setQrs(m); })(); return () => { off = true; }; }, [students, school]);
  const chosen = students.filter((s) => sel.has(s._id));

  const pdf = async () => {
    const [dr, lr] = (THEMES[theme] || THEMES.green).map(hexToRgb); const { w, h } = dim; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const mx = 8, my = 10, gap = 4; const cols = Math.max(1, Math.floor((210 - 2 * mx + gap) / (w + gap))); const rowsN = Math.max(1, Math.floor((297 - 2 * my + gap) / (h + gap))); const per = cols * rowsN;
    const front = (s, x, y) => { doc.setDrawColor(180); doc.rect(x, y, w, h); doc.setFillColor(...dr); doc.rect(x, y, w, 9, 'F'); doc.setTextColor(255); doc.setFontSize(8); doc.setFont(undefined, 'bold'); doc.text((school?.name || '').slice(0, 38), x + 3, y + 5); doc.setFontSize(5); doc.setFont(undefined, 'normal'); doc.text('STUDENT IDENTITY CARD', x + 3, y + 8);
      doc.setFillColor(235); doc.rect(x + 3, y + 12, 20, 24, 'F'); doc.setTextColor(150); doc.setFontSize(12); doc.text((s.firstName[0] || '') + (s.lastName[0] || ''), x + 13, y + 26, { align: 'center' });
      doc.setTextColor(20); doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.text(fullName(s).slice(0, 24), x + 26, y + 15); doc.setFont(undefined, 'normal'); doc.setFontSize(7.5); doc.text(`ADM: ${s.admissionNo}`, x + 26, y + 20); doc.text(`${s.className} ${s.stream || ''}`, x + 26, y + 24.5); doc.text(`Year: ${year}`, x + 26, y + 29);
      if (qrs[s._id]) doc.addImage(qrs[s._id], 'PNG', x + w - 19, y + h - 21, 16, 16); doc.setFillColor(...lr); doc.rect(x, y + h - 2, w, 2, 'F'); };
    const back = (s, x, y) => { doc.setDrawColor(180); doc.rect(x, y, w, h); doc.setTextColor(20); doc.setFontSize(8); doc.setFont(undefined, 'bold'); doc.text((school?.name || '').slice(0, 40), x + 3, y + 7); doc.setFont(undefined, 'normal'); doc.setFontSize(6.5); doc.text(doc.splitTextToSize(sc?.backNote || '', w - 6), x + 3, y + 13); doc.text([school?.phone && `Tel: ${school.phone}`, school?.email, school?.address].filter(Boolean), x + 3, y + 25); doc.setTextColor(130); doc.setFontSize(5.5); doc.text(`Valid for academic year ${year}`, x + 3, y + h - 3); };
    let first = true;
    for (const mode of side === 'back' ? ['back'] : side === 'front' ? ['front'] : ['front', 'back']) for (let p = 0; p < chosen.length; p += per) {
      if (!first) doc.addPage(); first = false;
      chosen.slice(p, p + per).forEach((s, i) => { let c = i % cols; if (mode === 'back') c = cols - 1 - c; /* mirrored for duplex */ const x = mx + c * (w + gap), y = my + Math.floor(i / cols) * (h + gap); (mode === 'front' ? front : back)(s, x, y); });
    }
    doc.save(`id-cards-${cls || 'selection'}.pdf`);
  };

  return (<div>
    <PageHeader title="Student ID Cards" sub={`${sel.size} of ${students.length} selected`}>
      <button className="btn-ghost" disabled={!chosen.length} onClick={() => window.print()}><Printer size={14} /> Print</button><button className="btn-primary" disabled={!chosen.length} onClick={pdf}><FileDown size={14} /> Export PDF</button></PageHeader>
    <Err msg={err} />
    <div className="card no-print mb-3 space-y-3 p-3">
      <div className="flex flex-wrap gap-2">{Object.entries(classTotals).map(([c, n]) => <button key={c} className={`chip ${cls === c ? 'border-forest-600 bg-forest-600 text-white' : 'bg-white'}`} onClick={() => { setCls(c); setStream(''); setSearch(''); }}>{c} ({n})</button>)}{!counts.length && <span className="text-sm text-slate-400">No active students yet.</span>}</div>
      <div className="flex flex-wrap items-center gap-2">
        {cls && <select className="input w-36" value={stream} onChange={(e) => setStream(e.target.value)}><option value="">All streams</option>{streamsOf.map((s) => <option key={s._id.stream} value={s._id.stream}>{s._id.stream} ({s.count})</option>)}</select>}
        <input className="input w-56" placeholder="Single student: name / adm no." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input w-32" value={side} onChange={(e) => setSide(e.target.value)}><option value="both">Front + back</option><option value="front">Front only</option><option value="back">Back only</option></select>
        <select className="input w-28" value={theme} onChange={(e) => setTheme(e.target.value)}>{Object.keys(THEMES).map((t) => <option key={t}>{t}</option>)}</select>
        <label className="text-xs">W mm <input type="number" className="input ml-1 inline w-20" value={dim.w} onChange={(e) => setDim({ ...dim, w: +e.target.value || 85.6 })} /></label><label className="text-xs">H mm <input type="number" className="input ml-1 inline w-20" value={dim.h} onChange={(e) => setDim({ ...dim, h: +e.target.value || 54 })} /></label>
        <button className="btn-ghost" onClick={() => setSel(new Set(students.map((s) => s._id)))}>Select all</button><button className="btn-ghost" onClick={() => setSel(new Set())}>Clear</button></div></div>
    {loading ? <Spinner /> : <div className="print-area grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${dim.w * 3.78 + 8}px, 1fr))` }}>
      {students.map((s) => (<div key={s._id} className="space-y-2"><label className="no-print flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={sel.has(s._id)} onChange={() => setSel((o) => { const n = new Set(o); n.has(s._id) ? n.delete(s._id) : n.add(s._id); return n; })} /> {fullName(s)}</label>
        {(side === 'both' || side === 'front') && <Card s={s} school={sc} qr={qrs[s._id]} side="front" w={dim.w} h={dim.h} theme={theme} year={year} />}{(side === 'both' || side === 'back') && <Card s={s} school={sc} side="back" w={dim.w} h={dim.h} theme={theme} year={year} />}</div>))}
      {!students.length && <p className="text-slate-400">Choose a class chip or search for a student to preview cards.</p>}</div>}
  </div>);
}
