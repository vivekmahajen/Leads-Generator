// prisma/seed.mjs
// Seeds a demo user (demo@leadforge.io / demo1234), an active subscription,
// and a batch of sample delivered leads so the dashboard has data to show.
//
// Run:  node prisma/seed.mjs   (requires DATABASE_URL + a migrated schema)

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

const FIRST = ['Aarav', 'Diya', 'Vivaan', 'Ananya', 'Reyansh', 'Isha', 'Kabir', 'Myra', 'Arjun', 'Sara'];
const LAST = ['Sharma', 'Patel', 'Reddy', 'Iyer', 'Nair', 'Khan', 'Gupta', 'Mehta', 'Singh', 'Rao'];
const CITIES = [['Mumbai', 'MH'], ['Bengaluru', 'KA'], ['Delhi', 'DL'], ['Chennai', 'TN'], ['Pune', 'MH'], ['Hyderabad', 'TS']];
const SOURCES = ['google_ads', 'facebook', 'organic', 'linkedin'];
const STATUSES = ['new', 'new', 'contacted', 'qualified', 'converted', 'rejected'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  const categoryIds = ['real_estate', 'insurance', 'fintech_loans', 'legal', 'solar_energy'];

  const passwordHash = await bcrypt.hash('demo1234', 12);
  const user = await db.user.upsert({
    where: { email: 'demo@leadforge.io' },
    update: {},
    create: {
      email: 'demo@leadforge.io',
      fullName: 'Demo User',
      companyName: 'LeadForge Demo Co.',
      passwordHash,
      emailVerified: true,
    },
  });

  const subscription = await db.subscription.create({
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

  // Reset categories for the demo user
  await db.userCategory.deleteMany({ where: { userId: user.id } });
  await db.userCategory.createMany({
    data: categoryIds.map((id) => ({ userId: user.id, categoryId: id, subscriptionId: subscription.id })),
  });

  // Create ~60 leads + deliveries
  for (let i = 0; i < 60; i++) {
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

  console.log('Seeded demo user demo@leadforge.io / demo1234 with 60 leads.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
