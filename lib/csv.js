// lib/csv.js
// Minimal, dependency-free CSV parsing. Handles quoted fields, escaped quotes
// (""), embedded commas/newlines, and CRLF. Used by the leads CSV import.

/** Parse CSV text into an array of string-arrays (rows of cells). */
export function parseCSVRows(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r') {
      // ignore — handled by the \n branch
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += c;
    }
  }
  // flush trailing field/row (file may not end in newline)
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const normalizeHeader = (h) => String(h || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

/**
 * Parse CSV text into an array of objects keyed by normalized header.
 * Fully-empty rows are skipped.
 */
export function parseCSV(text) {
  const rows = parseCSVRows(text);
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.every((c) => String(c).trim() === '')) continue;
    const obj = {};
    headers.forEach((h, idx) => { if (h) obj[h] = (cells[idx] ?? '').trim(); });
    out.push(obj);
  }
  return out;
}
