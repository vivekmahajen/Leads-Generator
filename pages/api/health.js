// pages/api/health.js
// Diagnostic endpoint: reports whether required env vars are set and whether
// the database is reachable + migrated. Hit GET /api/health to debug 500s.
import { db } from '@/lib/db';

export default async function handler(req, res) {
  const checks = {
    env: {
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      JWT_SECRET: Boolean(process.env.JWT_SECRET),
      STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY), // optional
    },
    database: { connected: false, migrated: false },
  };

  // Can we reach the database at all?
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database.connected = true;
  } catch (err) {
    checks.database.error = err.message;
  }

  // Does the schema exist (have migrations been applied)?
  if (checks.database.connected) {
    try {
      await db.user.count();
      checks.database.migrated = true;
    } catch (err) {
      checks.database.error = `Schema not migrated — run \`npm run prisma:deploy\`. (${err.message})`;
    }
  }

  const ok =
    checks.env.DATABASE_URL &&
    checks.env.JWT_SECRET &&
    checks.database.connected &&
    checks.database.migrated;

  return res.status(ok ? 200 : 503).json({ ok, ...checks });
}
