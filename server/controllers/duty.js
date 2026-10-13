const { DutyStation, DutyAssignment, DutySwap, Leave } = require('../models/Operations');
const { Staff, Timetable, School } = require('../models/Core');
const { asyncH, ok, ApiError } = require('../utils/helpers');
const { findConflicts, generateRoster } = require('../services/duty');
const { can } = require('../utils/permissions');
const audit = require('../services/audit');

const ctx = async (dates) => ({ teaching: await Timetable.find(), leave: await Leave.find({ status: 'Approved' }), existing: await DutyAssignment.find({ date: { $in: dates }, status: { $ne: 'Cancelled' } }) });
const range = (from, to) => { const out = []; for (let d = new Date(from + 'T00:00:00Z'); d <= new Date(to + 'T00:00:00Z') && out.length < 100; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10)); return out; };
const staffOf = (req) => req.user.staff && String(req.user.staff);

exports.list = asyncH(async (req, res) => {
  const q = {}; if (req.query.from || req.query.to) q.date = { ...(req.query.from && { $gte: req.query.from }), ...(req.query.to && { $lte: req.query.to }) };
  if (req.query.station) q.station = req.query.station; if (req.query.status) q.status = req.query.status;
  if (!can(req.user.role, 'duty:read') || req.query.mine === 'true') q.staff = req.user.staff;
  ok(res, await DutyAssignment.find(q).populate('station staff replacement', 'name staffNo').sort('date start'));
});
exports.create = asyncH(async (req, res) => {
  const b = req.body; const c = await ctx([b.date]);
  const conflicts = findConflicts(b, c.existing, c);
  if (conflicts.length && !req.body.override) return res.status(409).json({ success: false, message: 'Conflicts detected (send override:true to force)', conflicts });
  const { override, ...doc } = b; const a = await DutyAssignment.create(doc); await audit(req, 'create', 'DutyAssignment', a._id, override ? 'manual override' : ''); ok(res, a, { conflicts }, 201);
});
exports.update = asyncH(async (req, res) => {
  const a = await DutyAssignment.findById(req.params.id); if (!a) throw new ApiError(404, 'Not found');
  const next = { ...a.toObject(), ...req.body }; const c = await ctx([next.date]);
  const conflicts = findConflicts(next, c.existing, c);
  if (conflicts.length && !req.body.override) return res.status(409).json({ success: false, message: 'Conflicts detected', conflicts });
  const { override, ...rest } = req.body; a.set(rest); await a.save(); ok(res, a);
});
exports.remove = asyncH(async (req, res) => { await DutyAssignment.findByIdAndUpdate(req.params.id, { status: 'Cancelled' }); ok(res, { cancelled: true }); });
// Staff self-service on their OWN assignment only.
const own = async (req) => { const a = await DutyAssignment.findById(req.params.id); if (!a) throw new ApiError(404, 'Not found'); if (!can(req.user.role, 'duty:write') && String(a.staff) !== staffOf(req)) throw new ApiError(403, 'Not your duty'); return a; };
exports.confirm = asyncH(async (req, res) => { const a = await own(req); a.status = 'Confirmed'; await a.save(); ok(res, a); });
exports.complete = asyncH(async (req, res) => { const a = await own(req); a.status = 'Completed'; a.completedAt = new Date(); a.handoverNotes = req.body.handoverNotes; await a.save(); ok(res, a); });

exports.stations = { list: asyncH(async (req, res) => ok(res, await DutyStation.find().sort('name'))), create: asyncH(async (req, res) => ok(res, await DutyStation.create(req.body), {}, 201)), update: asyncH(async (req, res) => ok(res, await DutyStation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }))) };

