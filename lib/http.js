/** Small helpers shared by every /api route. */

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export const ok = (res, body) => json(res, 200, body);
export const badRequest = (res, message) => json(res, 400, { error: message });
export const unauthorized = (res) => json(res, 401, { error: 'Not authorised.' });
export const notFound = (res, message = 'Not found.') => json(res, 404, { error: message });

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  return json(res, 405, { error: `Method not allowed. Allowed: ${allowed.join(', ')}` });
}

/** Read + JSON-parse the request body, tolerating pre-parsed bodies. */
export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    // Content here is text; anything this large is a mistake or an attack.
    if (size > 1_000_000) throw new Error('Request body too large.');
    chunks.push(chunk);
  }
  if (!chunks.length) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header) return {};
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/** Collapse whitespace and cap length — used on every stored string. */
export function clean(value, maxLength = 300) {
  if (value == null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/** Multi-line variant: keeps newlines, collapses runs of blank lines. */
export function cleanMultiline(value, maxLength = 5000) {
  if (value == null) return '';
  return String(value).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, maxLength);
}

/**
 * Only allow URLs we are willing to put in an href/src.
 * Blocks javascript:, data:, and anything else that could execute.
 */
export function cleanUrl(value) {
  const raw = clean(value, 2000);
  if (!raw) return '';
  if (raw.startsWith('/')) return raw;
  try {
    const url = new URL(raw);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

/**
 * A video, as pasted into edit mode. Two kinds are accepted:
 *
 *   - Google Drive: a share link or a bare file id. Stored as the bare id,
 *     exactly as before, so every video already saved keeps working.
 *   - Cloudinary: a video delivery link (res.cloudinary.com/<cloud>/video/…),
 *     stored as the full https link. The "embed" link from Cloudinary's video
 *     player (player.cloudinary.com/embed/?cloud_name=…&public_id=…) is turned
 *     into the delivery link for the same video, so either copy button works.
 *
 * Anything else — including a Cloudinary IMAGE link — comes back empty, and the
 * row is dropped rather than saved as a video that can't play.
 */
export function cleanVideoRef(value) {
  const raw = clean(value, 1000);
  if (!raw) return '';

  if (/^https?:\/\/res\.cloudinary\.com\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const isVideo = /^\/[^/]+\/video\/(upload|authenticated|private)\/.+/i.test(url.pathname);
      return isVideo ? `https://res.cloudinary.com${url.pathname}` : '';
    } catch {
      return '';
    }
  }

  if (/^https?:\/\/player\.cloudinary\.com\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const cloud = url.searchParams.get('cloud_name');
      const id = url.searchParams.get('public_id');
      if (!cloud || !id || !/^[\w-]+$/.test(cloud)) return '';
      const path = id.split('/').map(encodeURIComponent).join('/');
      return `https://res.cloudinary.com/${cloud}/video/upload/${path}.mp4`;
    } catch {
      return '';
    }
  }

  // Google Drive: a pasted share link as well as a bare id.
  const match = raw.match(/\/d\/([A-Za-z0-9_-]{10,})/) || raw.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  const id = match ? match[1] : raw;
  return /^[A-Za-z0-9_-]{10,}$/.test(id) ? id : '';
}

export function slugify(value, fallback = 'item') {
  const slug = String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}

/** Stable-ish unique id. */
export function newId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Wrap a handler so an unexpected throw becomes a 500 instead of a hang. */
export function withErrors(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(`[api] ${req.method} ${req.url}`, error);
      if (!res.headersSent) json(res, 500, { error: 'Something went wrong.' });
    }
  };
}
