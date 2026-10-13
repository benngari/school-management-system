class ApiError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const ok = (res, data, extra = {}, status = 200) => res.status(status).json({ success: true, data, ...extra });
const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
// [aStart,aEnd) intersects [bStart,bEnd); times "HH:MM"
const overlaps = (aS, aE, bS, bE) => toMin(aS) < toMin(bE) && toMin(bS) < toMin(aE);
const fmtPhoneKE = (p = '') => {
  const d = String(p).replace(/\D/g, '');
  if (/^0[17]\d{8}$/.test(d)) return '+254' + d.slice(1);
  if (/^254[17]\d{8}$/.test(d)) return '+' + d;
  if (/^[17]\d{8}$/.test(d)) return '+254' + d;
  return null;
};
module.exports = { ApiError, asyncH, ok, overlaps, toMin, fmtPhoneKE };