// Preview only — nothing saved until /publish.
exports.generate = asyncH(async (req, res) => {
  const { from, to, stationIds } = req.body; if (!from || !to) throw new ApiError(400, 'from and to are required');
  const dates = range(from, to).filter((d) => req.body.includeWeekends || ![0, 6].includes(new Date(d + 'T00:00:00Z').getUTCDay()));
  const school = await School.findOne(); const c = await ctx(dates);
  const stations = await DutyStation.find({ active: true, ...(stationIds?.length && { _id: { $in: stationIds } }) });
  const staff = await Staff.find({ active: true, ...(req.body.type && { type: req.body.type }) });
  const r = generateRoster({ stations: stations.map((s) => s.toObject()), staff: staff.map((s) => s.toObject()), dates, ...c, maxPerWeek: school?.dutyRules?.maxDutiesPerStaffPerWeek || 4 });
  const nameOf = new Map(staff.map((s) => [String(s._id), s.name])), stName = new Map(stations.map((s) => [String(s._id), s.name]));
  const load = {}; r.assignments.forEach((a) => { const n = nameOf.get(String(a.staff)); load[n] = (load[n] || 0) + 1; });
  ok(res, { ...r, preview: r.assignments.map((a) => ({ ...a, staffName: nameOf.get(String(a.staff)), stationName: stName.get(String(a.station)) })), workload: load });
});
exports.publish = asyncH(async (req, res) => {
  const list = req.body.assignments; if (!Array.isArray(list) || !list.length) throw new ApiError(400, 'assignments[] required');
  const created = await DutyAssignment.insertMany(list.map((a) => ({ ...a, status: 'Published' }))); await audit(req, 'publish', 'DutyAssignment', null, `${created.length} duties`); ok(res, { published: created.length }, {}, 201);
});

exports.swaps = {
  list: asyncH(async (req, res) => ok(res, await DutySwap.find(req.query.status ? { status: req.query.status } : {}).populate({ path: 'assignment', populate: 'station staff' }).populate('proposedStaff requestedBy', 'name').sort('-createdAt'))),
  request: asyncH(async (req, res) => {
    const a = await DutyAssignment.findById(req.body.assignment); if (!a) throw new ApiError(404, 'Duty not found');
    if (!can(req.user.role, 'duty:write') && String(a.staff) !== staffOf(req)) throw new ApiError(403, 'You can only request changes for your own duties');
    if (String(a.staff) === String(req.body.proposedStaff)) throw new ApiError(400, 'Proposed person is already assigned');
    ok(res, await DutySwap.create({ assignment: a._id, requestedBy: a.staff, type: req.body.type, proposedStaff: req.body.proposedStaff, reason: req.body.reason }), {}, 201);
  }),
  decide: asyncH(async (req, res) => { // requires duty:approve (enforced in route)
    const sw = await DutySwap.findById(req.params.id); if (!sw) throw new ApiError(404, 'Not found'); if (sw.status !== 'Pending') throw new ApiError(409, 'Already decided');
    const approve = req.body.decision === 'Approved';
    if (approve) {
      const a = await DutyAssignment.findById(sw.assignment); const c = await ctx([a.date]);
      const conflicts = findConflicts({ ...a.toObject(), staff: sw.proposedStaff }, c.existing, c);
      if (conflicts.length) return res.status(409).json({ success: false, message: 'Replacement has a conflict', conflicts });
      a.replacement = a.staff; a.staff = sw.proposedStaff; await a.save();
    }
    sw.status = approve ? 'Approved' : 'Rejected'; sw.decidedBy = req.user._id; sw.decidedAt = new Date(); await sw.save(); await audit(req, sw.status.toLowerCase(), 'DutySwap', sw._id); ok(res, sw);
  }),
};
exports.report = asyncH(async (req, res) => {
  const q = {}; if (req.query.from || req.query.to) q.date = { ...(req.query.from && { $gte: req.query.from }), ...(req.query.to && { $lte: req.query.to }) };
  const all = await DutyAssignment.find({ ...q, status: { $ne: 'Cancelled' } }, 'staff status').lean(); const by = new Map();
  for (const a of all) { const k = String(a.staff || ''); const r = by.get(k) || { _id: a.staff, total: 0, completed: 0, missed: 0, pending: 0 }; r.total++; if (a.status === 'Completed') r.completed++; else if (a.status === 'Missed') r.missed++; else if (['Published', 'Draft', 'Confirmed'].includes(a.status)) r.pending++; by.set(k, r); }
  const rows = [...by.values()].sort((a, b) => b.total - a.total);
  const staff = await Staff.find({ _id: { $in: rows.map((r) => r._id).filter(Boolean) } }).select('name'); const n = new Map(staff.map((s) => [String(s._id), s.name]));
  ok(res, rows.map((r) => ({ ...r, name: n.get(String(r._id)) || '—' })));
});
// leave approval
exports.leave = { list: asyncH(async (req, res) => ok(res, await Leave.find().populate('staff', 'name').sort('-createdAt'))), create: asyncH(async (req, res) => ok(res, await Leave.create({ ...req.body, staff: can(req.user.role, 'staff:write') ? req.body.staff : req.user.staff }), {}, 201)), decide: asyncH(async (req, res) => ok(res, await Leave.findByIdAndUpdate(req.params.id, { status: req.body.decision, decidedBy: req.user._id }, { new: true }))) };
