export const kes = (n) => 'KES ' + Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const dmy = (d) => { if (!d) return '—'; const x = new Date(d); if (isNaN(x)) return String(d); return `${String(x.getUTCDate()).padStart(2, '0')}/${String(x.getUTCMonth() + 1).padStart(2, '0')}/${x.getUTCFullYear()}`; };
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const fullName = (s) => s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : '';
export const addDaysISO = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const mondayOf = (iso) => { const d = new Date(iso + 'T00:00:00Z'); const k = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() - k + 1); return d.toISOString().slice(0, 10); };
export const CLASSES_FALLBACK = ['Grade 7', 'Grade 8', 'Grade 9', 'Form 3', 'Form 4'];
