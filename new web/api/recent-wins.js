/**
 * The Home page's Recent Wins list.
 *
 * This is a view over `clients` rather than a second copy of them — a recent win
 * IS a client with `isRecentWin: true`. PUT takes the ids that should be flagged,
 * in display order, and rewrites the flag + order on the client records.
 */

import { set } from '../lib/kv.js';
import { readCollection } from '../lib/collection.js';
import { ok, badRequest, methodNotAllowed, readBody, withErrors } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999);

export default withErrors(async (req, res) => {
  const method = req.method?.toUpperCase();

  if (method === 'GET') {
    const clients = await readCollection('clients');
    return ok(res, { items: clients.filter((client) => client.isRecentWin).sort(byOrder) });
  }

  if (method !== 'PUT') return methodNotAllowed(res, ['GET', 'PUT']);
  if (!requireAuth(req, res)) return;

  const body = await readBody(req);
  const ids = Array.isArray(body?.ids) ? body.ids.map(String) : null;
  if (!ids) return badRequest(res, 'Expected { ids: [clientId, ...] } in display order.');

  const clients = await readCollection('clients');
  const unknown = ids.filter((id) => !clients.some((client) => client.id === id));
  if (unknown.length) return badRequest(res, `Unknown client ids: ${unknown.join(', ')}`);

  const updated = clients.map((client) => {
    const index = ids.indexOf(client.id);
    return index === -1
      ? { ...client, isRecentWin: false }
      : { ...client, isRecentWin: true, order: index + 1 };
  });

  await set('clients', updated);
  return ok(res, { items: updated.filter((client) => client.isRecentWin).sort(byOrder) });
});
