const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncH, ok, ApiError } = require('../utils/helpers');
const { R } = require('../utils/permissions');
const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
exports.login = asyncH(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new ApiError(400, 'Email and password are required');
  const u = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!u || !u.active || !(await u.matches(password))) throw new ApiError(401, 'Invalid email or password');
  u.lastLogin = new Date(); await User.updateOne({ _id: u._id }, { lastLogin: u.lastLogin });
  ok(res, { token: sign(u), user: { id: u._id, name: u.name, email: u.email, role: u.role, permissions: R[u.role] } });
});
exports.me = asyncH(async (req, res) => ok(res, { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, permissions: R[req.user.role] }));
// First-administrator setup: only works while NO user exists.
exports.setup = asyncH(async (req, res) => {
  if (await User.countDocuments()) throw new ApiError(403, 'Setup already completed');
  const { name, email, password } = req.body || {};
  const u = await User.create({ name, email, password, role: 'super_admin' });
  ok(res, { id: u._id, email: u.email }, {}, 201);
});
exports.users = {
  create: asyncH(async (req, res) => { const u = await User.create(req.body); ok(res, { id: u._id, email: u.email, role: u.role }, {}, 201); }),
  list: asyncH(async (req, res) => ok(res, await User.find().select('-password').sort('name'))),
  update: asyncH(async (req, res) => { const u = await User.findById(req.params.id); if (!u) throw new ApiError(404, 'Not found'); const { password, ...rest } = req.body; u.set(rest); if (password) u.password = password; await u.save(); ok(res, { id: u._id }); }),
};
