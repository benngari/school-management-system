const mongoose = require('mongoose');
const { Schema } = mongoose; const oid = (ref) => ({ type: Schema.Types.ObjectId, ref });
const { DEBIT_KINDS, CREDIT_KINDS } = require('../services/finance');

const FeeStructure = mongoose.model('FeeStructure', new Schema({
  className: { type: String, required: true }, year: { type: Number, required: true }, term: { type: String, required: true },
  items: [{ name: String, amount: { type: Number, min: 0 } }],
}, { timestamps: true }));
FeeStructure.schema.index({ className: 1, year: 1, term: 1 }, { unique: true });

// Append-only ledger. Nothing is edited or deleted: mistakes are reversed with a counter-entry.
const FeeTransaction = mongoose.model('FeeTransaction', new Schema({
  student: { ...oid('Student'), required: true, index: true },
  kind: { type: String, enum: [...DEBIT_KINDS, ...CREDIT_KINDS], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  year: Number, term: String, description: String,
  method: { type: String, enum: ['Cash', 'Bank', 'Cheque', 'M-PESA', 'Other', ''], default: '' },
  reference: String, receiptNo: { type: String, sparse: true, unique: true },
  reverses: oid('FeeTransaction'), reversedBy: oid('FeeTransaction'), reason: String,
  approvedBy: oid('User'), recordedBy: oid('User'),
}, { timestamps: true }));
const Expense = mongoose.model('Expense', new Schema({ date: { type: Date, default: Date.now }, category: String, supplier: String, description: String, amount: { type: Number, min: 0.01, required: true }, recordedBy: oid('User') }, { timestamps: true }));
module.exports = { FeeStructure, FeeTransaction, Expense };
