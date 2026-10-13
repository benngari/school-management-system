const { Student, SchoolClass, nextSeq } = require('../models/Core');
const { asyncH, ok, ApiError, fmtPhoneKE } = require('../utils/helpers');
const audit = require('../services/audit');

const admissionNo = async () => String(await nextSeq('admissionNo')).padStart(5, '0');
const cleanGuardians = (g = []) => g.filter((x) => x && x.name).map((x) => ({ ...x, phone: x.phone ? (fmtPhoneKE(x.phone) || (() => { throw new ApiError(400, `Invalid Kenyan phone: ${x.phone}`); })()) : undefined }));

exports.list = asyncH(async (req, res) => {
  const page = Math.max(1, +req.query.page || 1), limit = Math.min(500, +req.query.limit || 25);
  const q = {};
  ['className', 'stream', 'status', 'residence', 'gender'].forEach((f) => { if (req.query[f]) q[f] = req.query[f]; });
  if (req.query.q) { const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); q.$or = [{ firstName: rx }, { lastName: rx }, { admissionNo: rx }]; }
  const sort = req.query.sort || 'className lastName';
  const [items, total] = await Promise.all([Student.find(q).sort(sort).skip((page - 1) * limit).limit(limit), Student.countDocuments(q)]);
  ok(res, items, { page, limit, total, pages: Math.ceil(total / limit) });
});
exports.get = asyncH(async (req, res) => { const s = await Student.findById(req.params.id); if (!s) throw new ApiError(404, 'Student not found'); ok(res, s); });
exports.create = asyncH(async (req, res) => {
  const b = { ...req.body, guardians: cleanGuardians(req.body.guardians) };
  if (!b.admissionNo) b.admissionNo = await admissionNo();
  b.statusHistory = [{ status: 'Active', className: b.className, note: 'Admitted' }];
  const s = await Student.create(b); await audit(req, 'create', 'Student', s._id, s.admissionNo); ok(res, s, {}, 201);
});
exports.update = asyncH(async (req, res) => {
  const s = await Student.findById(req.params.id); if (!s) throw new ApiError(404, 'Student not found');
  const { admissionNo: _a, statusHistory: _h, ...rest } = req.body; if (rest.guardians) rest.guardians = cleanGuardians(rest.guardians);
  s.set(rest); await s.save(); await audit(req, 'update', 'Student', s._id); ok(res, s);
});
// Transfers, promotions, graduation, withdrawal, re-admission — each recorded in statusHistory.
exports.changeStatus = asyncH(async (req, res) => {
  const { status, className, note } = req.body;
  const s = await Student.findById(req.params.id); if (!s) throw new ApiError(404, 'Student not found');
  if (status) s.status = status; if (className) s.className = className;
  s.statusHistory.push({ status: s.status, className: s.className, note }); await s.save(); await audit(req, 'status', 'Student', s._id, `${s.status} ${s.className}`); ok(res, s);
});
exports.remove = asyncH(async (req, res) => { const s = await Student.findById(req.params.id); if (!s) throw new ApiError(404, 'Not found'); s.status = 'Withdrawn'; s.statusHistory.push({ status: 'Withdrawn', className: s.className, note: 'Removed (soft delete)' }); await s.save(); await audit(req, 'withdraw', 'Student', s._id); ok(res, { withdrawn: true }); });
// Bulk import: validates every row, returns a per-row report; valid rows are created.
exports.importRows = asyncH(async (req, res) => {
  const rows = req.body.rows; if (!Array.isArray(rows) || !rows.length) throw new ApiError(400, 'rows[] is required');
  const report = { created: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      if (!r.firstName || !r.lastName) throw new Error('firstName and lastName are required');
      const gender = /^m/i.test(r.gender) ? 'Male' : /^f/i.test(r.gender) ? 'Female' : null; if (!gender) throw new Error('gender must be Male or Female');
      if (!r.className) throw new Error('className is required');
      const guardians = r.guardianName ? cleanGuardians([{ name: r.guardianName, relationship: r.guardianRelationship, phone: r.guardianPhone }]) : [];
      await Student.create({ admissionNo: r.admissionNo || (await admissionNo()), firstName: r.firstName, lastName: r.lastName, gender, className: r.className, stream: r.stream || '', residence: /board/i.test(r.residence) ? 'Boarding' : 'Day', dob: r.dob || undefined, guardians, statusHistory: [{ status: 'Active', className: r.className, note: 'Imported' }] });
      report.created++;
    } catch (e) { report.errors.push({ row: i + 2, message: e.code === 11000 ? 'Duplicate admission number' : e.message }); }
  }
  await audit(req, 'import', 'Student', null, `${report.created} created, ${report.errors.length} errors`);
  ok(res, report);
});
// Counts per class/stream for the ID-card filter chips.
exports.classCounts = asyncH(async (req, res) => ok(res, await Student.aggregate([{ $match: { status: 'Active' } }, { $group: { _id: { className: '$className', stream: '$stream' }, count: { $sum: 1 } } }, { $sort: { '_id.className': 1, '_id.stream': 1 } }])));

// Per-student views used by the profile page (staff side)
const { Attendance, Result } = require('../models/Core');
exports.attendance = asyncH(async (req, res) => ok(res, await Attendance.find({ student: req.params.id }).sort('-date').limit(120)));
exports.results = asyncH(async (req, res) => { const rs = await Result.find({ student: req.params.id }).populate('exam'); ok(res, rs); });
