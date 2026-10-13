import * as XLSX from 'xlsx'; import { jsPDF } from 'jspdf'; import autoTable from 'jspdf-autotable';
export function exportXlsx(rows, name = 'export', csv = false) { const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Data'); XLSX.writeFile(wb, `${name}.${csv ? 'csv' : 'xlsx'}`, csv ? { bookType: 'csv' } : undefined); }
export function exportPdf(rows, title = 'Report', name = 'report') {
  if (!rows.length) return; const doc = new jsPDF({ orientation: Object.keys(rows[0]).length > 6 ? 'landscape' : 'portrait' });
  doc.setFontSize(14); doc.text(title, 14, 15); autoTable(doc, { startY: 20, head: [Object.keys(rows[0])], body: rows.map((r) => Object.values(r).map((v) => (v ?? '').toString())), styles: { fontSize: 8 }, headStyles: { fillColor: [22, 101, 52] } }); doc.save(`${name}.pdf`);
}
export async function readSheet(file) { const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true }); return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false }); }
export function downloadTemplate(headers, name) { const ws = XLSX.utils.aoa_to_sheet([headers]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Template'); XLSX.writeFile(wb, name); }
