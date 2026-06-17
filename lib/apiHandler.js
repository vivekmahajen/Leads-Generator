// lib/apiHandler.js
// Wraps a Pages-API handler so thrown errors become clean JSON responses
// instead of an opaque 500, and common misconfigurations get a helpful message.

function describeError(err) {
  const msg = err?.message || '';
  const name = err?.name || '';
  const code = err?.code || '';

  // Schema not migrated yet (table/column does not exist)
  if (code === 'P2021' || code === 'P2022' || /does not exist in the current database/i.test(msg)) {
    return {
      status: 503,
      message: 'Database schema is missing. Run `npm run prisma:deploy` to create the tables.',
    };
  }

  // Missing/invalid database configuration or unreachable/closed DB.
  // P1xxx are Prisma's connection-level error codes (can't reach, timeout,
  // auth failed, db missing, connection closed).
  if (
    name === 'PrismaClientInitializationError' ||
    /^P1\d\d\d$/.test(code) ||
    /DATABASE_URL/i.test(msg) ||
    /Can't reach database server|closed the connection|ECONNREFUSED|getaddrinfo|Connection (refused|terminated|timed out)/i.test(msg)
  ) {
    return {
      status: 503,
      message:
        'Database is not configured or unreachable. Check DATABASE_URL, ensure the database is running, and run `npm run prisma:deploy`.',
    };
  }

  // Auth secret missing
  if (/JWT_SECRET/i.test(msg)) {
    return { status: 503, message: 'JWT_SECRET is not set. Add it to your .env file.' };
  }

  return { status: 500, message: 'Something went wrong. Please try again.' };
}

export function withErrorHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(`[api] ${req.method} ${req.url} failed:`, err);
      if (res.headersSent) return;

      const { status, message } = describeError(err);
      const isDev = process.env.NODE_ENV !== 'production';
      res.status(status).json({
        error: 'SERVER_ERROR',
        message,
        ...(isDev ? { detail: err?.message } : {}),
      });
    }
  };
}
