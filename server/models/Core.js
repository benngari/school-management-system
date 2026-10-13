const mongoose = require('mongoose');
const { Schema } = mongoose; const oid = (ref) => ({ type: Schema.Types.ObjectId, ref });

const School = mongoose.model('School', new Schema({
  name: { type: String, default: 'Demo Secondary School' }, motto: String, logoUrl: String,
  phone: String, email: String, address: String, currency: { type: String, default: 'KES' },
  primaryColor: { type: String, default: '#166534' },
  modules: { type: Map, of: Boolean, default: { transport: true, boarding: true, kitchen: true, clinic: true, library: true } },
  gradingSystem: { type: [{ min: Number, max: Number, grade: String, points: Number, remark: String }],
    default: [
      { min: 80, max: 100, grade: 'A', points: 12, remark: 'Excellent' }, { min: 70, max: 79, grade: 'B+', points: 10, remark: 'Very good' },
      { min: 60, max: 69, grade: 'B', points: 9, remark: 'Good' }, { min: 50, max: 59, grade: 'C', points: 6, remark: 'Average' },
      { min: 40, max: 49, grade: 'D', points: 3, remark: 'Below average' }, { min: 0, max: 39, grade: 'E', points: 1, remark: 'Poor' }] },
  dutyRules: { maxDutiesPerStaffPerWeek: { type: Number, default: 4 }, requireSwapApproval: { type: Boolean, default: true } },
  idCard: { widthMm: { type: Number, default: 85.6 }, heightMm: { type: Number, default: 54 }, template: { type: String, default: 'green' }, backNote: { type: String, default: 'If found, please return to the school.' } },
}, { timestamps: true }));

const AcademicYear = mongoose.model('AcademicYear', new Schema({
  year: { type: Number, required: true, unique: true }, active: { type: Boolean, default: false },
  terms: [{ name: String, start: Date, end: Date, active: Boolean }],
}, { timestamps: true }));

const SchoolClass = mongoose.model('SchoolClass', new Schema({
  name: { type: String, required: true, unique: true }, level: { type: String, enum: ['Primary', 'Junior', 'Senior', 'Other'], default: 'Other' },
  streams: [String], capacity: { type: Number, default: 45 }, classTeacher: oid('Staff'),
}, { timestamps: true }));

const Student = mongoose.model('Student', new Schema({
  admissionNo: { type: String, required: true, unique: true },
  firstName: { type: String, required: true, trim: true }, lastName: { type: String, required: true, trim: true }, otherNames: String,
  gender: { type: String, enum: ['Male', 'Female'], required: true }, dob: Date,
  className: { type: String, required: true, index: true }, stream: { type: String, default: '', index: true },
  residence: { type: String, enum: ['Day', 'Boarding'], default: 'Day' },
  status: { type: String, enum: ['Active', 'Transferred', 'Graduated', 'Withdrawn', 'Suspended'], default: 'Active', index: true },
  admittedOn: { type: Date, default: Date.now }, photoUrl: String,
  guardians: [{ name: String, relationship: String, phone: String, email: String }],
  statusHistory: [{ status: String, className: String, date: { type: Date, default: Date.now }, note: String }],
  clearance: { library: { type: Boolean, default: false }, finance: { type: Boolean, default: false }, discipline: { type: Boolean, default: false } },
}, { timestamps: true }));
Student.schema.index({ firstName: 'text', lastName: 'text', admissionNo: 'text' });

const Counter = mongoose.model('Counter', new Schema({ _id: String, seq: { type: Number, default: 0 } }));
const nextSeq = async (key) => (await Counter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { new: true, upsert: true })).seq;

const Staff = mongoose.model('Staff', new Schema({
  staffNo: { type: String, required: true, unique: true }, name: { type: String, required: true }, type: { type: String, enum: ['Teaching', 'Non-teaching'], default: 'Teaching' },
  department: String, phone: String, email: String, subjects: [String], active: { type: Boolean, default: true },
  contractExpiry: Date, maxDutiesPerWeek: Number,
}, { timestamps: true }));

const Subject = mongoose.model('Subject', new Schema({ name: { type: String, required: true }, code: { type: String, required: true, unique: true }, classes: [String], teacher: oid('Staff') }, { timestamps: true }));

const Timetable = mongoose.model('Timetable', new Schema({
  className: String, stream: String, day: { type: Number, min: 1, max: 7 }, start: String, end: String,
  subject: String, teacher: oid('Staff'), room: String,
}, { timestamps: true }));

const Attendance = mongoose.model('Attendance', new Schema({
  student: { ...oid('Student'), required: true }, date: { type: String, required: true }, // YYYY-MM-DD
  status: { type: String, enum: ['Present', 'Absent', 'Late', 'Excused'], required: true }, note: String, markedBy: oid('User'),
}, { timestamps: true }));
Attendance.schema.index({ student: 1, date: 1 }, { unique: true });

const Exam = mongoose.model('Exam', new Schema({ name: { type: String, required: true }, year: Number, term: String, className: String, date: Date, maxMarks: { type: Number, default: 100 } }, { timestamps: true }));
const Result = mongoose.model('Result', new Schema({ exam: { ...oid('Exam'), required: true }, student: { ...oid('Student'), required: true }, subject: { type: String, required: true }, marks: { type: Number, min: 0, required: true } }, { timestamps: true }));
Result.schema.index({ exam: 1, student: 1, subject: 1 }, { unique: true });

module.exports = { School, AcademicYear, SchoolClass, Student, Counter, nextSeq, Staff, Subject, Timetable, Attendance, Exam, Result };
