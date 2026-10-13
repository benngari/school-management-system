// Ledger maths. Debits increase what the student owes; credits reduce it.
const DEBIT_KINDS = ['opening', 'invoice', 'debit_adjustment'];
const CREDIT_KINDS = ['payment', 'discount', 'scholarship', 'bursary', 'credit_adjustment'];
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
// A reversal is stored as an entry of the OPPOSITE side with `reverses` set, so the pair nets to zero.
const opposite = (kind) => (DEBIT_KINDS.includes(kind) ? 'credit_adjustment' : 'debit_adjustment');
function computeBalance(entries) {
  let debit = 0, credit = 0;
  for (const e of entries) {
    if (DEBIT_KINDS.includes(e.kind)) debit += e.amount; else if (CREDIT_KINDS.includes(e.kind)) credit += e.amount;
  }
  return { debit: round2(debit), credit: round2(credit), balance: round2(debit - credit) };
}
const invoiceTotal = (items = []) => round2(items.reduce((s, i) => s + (Number(i.amount) || 0), 0));
module.exports = { DEBIT_KINDS, CREDIT_KINDS, computeBalance, invoiceTotal, opposite, round2 };
