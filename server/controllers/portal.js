// Server-side data isolation: parents see ONLY linked children; students ONLY themselves.
const { Student, Attendance, Result, Exam, School } = require('../models/Core');
const { FeeTransaction } = require('../models/Finance');
const { computeBalance } = require('../services/finance');
const { summarise } = require('../services/grading');
const { asyncH, ok, ApiError } = require('../utils/helpers');
const allowed = (u) => (u.role === 'parent' ? u.children.map(String) : u.role === 'student' && u.student ? [String(u.student)] : []);
exports.children = asyncH(async (req, res) => ok(res, await Student.find({ _id: { $in: allowed(req.user) } }).select('-statusHistory')));
const guard = (req) => { if (!allowed(req.user).includes(req.params.id)) throw new ApiError(403, 'Not your child'); };
exports.attendance = asyncH(async (req, res) => { guard(req); ok(res, await Attendance.find({ student: req.params.id }).sort('-date').limit(120)); });
exports.fees = asyncH(async (req, res) => { if (req.user.role === 'student') throw new ApiError(403, 'Not available'); guard(req); const e = await FeeTransaction.find({ student: req.params.id }).sort('createdAt'); ok(res, { entries: e, ...computeBalance(e) }); });
exports.results = asyncH(async (req, res) => { guard(req); const school = await School.findOne(); const rs = await Result.find({ student: req.params.id }).populate('exam'); const by = new Map(); rs.forEach((r) => { const k = String(r.exam._id); (by.get(k) || by.set(k, { exam: r.exam, r: [] }).get(k)).r.push(r); }); ok(res, [...by.values()].map((v) => ({ exam: v.exam, ...summarise(v.r, v.exam.maxMarks, school?.gradingSystem || []) }))); });
