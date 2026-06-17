// lib/sampleData.js
// Shared sample-lead generation used by the in-app "Generate sample leads"
// button (pages/api/leads/generate.js) and the CLI seed (prisma/seed.mjs).
// US-based data by default.

const FIRST = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Emily', 'Sarah', 'Chris', 'Jessica', 'Daniel', 'Ashley', 'Matthew', 'Olivia', 'Andrew'];
const LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee'];
const CITIES = [
  ['New York', 'NY'], ['Los Angeles', 'CA'], ['Chicago', 'IL'], ['Houston', 'TX'],
  ['Phoenix', 'AZ'], ['Philadelphia', 'PA'], ['San Antonio', 'TX'], ['San Diego', 'CA'],
  ['Dallas', 'TX'], ['Austin', 'TX'], ['Miami', 'FL'], ['Seattle', 'WA'],
  ['Denver', 'CO'], ['Atlanta', 'GA'], ['Boston', 'MA'], ['Charlotte', 'NC'],
];
const SOURCES = ['google_ads', 'facebook', 'organic', 'linkedin'];
const STATUSES = ['new', 'new', 'contacted', 'qualified', 'converted', 'rejected'];
const TITLES = ['Owner', 'Manager', 'Director', 'VP', 'Founder', 'Buyer'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// A US phone like +12025550143 (NANP: area code 2-9XX, exchange 2-9XX).
function usPhone() {
  const area = Math.floor(200 + Math.random() * 799);
  const exch = Math.floor(200 + Math.random() * 799);
  const line = Math.floor(1000 + Math.random() * 8999);
  return `+1${area}${exch}${line}`;
}

/** Build the `data` object for a Lead create, for a given category. */
export function makeLead(categoryId, uniqueSuffix = '') {
  const first = pick(FIRST);
  const last = pick(LAST);
  const [city, state] = pick(CITIES);
  return {
    categoryId,
    firstName: first,
    lastName: last,
    // example.com is the reserved "not a real address" domain (RFC 2606).
    email: `${first}.${last}${uniqueSuffix}@example.com`.toLowerCase(),
    phone: usPhone(),
    companyName: Math.random() > 0.5 ? `${last} ${pick(['LLC', 'Inc.', 'Group', 'Partners'])}` : null,
    jobTitle: pick(TITLES),
    city,
    state,
    country: 'US',
    intentScore: Math.floor(20 + Math.random() * 80),
    // Tagged so the UI can flag these as demo rows, not real captured leads.
    source: 'demo_sample',
  };
}

/** Build delivery metadata (status + a recent delivered date). */
export function makeDeliveryMeta() {
  return {
    status: pick(STATUSES),
    deliveredAt: new Date(Date.now() - Math.floor(Math.random() * 25) * 24 * 60 * 60 * 1000),
  };
}

export { pick };
