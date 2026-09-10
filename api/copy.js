/**
 * Editable site copy — every heading, paragraph and label marked `data-copy`.
 *
 * Stored as one flat object of overrides: { "home.hero.title": "…" }. Anything
 * without an override renders the default text written into the page markup, so
 * an empty object means "the site as designed", and removing a key is a reset.
 *
 *   GET  public → { copy }
 *   PUT  admin  → { copy: { key: "text" | null } } merged in; null resets a key
 */

import { get, set } from '../lib/kv.js';
import {
  ok,
  badRequest,
  methodNotAllowed,
  readBody,
  cleanMultiline,
  withErrors,
} from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

const KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/i;
const MAX_KEYS = 800;
const MAX_LENGTH = 1200;

async function readCopy() {
  const stored = await get('copy');
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
}

export default withErrors(async (req, res) => {
  const method = req.method?.toUpperCase();

  if (method === 'GET') return ok(res, { copy: await readCopy() });
  if (method !== 'PUT') return methodNotAllowed(res, ['GET', 'PUT']);
  if (!requireAuth(req, res)) return;

  const body = await readBody(req);
  const changes = body?.copy;
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    return badRequest(res, 'Expected { copy: { key: "text" } }.');
  }

  const copy = await readCopy();
  for (const [key, value] of Object.entries(changes)) {
    if (!KEY_PATTERN.test(key)) return badRequest(res, `Invalid copy key "${key}".`);
    if (value !== null && typeof value !== 'string') {
      return badRequest(res, `Copy for "${key}" must be text.`);
    }
    // Plain text only — it is escaped again on render. Newlines are kept so a
    // heading can still break across lines.
    const text = value === null ? '' : cleanMultiline(value, MAX_LENGTH);
    if (text) copy[key] = text;
    else delete copy[key];
  }

  if (Object.keys(copy).length > MAX_KEYS) return badRequest(res, 'Too many copy overrides.');

  await set('copy', copy);
  return ok(res, { copy });
});
