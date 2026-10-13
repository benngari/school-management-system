// Optional/secondary modules: real Mongoose models with validation, served by the generic CRUD factory.
const mongoose = require('mongoose');
const { Schema } = mongoose; const oid = (ref) => ({ type: Schema.Types.ObjectId, ref });
const m = (name, def) => mongoose.model(name, new Schema(def, { timestamps: true }));
const Book = m('Book', { title: { type: String, required: true }, author: String, isbn: { type: String, sparse: true, unique: true }, category: String, copies: { type: Number, default: 1, min: 0 }, available: { type: Number, default: 1, min: 0 } });
const Loan = m('Loan', { book: { ...oid('Book'), required: true }, student: { ...oid('Student'), required: true }, issued: { type: String, required: true }, due: { type: String, required: true }, returned: String, fine: { type: Number, default: 0 } });
const Vehicle = m('Vehicle', { plate: { type: String, required: true, unique: true }, capacity: { type: Number, required: true, min: 1 }, driver: String, insuranceExpiry: Date, inspectionExpiry: Date });
const Route = m('Route', { name: { type: String, required: true }, vehicle: oid('Vehicle'), stops: [String], students: [oid('Student')] });
const Dorm = m('Dorm', { name: { type: String, required: true, unique: true }, gender: String, beds: { type: Number, required: true, min: 1 }, supervisor: oid('Staff'), students: [oid('Student')] });
const Incident = m('Incident', { type: { type: String, required: true }, date: { type: String, required: true }, student: oid('Student'), description: String, severity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' }, status: { type: String, enum: ['Open', 'Investigating', 'Resolved'], default: 'Open' }, confidential: { type: Boolean, default: true }, reportedBy: oid('User') });
const Asset = m('Asset', { assetNo: { type: String, required: true, unique: true }, name: { type: String, required: true }, category: String, location: String, condition: { type: String, enum: ['Good', 'Fair', 'Poor', 'Broken'], default: 'Good' }, purchaseDate: Date, warrantyExpiry: Date });
const WorkOrder = m('WorkOrder', { title: { type: String, required: true }, asset: oid('Asset'), location: String, description: String, status: { type: String, enum: ['Open', 'Assigned', 'In Progress', 'Closed'], default: 'Open' }, technician: String, cost: { type: Number, default: 0 }, requestedBy: oid('User') });
const ClinicVisit = m('ClinicVisit', { student: { ...oid('Student'), required: true }, date: { type: String, required: true }, complaint: String, treatment: String, parentNotified: { type: Boolean, default: false }, recordedBy: oid('User') });
const MealMenu = m('MealMenu', { date: { type: String, required: true }, meal: { type: String, enum: ['Breakfast', 'Lunch', 'Supper', 'Special'], required: true }, items: String, studentCount: Number, staffCount: Number });
const KitchenStock = m('KitchenStock', { item: { type: String, required: true, unique: true }, unit: String, quantity: { type: Number, default: 0, min: 0 }, supplier: String });
const Admission = m('Admission', { applicant: { type: String, required: true }, guardianPhone: String, appliedClass: String, status: { type: String, enum: ['Received', 'Under review', 'Approved', 'Rejected'], default: 'Received' }, notes: String });
const Prefect = m('Prefect', { student: { ...oid('Student'), required: true }, position: { type: String, required: true }, term: String, year: Number, responsibilities: String });
module.exports = { Book, Loan, Vehicle, Route, Dorm, Incident, Asset, WorkOrder, ClinicVisit, MealMenu, KitchenStock, Admission, Prefect };
