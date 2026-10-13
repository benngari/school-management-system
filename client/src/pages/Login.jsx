import { useState } from 'react'; import { useNavigate } from 'react-router-dom'; import { School } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; import { Err } from '../components/ui';
export default function Login() {
  const { login } = useAuth(); const nav = useNavigate(); const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { const u = await login(f.email, f.password); nav(['parent', 'student'].includes(u.role) ? '/portal' : '/'); } catch (x) { setErr(x.userMessage); } finally { setBusy(false); } };
  return (<div className="flex min-h-screen items-center justify-center bg-forest-800 p-4"><form onSubmit={submit} className="card w-full max-w-sm space-y-3 p-6">
    <div className="flex flex-col items-center gap-1 text-forest-700"><School size={36} /><h1 className="text-xl font-bold">School ERP</h1><p className="text-xs text-slate-500">Sign in to continue</p></div>
    <Err msg={err} />
    <input className="input" type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
    <input className="input" type="password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
    <button className="btn-primary w-full justify-center" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></div>);
}
