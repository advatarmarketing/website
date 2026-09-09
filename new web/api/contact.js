import { get, set } from '../lib/kv.js';
import { seedFor } from '../lib/seed.js';
import {
  ok,
  badRequest,
  notFound,
  methodNotAllowed,
  readBody,
  clean,
  cleanMultiline,
  newId,
  withErrors,
} from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

const MAX_STORED = 500;

async function readSubmissions() {
  const stored = await get('contactSubmissions');
  return Array.isArray(stored) ? stored : seedFor('contactSubmissions') ?? [];
}

/**
 * Optional email notification. Entirely inert until RESEND_API_KEY and
 * CONTACT_NOTIFY_TO are set, and a failure here never fails the submission —
 * the message is already stored either way.
 */
async function notify(submission) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFY_TO;
  if (!apiKey || !to) return;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.CONTACT_NOTIFY_FROM || 'Advatar site <onboarding@resend.dev>',
        to: [to],
        reply_to: submission.email,
        subject: `New enquiry from ${submission.name}`,
        text: [
          `Name:  ${submission.name}`,
          `Email: ${submission.email}`,
          `Sent:  ${submission.submittedAt}`,
          '',
          submission.message,
        ].join('\n'),
      }),
    });
    if (!response.ok) console.error('[contact] Resend responded', response.status);
  } catch (error) {
    console.error('[contact] notification failed', error);
  }
}

export default withErrors(async (req, res) => {
  const method = req.method?.toUpperCase();

  /* ------------------------------------------------- public: submit form --- */
  if (method === 'POST') {
    const body = await readBody(req);
    if (!body || typeof body !== 'object') return badRequest(res, 'Expected a JSON body.');

    // Honeypot: real people never fill a field they cannot see.
    if (clean(body.company, 100)) return ok(res, { ok: true });

    const name = clean(body.name, 120);
    const email = clean(body.email, 200).toLowerCase();
    const message = cleanMultiline(body.message, 4000);

    if (!name) return badRequest(res, 'Please add your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest(res, 'Please add a valid email address.');
    if (message.length < 5) return badRequest(res, 'Please add a message.');

    const submission = {
      id: newId('msg'),
      name,
      email,
      message,
      submittedAt: new Date().toISOString(),
    };

    const submissions = await readSubmissions();
    submissions.unshift(submission);
    await set('contactSubmissions', submissions.slice(0, MAX_STORED));

    await notify(submission);
    return ok(res, { ok: true });
  }

  /* ----------------------------------------------- admin: read / delete --- */
  if (method === 'GET') {
    if (!requireAuth(req, res)) return;
    return ok(res, { items: await readSubmissions() });
  }

  if (method === 'DELETE') {
    if (!requireAuth(req, res)) return;
    const id = new URL(req.url, 'http://localhost').searchParams.get('id');
    if (!id) return badRequest(res, 'Missing ?id=');
    const submissions = await readSubmissions();
    const remaining = submissions.filter((item) => item.id !== id);
    if (remaining.length === submissions.length) return notFound(res, `No message with id "${id}".`);
    await set('contactSubmissions', remaining);
    return ok(res, { items: remaining });
  }

  return methodNotAllowed(res, ['GET', 'POST', 'DELETE']);
});
