const jwt = require('jsonwebtoken');
const { ApiError } = require('../utils/helpers');
const User = require('../models/User');
const { can } = require('../utils/permissions');

exports.protect = async (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) throw new ApiError(401, 'Authentication required');
    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch { throw new ApiError(401, 'Invalid or expired token'); }
    const user = await User.findById(payload.id);
    if (!user || !user.active) throw new ApiError(401, 'Account not found or disabled');
    req.user = user; next();
  } catch (e) { next(e); }
};
exports.requirePerm = (perm) => (req, res, next) =>
  can(req.user.role, perm) ? next() : next(new ApiError(403, 'You do not have permission for this action'));
