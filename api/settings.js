import { get, set } from '../lib/kv.js';
import { seedFor } from '../lib/seed.js';
import { ok, badRequest, methodNotAllowed, readBody, clean, cleanUrl, withErrors } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

/** Digits only — wa.me wants an international number with no +, spaces or dashes. */
function cleanPhone(value) {
  const digits = clean(value, 40).replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : '';
}

function cleanEmail(value) {
  const email = clean(value, 200).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

/**
 * An image reference: a normal image URL, or a Google Drive share link / file id
 * (stored as the bare id and shown through Drive's thumbnail service).
 */
function cleanImageRef(value) {
  const raw = clean(value, 2000);
  if (!raw) return '';
  if (/^[A-Za-z0-9_-]{20,}$/.test(raw)) return raw;
  if (/^https?:\/\/(drive|docs)\.google\.com\//i.test(raw)) {
    const match = raw.match(/\/d\/([A-Za-z0-9_-]{10,})/) || raw.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
    return match ? match[1] : '';
  }
  return cleanUrl(raw);
}

/** A Google Drive video: a share link or a bare file id, stored as the id. */
function cleanDriveId(value) {
  const raw = clean(value, 2000);
  if (/^[A-Za-z0-9_-]{20,}$/.test(raw)) return raw;
  if (!/^https?:\/\/(drive|docs)\.google\.com\//i.test(raw)) return '';
  const match = raw.match(/\/d\/([A-Za-z0-9_-]{10,})/) || raw.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  return match ? match[1] : '';
}

function sanitize(settings) {
  const defaults = seedFor('settings');
  const input = settings && typeof settings === 'object' ? settings : {};
  return {
    heroVideoDesktopUrl: cleanUrl(input.heroVideoDesktopUrl),
    heroVideoMobileUrl: cleanUrl(input.heroVideoMobileUrl),
    heroPosterUrl: cleanUrl(input.heroPosterUrl),
    heroHandAssetUrl: cleanUrl(input.heroHandAssetUrl),
    /* Theme-aware brand marks. Empty falls back to the built-in SVG wordmark. */
    logoLightUrl: cleanUrl(input.logoLightUrl),
    logoDarkUrl: cleanUrl(input.logoDarkUrl),
    /* A still pulled from real work, blurred and dimmed behind sections so
       nothing sits on flat colour. Empty falls back to a CSS gradient mesh. */
    textureUrl: cleanUrl(input.textureUrl),
    resultsStats: (Array.isArray(input.resultsStats) ? input.resultsStats : defaults.resultsStats)
      .slice(0, 12)
      .map((stat) => ({ label: clean(stat?.label, 60), value: clean(stat?.value, 60) }))
      .filter((stat) => stat.label),
    aboutStats: {
      founded: clean(input.aboutStats?.founded ?? defaults.aboutStats.founded, 20),
      clientsCount: clean(input.aboutStats?.clientsCount ?? defaults.aboutStats.clientsCount, 20),
      teamCount: clean(input.aboutStats?.teamCount ?? defaults.aboutStats.teamCount, 20),
    },
    contact: {
      whatsappNumber: cleanPhone(input.contact?.whatsappNumber),
      email: cleanEmail(input.contact?.email) || defaults.contact.email,
    },
    hiringGallery: (Array.isArray(input.hiringGallery) ? input.hiringGallery : [])
      .slice(0, 24)
      .map((entry) => ({
        // A gallery entry is either an image URL or a Drive video id.
        imageUrl: cleanUrl(entry?.imageUrl),
        driveFileId: /^[A-Za-z0-9_-]{10,}$/.test(clean(entry?.driveFileId, 200))
          ? clean(entry.driveFileId, 200)
          : '',
        caption: clean(entry?.caption, 120),
      }))
      .filter((entry) => entry.imageUrl || entry.driveFileId),
    /* Look Inside: an image beside each step, keyed by step number. */
    lookInsideImages: (Array.isArray(input.lookInsideImages) ? input.lookInsideImages : [])
      .slice(0, 40)
      .map((entry) => ({
        step: Math.round(Number(entry?.step)),
        image: cleanImageRef(entry?.image),
        caption: clean(entry?.caption, 140),
      }))
      .filter((entry) => entry.step >= 1 && entry.step <= 20 && entry.image),
    /* Our Work: the reel that opens each industry, keyed by industry name. */
    industryReels: (Array.isArray(input.industryReels) ? input.industryReels : [])
      .slice(0, 40)
      .map((entry) => ({
        industry: clean(entry?.industry, 80),
        video: cleanDriveId(entry?.video),
        title: clean(entry?.title, 120),
      }))
      .filter((entry) => entry.industry && entry.video),
  };
}

export default withErrors(async (req, res) => {
  const method = req.method?.toUpperCase();

  if (method === 'GET') {
    const stored = await get('settings');
    return ok(res, { settings: sanitize(stored ?? seedFor('settings')) });
  }

  if (method !== 'PUT') return methodNotAllowed(res, ['GET', 'PUT']);
  if (!requireAuth(req, res)) return;

  const body = await readBody(req);
  if (!body || typeof body !== 'object') return badRequest(res, 'Expected a JSON body.');

  // Merge over what's stored so a partial update can't blank the rest.
  const current = sanitize((await get('settings')) ?? seedFor('settings'));
  const incoming = body.settings ?? body;
  const merged = sanitize({
    ...current,
    ...incoming,
    aboutStats: { ...current.aboutStats, ...(incoming.aboutStats ?? {}) },
    contact: { ...current.contact, ...(incoming.contact ?? {}) },
  });

  await set('settings', merged);
  return ok(res, { settings: merged });
});
