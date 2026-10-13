const mongoose = require('mongoose');
const { Schema } = mongoose; const oid = (ref) => ({ type: Schema.Types.ObjectId, ref });

const DutyStation = mongoose.model('DutyStation', new Schema({ name: { type: String, required: true, unique: true }, category: { type: String, default: 'Custom' }, requiredStaff: { type: Number, default: 1 }, start: { type: String, default: '07:00' }, end: { type: String, default: '08:00' }, active: { type: Boolean, default: true } }, { timestamps: true }));
const DutyAssignment = mongoose.model('DutyAssignment', new Schema({
  station: { ...oid('DutyStation'), required: true }, personType: { type: String, enum: ['Staff', 'Prefect'], default: 'Staff' },
  staff: oid('Staff'), student: oid('Student'), date: { type: String, required: true }, start: { type: String, required: true }, end: { type: String, required: true },
  instructions: String, replacement: oid('Staff'), status: { type: String, enum: ['Draft', 'Published', 'Confirmed', 'Completed', 'Missed', 'Cancelled'], default: 'Published' },
  notes: String, handoverNotes: String, completedAt: Date,
}, { timestamps: true }));
DutyAssignment.schema.index({ date: 1, staff: 1 });
const DutySwap = mongoose.model('DutySwap', new Schema({
  assignment: { ...oid('DutyAssignment'), required: true }, requestedBy: oid('Staff'), type: { type: String, enum: ['Swap', 'Replacement'], default: 'Replacement' },
  proposedStaff: { ...oid('Staff'), required: true }, reason: String, status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }, decidedBy: oid('User'), decidedAt: Date,
}, { timestamps: true }));
const Leave = mongoose.model('Leave', new Schema({ staff: { ...oid('Staff'), required: true }, from: { type: String, required: true }, to: { type: String, required: true }, reason: String, status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }, decidedBy: oid('User') }, { timestamps: true }));
const Event = mongoose.model('Event', new Schema({ title: { type: String, required: true }, type: { type: String, default: 'Custom' }, date: { type: String, required: true }, start: String, end: String, venue: String, organizer: String, description: String }, { timestamps: true }));
const Task = mongoose.model('Task', new Schema({
  title: { type: String, required: true }, description: String, priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  deadline: String, assignee: oid('Staff'), status: { type: String, enum: ['Open', 'In Progress', 'Submitted', 'Approved', 'Rejected'], default: 'Open' },
  progress: { type: Number, min: 0, max: 100, default: 0 }, evidence: String, linkedModule: String, createdBy: oid('User'),
}, { timestamps: true }));
const Announcement = mongoose.model('Announcement', new Schema({ title: { type: String, required: true }, body: String, audience: { type: String, default: 'All' }, className: String, createdBy: oid('User') }, { timestamps: true }));
const AuditLog = mongoose.model('AuditLog', new Schema({ user: oid('User'), userName: String, action: String, resource: String, resourceId: String, detail: String, ip: String }, { timestamps: true }));
const Notification = mongoose.model('Notification', new Schema({ channel: { type: String, enum: ['in-app', 'sms', 'email'], default: 'in-app' }, to: String, message: String, status: { type: String, enum: ['queued', 'sent', 'delivered', 'failed', 'not_configured'], default: 'queued' }, providerRef: String }, { timestamps: true }));
module.exports = { DutyStation, DutyAssignment, DutySwap, Leave, Event, Task, Announcement, AuditLog, Notification };
