const { overlaps } = require('../utils/helpers');

// Find assignments that clash with `cand` for the same person on the same date.
function findConflicts(cand, existing, { teaching = [], leave = [] } = {}) {
  const out = [];
  for (const a of existing) {
    if (a._id && cand._id && String(a._id) === String(cand._id)) continue;
    if (['Cancelled'].includes(a.status)) continue;
    if (String(a.staff) === String(cand.staff) && a.date === cand.date && overlaps(cand.start, cand.end, a.start, a.end))
      out.push({ type: 'duty_overlap', with: a._id || null });
  }
  const dow = new Date(cand.date + 'T00:00:00Z').getUTCDay() || 7;
  for (const t of teaching) if (String(t.teacher) === String(cand.staff) && t.day === dow && overlaps(cand.start, cand.end, t.start, t.end)) out.push({ type: 'teaching_lesson', lesson: t.subject });
  for (const l of leave) if (String(l.staff) === String(cand.staff) && cand.date >= l.from && cand.date <= l.to) out.push({ type: 'on_leave' });
  return out;
}

const isoWeek = (d) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return `${t.getUTCFullYear()}-W${Math.ceil(((t - y) / 864e5 + 1) / 7)}`; };

/**
 * Fair roster generator (greedy least-loaded with rotation).
 * stations: [{_id,name,requiredStaff,start,end}], staff: [{_id,maxDutiesPerWeek?}], dates: ['YYYY-MM-DD']
 * Returns { assignments, understaffed } — nothing is saved; caller previews then publishes.
 */
function generateRoster({ stations, staff, dates, teaching = [], leave = [], existing = [], maxPerWeek = 4 }) {
  const load = new Map(staff.map((s) => [String(s._id), 0]));
  const weekLoad = new Map();
  const last = new Map(); // staff -> last station id, to rotate stations
  for (const a of existing) if (a.staff) load.set(String(a.staff), (load.get(String(a.staff)) || 0) + 1);
  const assignments = [], understaffed = [];
  for (const date of dates) {
    for (const st of stations) {
      let placed = 0;
      for (let slot = 0; slot < (st.requiredStaff || 1); slot++) {
        const cands = staff.filter((s) => {
          const key = `${s._id}|${isoWeek(date)}`;
          const cap = s.maxDutiesPerWeek || maxPerWeek;
          if ((weekLoad.get(key) || 0) >= cap) return false;
          const cand = { staff: s._id, date, start: st.start, end: st.end };
          return findConflicts(cand, [...existing, ...assignments], { teaching, leave }).length === 0;
        }).sort((a, b) => (load.get(String(a._id)) - load.get(String(b._id))) || ((String(last.get(String(a._id))) === String(st._id)) - (String(last.get(String(b._id))) === String(st._id))));
        const pick = cands[0];
        if (!pick) continue;
        assignments.push({ station: st._id, staff: pick._id, date, start: st.start, end: st.end, status: 'Draft', personType: 'Staff' });
        load.set(String(pick._id), load.get(String(pick._id)) + 1);
        const k = `${pick._id}|${isoWeek(date)}`; weekLoad.set(k, (weekLoad.get(k) || 0) + 1);
        last.set(String(pick._id), st._id); placed++;
      }
      if (placed < (st.requiredStaff || 1)) understaffed.push({ station: st._id, name: st.name, date, required: st.requiredStaff || 1, placed });
    }
  }
  return { assignments, understaffed };
}
module.exports = { findConflicts, generateRoster, isoWeek };
