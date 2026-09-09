import { collectionRoute } from '../lib/collection.js';
import { clean, cleanUrl, slugify } from '../lib/http.js';

export default collectionRoute({
  key: 'websiteEntries',
  idPrefix: 'site',
  sanitize(entry) {
    const name = clean(entry.name, 120);
    return {
      id: slugify(entry.id || name, 'site'),
      name,
      screenshotUrl: cleanUrl(entry.screenshotUrl),
      liveUrl: cleanUrl(entry.liveUrl),
      tags: (Array.isArray(entry.tags) ? entry.tags : String(entry.tags ?? '').split(','))
        .map((tag) => clean(tag, 40))
        .filter(Boolean)
        .slice(0, 8),
      order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : 999,
    };
  },
});
