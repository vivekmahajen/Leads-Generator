// lib/leadScore.js
// Heuristic intent score (0-100) for a real lead, based on how complete and
// contactable it is. Shared by inbound capture and CSV import.

export function scoreLead({ email, phone, companyName, jobTitle, notes }) {
  let score = 35;
  if (email) score += 15;
  if (phone) score += 20;
  if (companyName) score += 15;
  if (jobTitle) score += 5;
  if (notes) score += 10;
  return Math.min(100, score);
}
