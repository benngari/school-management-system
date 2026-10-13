const router = require('express').Router();
const { protect, requirePerm: P } = require('../middleware/auth');
const crud = require('../controllers/crud');
const auth = require('../controllers/auth');
const students = require('../controllers/students');
const fin = require('../controllers/finance');
const duty = require('../controllers/duty');
const acad = require('../controllers/academics');
const dash = require('../controllers/dashboard');
const portal = require('../controllers/portal');
const core = require('../models/Core');
const ops = require('../models/Operations');
const sec = require('../models/Secondary');
const { asyncH, ok } = require('../utils/helpers');

// ---- public auth
router.post('/auth/login', auth.login);
router.post('/auth/setup', auth.setup);
router.use(protect);
router.get('/auth/me', auth.me);
router.get('/users', P('users:write'), auth.users.list);
router.post('/users', P('users:write'), auth.users.create);
router.put('/users/:id', P('users:write'), auth.users.update);

router.get('/dashboard', P('reports:read'), dash.get);

// ---- students
router.get('/students', P('students:read'), students.list);
router.get('/students/class-counts', P('students:read'), students.classCounts);
router.post('/students/import', P('students:write'), students.importRows);
router.get('/students/:id', P('students:read'), students.get);
router.get('/students/:id/attendance', P('students:read'), students.attendance);
router.get('/students/:id/results', P('students:read'), students.results);
router.post('/students', P('students:write'), students.create);
router.put('/students/:id', P('students:write'), students.update);
router.post('/students/:id/status', P('students:write'), students.changeStatus);
router.delete('/students/:id', P('students:write'), students.remove);

// ---- generic resources: [path, Model, module, options]
const mount = (path, Model, mod, opt = {}) => {
  const c = crud(Model, opt);
  router.get(`/${path}`, P(`${mod}:read`), c.list); router.get(`/${path}/:id`, P(`${mod}:read`), c.get);
  router.post(`/${path}`, P(`${mod}:write`), c.create); router.put(`/${path}/:id`, P(`${mod}:write`), c.update); router.delete(`/${path}/:id`, P(`${mod}:write`), c.remove);
};
mount('classes', core.SchoolClass, 'academics', { sort: 'name', search: ['name'], populate: 'classTeacher' });
mount('academic-years', core.AcademicYear, 'academics', { sort: '-year' });
mount('staff', core.Staff, 'staff', { search: ['name', 'staffNo'], filters: ['type', 'active'], sort: 'name' });
mount('subjects', core.Subject, 'academics', { search: ['name', 'code'], populate: 'teacher' });
mount('timetable', core.Timetable, 'academics', { filters: ['className', 'stream', 'day'], populate: 'teacher', sort: 'day start' });
mount('exams', core.Exam, 'academics', { search: ['name'], filters: ['className', 'year', 'term'] });
mount('events', ops.Event, 'events', { search: ['title'], sort: 'date' });
mount('tasks', ops.Task, 'tasks', { search: ['title'], filters: ['status', 'priority'], populate: 'assignee' });
mount('announcements', ops.Announcement, 'announcements');
mount('books', sec.Book, 'library', { search: ['title', 'author', 'isbn'] });
mount('loans', sec.Loan, 'library', { populate: 'book student' });
mount('vehicles', sec.Vehicle, 'transport'); mount('routes', sec.Route, 'transport', { populate: 'vehicle' });
mount('dorms', sec.Dorm, 'boarding', { populate: 'supervisor' });
mount('incidents', sec.Incident, 'discipline', { populate: 'student', filters: ['status', 'type'] });
mount('assets', sec.Asset, 'maintenance', { search: ['name', 'assetNo'] }); mount('work-orders', sec.WorkOrder, 'maintenance', { populate: 'asset' });
mount('clinic', sec.ClinicVisit, 'clinic', { populate: 'student' });
mount('menus', sec.MealMenu, 'kitchen', { sort: '-date' }); mount('kitchen-stock', sec.KitchenStock, 'kitchen', { search: ['item'] });
mount('admissions', sec.Admission, 'admissions', { search: ['applicant'], filters: ['status'] });
mount('prefects', sec.Prefect, 'discipline', { populate: 'student' });

