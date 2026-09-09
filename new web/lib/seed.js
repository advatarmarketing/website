/**
 * Seed content, used two ways:
 *   1. POST /api/seed writes all of it into the store in one go.
 *   2. Every GET route falls back to it for any key that has never been written,
 *      so the site renders correctly on a brand-new deployment before seeding.
 */

import seedData from '../data/seed.json' with { type: 'json' };

/** Every collection key the app stores, mapped to its seed default. */
export const SEED = Object.freeze({
  clients: seedData.clients,
  jobs: seedData.jobs,
  photographyCategories: seedData.photographyCategories,
  brandingItems: seedData.brandingItems,
  websiteEntries: seedData.websiteEntries,
  settings: seedData.settings,
  contactSubmissions: seedData.contactSubmissions,
});

export const SEED_KEYS = Object.keys(SEED);

/** Deep clone so callers can never mutate the frozen seed. */
export function seedFor(key) {
  return structuredClone(SEED[key]);
}
