/**
 * Edit-mode session. One shared admin password, one signed httpOnly cookie.
 *
 * There are no user accounts here — this gates "Web dev edit" on the marketing
 * site, nothing more. The cookie carries only an expiry and is HMAC-signed, so
 * it cannot be forged or extended client-side.
 */

import crypto from 'node:crypto';
import { parseCookies } from './http.js';

export const COOKIE_NAME = 'advatar_edit';
const MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  // Without an explicit secret, derive one from the admin password so sessions
  // are still unforgeable. They invalidate whenever the password changes.
  if (process.env.ADMIN_PASSWORD) return `derived:${process.env.ADMIN_PASSWORD}`;
  return null;
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** True when the supplied password matches ADMIN_PASSWORD. */
export function passwordMatches(candidate) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(candidate ?? '', expected);
}

/** True when ADMIN_PASSWORD is configured at all. */
export function isConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && secret());
}

export function createToken() {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + MAX_AGE_SECONDS * 1000 })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
  if (!token || !secret()) return false;
  const [payload, signature] = String(token).split('.');
  if (!payload || !signature) return false;
  if (!timingSafeEqual(signature, sign(payload))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

/** True when the request carries a valid, unexpired edit session. */
export function isAuthed(req) {
  return verifyToken(parseCookies(req)[COOKIE_NAME]);
}

function cookieString(value, maxAge) {
  const parts = [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  // `vercel dev` serves over plain http, where a Secure cookie is dropped.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'development') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function setSessionCookie(res) {
  res.setHeader('Set-Cookie', cookieString(createToken(), MAX_AGE_SECONDS));
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', cookieString('', 0));
}

/**
 * Guard for every mutating route. Responds 401 and returns false when the
 * caller has no valid session, so handlers can `if (!requireAuth(req, res)) return;`
 */
export function requireAuth(req, res) {
  if (isAuthed(req)) return true;
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ error: 'Not authorised.' }));
  return false;
}
