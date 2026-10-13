const { FeeTransaction } = require('../models/Finance');
const { computeBalance } = require('./finance');
// Map<studentId, {debit,credit,balance}> computed from the append-only ledger with the single tested balance function.
module.exports = async function balancesByStudent() {
  const rows = await FeeTransaction.find({}, 'student kind amount').lean();
  const by = new Map(); for (const r of rows) { const k = String(r.student); if (!by.has(k)) by.set(k, []); by.get(k).push(r); }
  return new Map([...by].map(([k, v]) => [k, computeBalance(v)]));
};
