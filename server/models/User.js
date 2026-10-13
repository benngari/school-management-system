const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../utils/permissions');
const s = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^\S+@\S+\.\S+$/ },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ROLES, required: true },
  active: { type: Boolean, default: true },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }], // parent portal link
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },   // student portal link
  lastLogin: Date,
}, { timestamps: true });
s.pre('save', async function () { if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 10); });
s.methods.matches = function (pw) { return bcrypt.compare(pw, this.password); };
module.exports = mongoose.model('User', s);
