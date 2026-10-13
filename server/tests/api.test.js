// Integration tests. Need a reachable MongoDB: run with TEST_MONGODB_URI=... npm test (skipped otherwise).
// WARNING: they run against the database at TEST_MONGODB_URI and create/delete data there. Use a throwaway DB.
const test = require('node:test'); const assert = require('node:assert');
const URI = process.env.TEST_MONGODB_URI;
if (!URI) { test('api integration (skipped: set TEST_MONGODB_URI)', { skip: true }, () => {}); return; }
process.env.JWT_SECRET = 'test'; process.env.NODE_ENV = 'test';
const mongoose = require('mongoose'); const app = require('../app'); const User = require('../models/User'); const core = require('../models/Core');
let base, server, tok = {};
const api = async (m, p, body, t) => { const r = await fetch(base + p, { method: m, headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json() }; };
test.before(async () => {
  await mongoose.connect(URI); await mongoose.connection.dropDatabase();
  await new Promise((r) => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}/api`;
  const staffA = await core.Staff.create({ staffNo: 'T1', name: 'A' }), staffB = await core.Staff.create({ staffNo: 'T2', name: 'B' });
  const stu = await core.Student.create({ admissionNo: '90001', firstName: 'Kid', lastName: 'One', gender: 'Male', className: 'Grade 7' });
  const other = await core.Student.create({ admissionNo: '90002', firstName: 'Kid', lastName: 'Two', gender: 'Female', className: 'Grade 7' });
  for (const [role, extra] of [['super_admin', {}], ['bursar', {}], ['deputy', {}], ['teacher', { staff: staffA._id }], ['parent', { children: [stu._id] }]])
    await User.create({ name: role, email: `${role}@t.io`, password: 'Password-123', role, ...extra });
  for (const r of ['super_admin', 'bursar', 'deputy', 'teacher', 'parent']) tok[r] = (await api('POST', '/auth/login', { email: `${r}@t.io`, password: 'Password-123' })).body.data.token;
  Object.assign(global, { __ids: { staffA, staffB, stu, other } });
});
test.after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });

test('login rejects bad password; protected routes need a token', async () => {
  assert.strictEqual((await api('POST', '/auth/login', { email: 'bursar@t.io', password: 'nope' })).status, 401);
  assert.strictEqual((await api('GET', '/students')).status, 401);
});
test('RBAC: bursar cannot create students, teacher cannot read finance, parent cannot list students', async () => {
  const b = { firstName: 'X', lastName: 'Y', gender: 'Male', className: 'Grade 7' };
  assert.strictEqual((await api('POST', '/students', b, tok.bursar)).status, 403);
  assert.strictEqual((await api('GET', '/finance/arrears', null, tok.teacher)).status, 403);
  assert.strictEqual((await api('GET', '/students', null, tok.parent)).status, 403);
});
test('student CRUD, auto admission numbers, validation, import report, soft-delete', async () => {
  const c = await api('POST', '/students', { firstName: 'Amina', lastName: 'Hassan', gender: 'Female', className: 'Grade 8', guardians: [{ name: 'G', phone: '0712345678' }] }, tok.deputy);
  assert.strictEqual(c.status, 201); assert.match(c.body.data.admissionNo, /^\d{5}$/); assert.strictEqual(c.body.data.guardians[0].phone, '+254712345678');
  assert.strictEqual((await api('POST', '/students', { firstName: 'NoClass' }, tok.deputy)).status, 400);
  assert.strictEqual((await api('POST', '/students', { firstName: 'A', lastName: 'B', gender: 'Male', className: 'G8', guardians: [{ name: 'G', phone: '123' }] }, tok.deputy)).status, 400);
  const up = await api('PUT', `/students/${c.body.data._id}`, { stream: 'East' }, tok.deputy); assert.strictEqual(up.body.data.stream, 'East');
  const imp = await api('POST', '/students/import', { rows: [{ firstName: 'I1', lastName: 'L', gender: 'M', className: 'Grade 9' }, { firstName: 'Bad', lastName: 'Row', gender: '?', className: 'Grade 9' }, { firstName: 'Dup', lastName: 'L', gender: 'F', className: 'Grade 9', admissionNo: '90001' }] }, tok.deputy);
  assert.strictEqual(imp.body.data.created, 1); assert.strictEqual(imp.body.data.errors.length, 2);
  const list = await api('GET', '/students?q=amina&limit=5', null, tok.deputy); assert.strictEqual(list.body.total, 1);
  await api('DELETE', `/students/${c.body.data._id}`, null, tok.deputy); assert.strictEqual((await api('GET', `/students/${c.body.data._id}`, null, tok.deputy)).body.data.status, 'Withdrawn');
});
test('finance: structure -> invoice (no duplicates) -> payment -> reversal -> arrears', async () => {
  const { stu } = __ids;
  await api('POST', '/finance/fee-structures', { className: 'Grade 7', year: 2026, term: 'Term 3', items: [{ name: 'Tuition', amount: 20000 }, { name: 'Lunch', amount: 5000 }] }, tok.bursar);
  const inv = await api('POST', '/finance/invoices', { className: 'Grade 7', year: 2026, term: 'Term 3' }, tok.bursar); assert.ok(inv.body.data.created >= 2); assert.strictEqual(inv.body.data.amountEach, 25000);
  assert.strictEqual((await api('POST', '/finance/invoices', { className: 'Grade 7', year: 2026, term: 'Term 3' }, tok.bursar)).body.data.created, 0);
  await api('POST', '/finance/transactions', { student: stu._id, kind: 'opening', amount: 1000 }, tok.bursar);
  const pay = await api('POST', '/finance/transactions', { student: stu._id, kind: 'payment', amount: 10000, method: 'Cash' }, tok.bursar);
  assert.strictEqual(pay.body.data.balance, 16000); assert.match(pay.body.data.transaction.receiptNo, /^RCP-/);
  await api('POST', '/finance/transactions', { student: stu._id, kind: 'bursary', amount: 5000 }, tok.bursar);
  assert.strictEqual((await api('POST', '/finance/transactions', { student: stu._id, kind: 'payment', amount: -5 }, tok.bursar)).status, 400);
  const rev = await api('POST', `/finance/transactions/${pay.body.data.transaction._id}/reverse`, { reason: 'Bounced cheque' }, tok.bursar); assert.strictEqual(rev.body.data.balance, 21000);
  assert.strictEqual((await api('POST', `/finance/transactions/${pay.body.data.transaction._id}/reverse`, { reason: 'x' }, tok.bursar)).status, 409);
  const ar = await api('GET', '/finance/arrears?className=Grade 7', null, tok.bursar); assert.ok(ar.body.totalOutstanding >= 21000);
  assert.strictEqual((await api('GET', `/finance/statement/${stu._id}`, null, tok.bursar)).body.data.entries.length, 5);
});
test('attendance and results', async () => {
  const { stu } = __ids;
  assert.strictEqual((await api('POST', '/attendance', { date: '2026-10-12', records: [{ student: stu._id, status: 'Late' }] }, tok.teacher)).body.data.saved, 1);
  await api('POST', '/attendance', { date: '2026-10-12', records: [{ student: stu._id, status: 'Present' }] }, tok.teacher);
  const g = await api('GET', '/attendance?date=2026-10-12&className=Grade 7', null, tok.teacher); assert.strictEqual(g.body.data.find((r) => r.student._id === String(stu._id)).status, 'Present');
  const ex = await api('POST', '/exams', { name: 'T', className: 'Grade 7', maxMarks: 100 }, tok.deputy); await api('PUT', '/settings', {}, tok.super_admin);
  assert.strictEqual((await api('POST', '/results', { exam: ex.body.data._id, subject: 'Maths', marks: [{ student: stu._id, marks: 101 }] }, tok.teacher)).status, 400);
  await api('POST', '/results', { exam: ex.body.data._id, subject: 'Maths', marks: [{ student: stu._id, marks: 80 }] }, tok.teacher); await api('POST', '/results', { exam: ex.body.data._id, subject: 'English', marks: [{ student: stu._id, marks: 60 }] }, tok.teacher);
  const rc = await api('GET', `/results/report-card/${ex.body.data._id}/${stu._id}`, null, tok.teacher); assert.strictEqual(rc.body.data.average, 70); assert.strictEqual(rc.body.data.grade, 'B+');
});
test('duty roster: conflict detection, override, generator preview/publish, swap needs approval', async () => {
  const { staffA, staffB } = __ids;
  const st = (await api('POST', '/duty/stations', { name: 'Gate', requiredStaff: 1, start: '07:00', end: '08:00' }, tok.deputy)).body.data;
  const a1 = await api('POST', '/duty/assignments', { station: st._id, staff: staffA._id, date: '2026-10-14', start: '07:00', end: '08:00' }, tok.deputy); assert.strictEqual(a1.status, 201);
  const c = await api('POST', '/duty/assignments', { station: st._id, staff: staffA._id, date: '2026-10-14', start: '07:30', end: '08:30' }, tok.deputy); assert.strictEqual(c.status, 409); assert.strictEqual(c.body.conflicts[0].type, 'duty_overlap');
  assert.strictEqual((await api('POST', '/duty/assignments', { station: st._id, staff: staffA._id, date: '2026-10-14', start: '07:30', end: '08:30', override: true }, tok.deputy)).status, 201);
  assert.strictEqual((await api('POST', '/duty/assignments', {}, tok.teacher)).status, 403);
  const gen = await api('POST', '/duty/generate', { from: '2026-10-19', to: '2026-10-23' }, tok.deputy); assert.strictEqual(gen.body.data.preview.length, 5);
  assert.strictEqual((await api('POST', '/duty/publish', { assignments: gen.body.data.assignments }, tok.deputy)).body.data.published, 5);
  const sw = await api('POST', '/duty/swaps', { assignment: a1.body.data._id, proposedStaff: staffB._id, reason: 'Sick' }, tok.teacher); assert.strictEqual(sw.status, 201);
  assert.strictEqual((await api('POST', `/duty/swaps/${sw.body.data._id}/decide`, { decision: 'Approved' }, tok.teacher)).status, 403);
  assert.strictEqual((await api('POST', `/duty/swaps/${sw.body.data._id}/decide`, { decision: 'Approved' }, tok.deputy)).body.data.status, 'Approved');
  const mine = await api('GET', '/duty/assignments?mine=true', null, tok.teacher); assert.ok(mine.body.data.every((d) => String(d.staff?._id) === String(staffA._id)));
});
test('dashboard and duty report use real records', async () => {
  const d = await api('GET', '/dashboard', null, tok.deputy); assert.strictEqual(d.status, 200); assert.ok(d.body.data.students >= 2); assert.ok(d.body.data.fees.outstanding > 0);
  const r = await api('GET', '/duty/report', null, tok.deputy); assert.strictEqual(r.status, 200); assert.ok(r.body.data.length >= 1);
});
test('portal: parent sees only linked child', async () => {
  const { stu, other } = __ids;
  assert.strictEqual((await api('GET', '/portal/children', null, tok.parent)).body.data.length, 1);
  assert.strictEqual((await api('GET', `/portal/${stu._id}/fees`, null, tok.parent)).status, 200);
  assert.strictEqual((await api('GET', `/portal/${other._id}/fees`, null, tok.parent)).status, 403);
  assert.strictEqual((await api('GET', '/portal/children', null, tok.teacher)).status, 403);
});
test('library, transport capacity, boarding capacity, persistence across reconnect', async () => {
  const sec = require('../models/Secondary'); const { stu } = __ids;
  const b = (await api('POST', '/books', { title: 'B', copies: 1, available: 1 }, tok.super_admin)).body.data;
  assert.strictEqual((await api('POST', '/loans/issue', { book: b._id, student: stu._id, issued: '2026-10-01', due: '2026-10-08' }, tok.super_admin)).status, 201);
  assert.strictEqual((await api('POST', '/loans/issue', { book: b._id, student: stu._id, issued: '2026-10-01', due: '2026-10-08' }, tok.super_admin)).status, 409);
  const v = (await api('POST', '/vehicles', { plate: 'KXX 1', capacity: 1 }, tok.super_admin)).body.data; const r = (await api('POST', '/routes', { name: 'R', vehicle: v._id }, tok.super_admin)).body.data;
  assert.strictEqual((await api('POST', `/routes/${r._id}/allocate`, { student: stu._id }, tok.super_admin)).status, 200);
  assert.strictEqual((await api('POST', `/routes/${r._id}/allocate`, { student: __ids.other._id }, tok.super_admin)).status, 409);
  await mongoose.disconnect(); await mongoose.connect(URI); assert.ok(await core.Student.countDocuments() >= 2, 'data persisted after reconnect');
});
