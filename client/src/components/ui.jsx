import { X, Loader2 } from 'lucide-react';
export const Spinner = () => <div className="flex justify-center p-10 text-slate-400"><Loader2 className="animate-spin" /></div>;
export const PageHeader = ({ title, sub, children }) => (<div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">{title}</h1>{sub && <p className="text-sm text-slate-500">{sub}</p>}</div><div className="flex flex-wrap gap-2">{children}</div></div>);
export function Modal({ title, onClose, children, wide }) {
  return (<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`card mt-10 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} p-5`}><div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold">{title}</h3><button onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X size={18} /></button></div>{children}</div></div>);
}
export const Field = ({ label, children, error }) => (<label className="block text-sm"><span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>{children}{error && <span className="text-xs text-red-600">{error}</span>}</label>);
export const Badge = ({ children, tone = 'slate' }) => { const t = { slate: 'bg-slate-100 text-slate-700', green: 'bg-green-100 text-green-800', red: 'bg-red-100 text-red-700', amber: 'bg-amber-100 text-amber-800', blue: 'bg-blue-100 text-blue-800' }[tone]; return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t}`}>{children}</span>; };
export const toneFor = (s) => ({ Active: 'green', Present: 'green', Approved: 'green', Completed: 'green', Closed: 'green', Resolved: 'green', Confirmed: 'green', Published: 'blue', Open: 'amber', Pending: 'amber', Late: 'amber', Draft: 'slate', Absent: 'red', Rejected: 'red', Missed: 'red', Withdrawn: 'red', Urgent: 'red', High: 'amber' }[s] || 'slate');
export const Err = ({ msg }) => msg ? <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{msg}</div> : null;
export function Pager({ page, pages, total, set }) {
  return (<div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-500"><span>Page {page} of {pages || 1} · {total ?? 0} records</span><div className="flex gap-1"><button className="btn-ghost" disabled={page <= 1} onClick={() => set(page - 1)}>Prev</button><button className="btn-ghost" disabled={page >= pages} onClick={() => set(page + 1)}>Next</button></div></div>);
}
