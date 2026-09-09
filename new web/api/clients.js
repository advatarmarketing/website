import { collectionRoute } from '../lib/collection.js';
import { clean, cleanUrl, slugify } from '../lib/http.js';

/** Google Drive file IDs are the opaque token in /file/d/<ID>/view. */
function cleanDriveId(value) {
  const raw = clean(value, 200);
  if (!raw) return '';
  // Accept a pasted share link as well as a bare id.
  const match = raw.match(/\/d\/([A-Za-z0-9_-]{10,})/) || raw.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  const id = match ? match[1] : raw;
  return /^[A-Za-z0-9_-]{10,}$/.test(id) ? id : '';
}

function sanitizeVideo(video, index) {
  return {
    title: clean(video?.title, 120) || `Video ${index + 1}`,
    driveFileId: cleanDriveId(video?.driveFileId),
    kind: video?.kind === 'bts' ? 'bts' : 'reel',
  };
}

export default collectionRoute({
  key: 'clients',
  idPrefix: 'client',
  sanitize(client) {
    const name = clean(client.name, 120);
    return {
      id: slugify(client.id || name, 'client'),
      name,
      category: clean(client.category, 80) || 'Uncategorised',
      logoUrl: cleanUrl(client.logoUrl),
      tagline: clean(client.tagline, 200),
      videos: (Array.isArray(client.videos) ? client.videos : [])
        .slice(0, 60)
        .map(sanitizeVideo)
        .filter((video) => video.driveFileId),
      websiteUrl: cleanUrl(client.websiteUrl),
      // Free-text flag for extra coverage (e.g. "also event photography") — kept
      // here rather than duplicating the client under a second category.
      notes: clean(client.notes, 200),
      featured: Boolean(client.featured),
      isRecentWin: Boolean(client.isRecentWin),
      // Recent wins double as case studies unless explicitly overridden, so the
      // Results "see more" view fills itself as clients get featured.
      isCaseStudy: client.isCaseStudy === undefined
        ? Boolean(client.isRecentWin)
        : Boolean(client.isCaseStudy),
      order: Number.isFinite(Number(client.order)) ? Number(client.order) : 999,
    };
  },
});
