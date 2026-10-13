const test = require('node:test'); const assert = require('node:assert');
const { computeBalance, invoiceTotal } = require('../services/finance');
const { findConflicts, generateRoster } = require('../services/duty');
const { gradeFor, summarise } = require('../services/grading');
const { can } = require('../utils/permissions'); const { fmtPhoneKE, overlaps } = require('../utils/helpers');

test('fee balance: opening + invoice - payment - bursary + reversal nets correctly', () => {
  const e = [{ kind: 'opening', amount: 1000 }, { kind: 'invoice', amount: 30000 }, { kind: 'payment', amount: 10000 }, { kind: 'bursary', amount: 5000 }];
  assert.deepStrictEqual(computeBalance(e), { debit: 31000, credit: 15000, balance: 16000 });
  e.push({ kind: 'debit_adjustment', amount: 10000 }); // reversal of the payment
  assert.strictEqual(computeBalance(e).balance, 26000);
  assert.strictEqual(invoiceTotal([{ amount: 100.1 }, { amount: 200.2 }]), 300.3);
});
test('overlap detection is half-open', () => { assert.ok(overlaps('08:00', '09:00', '08:30', '09:30')); assert.ok(!overlaps('08:00', '09:00', '09:00', '10:00')); });
test('duty conflicts: overlap, lesson, leave', () => {
  const ex = [{ _id: 1, staff: 'a', date: '2026-10-12', start: '07:00', end: '08:00', status: 'Published' }];
  assert.strictEqual(findConflicts({ staff: 'a', date: '2026-10-12', start: '07:30', end: '08:30' }, ex).length, 1);
  assert.strictEqual(findConflicts({ staff: 'b', date: '2026-10-12', start: '07:30', end: '08:30' }, ex).length, 0);
  const t = [{ teacher: 'b', day: 1, start: '07:00', end: '08:00', subject: 'Math' }]; // 2026-10-12 is Monday
  assert.strictEqual(findConflicts({ staff: 'b', date: '2026-10-12', start: '07:30', end: '07:45' }, [], { teaching: t })[0].type, 'teaching_lesson');
  assert.strictEqual(findConflicts({ staff: 'c', date: '2026-10-12', start: '07:00', end: '08:00' }, [], { leave: [{ staff: 'c', from: '2026-10-10', to: '2026-10-14' }] })[0].type, 'on_leave');
});
test('roster generator: fair, respects cap, flags understaffing, no conflicts', () => {
  const staff = ['a', 'b', 'c'].map((_id) => ({ _id })); const stations = [{ _id: 's1', name: 'Gate', requiredStaff: 1, start: '07:00', end: '08:00' }, { _id: 's2', name: 'Assembly', requiredStaff: 1, start: '07:30', end: '08:30' }];
  const dates = ['2026-10-12', '2026-10-13', '2026-10-14'];
  const r = generateRoster({ stations, staff, dates, maxPerWeek: 2 });
  const per = {}; r.assignments.forEach((a) => { per[a.staff] = (per[a.staff] || 0) + 1; });
  assert.ok(Math.max(...Object.values(per)) <= 2, 'weekly cap respected');
  assert.ok(Math.max(...Object.values(per)) - Math.min(...Object.values(per)) <= 1, 'fair distribution');
  for (const d of dates) { const day = r.assignments.filter((a) => a.date === d); assert.notStrictEqual(day[0]?.staff, day[1]?.staff, 'overlapping stations get different people'); }
  const tight = generateRoster({ stations, staff: [{ _id: 'a' }], dates: ['2026-10-12'], maxPerWeek: 4 });
  assert.strictEqual(tight.understaffed.length, 1);
});
test('grading is configurable', () => {
  const sys = [{ min: 50, max: 100, grade: 'ME', points: 3 }, { min: 0, max: 49, grade: 'BE', points: 1 }];
  assert.strictEqual(gradeFor(75, sys).grade, 'ME'); assert.strictEqual(summarise([{ subject: 'M', marks: 30 }, { subject: 'E', marks: 50 }], 100, sys).average, 40);
});
test('permissions: bursar cannot write students; teacher cannot approve duty swaps; parent isolated', () => {
  assert.ok(!can('bursar', 'students:write')); assert.ok(can('bursar', 'finance:write')); assert.ok(can('bursar', 'finance:read'));
  assert.ok(!can('teacher', 'duty:approve')); assert.ok(can('deputy', 'duty:approve')); assert.ok(!can('parent', 'finance:read')); assert.ok(!can('teacher', 'clinic:read')); assert.ok(can('super_admin', 'anything:write'));
});
test('Kenyan phone formatting', () => { assert.strictEqual(fmtPhoneKE('0712 345 678'), '+254712345678'); assert.strictEqual(fmtPhoneKE('254112345678'), '+254112345678'); assert.strictEqual(fmtPhoneKE('12345'), null); });
