// Integration-ready payment provider. It NEVER fabricates a successful payment.
// Money is only recorded in the ledger by a bursar (manual receipt) or, once you implement a real
// provider callback (e.g. Safaricom Daraja STK push + validated callback), from that confirmed callback.
module.exports = {
  enabled: () => process.env.MPESA_ENABLED === 'true',
  async initiateStkPush() {
    if (!this.enabled()) return { status: 'not_configured', message: 'M-PESA is not configured. See docs/DEPLOYMENT.md (Payments).' };
    throw new Error('Implement Daraja STK push in services/payments.js using your Safaricom credentials.');
  },
};
