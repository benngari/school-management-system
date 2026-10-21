# Project status (honest)


## Verified
- Server logic tests (7): ledger maths, conflict detection, roster generator fairness/caps/understaffing, grading, RBAC map, Kenyan phone format — pass.
- API integration tests (9) pass against **FerretDB (SQLite)**, not real MongoDB: login/RBAC, student CRUD + import report, fee invoice/payment/reversal/arrears, attendance + results/report card, duty conflicts/override/generate/publish/swap approval, parent data isolation, library availability, transport capacity, persistence after reconnect, dashboard.
- Seed script runs. Client `vite build` succeeds.
- **NOT verified**: real MongoDB, a real browser walkthrough of every page, PDF/ID-card output visually, mobile layout, any email/SMS/M-PESA/Cloudinary.

## Fully implemented
Auth + JWT + 16 roles with server-side permissions; audit log; dashboard (live stats, charts, clickable cards); students (CRUD, auto adm no., filters, sort, pagination, bulk status, CSV/Excel import with report, export CSV/Excel/PDF, profile tabs, status history); ID cards (QR, front/back, selectable, size/theme, print, PDF); class register; exams, configurable grading, report cards, ranking; fee ledger (structures, invoices, payments/receipts, bursary/discount/adjustments, reversal, arrears, income vs expenditure); duty roster (stations, week calendar, conflict detection vs duties/lessons/leave, fair generator with preview, confirm/complete/handover, swap/replacement approval, workload report); staff leave; parent/student portal (own data only); settings (branding, grading, duty rules, ID card).

## Basic CRUD only (models + API + list/form UI, little workflow)
Classes/streams, staff, timetable (no clash detection yet), events, tasks (no approval workflow UI beyond status), library (issue/return API exists, no loan UI), transport (capacity enforced in API, no allocation UI), dormitories (bed limit in API, no UI), kitchen menus/stock, clinic, assets/work orders, incidents, admissions, prefects, announcements.

## Not built yet
Academic year/term management UI (model+API exist); document generation (letters, receipts PDF, leaving certificates); photo upload; notification center UI and email/SMS providers; module on/off actually hiding menus; staff appraisals/training/contract reminders; kitchen/transport/boarding rosters; library fines UI; attendance reports UI beyond the Reports page; clinic/safeguarding field-level restriction beyond role permissions; timetable clash checks; linking parents to children from the UI; automated browser tests.

## Next steps
1. Run against real MongoDB/Atlas and click through every page. 2. Add term management, documents (PDF), uploads. 3. Build loan/transport/boarding allocation screens. 4. Wire SMS provider and (if wanted) Daraja STK push.
