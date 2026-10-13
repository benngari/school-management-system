import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';
const Ctx = createContext(null); export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [school, setSchool] = useState(null); const [loading, setLoading] = useState(!!localStorage.getItem('token'));
  const loadSchool = useCallback(() => api.get('/settings').then((r) => setSchool(r.data.data)).catch(() => {}), []);
  useEffect(() => { if (!localStorage.getItem('token')) return; api.get('/auth/me').then((r) => { setUser(r.data.data); loadSchool(); }).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false)); }, [loadSchool]);
  const login = async (email, password) => { const { data } = await api.post('/auth/login', { email, password }); localStorage.setItem('token', data.data.token); setUser(data.data.user); loadSchool(); return data.data.user; };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  // mirrors server permission rules (UI hints only — the server enforces them)
  const can = (perm) => { const l = user?.permissions || []; const [m, a] = perm.split(':'); return l.includes('*') || l.includes(perm) || l.includes(`*:${a}`) || (a === 'read' && l.includes(`${m}:write`)); };
  return <Ctx.Provider value={{ user, school, setSchool, loading, login, logout, can, loadSchool }}>{children}</Ctx.Provider>;
}
