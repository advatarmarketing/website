import { collectionRoute } from '../lib/collection.js';
import { clean, cleanUrl, cleanVideoRef, slugify } from '../lib/http.js';

/*
  A client's videos are Google Drive files or Cloudinary videos — see
  cleanVideoRef. The field is still called driveFileId because every video
  saved before Cloudinary was added is stored under that name; renaming it would
  mean moving all of them.
*/

function sanitizeVideo(video, index) {
  return {
    title: clean(video?.title, 120) || `Video ${index + 1}`,
    driveFileId: cleanVideoRef(video?.driveFileId),
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
      // The reel that represents this client on Our Work: one of their videos or
      // a separate upload. Empty means their first video. A Drive id or a
      // Cloudinary link, the same as the videos themselves.
      selectedReel: cleanVideoRef(client.selectedReel),
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
