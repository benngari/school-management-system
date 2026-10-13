const { AuditLog } = require('../models/Operations');
module.exports = async (req, action, resource, resourceId, detail) => {
  try { await AuditLog.create({ user: req.user?._id, userName: req.user?.name, action, resource, resourceId: resourceId && String(resourceId), detail, ip: req.ip }); } catch (e) { console.error('audit failed', e.message); }
};
