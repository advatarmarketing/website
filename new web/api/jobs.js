import { collectionRoute } from '../lib/collection.js';
import { clean, cleanMultiline, cleanUrl, slugify } from '../lib/http.js';

const TYPES = ['Full-time', 'Part-time', 'Freelance', 'Internship'];
const WORKPLACE = ['Remote', 'Hybrid', 'In-person'];
const EXPERIENCE = ['Entry', 'Junior', 'Mid', 'Senior', 'Lead'];

const oneOf = (value, allowed, fallback) => {
  const match = allowed.find((option) => option.toLowerCase() === clean(value, 40).toLowerCase());
  return match ?? fallback;
};

export default collectionRoute({
  key: 'jobs',
  idPrefix: 'job',
  sanitize(job) {
    const title = clean(job.title, 120);
    const posted = Date.parse(job.postedDate);
    return {
      id: slugify(job.id || title, 'job'),
      title,
      department: clean(job.department, 80) || 'General',
      location: clean(job.location, 80),
      type: oneOf(job.type, TYPES, 'Full-time'),
      workplaceType: oneOf(job.workplaceType, WORKPLACE, 'In-person'),
      experienceLevel: oneOf(job.experienceLevel, EXPERIENCE, 'Mid'),
      description: cleanMultiline(job.description, 4000),
      applyUrl: cleanUrl(job.applyUrl),
      postedDate: new Date(Number.isNaN(posted) ? Date.now() : posted).toISOString(),
      active: job.active === undefined ? true : Boolean(job.active),
    };
  },
});

export const JOB_TYPES = TYPES;
export const JOB_WORKPLACE = WORKPLACE;
export const JOB_EXPERIENCE = EXPERIENCE;
