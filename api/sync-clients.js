/**
 * Brings the stored client list up to date with data/seed.json — safely.
 *
 * Once clients have been edited in production, the stored list is what the site
 * shows, and changes to seed.json never appear on their own. This proposes the
 * difference and applies only what the admin ticks:
 *   - clients in the seed whose id isn't stored yet   → add
 *   - stored clients whose category differs from seed → move to the seed category
 *
 * Nothing is ever deleted, and no other field of an existing client changes
 * (notes are only filled in when empty), so videos, taglines and flags added in
 * edit mode always survive.
 *
 *   GET  admin → { add: [{ id, name, category }], move: [{ id, name, from, to }] }
 *   POST admin → { add: [ids], move: [ids] } — applies the chosen changes
 */

import { set } from '../lib/kv.js';
import { readCollection } from '../lib/collection.js';
import { seedFor } from '../lib/seed.js';
import { ok, badRequest, methodNotAllowed, readBody, withErrors } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

function plan(stored, seed) {
  const byId = new Map(stored.map((client) => [client.id, client]));
  const add = seed.filter((client) => !byId.has(client.id));
  const move = seed
    .filter((client) => byId.has(client.id) && byId.get(client.id).category !== client.category)
    .map((client) => {
      const current = byId.get(client.id);
      return { id: client.id, name: current.name, from: current.category, to: client.category, notes: client.notes };
    });
  return { add, move };
}

export default withErrors(async (req, res) => {
  const method = req.method?.toUpperCase();
  if (method !== 'GET' && method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);
  if (!requireAuth(req, res)) return;

  const stored = await readCollection('clients');
  const { add, move } = plan(stored, seedFor('clients'));

  if (method === 'GET') {
    return ok(res, {
      add: add.map(({ id, name, category }) => ({ id, name, category })),
      move: move.map(({ id, name, from, to }) => ({ id, name, from, to })),
    });
  }

  const body = await readBody(req);
  const addIds = new Set(Array.isArray(body?.add) ? body.add.map(String) : []);
  const moveIds = new Set(Array.isArray(body?.move) ? body.move.map(String) : []);
  if (!addIds.size && !moveIds.size) return badRequest(res, 'Nothing selected.');

  const moves = new Map(move.filter((entry) => moveIds.has(entry.id)).map((entry) => [entry.id, entry]));
  const next = stored.map((client) => {
    const entry = moves.get(client.id);
    if (!entry) return client;
    return { ...client, category: entry.to, notes: client.notes || entry.notes || '' };
  });
  const added = add.filter((client) => addIds.has(client.id));
  next.push(...added);

  await set('clients', next);
  return ok(res, { added: added.length, moved: moves.size, items: next });
});
