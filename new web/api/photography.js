import { collectionRoute } from '../lib/collection.js';
import { clean, cleanUrl, slugify } from '../lib/http.js';

export default collectionRoute({
  key: 'photographyCategories',
  idPrefix: 'photo-cat',
  sanitize(category) {
    const name = clean(category.name, 80);
    return {
      id: slugify(category.id || name, 'photo-cat'),
      name,
      coverPhotoUrl: cleanUrl(category.coverPhotoUrl),
      photos: (Array.isArray(category.photos) ? category.photos : [])
        .map(cleanUrl)
        .filter(Boolean)
        .slice(0, 200),
      order: Number.isFinite(Number(category.order)) ? Number(category.order) : 999,
    };
  },
});
