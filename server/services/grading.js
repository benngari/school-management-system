// Grading is configurable per school (School.gradingSystem); nothing is hardcoded here.
function gradeFor(percent, system = []) {
  const g = system.find((b) => percent >= b.min && percent <= b.max);
  return g ? { grade: g.grade, points: g.points, remark: g.remark } : { grade: 'N/A', points: 0, remark: '' };
}
function summarise(results, maxMarks = 100, system = []) {
  const rows = results.map((r) => { const pct = (r.marks / maxMarks) * 100; return { subject: r.subject, marks: r.marks, percent: Math.round(pct * 10) / 10, ...gradeFor(pct, system) }; });
  const total = rows.reduce((s, r) => s + r.marks, 0);
  const avg = rows.length ? Math.round((total / rows.length / maxMarks) * 1000) / 10 : 0;
  return { rows, total, average: avg, ...gradeFor(avg, system) };
}
module.exports = { gradeFor, summarise };
