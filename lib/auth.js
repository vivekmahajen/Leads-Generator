// lib/auth.js
// JWT signing/verification + helper to resolve the current user from a request.

import jwt from 'jsonwebtoken';
import { db } from './db';

const JWT_EXPIRY = '30d';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

export function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

/**
 * Extract the bearer token from an incoming request.
 * Supports `Authorization: Bearer <token>` and the `?auth=<token>` query param
 * (used by the CSV export link which can't set headers).
 */
export function extractToken(req) {
  const header = req.headers?.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  if (req.query?.auth) return req.query.auth;
  return null;
}

/**
 * Resolve the authenticated user from a Pages-API request.
 * Returns the full user record, or null when unauthenticated.
 */
export async function getUserFromToken(req) {
  const token = extractToken(req);
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded?.userId) return null;

  const user = await db.user.findUnique({ where: { id: decoded.userId } });
  return user || null;
}
