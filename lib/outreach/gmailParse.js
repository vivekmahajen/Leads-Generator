// lib/outreach/gmailParse.js
// Pure helpers for classifying polled Gmail messages (no IO — unit-testable).

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

// Extract Message-IDs referenced by a reply (In-Reply-To + References headers).
export function extractReferencedIds(rawHeaders) {
  const ids = new Set();
  const grab = (name) => {
    const m = new RegExp(`^${name}:\\s*(.+)$`, 'im').exec(rawHeaders || '');
    if (!m) return;
    for (const id of m[1].match(/<[^>]+>/g) || []) ids.add(id.trim());
  };
  grab('In-Reply-To');
  grab('References');
  return [...ids];
}

// Match variants so we find the OutreachMessage whether stored with/without <>.
export function idVariants(id) {
  const bare = id.replace(/[<>]/g, '');
  return [id, bare, `<${bare}>`];
}

const BOUNCE_FROMS = /mailer-daemon|postmaster|mail delivery|delivery subsystem/i;
const BOUNCE_SUBJECTS = /(delivery status notification|undeliverable|undelivered|delivery has failed|address not found|returned to sender|mail delivery failed)/i;

export function looksLikeBounce({ from = '', subject = '' } = {}) {
  return BOUNCE_FROMS.test(from) || BOUNCE_SUBJECTS.test(subject);
}

export function extractEmails(text) {
  return [...new Set((String(text || '').match(EMAIL_RE) || []).map((e) => e.toLowerCase()))];
}

export function isAutoReply(subject = '') {
  return /^\s*(re:|reply:)/i.test(subject);
}
