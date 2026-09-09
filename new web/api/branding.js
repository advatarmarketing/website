import { collectionRoute } from '../lib/collection.js';
import { clean, cleanUrl, slugify } from '../lib/http.js';

const TYPES = ['logo', 'carousel', 'edit'];

export default collectionRoute({
  key: 'brandingItems',
  idPrefix: 'brand',
  sanitize(item) {
    return {
      id: slugify(item.id || item.clientName || item.type, 'brand'),
      type: TYPES.includes(item.type) ? item.type : 'logo',
      mediaUrl: cleanUrl(item.mediaUrl),
      clientName: clean(item.clientName, 120),
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : 999,
    };
  },
});
