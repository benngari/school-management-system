const { Student, Staff, Attendance, Exam, SchoolClass } = require('../models/Core');
const { FeeTransaction, Expense } = require('../models/Finance');
const { DutyAssignment, Event, Task, Leave } = require('../models/Operations');
const { WorkOrder } = require('../models/Secondary');
const { User } = { User: require('../models/User') };
const { asyncH, ok } = require('../utils/helpers');
const { computeBalance } = require('../services/finance');
const today = () => new Date().toISOString().slice(0, 10);

exports.get = asyncH(async (req, res) => {
  const t = today();
  const [students, parents, staff, classes, att, events, duties, tasksOverdue, maint, recentStudents, recentPayments, ledger, byClass, exams, pendingLeave] = await Promise.all([
    Student.countDocuments({ status: 'Active' }), User.countDocuments({ role: 'parent' }), Staff.countDocuments({ active: true }), SchoolClass.countDocuments(),
    Attendance.aggregate([{ $match: { date: t } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Event.find({ date: { $gte: t } }).sort('date').limit(5),
    DutyAssignment.find({ date: t, status: { $ne: 'Cancelled' } }).populate('station staff', 'name').limit(10),
    Task.countDocuments({ deadline: { $lt: t }, status: { $nin: ['Approved'] } }), WorkOrder.countDocuments({ status: { $ne: 'Closed' } }),
    Student.find().sort('-createdAt').limit(5).select('firstName lastName admissionNo className'),
    FeeTransaction.find({ kind: 'payment', reversedBy: null }).sort('-createdAt').limit(5).populate('student', 'firstName lastName admissionNo'),
    require('../services/ledger')(),
    Student.aggregate([{ $match: { status: 'Active' } }, { $group: { _id: '$className', n: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Exam.find({ date: { $gte: new Date() } }).sort('date').limit(5), Leave.countDocuments({ status: 'Pending' }),
  ]);
  const bal = [...ledger.values()];
  const collected = bal.reduce((s, b) => s + b.credit, 0), outstanding = bal.reduce((s, b) => s + Math.max(0, b.balance), 0);
  const a = Object.fromEntries(att.map((x) => [x._id, x.n])); const marked = Object.values(a).reduce((s, n) => s + n, 0);
  ok(res, { students, parents, staff, classes, attendanceToday: { ...a, marked, rate: marked ? Math.round(((a.Present || 0) + (a.Late || 0)) / marked * 100) : null }, fees: { collected, outstanding }, upcomingEvents: events, dutiesToday: duties, overdueTasks: tasksOverdue, pendingMaintenance: maint, recentStudents, recentPayments, enrollmentByClass: byClass, upcomingExams: exams, pendingLeave });
});