// Library: issue/return with availability + fines
router.post('/loans/issue', P('library:write'), asyncH(async (req, res) => {
  const b = await sec.Book.findOneAndUpdate({ _id: req.body.book, available: { $gt: 0 } }, { $inc: { available: -1 } }, { new: true });
  if (!b) return res.status(409).json({ success: false, message: 'No copies available' });
  ok(res, await sec.Loan.create(req.body), {}, 201);
}));
router.post('/loans/:id/return', P('library:write'), asyncH(async (req, res) => {
  const l = await sec.Loan.findById(req.params.id); if (!l || l.returned) return res.status(409).json({ success: false, message: 'Loan not open' });
  const ret = req.body.returned || new Date().toISOString().slice(0, 10); const late = Math.max(0, Math.floor((new Date(ret) - new Date(l.due)) / 864e5));
  l.returned = ret; l.fine = late * (+req.body.finePerDay || 0); await l.save(); await sec.Book.updateOne({ _id: l.book }, { $inc: { available: 1 } }); ok(res, l);
}));
// Transport: capacity enforced server-side
router.post('/routes/:id/allocate', P('transport:write'), asyncH(async (req, res) => {
  const r = await sec.Route.findById(req.params.id).populate('vehicle'); if (!r) return res.status(404).json({ success: false, message: 'Route not found' });
  const cap = r.vehicle?.capacity ?? Infinity; const ids = new Set(r.students.map(String)); ids.add(String(req.body.student));
  if (ids.size > cap) return res.status(409).json({ success: false, message: `Vehicle capacity (${cap}) would be exceeded` });
  r.students = [...ids]; await r.save(); ok(res, r);
}));
// Boarding: bed capacity enforced
router.post('/dorms/:id/allocate', P('boarding:write'), asyncH(async (req, res) => {
  const d = await sec.Dorm.findById(req.params.id); const ids = new Set(d.students.map(String)); ids.add(String(req.body.student));
  if (ids.size > d.beds) return res.status(409).json({ success: false, message: `Dormitory full (${d.beds} beds)` }); d.students = [...ids]; await d.save(); ok(res, d);
}));

// ---- attendance & results
router.get('/attendance', P('attendance:write'), acad.attendanceGet);
router.post('/attendance', P('attendance:write'), acad.attendanceSave);
router.get('/attendance/report', P('students:read'), acad.attendanceReport);
router.post('/results', P('results:write'), acad.resultsSave);
router.get('/results/report-card/:exam/:student', P('academics:read'), acad.reportCard);
router.get('/results/class/:exam', P('academics:read'), acad.classPerformance);

// ---- finance
router.get('/finance/statement/:id', P('finance:read'), fin.statement);
router.post('/finance/invoices', P('finance:write'), fin.invoiceFromStructure);
router.post('/finance/transactions', P('finance:write'), fin.record);
router.post('/finance/transactions/:id/reverse', P('finance:write'), fin.reverse);
router.get('/finance/arrears', P('finance:read'), fin.arrears);
router.get('/finance/income-expense', P('finance:read'), fin.incomeExpense);
router.get('/finance/expenses', P('finance:read'), fin.expenses.list); router.post('/finance/expenses', P('finance:write'), fin.expenses.create);
const { FeeStructure } = require('../models/Finance'); mount('finance/fee-structures', FeeStructure, 'finance');

// ---- duty roster
router.get('/duty/stations', P('duty:read'), duty.stations.list); router.post('/duty/stations', P('duty:write'), duty.stations.create); router.put('/duty/stations/:id', P('duty:write'), duty.stations.update);
router.get('/duty/assignments', duty.list);   // staff without duty:read get only their own (enforced in controller)
router.post('/duty/assignments', P('duty:write'), duty.create); router.put('/duty/assignments/:id', P('duty:write'), duty.update); router.delete('/duty/assignments/:id', P('duty:write'), duty.remove);
router.post('/duty/assignments/:id/confirm', P('duty:self'), duty.confirm); router.post('/duty/assignments/:id/complete', P('duty:self'), duty.complete);
router.post('/duty/generate', P('duty:write'), duty.generate); router.post('/duty/publish', P('duty:write'), duty.publish);
router.get('/duty/swaps', P('duty:read'), duty.swaps.list); router.post('/duty/swaps', P('duty:self'), duty.swaps.request); router.post('/duty/swaps/:id/decide', P('duty:approve'), duty.swaps.decide);
router.get('/duty/report', P('duty:write'), duty.report);
router.get('/leave', P('leave:self'), duty.leave.list); router.post('/leave', P('leave:self'), duty.leave.create); router.post('/leave/:id/decide', P('staff:write'), duty.leave.decide);

// ---- settings / audit
router.get('/settings', asyncH(async (req, res) => ok(res, (await core.School.findOne()) || (await core.School.create({})))));
router.put('/settings', P('settings:write'), asyncH(async (req, res) => { const s = (await core.School.findOne()) || new core.School(); s.set(req.body); await s.save(); ok(res, s); }));
router.get('/audit-logs', P('settings:write'), asyncH(async (req, res) => ok(res, await ops.AuditLog.find().sort('-createdAt').limit(200))));

// ---- portals (own data only)
const portalOnly = (req, res, next) => (['parent', 'student'].includes(req.user.role) ? next() : res.status(403).json({ success: false, message: 'Portal users only' }));
router.get('/portal/children', portalOnly, portal.children);
router.get('/portal/:id/attendance', portalOnly, portal.attendance); router.get('/portal/:id/fees', portalOnly, portal.fees); router.get('/portal/:id/results', portalOnly, portal.results);
module.exports = router;
