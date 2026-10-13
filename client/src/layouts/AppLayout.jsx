import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronDown, LayoutDashboard, GraduationCap, Wallet, Wrench, ShieldAlert, Megaphone, BarChart3, Settings, Menu, Bell, Search, LogOut, School } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const NAV = [
  { key: 'academics', label: 'Academics', icon: GraduationCap, perm: 'students:read', items: [['Students', '/students'], ['ID Cards', '/id-cards'], ['Classes', '/r/classes'], ['Timetable', '/r/timetable'], ['Class Register', '/attendance'], ['Exams & Results', '/exams'], ['Teachers & Staff', '/r/staff'], ['Staff Leave', '/leave'], ['Library', '/r/books']] },
  { key: 'finance', label: 'Finance', icon: Wallet, perm: 'finance:read', items: [['Fees & Payments', '/finance'], ['Fee Structures', '/r/fee-structures'], ['Expenses', '/r/expenses']] },
  { key: 'operations', label: 'Operations', icon: Wrench, perm: 'duty:read', items: [['Duty Roster', '/duty'], ['Prefects', '/r/prefects'], ['Events', '/r/events'], ['Tasks', '/r/tasks'], ['Vehicles', '/r/vehicles'], ['Routes', '/r/routes'], ['Dormitories', '/r/dorms'], ['Meal Menus', '/r/menus'], ['Kitchen Stock', '/r/kitchen-stock'], ['Clinic', '/r/clinic'], ['Assets', '/r/assets'], ['Work Orders', '/r/work-orders']] },
  { key: 'discipline', label: 'Discipline & Clearance', icon: ShieldAlert, perm: 'discipline:read', items: [['Incidents', '/r/incidents'], ['Admissions', '/r/admissions']] },
  { key: 'comm', label: 'Communication', icon: Megaphone, perm: 'announcements:read', items: [['Announcements', '/r/announcements']] },
  { key: 'reports', label: 'Reports & Audit', icon: BarChart3, perm: 'reports:read', items: [['Reports', '/reports'], ['Audit Logs', '/r/audit-logs']] },
  { key: 'settings', label: 'Settings', icon: Settings, perm: 'settings:write', items: [['School Settings', '/settings'], ['Users', '/r/users']] },
];

export default function AppLayout() {
  const { user, school, logout, can } = useAuth(); const nav = useNavigate(); const loc = useLocation();
  const [open, setOpen] = useState(() => NAV.find((g) => g.items.some(([, p]) => loc.pathname.startsWith(p)))?.key || 'academics');
  const [mobile, setMobile] = useState(false); const [q, setQ] = useState('');
  const portal = ['parent', 'student'].includes(user.role);
  const groups = portal ? [] : NAV.filter((g) => can(g.perm));
  const term = 'Term 3'; const year = new Date().getFullYear();
  return (
    <div className="flex min-h-screen">
      {mobile && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobile(false)} />}
      <aside className={`fixed z-40 h-full w-64 shrink-0 overflow-y-auto bg-forest-800 text-white transition lg:static lg:translate-x-0 ${mobile ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2 border-b border-white/10 p-4">
          {school?.logoUrl ? <img src={school.logoUrl} className="h-9 w-9 rounded bg-white object-contain" alt="" /> : <School size={28} />}
          <span className="truncate text-sm font-bold">{school?.name || 'School ERP'}</span>
        </div>
        <nav className="space-y-1 p-3">
          <NavLink to={portal ? '/portal' : '/'} end className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-forest-500' : 'hover:bg-white/10'}`} onClick={() => setMobile(false)}><LayoutDashboard size={16} /> {portal ? 'My Portal' : 'Dashboard'}</NavLink>
          {groups.map((g) => (
            <div key={g.key}>
              <button onClick={() => setOpen(open === g.key ? '' : g.key)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${open === g.key ? 'bg-white/10' : 'hover:bg-white/10'}`}>
                <span className="flex items-center gap-2"><g.icon size={16} />{g.label}</span>{open === g.key ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {open === g.key && <div className="ml-4 mt-1 space-y-0.5 border-l border-white/15 pl-2">{g.items.map(([label, to]) => (
                <NavLink key={to} to={to} onClick={() => setMobile(false)} className={({ isActive }) => `block rounded-md px-3 py-1.5 text-[13px] ${isActive ? 'bg-forest-500 font-medium' : 'text-white/85 hover:bg-white/10'}`}>{label}</NavLink>))}</div>}
            </div>))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
          <button className="lg:hidden" onClick={() => setMobile(true)}><Menu /></button>
          <form className="relative hidden max-w-sm flex-1 sm:block" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/students?q=${encodeURIComponent(q)}`); }}>
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input className="input pl-9" placeholder="Search students by name or admission no." value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs md:inline">Academic Year {year} · {term}</span>
            <button className="relative rounded-full p-2 hover:bg-slate-100" title="Notifications"><Bell size={18} /></button>
            <div className="hidden text-right leading-tight sm:block"><div className="font-medium">{user.name}</div><div className="text-xs capitalize text-slate-500">{user.role.replace('_', ' ')}</div></div>
            <button className="btn-ghost" onClick={() => { logout(); nav('/login'); }}><LogOut size={14} /> Logout</button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
