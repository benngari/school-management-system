const { FeeStructure, FeeTransaction, Expense } = require('../models/Finance');
const { Student, nextSeq } = require('../models/Core');
const { asyncH, ok, ApiError } = require('../utils/helpers');
const { computeBalance, invoiceTotal, opposite, DEBIT_KINDS, round2 } = require('../services/finance');
const audit = require('../services/audit');

const studentBalance = async (id) => computeBalance(await FeeTransaction.find({ student: id }));
exports.statement = asyncH(async (req, res) => { const e = await FeeTransaction.find({ student: req.params.id }).sort('createdAt'); ok(res, { entries: e, ...computeBalance(e) }); });

exports.invoiceFromStructure = asyncH(async (req, res) => {
  const { className, year, term, studentIds } = req.body;
  const fs = await FeeStructure.findOne({ className, year, term }); if (!fs) throw new ApiError(404, 'No fee structure for that class/year/term');
  const total = invoiceTotal(fs.items);
  const students = await Student.find(studentIds?.length ? { _id: { $in: studentIds } } : { className, status: 'Active' });
  let created = 0, skipped = 0;
  for (const s of students) {
    if (await FeeTransaction.exists({ student: s._id, kind: 'invoice', year, term, reversedBy: null })) { skipped++; continue; } // no duplicate invoices
    await FeeTransaction.create({ student: s._id, kind: 'invoice', amount: total, year, term, description: `${term} ${year} fees`, recordedBy: req.user._id }); created++;
  }
  await audit(req, 'invoice', 'FeeTransaction', null, `${className} ${term} ${year}: ${created} invoiced`); ok(res, { created, skipped, amountEach: total });
});
exports.record = asyncH(async (req, res) => {
  const { student, kind, amount, method, reference, description, year, term } = req.body;
  if (!(Number(amount) > 0)) throw new ApiError(400, 'Amount must be greater than zero');
  if (!(await Student.exists({ _id: student }))) throw new ApiError(404, 'Student not found');
  if (!['opening', 'payment', 'discount', 'scholarship', 'bursary', 'debit_adjustment', 'credit_adjustment'].includes(kind)) throw new ApiError(400, 'Invalid kind (use the invoice endpoint for invoices)');
  const doc = { student, kind, amount: round2(+amount), method, reference, description, year, term, recordedBy: req.user._id };
  if (kind === 'payment') doc.receiptNo = 'RCP-' + String(await nextSeq('receipt')).padStart(6, '0');
  if (['discount', 'scholarship', 'bursary', 'credit_adjustment', 'debit_adjustment'].includes(kind)) doc.approvedBy = req.user._id;
  const t = await FeeTransaction.create(doc); await audit(req, 'record', 'FeeTransaction', t._id, `${kind} ${amount}`);
  ok(res, { transaction: t, ...(await studentBalance(student)) }, {}, 201);
});
// Reversal never edits history: it appends an opposite entry and links both.
exports.reverse = asyncH(async (req, res) => {
  const orig = await FeeTransaction.findById(req.params.id); if (!orig) throw new ApiError(404, 'Transaction not found');
  if (orig.reversedBy || orig.reverses) throw new ApiError(409, 'Transaction already reversed (or is itself a reversal)');
  if (!req.body.reason) throw new ApiError(400, 'A reason is required');
  const kind = DEBIT_KINDS.includes(orig.kind) ? 'credit_adjustment' : 'debit_adjustment';
  const rev = await FeeTransaction.create({ student: orig.student, kind, amount: orig.amount, reverses: orig._id, reason: req.body.reason, description: `Reversal of ${orig.receiptNo || orig.kind}`, approvedBy: req.user._id, recordedBy: req.user._id });
  orig.reversedBy = rev._id; await orig.save(); await audit(req, 'reverse', 'FeeTransaction', orig._id, req.body.reason);
  ok(res, { reversal: rev, ...(await studentBalance(orig.student)) });
});
exports.arrears = asyncH(async (req, res) => {
  const match = req.query.className ? { className: req.query.className, status: 'Active' } : { status: 'Active' };
  const students = await Student.find(match).select('admissionNo firstName lastName className stream');
  const byId = await require('../services/ledger')();
  const rows = students.map((s) => ({ student: s, ...(byId.get(String(s._id)) || { debit: 0, credit: 0, balance: 0 }) })).filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance);
  ok(res, rows, { totalOutstanding: round2(rows.reduce((s, r) => s + r.balance, 0)) });
});
exports.expenses = { list: asyncH(async (req, res) => ok(res, await Expense.find().sort('-date').limit(200))), create: asyncH(async (req, res) => ok(res, await Expense.create({ ...req.body, recordedBy: req.user._id }), {}, 201)) };
exports.incomeExpense = asyncH(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(0), to = req.query.to ? new Date(req.query.to + 'T23:59:59Z') : new Date();
  const [pay, exp] = await Promise.all([FeeTransaction.aggregate([{ $match: { kind: 'payment', reversedBy: null, createdAt: { $gte: from, $lte: to } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]), Expense.aggregate([{ $match: { date: { $gte: from, $lte: to } } }, { $group: { _id: null, t: { $sum: '$amount' } } }])]);
  const income = pay[0]?.t || 0, expenditure = exp[0]?.t || 0; ok(res, { income, expenditure, net: round2(income - expenditure) });
});
