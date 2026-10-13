import { useEffect, useState } from 'react'; import { Link } from 'react-router-dom';
import { Users, UserCheck, GraduationCap, School, CalendarCheck, Wallet, AlertCircle, ClipboardList, Wrench } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api'; import { Spinner, PageHeader, Err } from '../components/ui'; import { kes, dmy, fullName } from '../utils/format';
const Stat = ({ to, icon: I, label, value, sub, tone = 'text-forest-600' }) => (<Link to={to} className="card flex items-center gap-3 p-4 transition hover:shadow-md"><div className={`rounded-lg bg-slate-100 p-2.5 ${tone}`}><I size={20} /></div><div><div className="text-xs text-slate-500">{label}</div><div className="text-2xl font-bold leading-tight">{value}</div>{sub && <div className="text-xs text-slate-500">{sub}</div>}</div></Link>);
export default function Dashboard() {
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api.get('/dashboard').then((r) => setD(r.data.data)).catch((e) => setErr(e.userMessage)); }, []);
  if (err) return <Err msg={err} />; if (!d) return <Spinner />;
  const a = d.attendanceToday; const pie = [['Present', a.Present, '#16a34a'], ['Late', a.Late, '#f59e0b'], ['Absent', a.Absent, '#dc2626'], ['Excused', a.Excused, '#64748b']].filter((x) => x[1]).map(([name, value, color]) => ({ name, value, color }));
  return (<div>
    <PageHeader title="Dashboard" sub="Live figures from your school records" />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat to="/students" icon={GraduationCap} label="Active students" value={d.students} />
      <Stat to="/r/users" icon={Users} label="Parent accounts" value={d.parents} />
      <Stat to="/r/staff" icon={UserCheck} label="Teachers & staff" value={d.staff} />
      <Stat to="/r/classes" icon={School} label="Classes" value={d.classes} />
      <Stat to="/attendance" icon={CalendarCheck} label="Attendance today" value={a.rate === null ? '—' : `${a.rate}%`} sub={a.marked ? `${a.marked} marked` : 'Not marked yet'} />
      <Stat to="/finance" icon={Wallet} label="Fees collected" value={kes(d.fees.collected)} />
      <Stat to="/finance" icon={AlertCircle} label="Outstanding fees" value={kes(d.fees.outstanding)} tone="text-red-600" />
      <Stat to="/r/tasks" icon={ClipboardList} label="Overdue tasks" value={d.overdueTasks} tone="text-amber-600" />
      <Stat to="/r/work-orders" icon={Wrench} label="Open maintenance" value={d.pendingMaintenance} tone="text-amber-600" />
      <Stat to="/leave" icon={UserCheck} label="Pending leave requests" value={d.pendingLeave} />
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <div className="card p-4 lg:col-span-2"><h3 className="mb-2 font-semibold">Enrollment by class</h3><div className="h-56"><ResponsiveContainer><BarChart data={d.enrollmentByClass.map((x) => ({ name: x._id, Students: x.n }))}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip /><Bar dataKey="Students" fill="#16a34a" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
      <div className="card p-4"><h3 className="mb-2 font-semibold">Today's attendance</h3>{pie.length ? <div className="h-56"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} label>{pie.map((p) => <Cell key={p.name} fill={p.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div> : <p className="py-16 text-center text-sm text-slate-400">No attendance marked today.</p>}</div>
      <List title="Recent admissions" to="/students" rows={d.recentStudents.map((s) => [fullName(s), `${s.admissionNo} · ${s.className}`])} />
      <List title="Recent payments" to="/finance" rows={d.recentPayments.map((p) => [`${fullName(p.student)} (${p.student?.admissionNo})`, `${kes(p.amount)} · ${p.receiptNo || ''}`])} />
      <List title="Upcoming events" to="/r/events" rows={d.upcomingEvents.map((e) => [e.title, dmy(e.date)])} />
      <List title="Staff on duty today" to="/duty" rows={d.dutiesToday.map((x) => [x.staff?.name || '—', `${x.station?.name || ''} ${x.start}-${x.end}`])} />
      <List title="Upcoming examinations" to="/exams" rows={d.upcomingExams.map((e) => [e.name, dmy(e.date)])} />
    </div></div>);
}
const List = ({ title, to, rows }) => (<Link to={to} className="card block p-4 hover:shadow-md"><h3 className="mb-2 font-semibold">{title}</h3>{rows.length ? <ul className="divide-y divide-slate-100 text-sm">{rows.map(([a, b], i) => <li key={i} className="flex justify-between gap-2 py-1.5"><span className="truncate">{a}</span><span className="shrink-0 text-xs text-slate-500">{b}</span></li>)}</ul> : <p className="text-sm text-slate-400">Nothing to show.</p>}</Link>);
