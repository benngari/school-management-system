// Email/SMS-ready. Status is only "sent"/"delivered" when a provider confirms; otherwise "not_configured".
const { Notification } = require('../models/Operations');
module.exports = async function notify({ channel = 'in-app', to, message }) {
  if (channel === 'in-app') return Notification.create({ channel, to, message, status: 'delivered' });
  if (!process.env.SMS_PROVIDER || process.env.SMS_PROVIDER === 'none') return Notification.create({ channel, to, message, status: 'not_configured' });
  return Notification.create({ channel, to, message, status: 'queued' }); // queued until a provider adapter confirms
};
