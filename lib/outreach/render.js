// lib/outreach/render.js
// Merge-field rendering + mandatory compliance footer (CAN-SPAM).

const FIELDS = {
  firstName: (l) => l.firstName,
  lastName: (l) => l.lastName,
  fullName: (l) => [l.firstName, l.lastName].filter(Boolean).join(' '),
  name: (l) => [l.firstName, l.lastName].filter(Boolean).join(' '),
  company: (l) => l.companyName,
  title: (l) => l.jobTitle,
  city: (l) => l.city,
  state: (l) => l.state,
};

const DEFAULTS = { firstName: 'there', name: 'there', company: 'your team', title: 'your role', city: 'your area', state: '' };

// Replace {{field}} tokens. Missing values fall back to a sensible default —
// never render a raw {{firstName}}.
export function renderTemplate(str, lead = {}) {
  return String(str || '').replace(/\{\{\s*([\w]+)\s*\}\}/g, (_m, key) => {
    const fn = FIELDS[key];
    const val = fn ? fn(lead) : lead[key];
    if (val != null && String(val).trim() !== '') return String(val);
    return DEFAULTS[key] ?? '';
  });
}

// Append the legally-required footer: sender identity, physical address, and a
// working one-click unsubscribe link. Every outbound message must carry this.
export function withComplianceFooter(body, { fromName, footerAddress, unsubscribeUrl }) {
  const lines = ['', '—', fromName || '', footerAddress || '', '', `Unsubscribe: ${unsubscribeUrl}`];
  return `${body}\n${lines.join('\n')}`;
}
