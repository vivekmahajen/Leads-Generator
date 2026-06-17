// lib/apiHandler.js
// Wraps a Pages-API handler so thrown errors become clean JSON responses
// instead of an opaque 500, and common misconfigurations get a helpful message.

function describeError(err) {
  const msg = err?.message || '';
  const name = err?.name || '';

  // Missing/invalid database configuration or unreachable DB
  if (
    name === 'PrismaClientInitializationError' ||
    /DATABASE_URL/i.test(msg) ||
    /Can't reach database server|ECONNREFUSED|getaddrinfo/i.test(msg)
  ) {
    return {
      status: 503,
      message:
        'Database is not configured or unreachable. Set DATABASE_URL in .env and run `npm run prisma:migrate`.',
    };
  }

  // Schema not migrated yet (table does not exist)
  if (name === 'PrismaClientKnownRequestError' && err.code === 'P2021') {
    return {
      status: 503,
      message: 'Database schema is missing. Run `npm run prisma:migrate` to create the tables.',
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
