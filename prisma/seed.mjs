// prisma/seed.mjs
// Seeds a batch of sample delivered leads onto an EXISTING user's account so
// the dashboard has data to show. Targets a user by email (your signup email);
// it never changes the user's password. If the email isn't found, it creates a
// demo user (demo@leadforge.io / demo1234) as a fallback.
//
// Choose the target email via arg or env, e.g.:
//   node prisma/seed.mjs you@example.com
//   SEED_EMAIL=you@example.com node prisma/seed.mjs
//
// Requires the database env vars (POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING)
// and a migrated schema. See the run instructions in the README.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

const TARGET_EMAIL = (process.argv[2] || process.env.SEED_EMAIL || 'demo@leadforge.io')
  .toLowerCase()
  .trim();
const LEAD_COUNT = Number(process.env.SEED_LEADS || 60);

const FIRST = ['Aarav', 'Diya', 'Vivaan', 'Ananya', 'Reyansh', 'Isha', 'Kabir', 'Myra', 'Arjun', 'Sara'];
const LAST = ['Sharma', 'Patel', 'Reddy', 'Iyer', 'Nair', 'Khan', 'Gupta', 'Mehta', 'Singh', 'Rao'];
const CITIES = [['Mumbai', 'MH'], ['Bengaluru', 'KA'], ['Delhi', 'DL'], ['Chennai', 'TN'], ['Pune', 'MH'], ['Hyderabad', 'TS']];
const SOURCES = ['google_ads', 'facebook', 'organic', 'linkedin'];
const STATUSES = ['new', 'new', 'contacted', 'qualified', 'converted', 'rejected'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function resolveUser() {
  const existing = await db.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (existing) {
    console.log(`Attaching leads to existing user: ${existing.email} (${existing.fullName})`);
    return existing;
  }
  // Fallback: create a demo user (only when the target email doesn't exist).
  console.log(`No user found for ${TARGET_EMAIL} — creating fallback demo user.`);
  return db.user.create({
    data: {
      email: TARGET_EMAIL === 'demo@leadforge.io' ? TARGET_EMAIL : 'demo@leadforge.io',
      fullName: 'Demo User',
      companyName: 'LeadForge Demo Co.',
      passwordHash: await bcrypt.hash('demo1234', 12),
      emailVerified: true,
    },
  });
}

async function main() {
  const categoryIds = ['real_estate', 'insurance', 'fintech_loans', 'legal', 'solar_energy'];
  const user = await resolveUser();

  // Ensure the user has an active subscription + the selected categories so the
  // dashboard's category filter is populated.
  let subscription = await db.subscription.findFirst({
    where: { userId: user.id, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  if (!subscription) {
    subscription = await db.subscription.create({
      data: {
        userId: user.id,
        tierId: 'growth',
        billingCycle: 'monthly',
        categoryCount: categoryIds.length,
        monthlyPrice: 94,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  await db.userCategory.deleteMany({ where: { userId: user.id } });
  await db.userCategory.createMany({
    data: categoryIds.map((id) => ({ userId: user.id, categoryId: id, subscriptionId: subscription.id })),
  });

  // Create the sample leads + deliveries
  for (let i = 0; i < LEAD_COUNT; i++) {
    const categoryId = pick(categoryIds);
    const [city, state] = pick(CITIES);
    const first = pick(FIRST);
    const last = pick(LAST);
    const lead = await db.lead.create({
      data: {
        categoryId,
        firstName: first,
        lastName: last,
        email: `${first}.${last}${i}@example.com`.toLowerCase(),
        phone: `+9198${Math.floor(10000000 + Math.random() * 89999999)}`,
        companyName: Math.random() > 0.5 ? `${last} Enterprises` : null,
        jobTitle: pick(['Owner', 'Manager', 'Director', 'Buyer', 'Founder']),
        city,
        state,
        intentScore: Math.floor(20 + Math.random() * 80),
        source: pick(SOURCES),
      },
    });
    await db.leadDelivery.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        categoryId,
        status: pick(STATUSES),
        deliveredAt: new Date(Date.now() - Math.floor(Math.random() * 25) * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`Seeded ${LEAD_COUNT} leads for ${user.email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
