const { Attendance, Student, Exam, Result, School } = require('../models/Core');
const { asyncH, ok, ApiError } = require('../utils/helpers');
const { summarise } = require('../services/grading');
const audit = require('../services/audit');

exports.attendanceGet = asyncH(async (req, res) => {
  const { date, className, stream } = req.query; if (!date || !className) throw new ApiError(400, 'date and className are required');
  const students = await Student.find({ className, status: 'Active', ...(stream && { stream }) }).sort('lastName').select('admissionNo firstName lastName stream');
  const marks = await Attendance.find({ date, student: { $in: students.map((s) => s._id) } });
  const m = new Map(marks.map((a) => [String(a.student), a]));
  ok(res, students.map((s) => ({ student: s, status: m.get(String(s._id))?.status || null, note: m.get(String(s._id))?.note })));
});
exports.attendanceSave = asyncH(async (req, res) => {
  const { date, records } = req.body; if (!date || !Array.isArray(records)) throw new ApiError(400, 'date and records[] required');
  const ops = records.filter((r) => ['Present', 'Absent', 'Late', 'Excused'].includes(r.status)).map((r) => ({ updateOne: { filter: { student: r.student, date }, update: { $set: { status: r.status, note: r.note, markedBy: req.user._id } }, upsert: true } }));
  if (ops.length) await Attendance.bulkWrite(ops); await audit(req, 'attendance', 'Attendance', null, `${date}: ${ops.length}`); ok(res, { saved: ops.length });
});
exports.attendanceReport = asyncH(async (req, res) => {
  const { from, to, className } = req.query; const q = { date: { $gte: from || '0000', $lte: to || '9999' } };
  if (className) q.student = { $in: (await Student.find({ className }).select('_id')).map((s) => s._id) };
  const rows = await Attendance.aggregate([{ $match: q }, { $group: { _id: { date: '$date', status: '$status' }, n: { $sum: 1 } } }, { $sort: { '_id.date': 1 } }]);
  ok(res, rows.map((r) => ({ date: r._id.date, status: r._id.status, count: r.n })));
});
exports.resultsSave = asyncH(async (req, res) => {
  const { exam, subject, marks } = req.body; const e = await Exam.findById(exam); if (!e) throw new ApiError(404, 'Exam not found');
  for (const m of marks) if (m.marks < 0 || m.marks > e.maxMarks) throw new ApiError(400, `Marks must be between 0 and ${e.maxMarks}`);
  await Result.bulkWrite(marks.map((m) => ({ updateOne: { filter: { exam, student: m.student, subject }, update: { $set: { marks: m.marks } }, upsert: true } }))); ok(res, { saved: marks.length });
});
exports.reportCard = asyncH(async (req, res) => {
  const e = await Exam.findById(req.params.exam); const st = await Student.findById(req.params.student); if (!e || !st) throw new ApiError(404, 'Not found');
  const school = await School.findOne(); const results = await Result.find({ exam: e._id, student: st._id });
  ok(res, { exam: e, student: st, ...summarise(results, e.maxMarks, school?.gradingSystem || []) });
});
exports.classPerformance = asyncH(async (req, res) => {
  const e = await Exam.findById(req.params.exam); if (!e) throw new ApiError(404, 'Exam not found'); const school = await School.findOne();
  const all = await Result.find({ exam: e._id }).populate('student', 'firstName lastName admissionNo'); const by = new Map();
  all.forEach((r) => { const k = String(r.student._id); if (!by.has(k)) by.set(k, { student: r.student, results: [] }); by.get(k).results.push(r); });
  const rows = [...by.values()].map((v) => ({ student: v.student, ...summarise(v.results, e.maxMarks, school?.gradingSystem || []) })).sort((a, b) => b.average - a.average).map((r, i) => ({ ...r, position: i + 1 }));
  ok(res, rows);
});
