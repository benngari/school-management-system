/* Demo data seeder. All records are fake and labelled demo. Run: npm run seed   (add --reset to wipe first) */
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const path = require('path'); const S = (p) => path.join(__dirname, '..', 'server', p);
const dotenv = require(S('node_modules/dotenv'));
dotenv.config({ path: S('.env') }); dotenv.config({ path: path.join(__dirname, '..', '.env') });
const crypto = require('crypto'); const mongoose = require(S('node_modules/mongoose'));
const core = require(S('models/Core')); const fin = require(S('models/Finance')); const ops = require(S('models/Operations')); const sec = require(S('models/Secondary')); const User = require(S('models/User'));
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const iso = (d) => d.toISOString().slice(0, 10); const addDays = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d; };

(async () => {
  const uri = process.env.MONGODB_URI; if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  if (process.argv.includes('--reset')) await mongoose.connection.dropDatabase();
  else if (await core.Student.countDocuments()) { console.log('Data already exists. Use --reset to wipe and reseed.'); process.exit(0); }

  await core.School.create({ name: 'Demo Secondary School (SEED DATA)', motto: 'Learning for Life', phone: '+254700000000', email: 'info@demo-school.example', address: 'P.O. Box 1, Nairobi' });
  const year = new Date().getFullYear();
  await core.AcademicYear.create({ year, active: true, terms: [{ name: 'Term 1', start: `${year}-01-06`, end: `${year}-04-04` }, { name: 'Term 2', start: `${year}-05-05`, end: `${year}-08-08`, active: false }, { name: 'Term 3', start: `${year}-08-25`, end: `${year}-11-28`, active: true }] });
  const classNames = ['Grade 7', 'Grade 8', 'Grade 9', 'Form 3', 'Form 4']; const streams = ['East', 'West'];
  await core.SchoolClass.insertMany(classNames.map((name) => ({ name, level: name.startsWith('Grade') ? 'Junior' : 'Senior', streams, capacity: 45 })));

  const staffNames = ['Mary Wanjiku', 'John Otieno', 'Grace Achieng', 'Peter Kamau', 'Faith Mutiso', 'David Kiprop', 'Lucy Njeri', 'Samuel Mwangi', 'Esther Chebet', 'Joseph Odhiambo', 'Agnes Wairimu', 'Hassan Ali'];
  const staff = await core.Staff.insertMany(staffNames.map((name, i) => ({ staffNo: 'T' + String(i + 1).padStart(3, '0'), name: `${name} (demo)`, type: i < 10 ? 'Teaching' : 'Non-teaching', department: i < 10 ? rnd(['Sciences', 'Languages', 'Humanities', 'Maths']) : 'Support', phone: '07' + String(10000000 + i * 1111), subjects: i < 10 ? [rnd(['Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies'])] : [] })));
  const subjects = ['Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies'];
  await core.Subject.insertMany(subjects.map((name, i) => ({ name, code: name.slice(0, 3).toUpperCase() + (101 + i), classes: classNames, teacher: staff[i]._id })));

  const adminPw = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  const mk = (name, email, role, extra = {}) => User.create({ name, email, role, password: adminPw, ...extra });
  await mk('System Admin (demo)', 'admin@demo-school.example', 'super_admin');
  await mk('Bursar (demo)', 'bursar@demo-school.example', 'bursar');
  await mk('Deputy Head (demo)', 'deputy@demo-school.example', 'deputy', { staff: staff[1]._id });
  await mk('Teacher (demo)', 'teacher@demo-school.example', 'teacher', { staff: staff[0]._id });

  const first = ['Brian', 'Cynthia', 'Kevin', 'Faith', 'Dennis', 'Mercy', 'Collins', 'Ann', 'Victor', 'Joy', 'Ian', 'Ruth', 'Allan', 'Naomi', 'Eric'];
  const last = ['Mwangi', 'Otieno', 'Wanjiru', 'Kiptoo', 'Njoroge', 'Akinyi', 'Mutua', 'Kamau', 'Chebet', 'Omondi'];
  const students = []; let n = 1;
  for (const cn of classNames) for (const st of streams) for (let i = 0; i < 6; i++) {
    const s = await core.Student.create({ admissionNo: String(n).padStart(5, '0'), firstName: rnd(first), lastName: rnd(last), gender: n % 2 ? 'Male' : 'Female', className: cn, stream: st, residence: n % 3 === 0 ? 'Boarding' : 'Day', dob: `${year - (cn.startsWith('Grade') ? 13 : 16)}-0${1 + (n % 9)}-1${n % 9}`, guardians: [{ name: `Guardian ${n} (demo)`, relationship: 'Parent', phone: '+2547' + String(10000000 + n * 137).slice(0, 8) }], statusHistory: [{ status: 'Active', className: cn, note: 'Seeded' }] });
    students.push(s); n++;
  }
  await core.Counter.findByIdAndUpdate('admissionNo', { seq: n - 1 }, { upsert: true });
  await mk('Parent (demo)', 'parent@demo-school.example', 'parent', { children: [students[0]._id, students[1]._id] });
  await mk('Student (demo)', 'student@demo-school.example', 'student', { student: students[0]._id });

  const today = iso(new Date());
  for (const s of students) for (let d = 0; d < 5; d++) { const dt = iso(addDays(-d)); await core.Attendance.create({ student: s._id, date: dt, status: Math.random() < 0.9 ? 'Present' : rnd(['Absent', 'Late', 'Excused']) }); }
  const exam = await core.Exam.create({ name: 'Mid-Term Exam', year, term: 'Term 3', date: addDays(-14), maxMarks: 100 });
  const exam2 = await core.Exam.create({ name: 'End-Term Exam', year, term: 'Term 3', date: addDays(20), maxMarks: 100 });
  for (const s of students) for (const sub of subjects) await core.Result.create({ exam: exam._id, student: s._id, subject: sub, marks: 30 + Math.floor(Math.random() * 65) });

  for (const cn of classNames) await fin.FeeStructure.create({ className: cn, year, term: 'Term 3', items: [{ name: 'Tuition', amount: 18000 }, { name: 'Activity', amount: 2500 }, { name: 'Lunch', amount: 6000 }] });
  let r = 1;
  for (const s of students) {
    await fin.FeeTransaction.create({ student: s._id, kind: 'invoice', amount: 26500, year, term: 'Term 3', description: 'Term 3 fees' });
    const paid = rnd([0, 10000, 20000, 26500]); if (paid) await fin.FeeTransaction.create({ student: s._id, kind: 'payment', amount: paid, method: rnd(['Cash', 'Bank', 'M-PESA']), reference: 'DEMO-' + r, receiptNo: 'RCP-' + String(r++).padStart(6, '0'), year, term: 'Term 3' });
  }
  await core.Counter.findByIdAndUpdate('receipt', { seq: r }, { upsert: true });
  await fin.Expense.insertMany([{ category: 'Utilities', supplier: 'Demo Power Co', description: 'Electricity', amount: 42000 }, { category: 'Supplies', supplier: 'Demo Stationers', description: 'Chalk & paper', amount: 15500 }]);

  const days = [1, 2, 3, 4, 5];
  for (const d of days) for (let p = 0; p < 4; p++) await core.Timetable.create({ className: 'Grade 7', stream: 'East', day: d, start: `${String(8 + p).padStart(2, '0')}:00`, end: `${String(8 + p).padStart(2, '0')}:40`, subject: subjects[(d + p) % 5], teacher: staff[(d + p) % 5]._id, room: 'R' + (p + 1) });

  const stations = await ops.DutyStation.insertMany([{ name: 'Morning Gate', category: 'Gate', requiredStaff: 2, start: '06:30', end: '07:30' }, { name: 'Assembly', category: 'Assembly', requiredStaff: 1, start: '07:30', end: '08:00' }, { name: 'Lunch Duty', category: 'Break and lunch', requiredStaff: 2, start: '12:30', end: '13:30' }, { name: 'Dormitory Evening', category: 'Dormitory', requiredStaff: 1, start: '18:00', end: '20:00' }]);
  for (let d = 0; d < 3; d++) for (const st of stations.slice(0, 2)) await ops.DutyAssignment.create({ station: st._id, staff: staff[(d + stations.indexOf(st)) % 10]._id, date: iso(addDays(d)), start: st.start, end: st.end, status: 'Published' });
  await ops.Event.insertMany([{ title: 'Parents Meeting', type: 'Parent meeting', date: iso(addDays(5)), venue: 'Main Hall' }, { title: 'Sports Day', type: 'Sports day', date: iso(addDays(12)), venue: 'Field' }, { title: 'Prize Giving', type: 'Prize-giving', date: iso(addDays(30)), venue: 'Main Hall' }]);
  await ops.Task.insertMany([{ title: 'Repaint Form 4 classroom', priority: 'High', deadline: iso(addDays(-2)), assignee: staff[10]._id }, { title: 'Prepare exam timetable', priority: 'Medium', deadline: iso(addDays(7)), assignee: staff[1]._id }]);
  await ops.Announcement.create({ title: 'Welcome (demo)', body: 'This is demo data.', audience: 'All' });
  await sec.Book.insertMany([{ title: 'Demo Atlas', author: 'Demo Author', isbn: '9780000000001', category: 'Reference', copies: 5, available: 5 }]);
  const v = await sec.Vehicle.create({ plate: 'KDA 000A', capacity: 5, driver: 'Demo Driver', insuranceExpiry: addDays(40), inspectionExpiry: addDays(90) });
  await sec.Route.create({ name: 'Demo Route A', vehicle: v._id, stops: ['Stage 1', 'Stage 2'] });
  await sec.Dorm.create({ name: 'Demo Dorm', gender: 'Male', beds: 20 });
  const asset = await sec.Asset.create({ assetNo: 'AST-0001', name: 'Projector', category: 'ICT', location: 'Lab 1', condition: 'Fair' });
  await sec.WorkOrder.create({ title: 'Projector bulb replacement', asset: asset._id, status: 'Open' });
  await sec.MealMenu.create({ date: today, meal: 'Lunch', items: 'Rice, beans, cabbage', studentCount: 180 });

  console.log('\nSeed complete (demo data).');
  console.log('Demo logins (all roles share this DEV-ONLY password):', adminPw);
  console.log('  admin@demo-school.example | bursar@ | deputy@ | teacher@ | parent@ | student@ (same domain)\n');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
