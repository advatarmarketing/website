/* ==========================================================================
   Advatar — single-page app
   Vanilla JS, no framework, no build step. History-API routing.
   ========================================================================== */

/* --------------------------------------------------------------- Utils --- */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape for interpolation into HTML. Used on EVERY dynamic value. */
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPES[char]);

/**
 * Escape for an href/src. Content is admin-authored, but the admin is not a
 * reason to allow `javascript:` through — the API sanitises too, this is defence
 * in depth for anything rendered before a round-trip.
 */
function safeUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^(https?:|mailto:|\/)/i.test(raw)) return esc(raw);
  return '';
}

/*
  Cloudinary. Paste a delivery URL straight out of the media library into any
  image or video field and it is served fit for the web: Cloudinary resizes and
  re-encodes on the way out if you ask it to, so f_auto,q_auto and a width cap
  are inserted here. Without that, the URL points at the original upload — often
  several thousand pixels wide — which is slow to fetch and heavy for a phone to
  hold, and Our Work shows over a hundred pictures at once.

  c_limit only ever scales down, never up. A URL that already carries its own
  transformations is somebody being deliberate, and is left exactly as pasted.
  Anything that isn't a Cloudinary URL passes straight through, so ordinary
  image links and Drive ids work as they always did.
*/
const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/(?:upload|fetch|private|authenticated))\/(.+)$/i;
const CLOUDINARY_TRANSFORM = /^[a-z]{1,3}_[^/]+(?:,[a-z]{1,3}_[^/]+)*\//i;

function cloudinaryFit(url, width) {
  const match = CLOUDINARY.exec(url);
  if (!match) return url;
  const [, base, kind, rest] = match;
  if (CLOUDINARY_TRANSFORM.test(rest)) return url;
  // Video is left at its own size — a cap belongs to whoever cut the footage.
  const fit = kind.toLowerCase() === 'video' || !width ? 'f_auto,q_auto' : `f_auto,q_auto,c_limit,w_${width}`;
  return `${base}/${fit}/${rest}`;
}

/** A URL for an <img> or <video>: checked, and sized if it is a Cloudinary one. */
function assetUrl(value, width = 1200) {
  const raw = String(value ?? '').trim();
  if (!/^(https?:|\/)/i.test(raw)) return '';
  return esc(cloudinaryFit(raw, width));
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const driveEmbed = (fileId) => `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Read/write a nested value by dotted path: get(obj, 'contact.email'). */
const getPath = (object, path) =>
  path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), object);

function setPath(object, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((acc, key) => (acc[key] ??= {}), object);
  target[last] = value;
  return object;
}

/* --------------------------------------------------------------- Icons --- */

/* Monoline SVG set. One style throughout — no emoji anywhere. */
const ICONS = {
  arrowRight: '<path d="M4 12h16M14 6l6 6-6 6"/>',
  arrowUp: '<path d="M12 20V4M6 10l6-6 6 6"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  diamond: '<path d="M9 6l-5 6 5 6M15 6l5 6-5 6"/>',
  cross: '<path d="M5 5l14 14M19 5L5 19"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 16l-5-5-9 8"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16M3 12h18"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  message: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.3 9.3 0 0 1-3.3-.6L3 21l1.8-5a8 8 0 0 1-.8-3.5 8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8 7.4z"/>',
  whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.4 2.5 3 5.1 5.5 5.5l1-1.4 2 .9v1.8c-3.7.6-8.3-3.9-7.7-7.7h1.8l.9 2z"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  pencil: '<path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16v4z"/>',
  trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  logout: '<path d="M15 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9"/><path d="M14 12h7M18 8l3 4-3 4"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/>',
  moon: '<path d="M20 13.4A8.2 8.2 0 1 1 10.6 4a6.6 6.6 0 0 0 9.4 9.4z"/>',
  eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  home: '<path d="M4 10.5 12 4l8 6.5"/><path d="M6 9.6V20h12V9.6"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 10v7M7 7v.5M11 17v-4a2 2 0 0 1 4 0v4"/>',
  tiktok: '<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 4c.5 2.5 2 4 4.5 4.2"/>',
};

/** Render an icon. `name` must be a key of ICONS — never user input. */
function icon(name, extraClass = '') {
  const inner = ICONS[name] ?? ICONS.diamond;
  return `<svg class="icon ${extraClass}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${inner}</svg>`;
}

/* ------------------------------------------------------------ API layer --- */

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

/* ---------------------------------------------------------------- State --- */

const state = {
  settings: null,
  clients: null,
  websites: null,
  photography: null,
  branding: null,
  jobs: null,
  copy: null,
  copyEditing: false,
  authed: false,
  authConfigured: false,
};

const CACHE_KEYS = {
  settings: '/api/settings',
  clients: '/api/clients',
  websites: '/api/websites',
  photography: '/api/photography',
  branding: '/api/branding',
  jobs: '/api/jobs',
  copy: '/api/copy',
};

/** Fetch a collection once and cache it. `invalidate(key)` forces a refetch. */
async function load(key) {
  if (state[key] != null) return state[key];
  const payload = await api.get(CACHE_KEYS[key]);
  state[key] = key === 'settings' ? payload.settings : key === 'copy' ? payload.copy : payload.items;
  return state[key];
}

const invalidate = (key) => { state[key] = null; };

/* ---------------------------------------------------------------- Toast --- */

const toastRegion = Object.assign(document.createElement('div'), {
  className: 'toast-region',
});
toastRegion.setAttribute('role', 'status');
toastRegion.setAttribute('aria-live', 'polite');
document.body.append(toastRegion);

function toast(message, tone = 'ok') {
  const node = document.createElement('div');
  node.className = 'toast';
  node.dataset.tone = tone;
  node.innerHTML = `${icon(tone === 'ok' ? 'check' : 'alert')}<span>${esc(message)}</span>`;
  toastRegion.append(node);
  setTimeout(() => node.remove(), 4200);
}

/* ---------------------------------------------------------------- Modal --- */

let openModalCleanup = null;

/**
 * Focus-trapped dialog. Escape closes, click-outside closes, focus returns to
 * whatever opened it.
 */
function openModal({ title, subtitle = '', body, onMount, onClose, labelledBy = 'modal-title', className = '' }) {
  closeModal();

  const opener = document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal ${esc(className)}" role="dialog" aria-modal="true" aria-labelledby="${esc(labelledBy)}" data-lenis-prevent>
      <div class="modal-head">
        <div>
          <h2 id="${esc(labelledBy)}">${esc(title)}</h2>
          ${subtitle ? `<p class="modal-sub">${esc(subtitle)}</p>` : ''}
        </div>
        <button type="button" class="icon-btn" data-close aria-label="Close dialog">${icon('close')}</button>
      </div>
      <div class="modal-body"></div>
    </div>`;

  const modal = $('.modal', backdrop);
  const bodyHost = $('.modal-body', backdrop);
  if (typeof body === 'string') bodyHost.innerHTML = body;
  else if (body instanceof Node) bodyHost.append(body);

  document.body.append(backdrop);
  document.body.style.overflow = 'hidden';
  pauseScrolling();

  const focusables = () =>
    $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', modal)
      .filter((node) => node.offsetParent !== null);

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = focusables();
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) closeModal();
  });
  backdrop.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) closeModal();
  });
  document.addEventListener('keydown', onKeydown);

  openModalCleanup = () => {
    // Anything the dialog wired up outside itself — a key listener on the
    // document, say — gets undone before the dialog goes.
    onClose?.();
    document.removeEventListener('keydown', onKeydown);
    backdrop.remove();
    document.body.style.overflow = '';
    resumeScrolling();
    if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    openModalCleanup = null;
  };

  (focusables()[0] ?? modal).focus();
  onMount?.(bodyHost, closeModal);
  return closeModal;
}

function closeModal() {
  openModalCleanup?.();
}

/* ------------------------------------------------------------ Fragments --- */

const NAV_ITEMS = [
  { href: '/our-work', label: 'Our Work' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/look-inside', label: 'Look Inside', glyph: 'eye' },
  { href: '/hiring', label: "We're Hiring" },
];

/*
  The client login. It goes to Advatar's own app — a separate site — so it is an
  ordinary link to another address, and the page's own navigation leaves it
  alone. One place to change it if the address ever moves.
*/
const LOGIN_URL = 'https://app.advatar.co.uk';

/** The enquiry form, in that same app. Linked from the contact page. */
const ENQUIRE_URL = 'https://app.advatar.co.uk/enquire';

const loginLink = (className = 'btn btn--sm btn--login nav-login') => `
  <a class="${className}" href="${LOGIN_URL}">
    ${icon('lock')}<span data-copy="nav.login">Client login</span>
  </a>`;

/** The nav menu also lists Home, which the top bar covers with the logo. */
const MENU_ITEMS = [{ href: '/', label: 'Home', glyph: 'home' }, ...NAV_ITEMS];

/* ---------------------------------------------------------------- Theme --- */

const THEME_KEY = 'advatar-theme';

const currentTheme = () =>
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

/**
 * Switch theme. `persist` records it as the visitor's choice — the intro sweep
 * doesn't, because nobody chose it. Where the View Transitions API exists the
 * whole page crossfades: gradients can't be CSS-transitioned, so without it the
 * hero would snap from one theme to the other.
 */
function applyTheme(theme, { persist = true, duration = 450 } = {}) {
  const swap = () => {
    document.documentElement.setAttribute('data-theme', theme);
    // The nav logo differs per theme, so re-render whichever marks are on screen.
    $$('[data-brand]').forEach((node) => { node.innerHTML = brandInner(); });
    syncThemeToggles();
  };

  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* Private mode — the choice just won't persist. */
    }
  }

  if (document.startViewTransition && !prefersReducedMotion()) {
    document.documentElement.style.setProperty('--theme-swap', `${duration}ms`);
    return document.startViewTransition(swap).finished.catch(() => {});
  }
  swap();
  return Promise.resolve();
}

const toggleTheme = () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');

/**
 * First-visit notice: the theme toggle is spotlighted with a small hint, so
 * people learn the view can be switched. Once per browser; ?hint=1 replays it.
 */
async function playThemeNotice() {
  const forced = /[?&](hint|intro)=1(&|$)/.test(window.location.search);
  let seen = false;
  try { seen = localStorage.getItem('advatar-hint-seen') === '1'; } catch { /* private mode */ }
  if (seen && !forced) return;
  try { localStorage.setItem('advatar-hint-seen', '1'); } catch { /* private mode */ }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const toggles = () => $$('[data-theme-toggle]');
  await sleep(400);
  toggles().forEach((node) => node.classList.add('theme-toggle--spotlight'));
  const hint = showThemeHint();
  await sleep(3200);
  toggles().forEach((node) => node.classList.remove('theme-toggle--spotlight'));
  hint?.classList.add('theme-hint--out');
  await sleep(300);
  hint?.remove();
}

/** The small "you can switch this" pill that points at the nav toggle. */
function showThemeHint() {
  const toggle = $('.nav [data-theme-toggle]');
  if (!toggle) return null;
  const rect = toggle.getBoundingClientRect();
  const hint = document.createElement('div');
  hint.className = 'theme-hint';
  hint.setAttribute('role', 'status');
  hint.textContent = 'Switch light / dark anytime';
  hint.style.top = `${Math.round(rect.bottom + 14)}px`;
  hint.style.right = `${Math.max(12, Math.round(window.innerWidth - rect.right - 6))}px`;
  document.body.append(hint);
  return hint;
}

const themeToggleButton = (extraClass = '') => `
  <button type="button" class="icon-btn theme-toggle ${extraClass}" data-theme-toggle
          aria-label="Switch to ${currentTheme() === 'dark' ? 'light' : 'dark'} mode">
    ${icon('sun', 'icon-sun')}${icon('moon', 'icon-moon')}
  </button>`;

/* ----------------------------------------------------------------- Logo --- */

/*
  The Advatar wordmark: light artwork on the dark theme, dark artwork on the
  light one. Both are cropped tight and cut out of their backgrounds, so they sit
  on the page rather than in a grey box. settings.logoDarkUrl / logoLightUrl
  still override them from edit mode.
*/
const LOGO_DARK = '/assets/logo-dark.png';
const LOGO_LIGHT = '/assets/logo-light.png';

function brandInner() {
  const settings = state.settings ?? {};
  const dark = currentTheme() === 'dark';
  const url = assetUrl(dark ? settings.logoDarkUrl : settings.logoLightUrl, 600) || (dark ? LOGO_DARK : LOGO_LIGHT);
  return `<img class="brand-logo" src="${url}" alt="Advatar" width="568" height="170" decoding="async">`;
}

function navFragment(path) {
  const link = ({ href, label }) =>
    `<li><a href="${href}"${href === path ? ' aria-current="page"' : ''}
            data-copy="nav.${copyKey(label)}">${esc(label)}</a></li>`;

  return `
  <header class="nav" data-scrolled="false">
    <div class="nav-inner">
      <a class="brand" href="/" aria-label="Advatar — home" data-brand>${brandInner()}</a>

      <nav aria-label="Primary">
        <ul class="nav-links">${NAV_ITEMS.map(link).join('')}</ul>
      </nav>

      <div class="nav-actions">
        ${themeToggleButton()}
        ${loginLink()}

        <!--
          A way to reach us from the top bar on a phone, where the Contact link
          is inside the menu rather than on screen. On a computer the menu's
          links are already across the bar, so it would only be a repeat: CSS
          shows it under 768px and nowhere else.
        -->
        <a class="icon-btn nav-contact" href="/contact" aria-label="Contact us">${icon('message')}</a>

        <button type="button" class="icon-btn nav-toggle" data-nav-toggle
                aria-label="Open menu" aria-expanded="false">${icon('menu')}</button>
      </div>
    </div>
  </header>`;
}

function footerFragment(settings) {
  const email = settings?.contact?.email || 'marketing@advatar.co.uk';
  const social = (name, label) =>
    `<span class="icon-btn" role="img" aria-label="${esc(label)} — link coming soon">${icon(name)}</span>`;

  return `
  <footer class="footer">
    <div class="shell">
      <div class="footer-inner">
        <div class="stack">
          <a class="brand" href="/" data-brand>${brandInner()}</a>
          <p class="tiny" style="max-width:26ch" data-copy="footer.tagline">Impact-focused marketing. Video at the core.</p>
        </div>

        <nav aria-label="Footer">
          <ul class="footer-links">
            ${NAV_ITEMS.map((item) =>
              `<li><a href="${item.href}" data-copy="nav.${copyKey(item.label)}">${esc(item.label)}</a></li>`).join('')}
          </ul>
        </nav>

        <div class="stack">
          <a class="link-arrow" href="mailto:${esc(email)}">${icon('mail')}<span>${esc(email)}</span></a>
          <a class="link-arrow" href="${LOGIN_URL}">${icon('lock')}<span data-copy="footer.login">Client login</span></a>
          <div class="socials" aria-label="Social links">
            ${social('instagram', 'Instagram')}
            ${social('tiktok', 'TikTok')}
            ${social('linkedin', 'LinkedIn')}
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <span>&copy; ${new Date().getFullYear()} Advatar. All rights reserved.</span>
        <button type="button" class="webdev-pill" data-webdev>
          ${icon('lock')}<span>Web dev edit</span>
        </button>
      </div>
    </div>
  </footer>`;
}

/** Stable copy-key fragment from a label: "We're Hiring" → "we-re-hiring". */
const copyKey = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Section eyebrow: monoline glyph + label (editable, keyed by its label). */
const eyebrow = (label, glyph = 'diamond', key = `eyebrow.${copyKey(label)}`) =>
  `<p class="eyebrow">${icon(glyph)}<span data-copy="${esc(key)}">${esc(label)}</span></p>`;

const driveThumb = (fileId, width = 720) =>
  `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`;

/*
  A video can be a Google Drive file (stored as its bare id) or a Cloudinary
  video (stored as its full link) — the server's cleanVideoRef decides which,
  and every video field accepts both.

  Cloudinary is the better home for them: it plays in the browser's own player,
  with no Drive page loaded around it and no Drive viewing limit to run into.
*/
const isCloudinaryVideo = (ref) => /^https:\/\/res\.cloudinary\.com\/[^/]+\/video\//i.test(String(ref ?? ''));

/*
  Is this link a video? A file name usually says so, but a Cloudinary link
  doesn't have to carry one — res.cloudinary.com/<cloud>/video/upload/<id> is a
  perfectly good video address with no ".mp4" on the end — so the address itself
  is checked as well. Used wherever a field takes either an image or a video.
*/
const looksLikeVideo = (url) =>
  isCloudinaryVideo(url) || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(String(url ?? ''));

/*
  A still from a Cloudinary video, for the poster: its first frame (so_0), as a
  JPEG, no wider than asked. Cloudinary makes it from the video on request —
  there's nothing to upload separately. Ours goes first in the transformation
  chain, so a link that already carries its own settings still works.
*/
function cloudinaryPoster(url, width) {
  const [path] = String(url).split(/[?#]/);
  const still = path.replace(/\.[a-z0-9]{2,5}$/i, '') + '.jpg';
  return still.replace(/\/video\/(upload|authenticated|private)\//i,
    (match) => `${match}so_0,c_limit,w_${width},q_auto/`);
}

/*
  A Cloudinary video with our own settings put in front of any it already has,
  then re-encoded for the browser (f_auto picks the format this browser plays
  best, q_auto the lowest quality nobody would notice). Used for the hero, which
  needs a particular size and shape on each kind of screen.
*/
function cloudinaryVideo(url, transform) {
  const [path] = String(url).split(/[?#]/);
  return path.replace(/\/video\/(upload|authenticated|private)\//i,
    (match) => `${match}${transform}/${VIDEO_FORMAT}/`);
}

/*
  ONE format for every browser, rather than the best one for each.

  Cloudinary's f_auto would send a browser whichever modern format it handles
  best, and for a photograph that is free. For video it is not: each format is a
  whole re-encode of the film, made the first time somebody asks for it. On a
  film of any length that takes over a minute — which nobody waits through — and
  Cloudinary gave up altogether on the version for iPhones, answering with an
  error, which is why the film would not play on a phone.

  H.264 in an MP4 is a little larger than the newer formats and is played by
  everything, everywhere. Asking for it by name means there is ONE copy to make
  instead of one per browser: after the first visitor it is ready for everyone.
*/
const VIDEO_FORMAT = 'f_mp4,vc_h264,q_auto';

/** A still from a Cloudinary video — its first frame — cut the same way. */
function cloudinaryStill(url, transform) {
  const [path] = String(url).split(/[?#]/);
  const still = path.replace(/\.[a-z0-9]{2,5}$/i, '') + '.jpg';
  return still.replace(/\/video\/(upload|authenticated|private)\//i,
    (match) => `${match}so_0,${transform},q_auto/`);
}

/** The poster for any video, whichever service it lives on. */
const videoPoster = (ref, width) => (isCloudinaryVideo(ref) ? cloudinaryPoster(ref, width) : driveThumb(ref, width));

/** Media tile: a Drive embed, an image, or a labelled empty placeholder. */
function mediaTile({ driveFileId, imageUrl, title, ratio = 'reel', empty = 'Asset coming soon' }) {
  const shape = `media media--${ratio}`;
  /*
    Drive videos play inline, right in the tile. The tile shows the poster — the
    sharp frame over a blurred fill of itself — and as it scrolls into view,
    Drive's player drops into a box sized to the video's own shape, centred in
    the tile. A square video gets a square player with no black bars, one press
    plays it, and fullscreen is in the player's own controls.
  */
  if (driveFileId) {
    const label = esc(title || 'Video');
    const source = isCloudinaryVideo(driveFileId) ? 'cloudinary' : 'drive';
    // The fill is blurred to nothing, so a tiny thumbnail does — dozens of tiles
    // decoding full-size posters twice over is what phones run out of memory on.
    return `<div class="${shape} media--video" data-video="${esc(driveFileId)}" data-source="${source}" data-title="${label}">
      <img class="media-thumb-fill" src="${esc(videoPoster(driveFileId, 60))}" alt="" loading="lazy"
           decoding="async" referrerpolicy="no-referrer">
      <img class="media-thumb" src="${esc(videoPoster(driveFileId, 540))}" alt="" loading="lazy"
           decoding="async" referrerpolicy="no-referrer">
      <div class="media-frame"></div>
      <button type="button" class="media-play" aria-label="Play ${label}">${icon('play')}</button>
    </div>`;
  }
  const url = assetUrl(imageUrl, ratio === 'wide' ? 1400 : 900);
  if (url) {
    return `<div class="${shape}"><img src="${url}" alt="${esc(title || '')}" loading="lazy" decoding="async"></div>`;
  }
  return `<div class="${shape} media--empty">${icon('image')}<span>${esc(empty)}</span></div>`;
}

/**
 * A client's videos as one row that drifts slowly sideways, like the home
 * carousel. mountCarousel decides at runtime whether the row is long enough to
 * loop; one or two videos simply sit still.
 */
function videoCarousel(client) {
  return `<div class="carousel carousel--videos" data-carousel>
    <div class="carousel-track" data-autoscroll="true">
      ${client.videos.map((video, index) => `
        <figure class="video-card" style="--i:${index}">
          ${mediaTile({ driveFileId: video.driveFileId, title: `${client.name} — ${video.title}` })}
          <figcaption class="tiny">${esc(video.title)}</figcaption>
        </figure>`).join('')}
    </div>
  </div>`;
}

/**
 * Admin-only markup. Returns nothing at all unless there is a live session, so
 * the edit surface is absent from the DOM for visitors rather than merely
 * hidden with CSS. Writes are re-authorised server-side regardless.
 */
const editOnly = (html) => (state.authed ? html : '');

/* ----------------------------------------------------------- Site copy --- */

/*
  Every piece of fixed text carries a data-copy key. The default text lives in
  the markup; an override from /api/copy replaces it straight after render, in
  the same task, so there is no flash of the old wording. Edit mode's "Edit
  text" writes overrides and "Reset" deletes one — an empty store is simply the
  site as designed.
*/
const renderCopy = (text) => esc(text).replace(/\n/g, '<br>');

function applyCopy(root = document) {
  const copy = state.copy ?? {};
  $$('[data-copy]', root).forEach((node) => {
    const value = copy[node.dataset.copy];
    if (typeof value === 'string' && value) node.innerHTML = renderCopy(value);
  });
}

const emptyState = (heading, message) => `
  <div class="empty-state">
    <h3>${esc(heading)}</h3>
    <p>${esc(message)}</p>
  </div>`;

/* ============================================================ Pages ======= */

/* ---------------------------------------------------------------- Home --- */

async function renderHome() {
  const [settings, clients] = await Promise.all([load('settings'), load('clients')]);
  const wins = clients.filter((client) => client.isRecentWin).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  /*
    The background behind the home page's first screen. Each of these takes a
    Cloudinary link or any other web address; a Cloudinary one is re-encoded and
    sized on delivery by assetUrl, so there is nothing to prepare before pasting
    it in.

    The two "video" fields will also take a still image. Someone setting this up
    has one background in mind and one link in hand, and a hero that silently
    stayed empty because the link was a photo rather than a film would be a
    puzzle with no clue in it.
  */
  const desktopMedia = assetUrl(settings.heroVideoDesktopUrl, 2400);
  const mobileMedia = assetUrl(settings.heroVideoMobileUrl, 1200);

  const desktopVideo = looksLikeVideo(desktopMedia) ? desktopMedia : '';
  const mobileVideo = looksLikeVideo(mobileMedia) ? mobileMedia : '';

  const onPhone = window.matchMedia('(max-width: 768px)').matches;
  /* The phone box if it's filled in, otherwise the computer one. */
  const videoRef = (onPhone && settings.heroVideoMobileUrl && mobileVideo)
    ? settings.heroVideoMobileUrl
    : (desktopVideo ? settings.heroVideoDesktopUrl : (mobileVideo ? settings.heroVideoMobileUrl : ''));

  /*
    THE FILM IS NEVER CROPPED. It is shown whole, at its own shape, as a panel
    rather than edge-to-edge — a split-screen edit showing two shots at once
    would otherwise lose one of them to the sides of the screen.

    Only its SIZE changes: 1600 pixels across on a computer, 720 on a phone,
    which is a fraction of the weight on mobile data.

    The list is what to try, in order. Cloudinary makes a resized copy the first
    time one is asked for, and a long film can take the best part of a minute —
    so the last entry is the file exactly as uploaded, which needs no preparing
    and is always there. mountHeroVideo works down the list if one won't play.
  */
  const videoSources = !videoRef ? []
    : isCloudinaryVideo(videoRef)
      ? [cloudinaryVideo(videoRef, onPhone ? 'c_limit,w_720' : 'c_limit,w_1600'), videoRef]
      : [onPhone && mobileVideo ? mobileVideo : desktopVideo];

  /*
    The poster is the frame held while the film loads — and the whole background
    when the film can't play at all: a very slow connection, Data Saver, or an
    iPhone in Low Power Mode, which won't start a film on its own. An explicit
    one wins; failing that a Cloudinary video hands over its own first frame, so
    setting the film alone is enough. A still dropped into a film box becomes the
    poster, which is how it ends up on screen.
  */
  const posterSource = settings.heroPosterUrl
    || (!desktopVideo && desktopMedia ? settings.heroVideoDesktopUrl : '')
    || (isCloudinaryVideo(videoRef) ? cloudinaryPoster(videoRef, onPhone ? 720 : 1600) : '');
  const poster = assetUrl(posterSource, onPhone ? 720 : 1600);

  /* Data Saver on: the visitor has asked sites to use less data. */
  const saveData = Boolean(navigator.connection?.saveData);
  const hasVideo = !saveData && videoSources.length;

  /*
    Hero media is optional by design. With no assets the CSS light shaft alone
    still reads as a finished hero — see .hero-light in styles.css.

    One source, not several: which file to use is decided here, in JS, so the
    browser is never asked to choose between them. Safari in particular is
    unreliable at moving on from a <source> it can't play, and a hero that
    silently stays black is the worst thing this page can do.
  */
  const heroMedia = hasVideo
    ? `<div class="hero-media">
         <video autoplay muted loop playsinline preload="auto" ${poster ? `poster="${poster}"` : ''}
                data-sources="${esc(JSON.stringify(videoSources))}"></video>
       </div>`
    : poster
      ? `<div class="hero-media"><img src="${poster}" alt="" decoding="async"></div>`
      : '';

  /*
    The hand plate. The supplied footage was a green screen; it's been keyed to a
    pure-black background, so `mix-blend-mode: screen` drops the black and adds
    only the gold light — which is the correct compositing for glowing particles
    and gives the "merged into the background" look without needing an alpha
    codec that Safari wouldn't play.

    It is always this hand. There used to be a box in edit mode to swap it for
    something else, but it sat beside the background boxes and read as one of
    them — pasting the background there replaced the hand, which is the one part
    of the hero meant to stay. (Anything still saved in that old box is ignored.)
  */
  const heroHand = `<video class="hero-hand" autoplay muted loop playsinline preload="metadata"
              poster="/assets/hero-hand-poster.jpg" aria-hidden="true" data-cursor-sample>
         <source src="/assets/hero-hand-mobile.mp4" media="(max-width: 720px)" type="video/mp4">
         <source src="/assets/hero-hand.mp4" type="video/mp4">
       </video>`;

  /*
    With a background of your own, the gold — the hand, the shaft of light, the
    amber glow — becomes a faint layer over it rather than the whole picture.
    How faint is set in edit mode (Golden overlay, 0–100); styles.css reads it as
    --overlay-k.
  */
  const overlay = Math.min(100, Math.max(0, Number(settings.heroOverlay ?? 30))) / 100;
  const heroClass = heroMedia ? 'hero hero--media' : 'hero';
  const heroStyle = heroMedia ? ` style="--overlay-k:${overlay}"` : '';

  const teasers = [
    { n: '01', glyph: 'film', title: 'Video Marketing', copy: 'What we specialise in.', href: '/our-work#video' },
    { n: '02', glyph: 'layers', title: 'Website Marketing', copy: 'Creators of beautiful webpages & e-commerce.', href: '/our-work#websites' },
    { n: '03', glyph: 'diamond', title: 'Branding', copy: 'Elevating your brand.', href: '/our-work#branding' },
  ];

  /*
    The section between the first screen and the latest work. Its whole job is
    to carry one from the other: it starts on the first screen's own flat
    colour, warms through the middle, and fades to nothing at the foot so the
    page's grain comes back gradually instead of starting at a line.

    Inside it, the logos of people we've worked for travel left to right, and a
    way in sits underneath them.

    The logos come from Client logos in edit mode. Until any are set, clients
    who already have a logo on file stand in, so the row is never empty.
  */
  const logos = (settings.clientLogos?.length
    ? settings.clientLogos
    : clients.filter((client) => client.logoUrl).map((client) => ({ image: client.logoUrl, name: client.name })))
    .filter((logo) => logo.image)
    .slice(0, 60);

  const clientSection = `
    <section class="section section--clients" id="clients">
      <div class="shell">
        <p class="clients-label micro" data-reveal data-copy="home.clients.label">We've Worked With</p>
        ${logos.length
          ? `<div class="carousel logo-strip" data-carousel data-reveal>
               <div class="carousel-track" data-autoscroll="true" data-drift="right" data-speed="34">
                 ${logos.map((logo) => `
                   <div class="logo-cell">
                     <span class="logo-mark" role="img" aria-label="${esc(logo.name || 'Client logo')}"
                           data-logo="${esc(logo.image)}"></span>
                   </div>`).join('')}
               </div>
             </div>`
          : editOnly('<p class="tiny clients-empty">No client logos yet — add them below and they will travel across here.</p>')}
        <div class="clients-cta" data-reveal>
          <a class="btn btn--sheen" href="/contact">
            <span data-copy="home.clients.cta">Join them — work with us</span>${icon('arrowRight')}
          </a>
        </div>
        ${editOnly(`
        <div class="clients-edit">
          <button type="button" class="edit-chip" data-edit="client-logos">${icon('image')} Client logos</button>
        </div>`)}
      </div>
    </section>`;

  const winCard = (client, index) => `
    <article class="win-card" data-reveal style="--i:${index}">
      ${mediaTile({
        driveFileId: clientReels(client).selected?.driveFileId,
        title: `${client.name} — reel`,
        empty: 'Video coming soon',
      })}
      <div class="win-meta">
        <h3>${esc(client.name)}</h3>
        <button type="button" class="link-arrow" data-win="${esc(client.id)}">
          <span data-copy="common.see-more">See more</span>${icon('arrowRight')}
        </button>
      </div>
    </article>`;

  return `
  <main id="main">
    <section class="${heroClass}"${heroStyle}>
      ${heroMedia}
      <div class="hero-light" data-cursor-sample></div>
      <!-- Grain over the hero's own background, but UNDER the hand and the
           content — media never gets grained. -->
      <div class="hero-grain" aria-hidden="true"></div>
      ${heroHand}
      <div class="glow" style="--glow-w:46rem;--glow-h:46rem;--glow-a:0.5;right:-6rem;top:20%"></div>

      <div class="hero-content">
        <h1 class="display display--xl" data-copy="home.hero.title">Marketing that leaves a mark,<br>not just a metric.</h1>
        <div class="hero-cta">
          <a class="btn btn--gold" href="/our-work"><span data-copy="home.hero.cta">See our work</span> ${icon('arrowRight')}</a>
        </div>
      </div>

      <div class="hero-foot">
        <p data-copy="home.hero.foot">Video marketing at the core — with web design, photography, branding and paid ads built around it.</p>
        <div class="with-mark">
          ${icon('cross')}
          <p data-copy="home.hero.note">An impact-focused agency for clients who want the whole picture handled, properly.</p>
        </div>
      </div>
    </section>

    ${clientSection}

    <section class="section" id="recent-wins">
      <div class="shell">
        <div class="section-head" data-reveal>
          <div>
            ${eyebrow('Recent wins', 'plus')}
            <h2 class="display display--lg" data-copy="home.wins.title">The latest work.</h2>
          </div>
          <p class="lede"><span data-copy="home.wins.lede">Fresh off the edit.</span>
            <span class="dim" data-copy="home.wins.lede-dim">A snapshot of who we've been building for lately.</span></p>
        </div>
        ${wins.length
          ? `<div class="carousel" data-carousel>
               <!-- mountCarousel adds the loop clones itself, and only when the
                    row is wider than the screen. -->
               <div class="carousel-track" data-autoscroll="true">
                 ${wins.map((client, i) => winCard(client, i)).join('')}
               </div>
               <button type="button" class="icon-btn carousel-nav" data-carousel-next
                       aria-label="Scroll to more recent wins">${icon('arrowRight')}</button>
             </div>`
          : emptyState('No recent wins yet', 'Add clients and flag them as recent wins from Web dev edit mode.')}
        ${editOnly(`
        <div style="margin-top:1.5rem">
          <button type="button" class="edit-chip" data-edit="recent-wins">${icon('pencil')} Edit recent wins</button>
          <button type="button" class="edit-chip" data-edit="hero">${icon('pencil')} Edit hero assets</button>
          <button type="button" class="edit-chip" data-edit="brand">${icon('pencil')} Logos &amp; texture</button>
        </div>
        `)}
      </div>
    </section>

    <section class="section backdrop-warm" id="what-we-do">
      <div class="shell">
        <div data-reveal>${eyebrow('What we do', 'diamond')}</div>
        <div class="teaser-grid">
          ${teasers.map((teaser, index) => `
            <a class="glass-card" href="${teaser.href}" data-reveal style="--i:${index}">
              <span class="card-index">${icon(teaser.glyph)} ${teaser.n} Service</span>
              <div class="card-body">
                <h3 data-copy="home.teaser.${teaser.n}.title">${esc(teaser.title)}</h3>
                <p data-copy="home.teaser.${teaser.n}.copy">${esc(teaser.copy)}</p>
              </div>
            </a>`).join('')}
        </div>
      </div>
    </section>
  </main>`;
}

/* ---------------------------------------------------------------------------
   Client logos, redrawn as one-colour marks.

   Logos arrive however the client happened to send them: black on a white
   box, white on a black box, colour on nothing, a screenshot with a plate
   behind it. Shown as they are, the row is a scrapbook — and half of them
   vanish in one theme or the other.

   So the page doesn't show the picture. It reads it, works out which pixels
   are the logo and which are whatever it was sitting on, and keeps only the
   shape. That shape is used as a stencil, and the page's own text colour is
   poured through it — so the same logo is near-black in light mode and
   near-white in dark mode, and switching theme changes it instantly with
   nothing redrawn.

   HOW IT TELLS THE LOGO FROM ITS BACKGROUND
   1. The border. Whatever colour runs round the edge of the picture is the
      background (or, if the edge is see-through, transparency is).
   2. The plate. Many logos sit on a filled box or disc of their own inside
      that — the dark badge behind "Mehfil", the white circle behind "Eid". If
      what's left is mostly one colour and fills most of its own outline, that
      colour is a plate too, and it goes, leaving the lettering on it. If
      taking it away would leave almost nothing, it wasn't a plate — it was the
      logo, a solid mark — and it stays.
   3. Softness. A pixel halfway between the logo and the background becomes
      half see-through, so edges stay smooth instead of turning jagged.

   HOW THEY ARE MADE THE SAME SIZE
   Empty margins are cut off first, so a logo floating in a big square canvas
   isn't drawn tiny. Then each logo is given the same AREA rather than the
   same height: a long wordmark and a square badge set to one height make the
   wordmark look enormous; set to one area, they look like equals. Nothing is
   cropped — the whole mark always fits inside its space.

   If a picture can't be read (another site that won't allow it), it is shown
   as it is, greyed, rather than not at all.
--------------------------------------------------------------------------- */

const logoMarks = new Map();       // image address → the finished stencil, drawn once per visit

function drawLogoMark(node) {
  const source = node.dataset.logo;
  if (!logoMarks.has(source)) logoMarks.set(source, traceLogo(source));
  logoMarks.get(source).then(
    ({ url, ratio }) => {
      node.style.setProperty('--logo-mask', `url("${url}")`);
      // The square root is what gives every logo the same area (see above).
      node.style.setProperty('--logo-wide', Math.sqrt(ratio).toFixed(3));
      node.style.setProperty('--logo-ratio', ratio.toFixed(3));
      node.dataset.state = 'ready';
    },
    () => {
      node.innerHTML = `<img src="${assetUrl(source, 500)}" alt="" loading="lazy" decoding="async">`;
      node.dataset.state = 'plain';
    },
  );
}

function traceLogo(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onerror = reject;
    image.onload = () => {
      try { resolve(stencilFrom(image)); } catch (error) { reject(error); }
    };
    // A lossless copy: a JPEG-style one smears the edges the stencil is cut from.
    const match = CLOUDINARY.exec(source);
    image.src = match && !CLOUDINARY_TRANSFORM.test(match[3])
      ? `${match[1]}/f_png,c_limit,w_640,h_640/${match[3]}`
      : source;
  });
}

function stencilFrom(image) {
  const MAX = 640;
  const scale = Math.min(1, MAX / Math.max(image.naturalWidth, image.naturalHeight));
  const w = Math.max(1, Math.round(image.naturalWidth * scale));
  const h = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;     // throws if the site won't allow it → shown plain

  // Colours are grouped coarsely so JPEG noise doesn't split one colour into many.
  const bucket = (i) => ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
  const average = (indices) => {
    const sum = [0, 0, 0];
    for (const i of indices) { sum[0] += px[i]; sum[1] += px[i + 1]; sum[2] += px[i + 2]; }
    return sum.map((value) => value / indices.length);
  };
  const commonest = (indices) => {
    const groups = new Map();
    for (const i of indices) {
      const key = bucket(i);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(i);
    }
    let best = [];
    for (const group of groups.values()) if (group.length > best.length) best = group;
    return { colour: average(best), share: best.length / indices.length };
  };
  const distance = (i, colour) => Math.hypot(px[i] - colour[0], px[i + 1] - colour[1], px[i + 2] - colour[2]);
  // Near a background colour → gone; clearly different → solid; in between → soft.
  const ramp = (d) => Math.min(1, Math.max(0, (d - 22) / 48));

  // 1. The border.
  const edge = [];
  for (let x = 0; x < w; x += 1) edge.push(x * 4, ((h - 1) * w + x) * 4);
  for (let y = 0; y < h; y += 1) edge.push(y * w * 4, (y * w + w - 1) * 4);
  const clearEdge = edge.filter((i) => px[i + 3] < 40).length / edge.length > 0.4;
  const backgrounds = clearEdge ? [] : [commonest(edge.filter((i) => px[i + 3] >= 40)).colour];

  const alphaOf = (colours) => {
    const alpha = new Float32Array(w * h);
    for (let p = 0, i = 0; p < alpha.length; p += 1, i += 4) {
      let keep = px[i + 3] / 255;
      for (const colour of colours) keep = Math.min(keep, ramp(distance(i, colour)));
      alpha[p] = keep;
    }
    return alpha;
  };
  const outline = (alpha) => {
    let left = w, top = h, right = -1, bottom = -1, count = 0;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (alpha[y * w + x] < 0.5) continue;
        count += 1;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    return { left, top, right, bottom, count, area: (right - left + 1) * (bottom - top + 1) };
  };

  let alpha = alphaOf(backgrounds);
  let box = outline(alpha);
  if (!box.count) throw new Error('nothing to draw');

  // 2. The plate.
  const inked = [];
  for (let p = 0; p < alpha.length; p += 1) if (alpha[p] >= 0.5) inked.push(p * 4);
  const plate = commonest(inked);
  if (box.count / box.area > 0.5 && plate.share > 0.5) {
    /*
      Is the commonest colour really a plate, or just bold lettering? A plate
      SURROUNDS the rest of the logo: from almost any other part of it, look
      left, right, up and down, and there is plate in every direction. The
      "Eid" lettering inside its white disc passes that; the red bar and the
      yellow words beside Mehfil's white letters don't — above or below them
      there is nothing but background — so those letters are the logo.
    */
    const isPlate = new Uint8Array(w * h);
    const firstX = new Int32Array(h).fill(w);
    const lastX = new Int32Array(h).fill(-1);
    const firstY = new Int32Array(w).fill(h);
    const lastY = new Int32Array(w).fill(-1);
    for (let p = 0; p < isPlate.length; p += 1) {
      if (alpha[p] < 0.5 || distance(p * 4, plate.colour) >= 40) continue;
      isPlate[p] = 1;
      const x = p % w;
      const y = (p - x) / w;
      if (x < firstX[y]) firstX[y] = x;
      if (x > lastX[y]) lastX[y] = x;
      if (y < firstY[x]) firstY[x] = y;
      if (y > lastY[x]) lastY[x] = y;
    }
    const inside = (p) => {
      const x = p % w;
      const y = (p - x) / w;
      return firstX[y] < x && x < lastX[y] && firstY[x] < y && y < lastY[x];
    };
    let rest = 0;
    let enclosed = 0;
    for (let p = 0; p < isPlate.length; p += 1) {
      if (alpha[p] < 0.5 || isPlate[p]) continue;
      rest += 1;
      if (inside(p)) enclosed += 1;
    }

    if (rest > box.count * 0.04 && enclosed / rest > 0.7) {
      /*
        On the plate, only the plate's colour is background. The colour round
        the edge is NOT removed there — white lettering on a dark badge, in a
        screenshot with a white margin, is the same white as the margin, and
        would otherwise vanish with it. Off the plate nothing changes, except
        a two-pixel rim hugging it, so its soft edge doesn't leave an outline.
      */
      const near = isPlate.slice();
      for (let ring = 0; ring < 2; ring += 1) {
        const grown = near.slice();
        for (let p = 0; p < near.length; p += 1) {
          if (near[p]) continue;
          const x = p % w;
          if ((x > 0 && near[p - 1]) || (x < w - 1 && near[p + 1])
            || (p >= w && near[p - w]) || (p < w * (h - 1) && near[p + w])) grown[p] = 1;
        }
        near.set(grown);
      }
      const onPlate = alphaOf([plate.colour]);
      for (let p = 0; p < onPlate.length; p += 1) {
        if (!inside(p)) onPlate[p] = near[p] ? 0 : alpha[p];
      }
      alpha = onPlate;
      box = outline(alpha);
    }
  }

  // 3. Cut to the mark itself, with a hair of room so soft edges aren't clipped.
  const pad = 2;
  const x0 = Math.max(0, box.left - pad);
  const y0 = Math.max(0, box.top - pad);
  const cw = Math.min(w, box.right + pad + 1) - x0;
  const ch = Math.min(h, box.bottom + pad + 1) - y0;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const octx = out.getContext('2d');
  const stencil = octx.createImageData(cw, ch);
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      stencil.data[(y * cw + x) * 4 + 3] = Math.round(alpha[(y + y0) * w + x + x0] * 255);
    }
  }
  octx.putImageData(stencil, 0, 0);
  return new Promise((resolve, reject) => out.toBlob((blob) => (blob
    ? resolve({ url: URL.createObjectURL(blob), ratio: cw / ch })
    : reject(new Error('no image'))), 'image/png'));
}

function mountHome() {
  // Delegated: the carousel's loop clones are created after this runs.
  $('main')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-win]');
    if (!button) return;
    const client = state.clients?.find((item) => item.id === button.dataset.win);
    if (client) openClientModal(client);
  });

  // The home page has two rows now — the client logos and the recent wins.
  $$('[data-carousel]').forEach((node) => mountCarousel(node));
  // After the carousels, so the loop's copies of each logo are drawn too.
  $$('.logo-mark[data-logo]').forEach(drawLogoMark);
  mountHeroVideo();
  mountHeroParallax();
}

/**
 * Starts the hero film, and keeps it from ever being a black rectangle.
 *
 * The addresses to try are on the element, best first. If one won't play — a
 * resized copy Cloudinary hasn't finished making, a format this browser can't
 * decode, a connection that drops — the next is tried, ending with the file
 * exactly as it was uploaded.
 *
 * If none of them play, nothing is broken on screen: the poster is a frame of
 * the film itself and simply stays put. That is what a phone in Low Power Mode
 * shows, since iOS won't start a film on its own there however it is asked.
 */
function mountHeroVideo() {
  const video = $('.hero-media video');
  if (!video) return;

  let sources;
  try {
    sources = JSON.parse(video.dataset.sources || '[]');
  } catch {
    sources = [];
  }
  if (!sources.length) return;

  let index = 0;
  /*
    Moving on takes a timer as well as an error, because the thing most likely
    to go wrong isn't an error at all: the first time a resized copy is asked
    for, Cloudinary has to make it, and it simply doesn't answer until it has.
    Waiting is not an option a visitor would choose, so after WAIT_MS the next
    address — ending with the file exactly as uploaded, which is always ready —
    is tried instead.
  */
  const WAIT_MS = 8000;
  let timer = 0;
  let settled = false;

  const next = () => {
    clearTimeout(timer);
    if (settled) return;
    index += 1;
    if (index < sources.length) attempt();
  };

  const attempt = () => {
    clearTimeout(timer);
    timer = setTimeout(next, WAIT_MS);
    video.src = sources[index];
    video.load();
    // Some browsers won't autoplay from the attribute alone but will when asked
    // directly. A refusal is fine and expected — the poster is already there.
    video.play?.().catch(() => {});
  };

  video.addEventListener('loadeddata', () => {
    settled = true;
    clearTimeout(timer);
  });
  video.addEventListener('error', next);

  registerCleanup(() => clearTimeout(timer));
  attempt();
}

/** Modal listing every video for one client, plus their tagline as the only text. */
function openClientModal(client) {
  const videos = client.videos ?? [];
  openModal({
    title: client.name,
    subtitle: client.tagline || '',
    body: videos.length
      ? videoCarousel(client)
      : emptyState('No videos yet', `Videos for ${client.name} haven't been added yet.`),
    onMount(host) { mountCarousel($('[data-carousel]', host)); },
  });
}

/* ------------------------------------------------------------ Our Work --- */

/*
  Display order for client categories. Personal Brands & Creators leads;
  Car & Transport sits at the back. Anything not listed falls in alphabetically
  after the known ones, so a new category added in edit mode still appears.
*/
const CATEGORY_ORDER = [
  'Personal Brands & Creators',
  'Food & Beverage',
  'Community & Islamic Organisations',
  'Clothing & Merch',
  'Fitness & Sport',
  'Education',
  'Professional Services',
  'Photography',
  'Car & Transport',
];

/**
 * Clients grouped by industry, as [name, clients] pairs in display order.
 *
 * The order of the industries comes from edit mode ("Industry order") when one
 * has been set there; otherwise CATEGORY_ORDER above is used. Anything not
 * named in either list falls to the end, alphabetically. Within an industry,
 * clients follow their own Order number.
 *
 * A client appears under every industry they belong to, in the industry view
 * and in the full index alike. `primaryOnly` files each one under their
 * Industry alone, which is what the Order editor needs: there is one Order
 * number per client, so a client asked for twice would keep only the second
 * answer.
 */
/** A name reduced to something safe to put in an id: "Food & Beverage" -> "food-beverage". */
const slug = (name) => String(name ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'x';

/** The extra industries on a client, however the editor last stored them. */
const industriesFor = (client) => (client?.extraCategories ?? [])
  .map((entry) => (typeof entry === 'string' ? entry : entry?.name))
  .map((name) => String(name ?? '').trim())
  .filter(Boolean);

function industriesOf(clients, { primaryOnly = false } = {}) {
  const chosen = (state.settings?.industryOrder ?? []).filter(Boolean);
  const sequence = chosen.length ? chosen : CATEGORY_ORDER;
  const rank = (name) => {
    const index = sequence.findIndex((entry) => entry.toLowerCase() === name.toLowerCase());
    return index === -1 ? sequence.length : index;
  };
  /*
    A client goes under its Industry and under anything in its "Also in" list,
    so one that genuinely sits in two places — a gym that is also a personal
    brand — is found in both rather than filed under whichever was typed first.
    They are still one client: the full index below lists everybody once.
  */
  const grouped = clients.reduce((map, client) => {
    const keys = [client.category || 'Uncategorised']
      .concat(primaryOnly ? [] : industriesFor(client));
    for (const key of new Set(keys)) map.set(key, [...(map.get(key) ?? []), client]);
    return map;
  }, new Map());
  // Personal Brands & Creators always has its place, even before any are added.
  if (!grouped.has('Personal Brands & Creators')) grouped.set('Personal Brands & Creators', []);
  // An industry named in edit mode shows up even while it is still empty, so it
  // can be put in its place before the clients are added to it.
  chosen.forEach((name) => { if (!grouped.has(name)) grouped.set(name, []); });
  return [...grouped]
    .map(([name, group]) => [name, [...group].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))])
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
}

/**
 * The videos for an industry's carousel. Chosen in edit mode ("Industry reels")
 * if any have been; otherwise every client in that industry contributes their
 * selected reel, so the row is useful before anything is set up.
 */
function industryReels(name, group) {
  const picked = (state.settings?.industryReels ?? [])
    .filter((row) => row.video && row.industry?.toLowerCase() === name.toLowerCase())
    .map((row) => ({ video: row.video, caption: row.caption }));
  if (picked.length) return picked;
  return group
    .map((client) => ({ video: clientReels(client).selected?.driveFileId, caption: client.name }))
    .filter((row) => row.video);
}

/**
 * A client's selected reel and the rest of their videos. The selected reel is
 * the one chosen in edit mode — one of their videos, or a separate Drive link —
 * or else their first video. It is never in `rest`, so it never shows twice.
 */
function clientReels(client) {
  const videos = (client.videos ?? []).filter((video) => video.driveFileId);
  const chosen = client.selectedReel;
  if (chosen) {
    const match = videos.find((video) => video.driveFileId === chosen);
    return {
      selected: { driveFileId: chosen, title: match?.title || '' },
      rest: videos.filter((video) => video.driveFileId !== chosen),
    };
  }
  const [first, ...rest] = videos;
  return { selected: first ?? null, rest };
}

async function renderOurWork() {
  const [settings, clients, websites, photography, branding] = await Promise.all([
    load('settings'), load('clients'), load('websites'), load('photography'), load('branding'),
  ]);

  const featured = clients.filter((client) => client.featured).slice(0, 12);
  const stats = settings.resultsStats ?? [];
  const industries = industriesOf(clients);

  const resultsRow = stats.length
    ? stats.map((stat) =>
        `<span class="result">${icon('arrowUp')}${esc(stat.label)}</span>`
      ).join('<span class="divider" aria-hidden="true">|</span>')
    : '<span class="result muted">Add your results in edit mode</span>';

  /*
    One client, as a line in the table. Closed it is their name and their tag,
    if they have one. Open it shows their note and their reels — each reel
    takes one tile's worth of width, not the whole line, so a client with a
    single vertical reel doesn't leave a screen of empty space beside it.

    NO COUNT. The number of videos behind a name is our business, not the
    reader's: "1 video" beside a client reads as an apology, and sitting in a
    column next to "4 videos" it invites a comparison that says nothing about
    the work.

    A CLIENT WITH NOTHING BEHIND THEM IS NOT A BUTTON. It used to be one, and
    pressing it opened a panel whose entire content was a line saying there
    was nothing there — which is a door that leads to a sign saying "no door".
    Now the row is a plain line: the name, the tag, no chevron, nothing to
    press and nothing written. It still counts as a client, which is the point
    of it being listed at all.

    Their videos are still added the usual way, through "Manage clients" in
    edit mode — that never ran through this row.

    `scope` keeps the ids unique: the same client appears in both the industry
    view and the full index, and two panels can't share one id.
  */
  const clientTableRow = (scope) => (client) => {
    const videos = (client.videos ?? []).filter((video) => video.driveFileId);
    const id = `${scope}-${esc(client.id)}`;
    const tag = client.notes
      ? `<span class="tag tag--soft">${esc(client.notes)}</span>`
      : '';

    /*
      Is there anything on the other side of the door? Videos, or a note
      somebody has written. A note with no videos still opens — hiding
      something that was deliberately typed would be worse than an empty row.
    */
    if (!videos.length && !client.tagline) {
      return `
      <li class="client-row">
        <div class="client-row-head client-row-head--static">
          <span class="client-row-name">${esc(client.name)}</span>
          ${tag}
        </div>
      </li>`;
    }

    return `
    <li class="client-row">
      <button type="button" class="client-row-head" data-toggle="${id}"
              aria-expanded="false" aria-controls="${id}">
        <span class="client-row-name">${esc(client.name)}</span>
        ${tag}
        ${icon('chevronRight')}
      </button>
      <div class="disclosure-panel" id="${id}" hidden data-animate="true">
        <div class="client-row-body">
          ${client.tagline ? `<p class="client-row-note">${esc(client.tagline)}</p>` : ''}
          ${videos.length
            ? `<div class="reel-grid">${videos.map((video) => `
                <figure class="reel">
                  ${mediaTile({ driveFileId: video.driveFileId, title: `${client.name} — ${video.title}` })}
                  ${video.title ? `<figcaption class="tiny">${esc(video.title)}</figcaption>` : ''}
                </figure>`).join('')}</div>`
            : ''}
        </div>
      </div>
    </li>`;
  };

  /** The table of clients used by both the industry view and the full index. */
  const clientTable = (group, scope, emptyLine) => group.length
    ? `<ul class="client-table">${group.map(clientTableRow(scope)).join('')}</ul>`
    : `<p class="tiny client-table-empty">${emptyLine}</p>`;

  const industryPanel = ([name, group], index) => {
    const reels = industryReels(name, group);
    return `
    <div class="disclosure" data-reveal style="--i:${index}">
      <button type="button" class="disclosure-head" data-toggle="industry-${esc(name)}"
              aria-expanded="false" aria-controls="industry-${esc(name)}">
        <span class="disclosure-title">${esc(name)}</span>
        <span class="disclosure-meta">${icon('chevronRight')}</span>
      </button>
      <div class="disclosure-panel" id="industry-${esc(name)}" hidden data-animate="true">
        ${reels.length
          ? `<div class="industry-reels">
               <div class="carousel carousel--videos carousel--reels" data-carousel>
                 <div class="carousel-track" data-autoscroll="true">
                   ${reels.map((reel, i) => `
                     <figure class="video-card" style="--i:${i}">
                       ${mediaTile({ driveFileId: reel.video, title: reel.caption || name })}
                       ${reel.caption ? `<figcaption class="tiny">${esc(reel.caption)}</figcaption>` : ''}
                     </figure>`).join('')}
                 </div>
               </div>
             </div>`
          : ''}
        ${/*
            The scope carries the industry, not just "ind": a client listed in
            two industries would otherwise give two panels the same id, and
            opening one of them would work the other.
          */''}
        ${clientTable(group, `ind-${slug(name)}`, `No clients in ${esc(name)} yet — add them in edit mode.`)}
      </div>
    </div>`;
  };

  /*
    One photograph, as something you can press to see it properly.

    It is a <button> rather than a plain picture so it answers to a finger, to
    Tab and to Enter alike, and so the cursor and the hover lift say plainly
    that there is more to see. The full-size address rides along in data-photo:
    the viewer collects every one inside the same category, in the order they
    appear, so whichever you press you can then walk through the rest.
  */
  const photoTile = (url, label, ratio = 'square') => {
    const shown = assetUrl(url, 900);
    if (!shown) return '';
    return `<button type="button" class="photo-open media media--${ratio}"
                    data-photo="${esc(url)}" aria-label="Enlarge ${esc(label)}">
      <img src="${shown}" alt="${esc(label)}" loading="lazy" decoding="async">
    </button>`;
  };

  const photoCategory = (category, index) => `
    <div class="disclosure" data-reveal style="--i:${index}">
      <button type="button" class="disclosure-head" data-toggle="photo-${esc(category.id)}"
              aria-expanded="false" aria-controls="photo-${esc(category.id)}">
        <span class="disclosure-title">${esc(category.name)}</span>
        <span class="disclosure-meta">${icon('chevronRight')}</span>
      </button>
      <div class="disclosure-panel" id="photo-${esc(category.id)}" hidden data-animate="true">
        <div class="photo-layout" data-photo-set>
          ${photoTile(category.coverPhotoUrl, `${category.name} — cover`)
            || mediaTile({ imageUrl: '', title: '', ratio: 'square', empty: 'Cover photo coming soon' })}
          ${category.photos?.length
            ? /*
                The set travels sideways on its own, like the reels do. The row
                is only built when the category is opened — a carousel inside a
                closed panel has no width to measure — which setPanel handles.
              */
              `<div class="carousel carousel--photos" data-carousel>
                 <div class="carousel-track" data-autoscroll="true">
                   ${category.photos.map((photo, number) =>
                     photoTile(photo, `${category.name} ${number + 1}`)).join('')}
                 </div>
               </div>`
            : `<p class="tiny">No ${esc(category.name.toLowerCase())} photos added yet.</p>`}
        </div>
      </div>
    </div>`;

  const siteCard = (entry) => `
    <article class="glass-card" data-reveal>
      ${mediaTile({ imageUrl: entry.screenshotUrl, title: entry.name, ratio: 'wide', empty: 'Screenshot coming soon' })}
      <div style="margin-top:1rem">
        <h3 style="font-family:var(--font-display);font-weight:500;font-size:1.0625rem;margin:0 0 0.4rem">${esc(entry.name)}</h3>
        ${entry.tags?.length ? `<div class="tag-row">${entry.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}</div>` : ''}
        ${safeUrl(entry.liveUrl)
          ? `<a class="link-arrow" href="${safeUrl(entry.liveUrl)}" target="_blank" rel="noopener noreferrer">
               <span>Visit site</span>${icon('external')}</a>`
          : ''}
      </div>
    </article>`;

  return `
  <main id="main" class="page">
    <section class="section" id="results">
      <div class="shell">
        <div class="glow" style="--glow-w:34rem;--glow-h:26rem;--glow-a:0.28;left:-10rem;top:-6rem"></div>
        <h2 class="display display--lg" data-reveal data-copy="work.results.title"
            style="margin-bottom:calc(clamp(1.75rem,4vw,2.75rem) - 0.16em)">Our Drive? Results.</h2>
        <div class="results-row" data-reveal>${resultsRow}</div>
        <div style="margin-top:1.5rem;display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center">
          <button type="button" class="link-arrow" data-results-modal><span data-copy="work.results.more">See more</span>${icon('arrowRight')}</button>
          ${editOnly(`<button type="button" class="edit-chip" data-edit="results">${icon('pencil')} Edit results</button>`)}
        </div>
      </div>
    </section>

    <section class="section" id="video">
      <div class="shell">
        <div class="section-head" data-reveal>
          <div>
            ${eyebrow('Video marketing', 'film')}
            <h2 class="display display--lg" data-copy="work.video.title">Selected reels.</h2>
          </div>
          <p class="lede"><span data-copy="work.video.lede">The work that moves numbers.</span>
            <span class="dim" data-copy="work.video.lede-dim">Grouped by industry so you can find your own.</span></p>
        </div>

        ${featured.length
          ? `<div class="carousel carousel--videos carousel--reels" data-carousel data-reveal>
               <div class="carousel-track" data-autoscroll="true">
                 ${featured.map((client, index) => `
                   <figure class="video-card" style="--i:${index}">
                     ${mediaTile({ driveFileId: clientReels(client).selected?.driveFileId, title: `${client.name} — reel`, empty: 'Video coming soon' })}
                     <figcaption class="tiny">${esc(client.tagline || client.name)}</figcaption>
                   </figure>`).join('')}
               </div>
             </div>`
          : emptyState('No featured reels yet', 'Mark clients as featured in edit mode to show them here.')}

        <!-- Both ways into the client work, side by side. -->
        <div class="work-actions" data-reveal>
          <button type="button" class="btn btn--ember" data-toggle="industries" data-exclusive="work"
                  aria-expanded="false" aria-controls="industries">
            ${icon('film')}<span data-copy="work.video.by-industry">See more by industry</span>
          </button>
          <button type="button" class="btn btn--ember" data-toggle="all-clients" data-exclusive="work"
                  aria-expanded="false" aria-controls="all-clients">
            ${icon('layers')}<span data-copy="work.video.all-clients">View all client work</span>
          </button>
          ${editOnly(`
            <button type="button" class="edit-chip" data-edit="clients">${icon('pencil')} Manage clients</button>
            <button type="button" class="edit-chip" data-edit="client-order">${icon('layers')} Order, notes &amp; tags</button>
            <button type="button" class="edit-chip" data-edit="industry-order">${icon('film')} Industry order</button>
            <button type="button" class="edit-chip" data-edit="industry-reels">${icon('film')} Industry reels</button>
            <button type="button" class="edit-chip" data-edit="sync-clients">${icon('layers')} Sync clients</button>`)}
        </div>

        <div class="disclosure-panel" id="industries" hidden style="margin-top:2rem">
          ${industries.length
            ? industries.map(industryPanel).join('')
            : emptyState('No clients yet', 'Add clients in edit mode and they will group by industry here.')}

        </div>

        <!-- The full client index: its own panel, opened by the button beside
             "See more by industry" rather than nested inside the industry view. -->
        <div class="disclosure-panel all-clients-panel" id="all-clients" hidden data-animate="true">
            <div class="section-head" style="margin-bottom:1.5rem">
              <div>
                ${eyebrow('All client work', 'layers')}
                <h3 class="display display--md" data-copy="work.all.title">Everyone we've worked with.</h3>
              </div>
              <p class="lede">${esc(state.settings?.workClientsLabel || `${clients.length} client${clients.length === 1 ? '' : 's'}.`)}
                <span class="dim" data-copy="work.all.lede-dim">Grouped by industry — anyone working across more than one is listed under each.</span></p>
              ${editOnly(`<button type="button" class="edit-chip" data-edit="client-count">${icon('pencil')} Edit this line</button>`)}
            </div>

            ${industries.map(([name, group]) => `
              <div class="client-index" data-reveal>
                <h4 class="client-index-head"><span>${esc(name)}</span></h4>
                ${/* The scope carries the industry, as in the industry view above:
                      one client under two headings must not give two panels the
                      same id, or opening one would work the other. */''}
                ${clientTable(group, `idx-${slug(name)}`, `No clients in ${esc(name)} yet — add them in edit mode.`)}
              </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section" id="websites">
      <div class="shell">
        <div class="section-head" data-reveal>
          <div>
            ${eyebrow('Websites', 'layers')}
            <h2 class="display display--lg" data-copy="work.websites.title">Beautifully designed and crafted websites,<br>just like this one.</h2>
          </div>
        </div>
        ${websites.length
          ? `<div class="site-grid">${websites.slice(0, 3).map(siteCard).join('')}</div>
             ${websites.length > 3 ? `
               <div style="margin-top:1.5rem">
                 <button type="button" class="btn btn--ghost" data-toggle="more-sites"
                         aria-expanded="false" aria-controls="more-sites"><span data-copy="work.websites.more">View more</span></button>
               </div>
               <div class="disclosure-panel" id="more-sites" hidden data-animate="true" style="margin-top:1.5rem">
                 <div class="site-grid">${websites.slice(3).map(siteCard).join('')}</div>
               </div>` : ''}`
          : emptyState('No websites added yet', 'Add your three portfolio entries in edit mode.')}
        ${editOnly(`
        <div style="margin-top:1.5rem">
          <button type="button" class="edit-chip" data-edit="websites">${icon('pencil')} Manage websites</button>
        </div>
        `)}
      </div>
    </section>

    <section class="section" id="photography">
      <div class="shell">
        ${eyebrow('Photography', 'image')}
        <h2 class="display display--lg" data-reveal data-copy="work.photo.title" style="margin-bottom:calc(2.5rem - 0.16em)">Shot properly, lit properly.</h2>
        ${photography.length
          ? photography.map(photoCategory).join('')
          : emptyState('No categories yet', 'Add photography categories in edit mode.')}
        ${editOnly(`
        <div style="margin-top:1.5rem">
          <button type="button" class="edit-chip" data-edit="photography">${icon('pencil')} Manage photography</button>
        </div>
        `)}
      </div>
    </section>

    <section class="section backdrop-warm" id="branding">
      <div class="shell">
        ${eyebrow('Branding', 'diamond')}
        <h2 class="display display--lg" data-reveal data-copy="work.branding.title" style="margin-bottom:calc(2.5rem - 0.16em)">Elevating your brand.</h2>
        ${branding.length
          ? /*
              Branding work arrives as whatever shape it was made in — a square
              logo, a wide poster, a tall menu. The tiles used to be squares
              with the picture cropped to fill them, which cut the ends off
              anything that wasn't square. They now take each picture's own
              shape, so every piece is shown whole, and the masonry column
              layout absorbs the different heights.
            */
            `<div class="branding-masonry" data-photo-set>${branding.map((item, index) => `
              <figure data-reveal style="--i:${index}">
                ${photoTile(item.mediaUrl, item.clientName || item.type, 'natural')
                  || mediaTile({ imageUrl: '', title: '', ratio: 'square' })}
                ${item.clientName ? `<figcaption class="tiny" style="margin-top:0.4rem">${esc(item.clientName)}</figcaption>` : ''}
              </figure>`).join('')}</div>`
          : emptyState('No branding work yet', 'Add logos, carousels and branded edits in edit mode.')}
        ${editOnly(`
        <div style="margin-top:1.5rem">
          <button type="button" class="edit-chip" data-edit="branding">${icon('pencil')} Manage branding</button>
        </div>
        `)}
      </div>
    </section>
  </main>`;
}

function mountOurWork() {
  $('[data-results-modal]')?.addEventListener('click', openCaseStudies);
  mountCarousel($('.carousel--reels'));

  /*
    Delegated, because the photographs are inside panels that are built before
    they are ever opened, and the carousel makes copies of them for its loop
    once they are. One listener on the page covers all of it.
  */
  $('main')?.addEventListener('click', (event) => {
    const pressed = event.target.closest('[data-photo]');
    if (!pressed) return;
    /*
      Everything in the same set, in the order shown — one photography category,
      or the branding wall. Scoped to the set rather than to the page, so
      opening a photograph doesn't hand you every other picture on Our Work.

      The copies the carousel made for its loop are dropped, or the same
      picture would come round again halfway through. The clicked one is found
      by its address rather than by counting, since a copy is not the element
      that was pressed.
    */
    const group = pressed.closest('[data-photo-set]') ?? pressed.closest('main');
    const photos = $$('[data-photo]', group)
      .filter((node) => !node.closest('[data-clone="true"]'))
      .map((node) => node.dataset.photo);
    const unique = [...new Set(photos)];
    openPhotoViewer(unique, Math.max(0, unique.indexOf(pressed.dataset.photo)));
  });
}

/**
 * A photograph at full size, with the rest of its category behind it.
 *
 * The picture is shown whole rather than cropped to the window — a photograph
 * you have opened to look at properly should not lose its edges to the shape
 * of the screen. Left and right walk through the set, by button or by arrow
 * key, and it wraps round at either end so there is no dead press.
 */
function openPhotoViewer(photos, startIndex = 0) {
  if (!photos.length) return;
  let at = startIndex;
  let onKey = null;

  const many = photos.length > 1;
  const body = `
    <div class="photo-viewer">
      <img class="photo-viewer-img" src="${assetUrl(photos[at], 1800)}" alt="" decoding="async">
      ${many ? `
        <button type="button" class="photo-viewer-step photo-viewer-step--prev" data-step="-1"
                aria-label="Previous photo">${icon('chevronRight')}</button>
        <button type="button" class="photo-viewer-step photo-viewer-step--next" data-step="1"
                aria-label="Next photo">${icon('chevronRight')}</button>
        <p class="photo-viewer-count tiny" aria-live="polite"></p>` : ''}
    </div>`;

  openModal({
    title: 'Photo',
    className: 'modal--photo',
    body,
    onMount(host) {
      const image = $('.photo-viewer-img', host);
      const count = $('.photo-viewer-count', host);

      const show = (next) => {
        at = (next + photos.length) % photos.length;
        image.src = assetUrl(photos[at], 1800);
        if (count) count.textContent = `${at + 1} of ${photos.length}`;
      };
      show(at);

      host.addEventListener('click', (event) => {
        const step = event.target.closest('[data-step]');
        if (step) show(at + Number(step.dataset.step));
      });

      if (!many) return;
      // The arrow keys walk the set. Removed again when the dialog closes,
      // through onClose below.
      onKey = (event) => {
        if (event.key === 'ArrowRight') show(at + 1);
        else if (event.key === 'ArrowLeft') show(at - 1);
        else return;
        event.preventDefault();
      };
      document.addEventListener('keydown', onKey);
    },
    onClose() {
      if (onKey) document.removeEventListener('keydown', onKey);
    },
  });
}

/**
 * Results "see more" (R8): real case studies rather than raw totals. Driven by
 * the client collection's isCaseStudy flag — which defaults to whatever
 * isRecentWin is — so featuring more clients in edit mode fills this view
 * automatically.
 */
function openCaseStudies() {
  const studies = (state.clients ?? [])
    .filter((client) => client.isCaseStudy)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  openModal({
    title: 'Case studies',
    subtitle: 'The work behind the numbers.',
    body: studies.length
      ? `<div class="stack-2">${studies.map((client) => `
          <article class="case-study">
            <div class="case-study-head">
              <h3>${esc(client.name)}</h3>
              <span class="tag">${esc(client.category)}</span>
            </div>
            ${client.tagline
              ? `<p class="lede">${esc(client.tagline)}</p>`
              : `<p class="tiny">Add a one-line result for ${esc(client.name)} in edit mode.</p>`}
            ${client.videos?.length
              ? videoCarousel(client)
              : `<div class="reel-grid">${mediaTile({ title: client.name, empty: 'Video coming soon' })}</div>`}
          </article>`).join('')}</div>`
      : emptyState(
          'No case studies yet',
          'Flag clients as case studies in edit mode — recent wins are included by default.'
        ),
    onMount(host) { $$('[data-carousel]', host).forEach((node) => mountCarousel(node)); },
  });
}

/* --------------------------------------------------------------- About --- */

async function renderAbout() {
  const settings = await load('settings');
  const { founded, clientsCount, teamCount } = settings.aboutStats ?? {};

  const stat = (num, label, index = 0) => `
    <div class="glass-card stat" data-reveal style="--i:${index}">
      <span class="num">${esc(num || '—')}</span>
      <span class="label micro" data-copy="about.stat.${copyKey(label)}">${esc(label)}</span>
    </div>`;

  return `
  <main id="main" class="page">
    <section class="section">
      <div class="shell" data-reveal>
        <div class="glow" style="--glow-w:40rem;--glow-h:30rem;--glow-a:0.3;right:-8rem;top:-4rem"></div>
        ${eyebrow('About', 'diamond')}
        <figure class="quote-block" data-reveal style="--i:1">
          <blockquote class="display" data-copy="about.quote">Lost until the love for impact found me.</blockquote>
          <figcaption data-copy="about.quote-by">Ar-Rayyan Monsur — Founder of Advatar</figcaption>
        </figure>
      </div>
    </section>

    <section class="section">
      <div class="shell stack-2">
        <p class="lede" data-reveal data-copy="about.founded" style="max-width:54ch">Founded in ${esc(founded || '2024')}, Advatar has worked with over ${esc(clientsCount || '50')} clients.</p>

        <div class="stat-row" data-reveal>
          ${stat(founded, 'Founded', 0)}
          ${stat(clientsCount ? `${clientsCount}+` : '', 'Clients', 1)}
          ${stat(teamCount, 'Team members', 2)}
        </div>
        ${editOnly(`
        <div>
          <button type="button" class="edit-chip" data-edit="about">${icon('pencil')} Edit stats</button>
        </div>
        `)}

        <div class="stack-2">
          <p class="lede" data-reveal data-copy="about.founder" style="max-width:54ch">The founder, Ar-Rayyan Monsur, has been working in marketing since 2021 and graduated in Economics at the University of Leicester.</p>
          <p class="lede" data-reveal style="max-width:54ch"><span data-copy="about.team">The team now expands to ${esc(teamCount || '13')} dedicated team members and is growing. Want to join the team,</span>
            <a class="text-link" href="/hiring" data-copy="about.team-link">register your interest here</a></p>
        </div>
      </div>
    </section>

    <section class="section ihsan">
      <div class="ihsan-mark" aria-hidden="true" lang="ar">إحسان</div>
      <div class="shell ihsan-body" data-reveal>
        ${eyebrow('Ihsan', 'plus')}
        <p class="lede" style="max-width:56ch;font-size:clamp(1.0625rem,1.6vw,1.375rem)">
          <span data-copy="about.ihsan-lead">Our aim is to work upon the term of &ldquo;Ihsan&rdquo;</span>
          (<span lang="ar" class="ihsan-inline">إحسان</span>)
          <span data-copy="about.ihsan-rest">or in other words, Excellence &mdash; and we never release a bit of work that we&rsquo;re not impressed by ourselves.</span>
        </p>
      </div>
    </section>
  </main>`;
}

/* ------------------------------------------------------------- Contact --- */

async function renderContact() {
  const settings = await load('settings');
  const { whatsappNumber, email } = settings.contact ?? {};

  /*
    The enquiry form lives in the separate app at app.advatar.co.uk, so this is
    an ordinary link out rather than anything this site handles. It opens in a
    new tab, like the WhatsApp button beside it, so nobody loses the page they
    were reading.
  */
  const enquire = `<a class="btn btn--sheen" href="${ENQUIRE_URL}" target="_blank" rel="noopener noreferrer">
      <span data-copy="contact.enquire-cta">Enquire now</span>${icon('arrowRight')}</a>`;

  const whatsapp = whatsappNumber
    ? `<a class="btn btn--gold" href="https://wa.me/${esc(whatsappNumber)}" target="_blank" rel="noopener noreferrer">
         ${icon('whatsapp')}<span data-copy="contact.whatsapp-cta">WhatsApp us</span></a>`
    : `<button type="button" class="btn" disabled aria-describedby="wa-note">${icon('whatsapp')}<span data-copy="contact.whatsapp-cta">WhatsApp us</span></button>
       <p class="tiny" id="wa-note" style="margin-top:0.75rem">
         Add your full WhatsApp number in edit mode to switch this on.</p>`;

  return `
  <main id="main" class="page">
    <section class="section">
      <div class="shell">
        <div class="glow" style="--glow-w:36rem;--glow-h:26rem;--glow-a:0.26;left:-8rem;top:-4rem"></div>
        ${eyebrow('Contact', 'mail')}
        <h1 class="display display--lg" data-reveal data-copy="contact.title" style="max-width:18ch">Let's talk about what you're building.</h1>

        <!--
          Two ways to look round before getting in touch, written as a sentence
          rather than as buttons: this is an aside under the heading, and a row
          of buttons here would compete with the two real ones below it.
        -->
        <p class="contact-ways" data-reveal style="--i:1">
          <a href="/look-inside" data-copy="contact.ways.look">Have a peek at what it looks like to work with us</a><!--
          --><span data-copy="contact.ways.or"> or </span><!--
          --><a href="/our-work" data-copy="contact.ways.work">view what we've been producing over the years</a>
        </p>
      </div>
    </section>

    <section class="section">
      <div class="shell contact-grid">
        <div class="stack-2" data-reveal>
          <p class="lede" data-copy="contact.whatsapp-lede">WhatsApp us and we'll get back to you before you take a bite out of your next meal.</p>
          <div class="contact-actions">${enquire}${whatsapp}</div>
        </div>

        <div class="or-divider" aria-hidden="true" data-reveal><span data-copy="contact.or">Or</span></div>

        <div class="stack-2" data-reveal style="--i:1">
          <form class="editor-form" id="contact-form" novalidate>
            <div class="field">
              <label for="cf-name" data-copy="contact.label.name">Name</label>
              <input id="cf-name" name="name" type="text" autocomplete="name" required maxlength="120">
            </div>
            <div class="field">
              <label for="cf-email" data-copy="contact.label.email">Email</label>
              <input id="cf-email" name="email" type="email" autocomplete="email" required maxlength="200">
            </div>
            <div class="field">
              <label for="cf-message" data-copy="contact.label.message">Message</label>
              <textarea id="cf-message" name="message" required maxlength="4000"></textarea>
            </div>

            <!-- Honeypot. Hidden from people, irresistible to bots. -->
            <div class="hp" aria-hidden="true">
              <label for="cf-company">Company</label>
              <input id="cf-company" name="company" type="text" tabindex="-1" autocomplete="off">
            </div>

            <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
              <button class="btn btn--gold" type="submit"><span data-copy="contact.send">Send message</span> ${icon('arrowRight')}</button>
              <p class="form-status" role="status" aria-live="polite"></p>
            </div>
          </form>

          <p class="tiny">
            <span data-copy="contact.prefer-email">Prefer email?</span>
            <a class="link-arrow" href="mailto:${esc(email || 'marketing@advatar.co.uk')}">
              ${icon('mail')}<span>${esc(email || 'marketing@advatar.co.uk')}</span></a>
          </p>

          ${editOnly(`
          <div>
            <button type="button" class="edit-chip" data-edit="contact">${icon('pencil')} Edit contact details</button>
            <button type="button" class="edit-chip" data-edit="submissions">${icon('mail')} View messages</button>
          </div>
          `)}
        </div>
      </div>
    </section>
  </main>`;
}

function mountContact() {
  const form = $('#contact-form');
  if (!form) return;
  const status = $('.form-status', form);
  const submit = $('button[type="submit"]', form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));

    status.dataset.state = '';
    status.textContent = 'Sending…';
    submit.disabled = true;

    try {
      await api.post('/api/contact', data);
      form.reset();
      status.dataset.state = 'ok';
      status.textContent = "Got it — we'll be in touch shortly.";
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
}

/* --------------------------------------------------------- Look Inside --- */

const PROCESS_STEPS = [
  { label: 'Discovery', title: 'Discovery call', copy: 'A Google Meet. We get the details and see if we’re a fit.' },
  { label: 'The plan', title: 'If yes — the plan', copy: 'A base-level plan and strategy, already built by the time we speak again.' },
  { label: 'In person', title: 'We meet properly', copy: 'In person to walk through it. Online if that isn’t possible.' },
  { label: 'Kick-off', title: 'Work begins', copy: 'The plan gets followed through, and developed as we go.' },
  { label: 'Portal', title: 'Your own client portal', copy: 'Track schedules, see what’s next, and message the team directly — all in one place.' },
  { label: 'Specialists', title: 'The right person for the work', copy: 'Videographer films, web designer designs, photographer shoots.' },
  { label: 'Review', title: 'Work goes up for review', copy: 'Yours to approve — unless you’d rather skip that. Then it’s published.' },
  { label: 'Optimise', title: 'The system cycles', copy: 'Work gets reviewed monthly for optimisation.' },
  { label: 'The smile', title: 'A smile on your face', copy: 'If it wasn’t there already.' },
  { label: 'Again?', title: 'Then — should we continue?', copy: 'With that smile, it’s an easy question to ask.' },
];

async function renderLookInside() {
  const settings = await load('settings');
  const images = new Map((settings.lookInsideImages ?? []).map((entry) => [entry.step, entry]));

  /*
    An image beside each step: a URL, or a Drive file shown via its thumbnail.

    Images are optional. A step without one is just its words — no grey
    "coming soon" box, which told visitors something was missing. In edit
    mode a slim note sits where the image would go, so it's clear the gap is
    a choice and where to fill it if you want to.
  */
  const imageFor = (number) => {
    const entry = images.get(number);
    if (!entry?.image) {
      return editOnly(`<p class="process-media-note tiny">${icon('image')}
        <span>No image for this step — visitors just see the text. Add one with <strong>Edit step images</strong>.</span></p>`);
    }
    /*
      Two pictures may be given: one for the light page and one for the dark.
      Both are put on the page and CSS shows whichever matches the theme, so
      switching theme swaps them at once with nothing to reload. With only one
      given, that one is used on both.
    */
    const source = (ref) => (/^(https?:|\/)/.test(ref) ? assetUrl(ref, 1600) : esc(driveThumb(ref, 1600)));
    const alt = esc(entry.caption || '');

    /*
      A step can be given a short film instead of a photograph — an MP4 on
      Cloudinary, used the way an animated GIF would be. It has no sound and no
      controls: it simply runs, and starts again. A GIF of any length is enormous
      and looks coarse; the same thing as an MP4 is a fraction of the size and
      keeps its quality, which is why the link is a video rather than a GIF.

      SILENT, AND SILENT EVEN IF THE FILE ISN'T. `muted` is what lets it start
      on its own at all — no browser plays sound nobody asked for — so a clip
      that happens to carry an audio track is still silent here.

      It waits its turn: nothing is fetched beyond the first frame until the
      step is on screen (see mountLookInside), so ten of these don't all load
      and decode at once on a phone.
    */
    const clip = (ref, extra) => {
      const src = isCloudinaryVideo(ref) ? cloudinaryVideo(ref, 'c_limit,w_1600') : ref;
      const poster = isCloudinaryVideo(ref) ? ` poster="${esc(cloudinaryPoster(ref, 1600))}"` : '';
      return `<video class="process-img${extra}" data-clip="${esc(src)}"${poster}
                     muted loop playsinline preload="none"
                     ${alt ? `aria-label="${alt}"` : 'aria-hidden="true"'}></video>`;
    };

    const picture = (ref, extra) => (looksLikeVideo(ref)
      ? clip(ref, extra)
      : `<img class="process-img${extra}" src="${source(ref)}" alt="${alt}"
              loading="lazy" decoding="async" referrerpolicy="no-referrer">`);

    return `<figure class="process-media">
      ${entry.imageDark
        ? `${picture(entry.image, ' process-img--light')}${picture(entry.imageDark, ' process-img--dark')}`
        : picture(entry.image, '')}
      ${entry.caption ? `<figcaption class="tiny">${esc(entry.caption)}</figcaption>` : ''}
    </figure>`;
  };

  // The step's short name, number included. Rendered twice: pinned beside the
  // line on desktop, and above the text on mobile where there's no room for it.
  const label = (step, index, extra = '') => `
    <div class="process-label ${extra}">
      <span class="process-num">${String(index + 1).padStart(2, '0')}</span>
      <h2 class="process-title" data-copy="look.step.${index + 1}.label">${esc(step.label)}</h2>
    </div>`;

  return `
  <main id="main" class="page">
    <section class="section">
      <div class="shell">
        <div class="glow" style="--glow-w:34rem;--glow-h:26rem;--glow-a:0.24;right:-8rem;top:-4rem"></div>
        ${eyebrow('Look inside', 'eye')}
        <h1 class="display display--lg" data-reveal data-copy="look.title" style="max-width:20ch">What it's actually like to work with us.</h1>
        <p class="lede" data-reveal style="--i:1;margin-top:1.5rem"><span data-copy="look.lede">Start to finish.</span>
          <span class="dim" data-copy="look.lede-dim">No mystery, no black box — here's every step.</span></p>
        ${editOnly(`
        <div style="margin-top:1.5rem">
          <button type="button" class="edit-chip" data-edit="look-images">${icon('image')} Edit step images</button>
        </div>
        `)}
      </div>
    </section>

    <!--
      Each step's name pins beside the line while its text and image scroll past,
      and the line fills continuously as you read — lighting each marker as the
      fill reaches it.
    -->
    <section class="section process-section">
      <div class="shell">
        <div class="process" style="--fill:0px">
          <div class="process-line" aria-hidden="true"><span class="process-line-fill"></span></div>
          ${PROCESS_STEPS.map((step, index) => `
            <article class="process-step" data-step="${index}" data-shown="false" data-lit="false" data-current="false">
              <div class="process-marker">
                <span class="process-dot" aria-hidden="true"></span>
                ${label(step, index, 'process-label--pinned')}
              </div>
              <div class="process-body">
                ${label(step, index, 'process-label--inline')}
                <h3 class="process-heading" data-copy="look.step.${index + 1}.title">${esc(step.title)}</h3>
                <p class="process-copy" data-copy="look.step.${index + 1}.copy">${esc(step.copy)}</p>
                ${imageFor(index + 1)}
              </div>
            </article>`).join('')}
        </div>
      </div>
    </section>
  </main>`;
}

/*
  The looping clips on Look Inside, if any step was given one.

  Each waits until its step is on screen before it fetches anything: until then
  the browser has only the poster, which is a single frame. That matters on a
  page of ten steps — ten films loading at once is a slow page and a warm phone,
  and nine of them are nowhere near the screen.

  Off screen they pause. Somebody scrolling past shouldn't leave a row of films
  running behind them, and a paused film costs nothing.

  Where motion is turned off in the system settings, nothing plays at all: the
  poster stays, which is the still picture of the same thing.
*/
function mountStepClips() {
  const clips = $$('video[data-clip]');
  if (!clips.length) return;

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    // No observer to lean on: load them, but still never play on their own.
    if (!prefersReducedMotion()) clips.forEach((clip) => { clip.src = clip.dataset.clip; });
    return;
  }

  const watcher = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const clip = entry.target;
      if (!entry.isIntersecting) { clip.pause(); continue; }
      if (!clip.src) {
        clip.src = clip.dataset.clip;
        clip.preload = 'auto';
      }
      // A play() that can't start (a tab in the background) isn't a problem.
      clip.play().catch(() => {});
    }
  }, { rootMargin: '25% 0px' });

  clips.forEach((clip) => watcher.observe(clip));
  registerCleanup(() => watcher.disconnect());
}

function mountLookInside() {
  const process = $('.process');
  const steps = $$('.process-step');
  if (!process || !steps.length) return;

  mountStepClips();

  // A step's name and its text arrive together: the option on the left reveals
  // as the text on the right does.
  const reveal = (step) => { step.dataset.shown = 'true'; };
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    steps.forEach(reveal);
  } else {
    const revealer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target);
        revealer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -25% 0px', threshold: 0.05 });
    steps.forEach((step) => revealer.observe(step));
    registerCleanup(() => revealer.disconnect());
  }

  /*
    The line fills continuously with scroll, as on the reference: its tip tracks
    the reading line, 55% down the screen. A marker lights once the fill reaches
    it, and the last lit marker is the current step. Markers are sticky, so their
    positions are read live on each frame rather than cached.
  */
  let ticking = false;
  function update() {
    ticking = false;
    const rect = process.getBoundingClientRect();
    const reading = window.innerHeight * 0.55;
    const fill = Math.min(Math.max(reading - rect.top, 0), rect.height);
    process.style.setProperty('--fill', `${fill.toFixed(1)}px`);

    let current = -1;
    steps.forEach((step, index) => {
      const dot = step.querySelector('.process-dot').getBoundingClientRect();
      const lit = dot.top + dot.height / 2 <= reading;
      step.dataset.lit = String(lit);
      if (lit) current = index;
    });
    steps.forEach((step, index) => { step.dataset.current = String(index === current); });
  }
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  registerCleanup(() => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
  });
}

/* -------------------------------------------------------------- Hiring --- */

const VALUES = [
  'Trust the person next to you.',
  'Bold beats safe.',
  "Solve it, don't own it.",
  'No one carries it alone.',
  "Do right, even when it's hard.",
];

async function renderHiring() {
  const [settings, jobs] = await Promise.all([load('settings'), load('jobs')]);
  const gallery = settings.hiringGallery ?? [];
  const activeJobs = jobs.filter((job) => job.active);

  const departments = [...new Set(activeJobs.map((job) => job.department))].sort();
  const types = [...new Set(activeJobs.map((job) => job.type))].sort();
  const levels = [...new Set(activeJobs.map((job) => job.experienceLevel))].sort();
  const workplaces = [...new Set(activeJobs.map((job) => job.workplaceType))].sort();

  const select = (id, label, options) => `
    <div class="field field--select">
      <label for="${id}" data-copy="hiring.filter.${copyKey(label)}">${esc(label)}</label>
      <select id="${id}" data-filter="${id}">
        <option value="">All</option>
        ${options.map((option) => `<option value="${esc(option)}">${esc(option)}</option>`).join('')}
      </select>
      ${icon('chevronDown')}
    </div>`;

  return `
  <main id="main" class="page">
    <section class="section">
      <div class="shell">
        <div class="glow" style="--glow-w:38rem;--glow-h:28rem;--glow-a:0.28;left:-8rem;top:-4rem"></div>
        ${eyebrow("We're hiring", 'briefcase')}
        <h1 class="display display--lg" data-reveal data-copy="hiring.title" style="max-width:18ch">Build something you're proud of.</h1>
      </div>
    </section>

    <section class="section">
      <div class="shell">
        ${gallery.length
          ? `<div class="bts-strip" data-reveal data-lenis-prevent-horizontal>${gallery.map((entry) =>
              mediaTile({
                driveFileId: entry.driveFileId,
                imageUrl: entry.imageUrl,
                title: entry.caption || 'Behind the scenes',
                ratio: 'square',
              })).join('')}</div>`
          : emptyState('No behind-the-scenes yet', 'Add team and culture photos or clips in edit mode.')}
        ${editOnly(`
        <div style="margin-top:1rem">
          <button type="button" class="edit-chip" data-edit="gallery">${icon('pencil')} Edit gallery</button>
        </div>
        `)}
      </div>
    </section>

    <section class="section backdrop-warm">
      <div class="shell">
        <p class="lede" data-reveal style="max-width:60ch;font-size:clamp(1rem,1.5vw,1.25rem)">
          <span data-copy="hiring.intro">At Advatar, growth isn't just something we chase for clients — we build it into how we work together.</span>
          <span class="dim" data-copy="hiring.intro-dim">This is a place to stretch, take ownership, and do work you're proud to put your name on.</span>
        </p>

        <div data-reveal style="margin-top:clamp(2.5rem,6vw,4rem)">
          ${eyebrow('Our values in action', 'plus')}
          <p class="tiny" style="margin:-1.5rem 0 0" data-copy="hiring.values-sub">The principles that guide how we work and collaborate.</p>
          <ol class="values-list">
            ${VALUES.map((value, index) => `
              <li data-reveal style="--i:${index}"><span class="value-num">${String(index + 1).padStart(2, '0')}</span><span data-copy="hiring.value.${index + 1}">${esc(value)}</span></li>`).join('')}
          </ol>
        </div>

        <div class="stack" data-reveal style="margin-top:2.5rem">
          <p class="lede" data-copy="hiring.cta">If you want to build something you're proud of — and help others do the same — we'd like to meet you.</p>
          <div><a class="btn btn--gold" href="#vacancies"><span data-copy="hiring.join">Join us</span> ${icon('arrowRight')}</a></div>
        </div>
      </div>
    </section>

    <section class="section" id="vacancies">
      <div class="shell">
        ${eyebrow('Open roles', 'briefcase')}
        <h2 class="display display--lg" data-reveal data-copy="hiring.vacancies" style="margin-bottom:calc(2rem - 0.16em)">Vacancies.</h2>

        <div class="job-filters" data-reveal>
          <div class="field">
            <label for="job-q" data-copy="hiring.filter.keyword">Keyword</label>
            <input id="job-q" type="search" data-filter="job-q" placeholder="Role, skill, keyword">
          </div>
          <div class="field">
            <label for="job-loc" data-copy="hiring.filter.location">Location</label>
            <input id="job-loc" type="text" data-filter="job-loc" placeholder="City or region">
          </div>
          ${select('job-dept', 'Department', departments)}
          ${select('job-type', 'Job type', types)}
          ${select('job-level', 'Experience level', levels)}
          ${select('job-workplace', 'Workplace type', workplaces)}
        </div>

        <div class="job-toolbar">
          <p class="tiny" data-job-count role="status" aria-live="polite"></p>
          <div class="field field--select" style="min-width:14rem">
            <label for="job-sort" class="visually-hidden">Sort by</label>
            <select id="job-sort" data-filter="job-sort">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            ${icon('chevronDown')}
          </div>
        </div>

        <ul class="job-list" data-job-list></ul>

        ${editOnly(`
        <div style="margin-top:1.5rem">
          <button type="button" class="edit-chip" data-edit="jobs">${icon('pencil')} Manage vacancies</button>
        </div>
        `)}
      </div>
    </section>
  </main>`;
}

function mountHiring() {
  const list = $('[data-job-list]');
  const count = $('[data-job-count]');
  if (!list) return;

  const controls = {
    q: $('[data-filter="job-q"]'),
    loc: $('[data-filter="job-loc"]'),
    dept: $('[data-filter="job-dept"]'),
    type: $('[data-filter="job-type"]'),
    level: $('[data-filter="job-level"]'),
    workplace: $('[data-filter="job-workplace"]'),
    sort: $('[data-filter="job-sort"]'),
  };

  const email = state.settings?.contact?.email || 'marketing@advatar.co.uk';

  function apply() {
    const q = controls.q.value.trim().toLowerCase();
    const loc = controls.loc.value.trim().toLowerCase();

    let results = (state.jobs ?? []).filter((job) => job.active);

    if (q) {
      results = results.filter((job) =>
        `${job.title} ${job.department} ${job.description}`.toLowerCase().includes(q));
    }
    if (loc) results = results.filter((job) => job.location.toLowerCase().includes(loc));
    if (controls.dept.value) results = results.filter((job) => job.department === controls.dept.value);
    if (controls.type.value) results = results.filter((job) => job.type === controls.type.value);
    if (controls.level.value) results = results.filter((job) => job.experienceLevel === controls.level.value);
    if (controls.workplace.value) results = results.filter((job) => job.workplaceType === controls.workplace.value);

    const direction = controls.sort.value === 'oldest' ? 1 : -1;
    results.sort((a, b) => direction * (Date.parse(a.postedDate) - Date.parse(b.postedDate)));

    count.textContent = `${results.length} role${results.length === 1 ? '' : 's'}`;

    list.innerHTML = results.length
      ? results.map((job) => `
        <li class="job-item">
          <div>
            <div>
              <h3>${esc(job.title)}</h3>
              <div class="job-meta">
                <span>${icon('briefcase')}${esc(job.department)}</span>
                ${job.location ? `<span>${icon('pin')}${esc(job.location)}</span>` : ''}
                <span>${icon('clock')}${esc(job.type)}</span>
                <span>${icon('layers')}${esc(job.workplaceType)}</span>
              </div>
            </div>
            <button type="button" class="btn btn--sm" data-job="${esc(job.id)}">View role</button>
          </div>
        </li>`).join('')
      : `<li class="job-item"><div><p class="tiny">No roles match those filters right now.</p></div></li>`;

    $$('[data-job]', list).forEach((button) => {
      button.addEventListener('click', () => {
        const job = results.find((item) => item.id === button.dataset.job);
        if (!job) return;
        const applyHref = safeUrl(job.applyUrl)
          || `mailto:${esc(email)}?subject=${encodeURIComponent(`Application — ${job.title}`)}`;
        openModal({
          title: job.title,
          subtitle: [job.department, job.location, job.type, job.workplaceType].filter(Boolean).join(' · '),
          body: `
            <div class="stack-2">
              <p style="white-space:pre-wrap;margin:0;color:var(--text-lo)">${esc(job.description || 'Full description coming soon.')}</p>
              <div><a class="btn btn--gold" href="${applyHref}">Apply ${icon('arrowRight')}</a></div>
            </div>`,
        });
      });
    });
  }

  Object.values(controls).forEach((control) => {
    control.addEventListener('input', apply);
    control.addEventListener('change', apply);
  });
  apply();
}

/* ============================================================ Router ====== */

const ROUTES = {
  '/':            { title: 'Advatar — Impact-focused marketing', render: renderHome,       mount: mountHome },
  '/our-work':    { title: 'Our Work — Advatar',                 render: renderOurWork,    mount: mountOurWork },
  '/about':       { title: 'About — Advatar',                    render: renderAbout },
  '/contact':     { title: 'Contact — Advatar',                  render: renderContact,    mount: mountContact },
  '/look-inside': { title: 'Look Inside — Advatar',              render: renderLookInside, mount: mountLookInside },
  '/hiring':      { title: "We're Hiring — Advatar",             render: renderHiring,     mount: mountHiring },
};

/* Listeners owned by the current page, torn down on every navigation. */
let cleanups = [];
const registerCleanup = (fn) => cleanups.push(fn);

const app = $('#app');

async function renderRoute(path, { restoreScroll = false } = {}) {
  const route = ROUTES[path] ?? ROUTES['/'];

  if (activeCopyEdit) finishCopyEdit({ save: false });
  cleanups.forEach((fn) => fn());
  cleanups = [];
  closeModal();

  app.setAttribute('aria-busy', 'true');

  let pageHtml;
  try {
    pageHtml = await route.render();
  } catch (error) {
    console.error(error);
    pageHtml = `
      <main id="main" style="padding-top:10rem">
        <div class="shell">
          ${emptyState("We couldn't load this page", error.message)}
          <div style="margin-top:1.5rem"><a class="btn" href="/">Back home</a></div>
        </div>
      </main>`;
  }

  app.innerHTML = navFragment(path) + pageHtml + footerFragment(state.settings);
  applyCopy(app);
  app.removeAttribute('aria-busy');
  document.title = route.title;

  mountChrome();
  route.mount?.();
  if (state.authed) mountEditHandlers();

  /* Anchor links inside a route (e.g. /our-work#branding). */
  const hash = window.location.hash;
  if (hash) {
    const target = document.getElementById(hash.slice(1));
    if (target) {
      scrollToTarget(target);
      return;
    }
  }
  if (!restoreScroll) scrollToTarget(0, { immediate: true });
}

function navigate(path, { replace = false } = {}) {
  const url = new URL(path, window.location.origin);
  const samePage = url.pathname === window.location.pathname;

  if (replace) history.replaceState({}, '', url);
  else history.pushState({}, '', url);

  if (samePage && url.hash) {
    const target = document.getElementById(url.hash.slice(1));
    if (target) scrollToTarget(target);
    return;
  }
  renderRoute(url.pathname);
}

/* Intercept internal links so navigation never reloads the page. */
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link) return;
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  if (link.target === '_blank' || link.hasAttribute('download')) return;

  const href = link.getAttribute('href');
  if (!href || !href.startsWith('/')) return;

  event.preventDefault();
  navigate(href);
});

window.addEventListener('popstate', () => renderRoute(window.location.pathname, { restoreScroll: true }));

/* ------------------------------------------------------ Video playback --- */

/*
  Videos play inline. A tile receives Drive's player as it scrolls into view, so
  a single press plays it like a normal embed — or straight away if its own play
  button is pressed first (a carousel loop clone, say). Tiles are picked up
  wherever they appear: a new page, an opened panel, a modal, a clone.
*/
/*
  Drive's player won't lay itself out narrower than 320px — in a smaller tile it
  overflows and is cropped, leaving the play button off-centre and a black strip
  down one side. So it's laid out at a comfortable 480px (or the frame's own
  width, if wider) and scaled to fit. Fullscreen is unaffected: browsers drop
  transforms on the fullscreened element.
*/
const PLAYER_BASE = 480;

function sizePlayer(frame, width = frame.getBoundingClientRect().width) {
  if (!width) return;
  const base = Math.max(PLAYER_BASE, Math.round(width));
  frame.style.setProperty('--base', `${base}px`);
  frame.style.setProperty('--scale', String(width / base));
}

const frameSizer = 'ResizeObserver' in window
  ? new ResizeObserver((entries) => {
      for (const entry of entries) sizePlayer(entry.target, entry.contentRect.width);
    })
  : null;

/*
  Players are heavy — every Drive embed is a whole web page of its own — and a
  phone reloads the tab once it holds too many. So a player only arrives once its
  tile has settled into view (a quick scroll past loads nothing), and only a
  handful are ever live at once: past that, the oldest one nobody is watching,
  off-screen first, gives its place up.

  A player that scrolls away is kept rather than dropped straight away. Drive
  limits how often viewers who aren't signed in can load its player, so reloading
  a video every time it drifts back into view would use that allowance up fast.
*/
const LIVE_LIMIT = window.matchMedia('(hover: none), (max-width: 720px)').matches ? 3 : 10;
const livePlayers = new Set();          // tiles holding a player, oldest first
const tileTimers = new WeakMap();

function laterFor(tile, fn, delay) {
  clearTimeout(tileTimers.get(tile));
  tileTimers.set(tile, setTimeout(fn, delay));
}

function isWatching(tile) {
  const active = document.activeElement;
  return tile.dataset.engaged === 'true'
    || (active?.tagName === 'IFRAME' && tile.contains(active))
    || Boolean(document.fullscreenElement && tile.contains(document.fullscreenElement));
}

function releaseVideo(tile) {
  const frame = tile.querySelector('.media-frame');
  if (frame) {
    frameSizer?.unobserve(frame);
    /* A playing <video> taken off the page can carry on playing its sound with
       nothing on screen, so it is stopped and emptied before it goes. */
    frame.querySelectorAll('video').forEach((video) => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    frame.replaceChildren();
  }
  delete tile.dataset.hydrated;
  delete tile.dataset.engaged;
  livePlayers.delete(tile);
}

function hydrateVideo(tile) {
  if (!tile || tile.dataset.hydrated === 'true') return;
  const frame = tile.querySelector('.media-frame');
  if (!frame) return;
  clearTimeout(tileTimers.get(tile));
  tile.dataset.hydrated = 'true';
  if (tile.dataset.aspect) frame.style.setProperty('--ratio', tile.dataset.aspect);

  if (tile.dataset.source === 'cloudinary') {
    /*
      Cloudinary plays in the browser's own player. It only arrives when the
      play button is pressed (see the click handler), so it starts at once —
      f_auto,q_auto ask Cloudinary for the best format and quality this
      browser can take.
    */
    const video = document.createElement('video');
    video.src = cloudinaryFit(tile.dataset.video);
    video.poster = tile.querySelector('.media-thumb')?.currentSrc || '';
    video.controls = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('aria-label', tile.dataset.title || 'Video');
    frame.replaceChildren(video);
  } else {
    frame.innerHTML = `<iframe src="${driveEmbed(tile.dataset.video)}" title="${esc(tile.dataset.title || 'Video')}"
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen
      referrerpolicy="no-referrer"></iframe>`;
    if (frameSizer) frameSizer.observe(frame);
    else sizePlayer(frame);
  }

  livePlayers.add(tile);
  if (livePlayers.size <= LIVE_LIMIT) return;
  // Over the limit: let go of the oldest players nobody is watching,
  // off-screen ones before visible ones.
  const spare = [...livePlayers]
    .filter((other) => other !== tile && !isWatching(other))
    .sort((a, b) => Number(a.dataset.inView === 'true') - Number(b.dataset.inView === 'true'));
  while (livePlayers.size > LIVE_LIMIT && spare.length) releaseVideo(spare.shift());
}

const videoObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const tile = entry.target;
        tile.dataset.inView = String(entry.isIntersecting);
        /* A Drive player is loaded ahead of time so a single press plays it.
           A Cloudinary one needs no warming up, so it waits to be pressed and
           a page of posters costs nothing to scroll past. */
        if (entry.isIntersecting && tile.dataset.source !== 'cloudinary') {
          laterFor(tile, () => {
            if (tile.isConnected && tile.dataset.inView === 'true') hydrateVideo(tile);
          }, 800);
        } else {
          clearTimeout(tileTimers.get(tile));
        }
      }
    }, { threshold: 0.35 })
  : null;

function watchVideo(tile) {
  if (videoObserver) videoObserver.observe(tile);
  else hydrateVideo(tile);
}

function forgetVideo(tile) {
  videoObserver?.unobserve(tile);
  clearTimeout(tileTimers.get(tile));
  releaseVideo(tile);
}

/*
  Posters are recycled the same way. A poster decodes to a couple of megabytes
  once it is on screen, and Our Work holds well over a hundred tiles, so reading
  the whole page would leave a few hundred megabytes of decoded image behind it.
  That is what makes a phone throw the tab away and reload the site underneath
  you. So a tile far from the viewport hands its posters back and takes them up
  again as it returns. The tile never changes shape: the box is sized by
  aspect-ratio, not by the picture inside it.
*/
function dropPosters(tile) {
  tile.querySelectorAll('img[src]').forEach((img) => {
    img.dataset.src = img.getAttribute('src');
    img.removeAttribute('src');
  });
}

function restorePosters(tile) {
  const waiting = tile.querySelectorAll('img[data-src]');
  if (!waiting.length) return;
  tile.classList.remove('media--thumb-failed');
  waiting.forEach((img) => {
    img.setAttribute('src', img.dataset.src);
    delete img.dataset.src;
  });
}

/*
  A screen and a half of slack, so a poster is long since loaded by the time it
  is reached and only let go of well out of sight. The margin can't reach inside
  a carousel: a card hidden by the row's own overflow reads as out of view
  whatever the margin says. Those come back as they reach the edge, which at a
  drift of 14px a second is in hand well before there is enough of the card
  showing to notice.
*/
const posterObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) restorePosters(entry.target);
        else dropPosters(entry.target);
      }
    }, { rootMargin: '150% 100%' })
  : null;

function watchPosters(tile) { posterObserver?.observe(tile); }
function forgetPosters(tile) { posterObserver?.unobserve(tile); }

const eachTile = (node, selector, fn) => {
  if (node.nodeType !== 1) return;
  if (node.matches(selector)) fn(node);
  node.querySelectorAll(selector).forEach(fn);
};

new MutationObserver((records) => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      eachTile(node, '.media--video', watchVideo);
      eachTile(node, '.media', watchPosters);
    }
    // Tiles that have left the page give up their players and their slots.
    for (const node of record.removedNodes) {
      eachTile(node, '.media--video', forgetVideo);
      eachTile(node, '.media', forgetPosters);
    }
  }
}).observe(document.body, { childList: true, subtree: true });

document.addEventListener('click', (event) => {
  const play = event.target.closest('.media-play');
  if (!play) return;
  event.preventDefault();
  const tile = play.closest('.media--video');
  if (tile) tile.dataset.engaged = 'true';
  hydrateVideo(tile);
  // Still inside the press, so the browser lets it start with sound.
  tile?.querySelector('.media-frame video')?.play()?.catch(() => { /* the controls are there */ });
});

/* One of our own players at a time: starting one pauses whichever was playing.
   (A Drive player can't be paused from here — it's Google's page, not ours.) */
document.addEventListener('play', (event) => {
  const started = event.target;
  if (!(started instanceof HTMLVideoElement) || !started.closest('.media--video')) return;
  $$('.media--video .media-frame video').forEach((video) => { if (video !== started) video.pause(); });
}, true);

// Pressing into a player moves focus into its frame, which blurs the window.
// That player is the one being watched — keep it through any eviction.
window.addEventListener('blur', () => {
  setTimeout(() => {
    const active = document.activeElement;
    if (active?.tagName !== 'IFRAME') return;
    livePlayers.forEach((tile) => { delete tile.dataset.engaged; });
    const tile = active.closest('.media--video');
    if (tile) tile.dataset.engaged = 'true';
  }, 0);
});

// A poster has the video's own shape: record it, and size the player to match.
// A poster that fails to load (file not shared publicly) still gets a player.
document.addEventListener('load', (event) => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('media-thumb')) return;
  if (!img.naturalWidth || !img.naturalHeight) return;
  const tile = img.closest('.media--video');
  const aspect = String(img.naturalWidth / img.naturalHeight);
  tile?.setAttribute('data-aspect', aspect);
  tile?.querySelector('.media-frame')?.style.setProperty('--ratio', aspect);
}, true);

document.addEventListener('error', (event) => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('media-thumb')) return;
  // Handing a poster back fires this too, since the browser treats a removed
  // src as an image that failed. That one isn't a failure — it's on its way out.
  if (!img.hasAttribute('src')) return;
  img.closest('.media--video')?.classList.add('media--thumb-failed');
}, true);

/* --------------------------------------------------- Chrome behaviours --- */

function mountChrome() {
  const nav = $('.nav');

  const onScroll = () => { nav.dataset.scrolled = String(window.scrollY > 24); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  registerCleanup(() => window.removeEventListener('scroll', onScroll));

  $('[data-nav-toggle]')?.addEventListener('click', openNavMenu);
  $('[data-webdev]')?.addEventListener('click', onWebDevClick);

  $$('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleTheme();
      syncThemeToggles();
    });
  });

  /*
    Disclosures. Video Marketing's industry/client panels stay instant — that was
    explicit in the original brief. Panels marked data-animate get the softer
    grid-rows unravel instead (R10).
  */
  /*
    Opening a panel: [data-exclusive] buttons share a slot, so only one of them
    is ever open. "See more by industry" and "View all client work" are a pair —
    with both open, the second one's content landed below the whole of the
    first, far enough down the page that pressing it looked like nothing had
    happened.
  */
  const setPanel = (button, open) => {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return null;
    button.setAttribute('aria-expanded', String(open));

    if (panel.dataset.animate === 'true') {
      if (!open) {
        panel.dataset.open = 'false';
        // Once collapsed, hide it properly — otherwise its padding and border
        // stay on screen as a stray gap under the button.
        setTimeout(() => { if (panel.dataset.open === 'false') panel.hidden = true; }, 340);
      } else {
        panel.hidden = false;
        panel.classList.add('disclosure-panel--animated');
        panel.getBoundingClientRect();     // commit the collapsed state first,
        panel.dataset.open = 'true';       // so the unravel actually animates
      }
    } else {
      panel.hidden = !open;
    }

    if (open) {
      /*
        A [data-reveal] inside a hidden panel can never intersect, so its reveal
        would never fire and it would open as blank space. Anything revealed by
        opening a panel is, by definition, already "in view" — mark it shown.
      */
      $$('[data-reveal]', panel).forEach((node) => { node.dataset.shown = 'true'; });
      // Carousels inside a closed panel had no width to measure; mount them now.
      requestAnimationFrame(() => $$('[data-carousel]', panel).forEach((node) => mountCarousel(node)));
    }
    return panel;
  };

  $$('[data-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';

      if (!open && button.dataset.exclusive) {
        $$(`[data-exclusive="${button.dataset.exclusive}"]`)
          .filter((other) => other !== button && other.getAttribute('aria-expanded') === 'true')
          .forEach((other) => setPanel(other, false));
      }

      const panel = setPanel(button, !open);
      if (!panel) return;

      // Having swapped one panel for another, put the button back where the eye
      // already is, so the page doesn't appear to jump somewhere else.
      if (!open && button.dataset.exclusive) {
        requestAnimationFrame(() => scrollToTarget(button, { offset: -120 }));
      }
    });
  });

  mountReveals();
  mountAmbientStill();
}


/* -------------------------------------------------------- Scroll reveal --- */

/**
 * Reveals every [data-reveal] element as it enters the viewport (R5). Grouped
 * children get a --i stagger index so cards cascade rather than popping as one.
 */
function mountReveals() {
  const targets = $$('[data-reveal]');
  if (!targets.length) return;

  // A reveal that never fires would leave content permanently invisible, so any
  // reason not to animate means show everything immediately.
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    targets.forEach((node) => { node.dataset.shown = 'true'; });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.dataset.shown = 'true';
      observer.unobserve(entry.target);   // reveal once, then stop watching
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

  targets.forEach((node) => observer.observe(node));
  registerCleanup(() => observer.disconnect());
}

/** Layer the blurred still from settings behind everything, when one is set. */
function mountAmbientStill() {
  $('.ambient-still')?.remove();
  const url = assetUrl(state.settings?.textureUrl, 1920);
  if (!url) return;

  const img = document.createElement('img');
  img.className = 'ambient-still';
  img.src = url;
  img.alt = '';
  img.decoding = 'async';
  img.setAttribute('aria-hidden', 'true');
  document.body.prepend(img);
}

/* ------------------------------------------------------- Hero parallax --- */

/**
 * Hero hand-off (R5): background layers track scroll at a fraction of the page
 * speed, and the hero content fades as the next section rises over it.
 */
function mountHeroParallax() {
  const hero = $('.hero');
  if (!hero || prefersReducedMotion()) return;

  const layers = [
    /*
      The film is deliberately NOT here. It is a panel with feathered edges
      rather than a full-bleed backdrop, so drifting it downwards only slid it
      towards the foot of the hero, where it was cut off square by the hero's
      own edge. The gold layers still drift, which is where the depth comes
      from anyway.
    */
    { node: $('.hero-light'), rate: 0.28, base: '' },
    // The hand is vertically centred with translateY(-50%); the parallax offset
    // has to be added to that baseline rather than replacing it.
    { node: $('.hero-hand'), rate: 0.45, base: '-50%' },
  ].filter((layer) => layer.node);

  const content = $('.hero-content');
  const foot = $('.hero-foot');
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    const height = hero.offsetHeight || 1;
    if (y > height) return;                    // hero is off-screen; nothing to do

    for (const { node, rate, base } of layers) {
      const offset = base
        ? `calc(${base} + ${(y * rate).toFixed(1)}px)`
        : `${(y * rate).toFixed(1)}px`;
      node.style.transform = `translate3d(0, ${offset}, 0)`;
    }

    // Fade + lift the content out over the first 70% of the hero.
    const progress = Math.min(1, y / (height * 0.7));
    const fade = 1 - progress;
    if (content) {
      content.style.opacity = String(fade);
      content.style.transform = `translate3d(0, ${y * 0.12}px, 0)`;
    }
    if (foot) foot.style.opacity = String(fade);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  registerCleanup(() => {
    window.removeEventListener('scroll', onScroll);
    for (const { node } of layers) node.style.transform = '';
    if (content) { content.style.opacity = ''; content.style.transform = ''; }
    if (foot) foot.style.opacity = '';
  });
}

/* ------------------------------------------------------------ Carousel --- */

/**
 * Swipeable single-row carousel: pointer-drag for mouse, native momentum for
 * touch, and — when the track opts in with data-autoscroll — a slow continuous
 * sideways drift that loops seamlessly.
 *
 * A loop needs the items twice. Instead of rendering duplicates up front, the
 * clones are made here, and only when one pass of the items is wider than the
 * row can show: a client with one or two videos just sits still. A carousel in a
 * closed panel has no width to measure, so the panel mounts it when it opens.
 */
function mountCarousel(root) {
  if (!root || root.dataset.mounted === 'true') return;
  const track = $('.carousel-track', root);
  const next = $('.carousel-nav', root);
  if (!track || !track.clientWidth) return;          // hidden — mounted on open
  root.dataset.mounted = 'true';
  // A sideways trackpad swipe scrolls the row; an up-and-down one still
  // scrolls the page, smoothly (see Lenis).
  track.setAttribute('data-lenis-prevent-horizontal', '');

  const wantsLoop = track.dataset.autoscroll === 'true' && !prefersReducedMotion();
  const looping = wantsLoop && track.scrollWidth > track.clientWidth + 8;

  if (looping) {
    for (const node of [...track.children]) {
      const clone = node.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.removeAttribute('data-reveal');
      clone.dataset.clone = 'true';
      $$('a, button', clone).forEach((el) => el.setAttribute('tabindex', '-1'));
      // A clone starts as a poster; it gets a player of its own when it's seen.
      $$('.media--video', clone).forEach((tile) => {
        delete tile.dataset.hydrated;
        delete tile.dataset.inView;
        delete tile.dataset.engaged;
        $('.media-frame', tile)?.replaceChildren();
      });
      track.append(clone);
    }
  }
  root.dataset.looping = String(looping);

  /*
    How far the row travels before it is back where it started: the distance
    from the first item to its own clone. scrollWidth/2 looks like the same
    thing but is half a gap out, so every loop nudged the row sideways.
  */
  const loopWidth = () => {
    const kids = track.children;
    const clone = kids[kids.length / 2];
    return clone ? clone.offsetLeft - kids[0].offsetLeft : track.scrollWidth / 2;
  };

  const updateEnd = () => {
    // With a seamless loop there is no "end" to fade against.
    if (looping) { root.dataset.atEnd = 'false'; return; }
    root.dataset.atEnd = String(track.scrollLeft + track.clientWidth >= track.scrollWidth - 8);
  };

  const step = () => Math.max(track.clientWidth * 0.8, 220);
  next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

  track.addEventListener('scroll', updateEnd, { passive: true });
  updateEnd();

  /* ---- Slow continuous drift -------------------------------------------- */
  if (looping) {
    // A row heading right starts one full set in, so there is something to its
    // left to come into view rather than an immediate jump back.
    if (track.dataset.drift === 'right') track.scrollLeft = loopWidth();
    /*
      Pixels a second. 14 is a slow walk, which suits a row of films you are
      meant to look at one at a time. A row can ask for its own pace with
      data-speed — the logos travel faster, because a logo is taken in at a
      glance and a long row of them crawling looks stalled.
    */
    const SPEED = Number(track.dataset.speed) || 14;
    /*
      Which way the row travels. Normally the cards march leftward, as a reel of
      work reads. data-drift="right" sends them the other way, for the logo row
      on the home page.
    */
    const DIR = track.dataset.drift === 'right' ? -1 : 1;
    const canHover = window.matchMedia('(hover: hover)').matches;
    let paused = false;
    let last = performance.now();
    let frame = 0;
    // Sub-pixel carry, or a 14px/s speed would floor to zero every frame.
    let carry = 0;
    /*
      A scroll the drift didn't make is someone scrolling the row themselves —
      a wheel, a trackpad, the keyboard. Hold off for a moment, or the drift
      writes scrollLeft every frame and fights them for it.
    */
    let holdUntil = 0;
    let expected = track.scrollLeft;
    const holdFor = (ms) => { holdUntil = performance.now() + ms; };
    track.addEventListener('scroll', () => {
      if (Math.abs(track.scrollLeft - expected) > 2 && holdUntil < performance.now() + 2500) holdFor(2500);
    }, { passive: true });

    /*
      A row you have put a finger on stops, and stays stopped until you have
      scrolled away from it. Resuming after a couple of seconds meant the video
      you had just pressed play on quietly slid off the side while you watched
      it — and on a phone a finger lands on these rows constantly, because they
      sit right in the path of scrolling down the page.
    */
    let touched = false;
    const holdRow = () => { touched = true; };
    track.addEventListener('touchstart', holdRow, { passive: true });
    track.addEventListener('touchmove', holdRow, { passive: true });

    /*
      Only the row you are looking at moves. Our Work opens dozens of these at
      once, and a frame loop per row, each writing scrollLeft and forcing a
      layout, is enough on its own to make a phone stutter and run out of room.
      Leaving a row also clears its hold, so it drifts again next time round.
    */
    let onScreen = true;
    const rowWatcher = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => {
          onScreen = entry.isIntersecting;
          if (!onScreen) { touched = false; return; }
          if (!frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
        }, { rootMargin: '20% 0px' })
      : null;

    const tick = (now) => {
      if (!track.isConnected) return;   // its modal closed, or the page changed
      if (!onScreen) { frame = 0; return; }
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      // Hovering the row (players included) or having pressed into one of its
      // players holds the drift, so a video never slides away mid-watch. Hover
      // only counts for a real mouse: a phone keeps :hover stuck on whatever
      // was last tapped, which would freeze the row for good.
      const watching = touched
        || (canHover && track.matches(':hover'))
        || (document.activeElement?.tagName === 'IFRAME' && track.contains(document.activeElement))
        || Boolean(track.querySelector('.media--video[data-engaged="true"]'));
      if (!paused && !watching && !track.dataset.dragging && now >= holdUntil) {
        carry += SPEED * dt;
        const whole = Math.floor(carry);
        if (whole) {
          carry -= whole;
          track.scrollLeft += whole * DIR;
          const width = loopWidth();
          // Wrap at whichever end the row is heading for.
          if (width) {
            if (DIR > 0 && track.scrollLeft >= width) track.scrollLeft -= width;
            else if (DIR < 0 && track.scrollLeft <= 0) track.scrollLeft += width;
          }
        }
      }
      expected = track.scrollLeft;
      frame = requestAnimationFrame(tick);
    };
    if (rowWatcher) rowWatcher.observe(root);
    else frame = requestAnimationFrame(tick);

    const pause = () => { paused = true; };
    const resume = () => {
      last = performance.now();
      paused = false;
      if (onScreen && !frame) frame = requestAnimationFrame(tick);
    };

    // Stop while someone is reading, interacting, or the tab is hidden.
    track.addEventListener('pointerenter', pause);
    track.addEventListener('pointerleave', resume);
    track.addEventListener('pointerdown', pause);
    track.addEventListener('focusin', pause);
    track.addEventListener('focusout', resume);
    const onVisibility = () => (document.hidden ? pause() : resume());
    document.addEventListener('visibilitychange', onVisibility);

    registerCleanup(() => {
      cancelAnimationFrame(frame);
      rowWatcher?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    });
  }

  /*
    Mouse drag. Touch is left to the browser's own momentum scrolling.
    The press is followed on the window, so a quick flick that leaves the row
    still drags it. Capture is only taken once it's clearly a drag: capturing on
    press makes Chrome retarget the click to the row, so play buttons and
    "See more" would never receive it.
  */
  let press = null;

  const onPointerMove = (event) => {
    if (!press || event.pointerId !== press.id) return;
    const delta = event.clientX - press.x;
    if (!track.dataset.dragging) {
      if (Math.abs(delta) < 4) return;        // still a click, not a drag
      track.dataset.dragging = 'true';
      try { track.setPointerCapture(press.id); } catch { /* pointer already released */ }
    }
    track.scrollLeft = press.scroll - delta;
  };

  const endDrag = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    if (!press) return;
    press = null;
    // Deferred, so the click that ends a drag is swallowed rather than followed.
    requestAnimationFrame(() => { delete track.dataset.dragging; });
  };

  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' || event.button !== 0) return;
    press = { id: event.pointerId, x: event.clientX, scroll: track.scrollLeft };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  });
  registerCleanup(endDrag);

  window.addEventListener('resize', updateEnd);
  registerCleanup(() => window.removeEventListener('resize', updateEnd));
}

/**
 * Full-screen navigation panel (R3). One item per line, large and legible, with
 * a gold bar marking the current page. Focus is trapped while it is open, and
 * Escape or the close button dismisses it.
 */
function openNavMenu() {
  const path = window.location.pathname;
  const toggle = $('[data-nav-toggle]');

  const menu = document.createElement('div');
  menu.className = 'nav-menu';
  menu.setAttribute('data-lenis-prevent', '');
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-modal', 'true');
  menu.setAttribute('aria-label', 'Site menu');

  menu.innerHTML = `
    <div class="nav-menu-top">
      <span class="brand" data-brand>${brandInner()}</span>
      <button type="button" class="icon-btn" data-menu-close aria-label="Close menu">${icon('close')}</button>
    </div>

    <nav aria-label="Primary">
      <ul class="nav-menu-links">
        ${MENU_ITEMS.map((item) => `
          <li>
            <a href="${item.href}"${item.href === path ? ' aria-current="page"' : ''}>
              ${item.glyph ? icon(item.glyph) : ''}<span data-copy="nav.${copyKey(item.label)}">${esc(item.label)}</span>
            </a>
          </li>`).join('')}
      </ul>
    </nav>

    <div class="nav-menu-foot">
      <span class="micro">Appearance</span>
      ${themeToggleButton()}
    </div>
    <div class="nav-menu-login">${loginLink('btn btn--gold nav-menu-login-btn')}</div>`;

  applyCopy(menu);

  const focusables = () =>
    $$('a[href], button:not([disabled])', menu).filter((node) => node.offsetParent !== null);

  function onKey(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = focusables();
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function close() {
    menu.remove();
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    resumeScrolling();
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.focus();
  }

  menu.addEventListener('click', (event) => {
    // The theme toggle stays open so the change can be seen behind the panel.
    if (event.target.closest('[data-theme-toggle]')) {
      toggleTheme();
      syncThemeToggles();
      return;
    }
    if (event.target.closest('a') || event.target.closest('[data-menu-close]')) close();
  });

  document.addEventListener('keydown', onKey);
  document.body.append(menu);
  document.body.style.overflow = 'hidden';
  pauseScrolling();
  toggle?.setAttribute('aria-expanded', 'true');
  $('[data-menu-close]', menu).focus();
}

/** Keep every toggle's accessible label in step with the active theme. */
function syncThemeToggles() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  $$('[data-theme-toggle]').forEach((button) => {
    button.setAttribute('aria-label', `Switch to ${next} mode`);
  });
}

/* ========================================================= Edit mode ===== */

/*
  Everything below only ever runs behind a valid httpOnly session cookie. The
  edit affordances are not merely hidden for logged-out visitors — they are
  never rendered, and every write is re-authorised server-side.
*/

function setAuthed(authed) {
  state.authed = authed;
  document.body.dataset.edit = String(authed);
  if (!authed) {
    state.copyEditing = false;
    document.body.dataset.copyEditing = 'false';
    finishCopyEdit({ save: false });
  }
  renderEditBar();
}

function renderEditBar() {
  $('.edit-bar')?.remove();
  if (!state.authed) return;

  const bar = document.createElement('div');
  bar.className = 'edit-bar';
  bar.innerHTML = `
    <span>Edit mode</span>
    <button type="button" class="btn btn--sm edit-text-toggle" data-copy-toggle
            aria-pressed="${state.copyEditing}">${icon('pencil')}<span>Edit text</span></button>
    <button type="button" class="icon-btn" data-logout aria-label="Log out of edit mode">${icon('logout')}</button>`;
  bar.querySelector('[data-copy-toggle]').addEventListener('click', (event) => {
    setCopyEditing(!state.copyEditing);
    event.currentTarget.setAttribute('aria-pressed', String(state.copyEditing));
  });
  bar.querySelector('[data-logout]').addEventListener('click', async () => {
    await api.del('/api/auth');
    setAuthed(false);
    toast('Logged out of edit mode.');
    renderRoute(window.location.pathname, { restoreScroll: true });
  });
  document.body.append(bar);
}

function onWebDevClick() {
  if (state.authed) {
    toast('Already in edit mode — look for the edit chips.');
    return;
  }
  openPasswordPrompt();
}

function openPasswordPrompt() {
  openModal({
    title: 'Web dev edit',
    subtitle: 'Enter the admin password to unlock editing.',
    body: `
      <form class="editor-form" id="pw-form">
        <div class="field">
          <label for="pw">Password</label>
          <input id="pw" name="password" type="password" autocomplete="current-password" required>
        </div>
        <p class="form-status" role="status" aria-live="polite"></p>
        <div class="editor-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="submit" class="btn btn--gold">Unlock</button>
        </div>
      </form>`,
    onMount(host, close) {
      const form = $('#pw-form', host);
      const status = $('.form-status', form);
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.dataset.state = '';
        status.textContent = 'Checking…';
        try {
          await api.post('/api/auth', { password: form.password.value });
          close();
          setAuthed(true);
          toast('Edit mode unlocked.');
          renderRoute(window.location.pathname, { restoreScroll: true });
        } catch (error) {
          status.dataset.state = 'error';
          status.textContent = error.message;
        }
      });
    },
  });
}

/* ------------------------------------------------------- Text editing --- */

/*
  "Edit text" mode. Every [data-copy] element becomes clickable: the click edits
  it in place instead of doing what it normally does (following a link, opening
  a panel). Enter saves, Shift+Enter adds a line break, Escape cancels, and Reset
  removes the override so the original wording returns.
*/
let activeCopyEdit = null;

function setCopyEditing(on) {
  state.copyEditing = Boolean(on && state.authed);
  document.body.dataset.copyEditing = String(state.copyEditing);
  if (!state.copyEditing) finishCopyEdit({ save: false });
  toast(state.copyEditing
    ? 'Text editing on — click any heading, line or label to change it.'
    : 'Text editing off.');
}

// Capture phase, so it runs before every other click handler on the page.
document.addEventListener('click', (event) => {
  if (!state.copyEditing) return;
  if (event.target.closest('.copy-toolbar, .edit-bar, .modal-backdrop, .toast-region')) return;
  const node = event.target.closest('[data-copy]');
  if (!node) return;
  event.preventDefault();
  event.stopPropagation();
  if (activeCopyEdit?.node !== node) startCopyEdit(node);
}, true);

/**
 * The text as a person sees it: source indentation collapsed the way HTML
 * renders it, <br> kept as a real line break. (innerText is unusable here — it
 * applies text-transform, so an uppercase nav label would be saved in capitals.)
 */
function readEditableText(node) {
  const clone = node.cloneNode(true);
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    text.nodeValue = text.nodeValue.replace(/\s+/g, ' ');
  }
  clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  clone.querySelectorAll('div, p').forEach((block) => block.prepend('\n'));
  return clone.textContent
    .split('\n').map((line) => line.trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function positionCopyToolbar(toolbar, node) {
  const rect = node.getBoundingClientRect();
  const below = rect.bottom + 10;
  const top = below + toolbar.offsetHeight > window.innerHeight - 8
    ? Math.max(8, rect.top - toolbar.offsetHeight - 10)
    : below;
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - toolbar.offsetWidth - 8);
  toolbar.style.top = `${Math.round(top)}px`;
  toolbar.style.left = `${Math.round(left)}px`;
}

function startCopyEdit(node) {
  finishCopyEdit({ save: false });
  const key = node.dataset.copy;
  const original = node.innerHTML;

  node.classList.add('copy-editing');
  // plaintext-only keeps pasted formatting out; fall back where it's unsupported.
  node.setAttribute('contenteditable', 'plaintext-only');
  if (node.contentEditable !== 'plaintext-only') node.setAttribute('contenteditable', 'true');
  node.setAttribute('spellcheck', 'true');
  node.focus();
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  const toolbar = document.createElement('div');
  toolbar.className = 'copy-toolbar';
  toolbar.innerHTML = `
    <span class="copy-toolbar-key" title="${esc(key)}">${esc(key)}</span>
    <button type="button" class="btn btn--sm" data-copy-cancel>Cancel</button>
    <button type="button" class="btn btn--sm" data-copy-reset ${state.copy?.[key] ? '' : 'disabled'}
            title="Go back to the original wording">Reset</button>
    <button type="button" class="btn btn--sm btn--gold" data-copy-save>Save</button>`;
  document.body.append(toolbar);
  positionCopyToolbar(toolbar, node);

  const onKey = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      finishCopyEdit({ save: false });
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      finishCopyEdit({ save: true });
    }
  };
  const onPaste = (event) => {
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') ?? '');
  };
  const reposition = () => positionCopyToolbar(toolbar, node);

  node.addEventListener('keydown', onKey);
  node.addEventListener('paste', onPaste);
  window.addEventListener('scroll', reposition, { passive: true });
  window.addEventListener('resize', reposition);
  toolbar.querySelector('[data-copy-cancel]').addEventListener('click', () => finishCopyEdit({ save: false }));
  toolbar.querySelector('[data-copy-save]').addEventListener('click', () => finishCopyEdit({ save: true }));
  toolbar.querySelector('[data-copy-reset]').addEventListener('click', () => resetCopy(key));

  activeCopyEdit = {
    node,
    key,
    original,
    teardown() {
      node.removeEventListener('keydown', onKey);
      node.removeEventListener('paste', onPaste);
      window.removeEventListener('scroll', reposition);
      window.removeEventListener('resize', reposition);
      node.removeAttribute('contenteditable');
      node.removeAttribute('spellcheck');
      node.classList.remove('copy-editing');
      toolbar.remove();
    },
  };
}

async function finishCopyEdit({ save }) {
  const edit = activeCopyEdit;
  if (!edit) return;
  activeCopyEdit = null;
  const text = readEditableText(edit.node);
  edit.teardown();

  if (!save) {
    edit.node.innerHTML = edit.original;
    return;
  }
  if (!text) {
    edit.node.innerHTML = edit.original;
    toast('Text can’t be empty — use Reset to go back to the original.', 'error');
    return;
  }
  try {
    const { copy } = await api.put('/api/copy', { copy: { [edit.key]: text } });
    state.copy = copy;
    applyCopy();                 // every instance of the key, e.g. each "See more"
    toast('Text saved.');
  } catch (error) {
    edit.node.innerHTML = edit.original;
    toast(error.message, 'error');
  }
}

async function resetCopy(key) {
  finishCopyEdit({ save: false });
  try {
    const { copy } = await api.put('/api/copy', { copy: { [key]: null } });
    state.copy = copy;
    toast('Back to the original text.');
    // The original wording lives in the page markup, so re-render to restore it.
    await renderRoute(window.location.pathname, { restoreScroll: true });
  } catch (error) {
    toast(error.message, 'error');
  }
}

/* ------------------------------------------------------- Client sync --- */

/**
 * Shows what data/seed.json has that the live client list doesn't — new clients
 * and category moves — and applies only what's ticked. Needed because once the
 * list has been edited in production, seed changes never appear on their own.
 */
async function openClientSync() {
  let plan;
  try {
    plan = await api.get('/api/sync-clients');
  } catch (error) {
    toast(error.message, 'error');
    return;
  }
  const { add, move } = plan;
  if (!add.length && !move.length) {
    toast('Clients are already up to date with the spreadsheet list.');
    return;
  }

  const row = (kind, item, html) => `
    <li>
      <label style="display:flex;align-items:center;gap:0.75rem;cursor:pointer">
        <input type="checkbox" name="${kind}" value="${esc(item.id)}" checked
               style="width:20px;height:20px;min-height:20px">
        <span>${html}</span>
      </label>
    </li>`;
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  openModal({
    title: 'Sync clients',
    subtitle: 'From the client spreadsheet, not yet on the live site. Nothing is deleted, and videos, taglines and flags are never touched.',
    body: `
      <form class="editor-form" id="sync-form">
        ${add.length ? `
          <p class="micro">Add ${plural(add.length, 'new client')}</p>
          <ul class="admin-list">${add.map((item) =>
            row('add', item, `<strong>${esc(item.name)}</strong> <span class="tiny">→ ${esc(item.category)}</span>`)).join('')}</ul>` : ''}
        ${move.length ? `
          <p class="micro">Move ${plural(move.length, 'client')} to a new category</p>
          <ul class="admin-list">${move.map((item) =>
            row('move', item, `<strong>${esc(item.name)}</strong> <span class="tiny">${esc(item.from)} → ${esc(item.to)}</span>`)).join('')}</ul>` : ''}
        <p class="form-status" role="status" aria-live="polite"></p>
        <div class="editor-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="submit" class="btn btn--gold">Apply selected</button>
        </div>
      </form>`,
    onMount(host) {
      const form = $('#sync-form', host);
      const status = $('.form-status', form);
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const picked = (name) => $$(`input[name="${name}"]:checked`, form).map((input) => input.value);
        status.dataset.state = '';
        status.textContent = 'Applying…';
        try {
          const result = await api.post('/api/sync-clients', { add: picked('add'), move: picked('move') });
          state.clients = result.items;
          closeModal();
          toast(`Synced — ${result.added} added, ${result.moved} moved.`);
          await renderRoute(window.location.pathname, { restoreScroll: true });
        } catch (error) {
          status.dataset.state = 'error';
          status.textContent = error.message;
        }
      });
    },
  });
}

/* ---------------------------------------------------- Field definitions --- */

/*
  A tiny schema-driven form builder. `rows` is the repeating one — videos,
  results, gallery entries — and it renders a real list: a card per entry with a
  box per column, an Add button under it, and buttons on each card to move it up
  or down or throw it away. It used to be a single textarea of lines separated
  by | characters, which meant typing punctuation in the right places to add one
  video.
*/

/** One card in a `rows` field. Also used when the Add button makes a new one. */
function rowHtml(field, row = {}) {
  const cell = (column) => {
    /*
      A saved row is normally an object keyed by column. A one-column list is
      allowed to be stored as plain text instead — "Also in" keeps a readable
      list of names rather than a list of objects wrapping one name each.
    */
    const value = (typeof row === 'string'
      ? (field.columns.length === 1 ? row : '')
      : row?.[column.key]) ?? '';
    if (column.options) {
      // Read now, not when the field was declared: a list of industries has to
      // reflect what exists at the moment the editor is opened.
      const choices = typeof column.options === 'function' ? column.options() : column.options;
      // An option that isn't in the list any more still has to be shown, or
      // saving an untouched row would quietly change it.
      const options = choices.includes(String(value)) || !value
        ? choices
        : [...choices, String(value)];
      return `<span class="field--select rows-select">
                <select data-key="${esc(column.key)}">
                  ${options.map((option) =>
                    `<option value="${esc(option)}" ${String(value) === String(option) ? 'selected' : ''}>${esc(option)}</option>`).join('')}
                </select>${icon('chevronDown')}
              </span>`;
    }
    return `<input type="${esc(column.type === 'number' ? 'number' : 'text')}" data-key="${esc(column.key)}"
                   value="${esc(value)}" ${column.placeholder ? `placeholder="${esc(column.placeholder)}"` : ''}>`;
  };

  return `
    <div class="rows-row">
      <div class="rows-cells">
        ${field.columns.map((column) => `
          <label class="rows-cell${column.narrow ? ' rows-cell--narrow' : ''}">
            <span class="tiny">${esc(column.label)}</span>
            ${cell(column)}
          </label>`).join('')}
      </div>
      <div class="rows-tools">
        <button type="button" class="icon-btn" data-row-move="-1" aria-label="Move up">${icon('chevronDown')}</button>
        <button type="button" class="icon-btn" data-row-move="1" aria-label="Move down">${icon('chevronDown')}</button>
        <button type="button" class="icon-btn" data-row-del aria-label="Remove">${icon('trash')}</button>
      </div>
    </div>`;
}

function fieldHtml(field, value) {
  const id = `f-${field.name.replace(/\W/g, '-')}`;
  const label = `<label for="${id}">${esc(field.label)}</label>`;
  const hint = field.hint ? `<p class="tiny" style="margin:0">${esc(field.hint)}</p>` : '';

  switch (field.type) {
    case 'textarea':
      return `<div class="field">${label}<textarea id="${id}" name="${esc(field.name)}">${esc(value ?? '')}</textarea>${hint}</div>`;

    case 'checkbox':
      return `<div class="field" style="grid-auto-flow:column;justify-content:start;align-items:center;gap:0.75rem">
                <input id="${id}" name="${esc(field.name)}" type="checkbox" ${value ? 'checked' : ''}
                       style="width:20px;min-height:20px;height:20px">
                ${label}
              </div>`;

    case 'select': {
      // The list may be a function, so it can be read when the editor opens
      // rather than when the field was declared — industries change as clients
      // are added. A stored value that is no longer offered is kept in the
      // list, or opening and saving a record would quietly change it.
      const choices = typeof field.options === 'function' ? field.options() : field.options;
      const options = !value || choices.includes(String(value)) ? choices : [...choices, String(value)];
      return `<div class="field">${label}
                <span class="field--select rows-select">
                  <select id="${id}" name="${esc(field.name)}">
                    ${options.map((option) =>
                      `<option value="${esc(option)}" ${option === value ? 'selected' : ''}>${esc(option)}</option>`).join('')}
                  </select>${icon('chevronDown')}
                </span>${hint}
              </div>`;
    }

    case 'lines': {
      const text = Array.isArray(value) ? value.join('\n') : '';
      return `<div class="field">${label}<textarea id="${id}" name="${esc(field.name)}">${esc(text)}</textarea>
                <p class="tiny" style="margin:0">${esc(field.hint || 'One per line.')}</p></div>`;
    }

    case 'rows': {
      const list = Array.isArray(value) ? value : [];
      return `<div class="field field--rows">${label}
                <div class="rows" data-rows="${esc(field.name)}">${list.map((row) => rowHtml(field, row)).join('')}</div>
                <p class="rows-empty tiny">Nothing here yet.</p>
                <div><button type="button" class="btn btn--sm" data-row-add="${esc(field.name)}">
                  ${icon('plus')}${esc(field.addLabel || 'Add another')}</button></div>
                ${hint}</div>`;
    }

    default:
      return `<div class="field">${label}
                <input id="${id}" name="${esc(field.name)}" type="${esc(field.type === 'number' ? 'number' : 'text')}"
                       value="${esc(value ?? '')}" ${field.placeholder ? `placeholder="${esc(field.placeholder)}"` : ''}>
                ${hint}</div>`;
  }
}

/** Pull a typed value back out of the form for one field. */
function fieldValue(form, field) {
  /*
    A rows field is a list of cards rather than one named input, so it is read
    from the cards themselves. A card left completely blank — Add pressed and
    then thought better of — is dropped rather than saved as an empty entry.
  */
  if (field.type === 'rows') {
    const host = $(`[data-rows="${CSS.escape(field.name)}"]`, form);
    if (!host) return undefined;
    return $$('.rows-row', host)
      .map((row) => Object.fromEntries(field.columns.map((column) =>
        [column.key, $(`[data-key="${CSS.escape(column.key)}"]`, row)?.value.trim() ?? ''])))
      /*
        A row the user added and left empty is dropped. "Empty" is judged on the
        columns they have to type into, because a dropdown always holds
        something — so for a list that is nothing but dropdowns, every row
        counts, which is how "Also in" keeps its entries.
      */
      .filter((row) => {
        const typed = field.columns.filter((column) => !column.options);
        return (typed.length ? typed : field.columns).some((column) => row[column.key]);
      });
  }

  const input = form.elements[field.name];
  if (!input) return undefined;

  switch (field.type) {
    case 'checkbox':
      return input.checked;

    case 'number': {
      const num = Number(input.value);
      return Number.isFinite(num) ? num : undefined;
    }

    case 'lines':
      return input.value.split('\n').map((line) => line.trim()).filter(Boolean);

    default:
      return input.value.trim();
  }
}

const buildForm = (fields, record) =>
  `<div class="editor-grid">${fields.map((field) =>
    fieldHtml(field, getPath(record ?? {}, field.name))).join('')}</div>`;

/**
 * Wires up the Add / move / remove buttons on every rows field in a form.
 * Called after the form's markup is in the page.
 */
function mountForm(form, fields) {
  fields.filter((field) => field.type === 'rows').forEach((field) => {
    const host = $(`[data-rows="${CSS.escape(field.name)}"]`, form);
    if (!host) return;
    const wrap = host.closest('.field');
    const sync = () => { wrap.dataset.empty = String(!host.children.length); };

    $(`[data-row-add="${CSS.escape(field.name)}"]`, form)?.addEventListener('click', () => {
      host.insertAdjacentHTML('beforeend', rowHtml(field));
      sync();
      // Straight into the first box of the new card, ready to paste.
      host.lastElementChild?.querySelector('input, select')?.focus();
    });

    host.addEventListener('click', (event) => {
      const row = event.target.closest('.rows-row');
      if (!row) return;

      if (event.target.closest('[data-row-del]')) {
        row.remove();
        sync();
        return;
      }

      const move = event.target.closest('[data-row-move]');
      if (!move) return;
      const up = Number(move.dataset.rowMove) < 0;
      const sibling = up ? row.previousElementSibling : row.nextElementSibling;
      if (!sibling) return;
      if (up) sibling.before(row);
      else sibling.after(row);
      move.focus();
    });

    sync();
  });
}

const readForm = (form, fields) =>
  fields.reduce((acc, field) => {
    const value = fieldValue(form, field);
    if (value !== undefined) setPath(acc, field.name, value);
    return acc;
  }, {});

/* ------------------------------------------------- Collection manager ---- */

/** Generic add/edit/delete UI for any array-shaped collection. */
function openCollectionManager({ title, endpoint, cacheKey, fields, label, subtitle }) {
  const items = state[cacheKey] ?? [];

  const rows = items.length
    ? `<ul class="admin-list">${items.map((item) => `
        <li>
          <div class="admin-row-head">
            <strong>${esc(label(item))}</strong>
            <span style="display:flex;gap:0.4rem">
              <button type="button" class="icon-btn" data-edit-item="${esc(item.id)}"
                      aria-label="Edit ${esc(label(item))}">${icon('pencil')}</button>
              <button type="button" class="icon-btn" data-del-item="${esc(item.id)}"
                      aria-label="Delete ${esc(label(item))}">${icon('trash')}</button>
            </span>
          </div>
        </li>`).join('')}</ul>`
    : `<p class="tiny">Nothing here yet.</p>`;

  openModal({
    title,
    subtitle,
    body: `
      <div class="stack-2">
        ${rows}
        <div class="editor-actions">
          <button type="button" class="btn btn--gold" data-add>${icon('plus')} Add new</button>
        </div>
      </div>`,
    onMount(host) {
      const refresh = async () => {
        invalidate(cacheKey);
        await load(cacheKey);
        closeModal();
        await renderRoute(window.location.pathname, { restoreScroll: true });
        openCollectionManager({ title, endpoint, cacheKey, fields, label, subtitle });
      };

      $('[data-add]', host).addEventListener('click', () =>
        openRecordEditor({ title: `New — ${title}`, fields, record: {}, endpoint, method: 'post', onDone: refresh }));

      $$('[data-edit-item]', host).forEach((button) => {
        button.addEventListener('click', () => {
          const record = items.find((item) => item.id === button.dataset.editItem);
          openRecordEditor({
            title: `Edit — ${label(record)}`,
            fields, record, endpoint, method: 'put', onDone: refresh,
          });
        });
      });

      $$('[data-del-item]', host).forEach((button) => {
        button.addEventListener('click', async () => {
          const record = items.find((item) => item.id === button.dataset.delItem);
          if (!window.confirm(`Delete "${label(record)}"? This cannot be undone.`)) return;
          try {
            await api.del(`${endpoint}?id=${encodeURIComponent(record.id)}`);
            toast('Deleted.');
            await refresh();
          } catch (error) {
            toast(error.message, 'error');
          }
        });
      });
    },
  });
}

function openRecordEditor({ title, fields, record, endpoint, method, onDone }) {
  openModal({
    title,
    body: `
      <form class="editor-form" id="record-form">
        ${buildForm(fields, record)}
        <p class="form-status" role="status" aria-live="polite"></p>
        <div class="editor-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="submit" class="btn btn--gold">Save</button>
        </div>
      </form>`,
    onMount(host) {
      const form = $('#record-form', host);
      const status = $('.form-status', form);
      mountForm(form, fields);

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.dataset.state = '';
        status.textContent = 'Saving…';
        const payload = { ...readForm(form, fields) };
        if (record?.id) payload.id = record.id;

        try {
          await api[method](endpoint, payload);
          toast('Saved.');
          await onDone();
        } catch (error) {
          status.dataset.state = 'error';
          status.textContent = error.message;
          toast(error.message, 'error');
        }
      });
    },
  });
}

/** Editor for a slice of the settings object. */
function openSettingsEditor({ title, subtitle, fields }) {
  openModal({
    title,
    subtitle,
    body: `
      <form class="editor-form" id="settings-form">
        ${buildForm(fields, state.settings ?? {})}
        <p class="form-status" role="status" aria-live="polite"></p>
        <div class="editor-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="submit" class="btn btn--gold">Save</button>
        </div>
      </form>`,
    onMount(host) {
      const form = $('#settings-form', host);
      const status = $('.form-status', form);
      mountForm(form, fields);

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.dataset.state = '';
        status.textContent = 'Saving…';
        try {
          const { settings } = await api.put('/api/settings', readForm(form, fields));
          state.settings = settings;
          closeModal();
          toast('Saved.');
          await renderRoute(window.location.pathname, { restoreScroll: true });
        } catch (error) {
          status.dataset.state = 'error';
          status.textContent = error.message;
          toast(error.message, 'error');
        }
      });
    },
  });
}

/* -------------------------------------------------------- Edit schemas --- */

/*
  Every image field takes the same thing, so the wording is written once. A
  Cloudinary URL is resized and re-encoded on delivery — see assetUrl — so
  there's nothing to prepare before pasting one in.
*/
const IMAGE_HINT = 'Paste a Cloudinary URL (or any image link). Cloudinary images are resized and compressed for the web automatically.';

/* The hero background takes either, so it says so rather than naming one. */
const BACKGROUND_HINT = 'Cloudinary videos and images are both re-encoded and sized for the web on the way to the page, so there is nothing to prepare first.';

const CLIENT_FIELDS = [
  { name: 'name', label: 'Client name', type: 'text' },
  {
    name: 'category', label: 'Industry', type: 'select', options: industryOptions,
    hint: 'Where this client mainly belongs on Our Work. To offer an industry that isn\'t '
      + 'in this list yet, add it under Industry order on Our Work and it appears here.',
  },
  {
    name: 'extraCategories', label: 'Also in', type: 'rows', addLabel: 'Add an industry',
    hint: 'Other industries this client belongs to. They are listed under every one of them, '
      + 'both here and in View all client work. The client count is unchanged.',
    // A list, not a fixed one: it is read when the editor opens, so an industry
    // added to another client today is offered here today.
    columns: [{ key: 'name', label: 'Industry', options: industryOptions }],
  },
  { name: 'tagline', label: 'Tagline', type: 'text' },
  { name: 'websiteUrl', label: 'Website URL', type: 'text' },
  { name: 'logoUrl', label: 'Logo URL', type: 'text', hint: IMAGE_HINT },
  { name: 'notes', label: 'Notes', type: 'text', hint: 'e.g. "Also event photography coverage".' },
  { name: 'order', label: 'Order', type: 'number' },
  { name: 'featured', label: 'Featured (selected reels)', type: 'checkbox' },
  { name: 'isRecentWin', label: 'Show in Recent Wins', type: 'checkbox' },
  { name: 'isCaseStudy', label: 'Show in Case studies', type: 'checkbox' },
  {
    name: 'selectedReel', label: 'Selected reel', type: 'text',
    hint: 'The reel shown for this client on Our Work — a Google Drive or Cloudinary video link, either one of their videos below or a separate upload. Leave blank to use their first video. It is left out of their carousel, so it never shows twice.',
  },
  {
    name: 'videos', label: 'Videos', type: 'rows', addLabel: 'Add a reel',
    columns: [
      { key: 'driveFileId', label: 'Video link', placeholder: 'Paste a Google Drive or Cloudinary link' },
      { key: 'title', label: 'Caption (optional)', placeholder: 'Shown under the reel' },
      { key: 'kind', label: 'Kind', options: ['reel', 'bts'], narrow: true },
    ],
  },
];

const WEBSITE_FIELDS = [
  { name: 'name', label: 'Site name', type: 'text' },
  { name: 'liveUrl', label: 'Live URL', type: 'text' },
  { name: 'screenshotUrl', label: 'Screenshot URL', type: 'text', hint: IMAGE_HINT },
  { name: 'tags', label: 'Tags', type: 'lines', hint: 'One tag per line.' },
  { name: 'order', label: 'Order', type: 'number' },
];

const PHOTO_FIELDS = [
  { name: 'name', label: 'Category name', type: 'text' },
  { name: 'coverPhotoUrl', label: 'Cover photo URL', type: 'text', hint: IMAGE_HINT },
  { name: 'photos', label: 'Photos', type: 'lines', hint: `One image URL per line. ${IMAGE_HINT}` },
  { name: 'order', label: 'Order', type: 'number' },
];

const BRANDING_FIELDS = [
  { name: 'clientName', label: 'Client name', type: 'text' },
  { name: 'type', label: 'Type', type: 'select', options: ['logo', 'carousel', 'edit'] },
  { name: 'mediaUrl', label: 'Media URL', type: 'text', hint: IMAGE_HINT },
  { name: 'order', label: 'Order', type: 'number' },
];

const JOB_FIELDS = [
  { name: 'title', label: 'Job title', type: 'text' },
  { name: 'department', label: 'Department', type: 'text' },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'type', label: 'Job type', type: 'select', options: ['Full-time', 'Part-time', 'Freelance', 'Internship'] },
  { name: 'workplaceType', label: 'Workplace', type: 'select', options: ['Remote', 'Hybrid', 'In-person'] },
  { name: 'experienceLevel', label: 'Experience level', type: 'select', options: ['Entry', 'Junior', 'Mid', 'Senior', 'Lead'] },
  { name: 'applyUrl', label: 'Apply URL', type: 'text', hint: 'Leave blank to use a mailto: link.' },
  { name: 'active', label: 'Active (visible on the site)', type: 'checkbox' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

/* --------------------------------------------------- Edit chip wiring ---- */

function mountEditHandlers() {
  const handlers = {
    hero: () => openSettingsEditor({
      title: 'Hero assets',
      subtitle: 'The background of the home page\'s first screen. It sits behind the hand and the '
        + 'gold, which stay on top as a faint overlay. Leave the backgrounds blank and the golden '
        + 'hero the site draws itself is used on its own.',
      fields: [
        {
          name: 'heroVideoDesktopUrl', label: 'Background — computer', type: 'text',
          hint: `A video or a still image: paste the link from Cloudinary's Copy URL, or any other web address. ${BACKGROUND_HINT}`,
        },
        {
          name: 'heroVideoMobileUrl', label: 'Background — phone', type: 'text',
          hint: 'The same again, cropped for a tall screen. Leave it blank to use the one above on phones too.',
        },
        {
          name: 'heroPosterUrl', label: 'Still image (shown while a video loads)', type: 'text',
          hint: `Leave this blank when the background is a Cloudinary video — its own first frame is used. ${IMAGE_HINT}`,
        },
        {
          name: 'heroOverlay', label: 'Golden overlay (0–100)', type: 'text',
          hint: 'How strongly the hand, the line of light and the gold glow show over your background. '
            + '0 is none at all, 100 is as strong as they go. Leave it blank for 30. Only used when a background is set.',
        },
      ],
    }),

    brand: () => openSettingsEditor({
      title: 'Logos & texture',
      subtitle: 'Leave the logos empty to use the built-in Advatar wordmark.',
      fields: [
        { name: 'logoLightUrl', label: 'Logo — light mode (dark artwork)', type: 'text', hint: IMAGE_HINT },
        { name: 'logoDarkUrl', label: 'Logo — dark mode (light artwork)', type: 'text', hint: IMAGE_HINT },
        {
          name: 'textureUrl', label: 'Background texture', type: 'text',
          hint: `A still from your work. It is blurred and dimmed behind every page. ${IMAGE_HINT}`,
        },
      ],
    }),

    results: () => openSettingsEditor({
      title: 'Results',
      fields: [{
        name: 'resultsStats', label: 'Results', type: 'rows', addLabel: 'Add a result',
        columns: [
          { key: 'label', label: 'Label', placeholder: 'e.g. Views in 90 days' },
          { key: 'value', label: 'Number', placeholder: 'e.g. 2.4M', narrow: true },
        ],
      }],
    }),

    about: () => openSettingsEditor({
      title: 'About stats',
      fields: [
        { name: 'aboutStats.founded', label: 'Founded', type: 'text' },
        { name: 'aboutStats.clientsCount', label: 'Clients', type: 'text' },
        { name: 'aboutStats.teamCount', label: 'Team members', type: 'text' },
      ],
    }),

    contact: () => openSettingsEditor({
      title: 'Contact details',
      fields: [
        {
          name: 'contact.whatsappNumber', label: 'WhatsApp number', type: 'text',
          hint: 'International format, digits only — e.g. 447314123456.',
        },
        { name: 'contact.email', label: 'Email', type: 'text' },
      ],
    }),

    gallery: () => openSettingsEditor({
      title: 'Hiring gallery',
      subtitle: IMAGE_HINT,
      fields: [{
        name: 'hiringGallery', label: 'Behind the scenes', type: 'rows', addLabel: 'Add a photo or video',
        columns: [
          { key: 'imageUrl', label: 'Image link', placeholder: 'Paste a Cloudinary or other image link' },
          { key: 'driveFileId', label: 'or a video link', placeholder: 'Google Drive or Cloudinary' },
          { key: 'caption', label: 'Caption (optional)' },
        ],
      }],
    }),

    clients: () => openCollectionManager({
      title: 'Clients', endpoint: '/api/clients', cacheKey: 'clients',
      fields: CLIENT_FIELDS, label: (item) => item.name || item.id,
      subtitle: 'Clients power Recent Wins, selected reels and the industry grouping.',
    }),

    websites: () => openCollectionManager({
      title: 'Websites', endpoint: '/api/websites', cacheKey: 'websites',
      fields: WEBSITE_FIELDS, label: (item) => item.name || item.id,
    }),

    photography: () => openCollectionManager({
      title: 'Photography', endpoint: '/api/photography', cacheKey: 'photography',
      fields: PHOTO_FIELDS, label: (item) => item.name || item.id,
    }),

    branding: () => openCollectionManager({
      title: 'Branding', endpoint: '/api/branding', cacheKey: 'branding',
      fields: BRANDING_FIELDS, label: (item) => item.clientName || item.type,
    }),

    jobs: () => openCollectionManager({
      title: 'Vacancies', endpoint: '/api/jobs', cacheKey: 'jobs',
      fields: JOB_FIELDS, label: (item) => item.title || item.id,
    }),

    'industry-order': () => openSettingsEditor({
      title: 'Industry order',
      subtitle: 'One industry per line, in the order they should appear on Our Work. '
        + 'Spell them exactly as they are spelled on the clients themselves. '
        + 'Leave this empty to use the built-in order.',
      fields: [{
        name: 'industryOrder', label: 'Industries', type: 'lines',
        hint: 'One per line. An industry listed here shows up even before any clients are in it.',
      }],
    }),

    'industry-reels': () => openSettingsEditor({
      title: 'Industry reels',
      subtitle: 'The row of videos at the top of an industry, in the order you list them. '
        + 'Leave an industry out and it shows one reel from each of its clients instead.',
      fields: [{
        name: 'industryReels', label: 'Reels', type: 'rows', addLabel: 'Add a reel',
        hint: 'Use the arrows on a reel to move it up or down the row it belongs to.',
        columns: [
          { key: 'industry', label: 'Industry', options: industryOptions(), narrow: true },
          { key: 'video', label: 'Video link', placeholder: 'Paste a Google Drive or Cloudinary link' },
          { key: 'caption', label: 'Caption (optional)' },
        ],
      }],
    }),

    'client-count': () => openSettingsEditor({
      title: 'The line above the client list',
      fields: [{
        name: 'workClientsLabel', label: 'Line', type: 'text',
        hint: 'e.g. "50+ clients." Leave it empty to show the real number of clients on the site.',
      }],
    }),

    'client-logos': () => openSettingsEditor({
      title: 'Client logos',
      subtitle: 'The logos that travel across the home page, in the section under the first screen. '
        + 'Leave this empty and the clients who already have a logo on file are used instead.',
      fields: [{
        name: 'clientLogos', label: 'Logos', type: 'rows', addLabel: 'Add a logo',
        hint: 'Any logo works — the page removes its background and redraws it in black for light mode and white for dark mode, all at the same size.',
        columns: [
          { key: 'image', label: 'Logo image', placeholder: 'Paste a Cloudinary or other image link' },
          { key: 'name', label: 'Who it belongs to', placeholder: 'Read aloud to anyone using a screen reader' },
        ],
      }],
    }),

    'client-order': openClientOrderEditor,

    'recent-wins': openRecentWinsEditor,
    submissions: openSubmissionsList,
    'sync-clients': openClientSync,

    'look-images': () => openSettingsEditor({
      title: 'Look Inside images',
      subtitle: 'Optional — add one only for the steps you want. Press Add an image, give the step number, then paste the link. It can be a picture, a Google Drive file (shared as "Anyone with the link"), or a Cloudinary MP4, which plays silently on a loop like a GIF. A step with no link just shows its text, and the second box takes a different version for dark mode.',
      fields: [{
        name: 'lookInsideImages', label: 'Step images', type: 'rows', addLabel: 'Add an image',
        columns: [
          { key: 'step', label: 'Step', type: 'number', narrow: true },
          { key: 'image', label: 'Image or video link', placeholder: 'A picture, a Google Drive file, or a Cloudinary MP4' },
          {
            key: 'imageDark',
            label: 'Dark mode version (optional)',
            placeholder: 'Leave empty to use the same one on both',
          },
          { key: 'caption', label: 'Caption (optional)' },
        ],
      }],
    }),
  };

  $$('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => handlers[button.dataset.edit]?.());
  });
}

/**
 * Order, notes and tags for every client, in one place — so the whole of Our
 * Work can be arranged without opening each client in turn.
 *
 *  - Order   the number a client is sorted by inside its industry, smallest
 *            first. Change the numbers to change the order.
 *  - Note    the line shown when that client's row is opened. Leave it empty
 *            and nothing is shown there at all — no placeholder.
 *  - Tag     the small outlined label beside the client's name. Empty means
 *            no label.
 */
/** The industries to choose from, plus any an existing reel is already filed under. */
function industryOptions() {
  const known = industriesOf(state.clients ?? []).map(([name]) => name);
  const used = (state.settings?.industryReels ?? []).map((row) => row.industry).filter(Boolean);
  const named = state.settings?.industryOrder ?? [];
  /*
    Everything that could reasonably be picked: the industries clients are in,
    the ones with reels, the ones named under Industry order, and the standard
    list. Industry order is how a brand-new industry gets into these menus,
    since both of them only offer what is already known.
  */
  return [...new Set([...named, ...known, ...used, ...CATEGORY_ORDER])]
    .map((name) => String(name ?? '').trim())
    .filter(Boolean);
}

function openClientOrderEditor() {
  const clients = state.clients ?? [];
  // One row each: Order is a single number per client, so a client listed
  // under two industries would otherwise be asked for twice and only the
  // second answer would be kept.
  const groups = industriesOf(clients, { primaryOnly: true });

  openModal({
    title: 'Order, notes & tags',
    subtitle: 'Smaller numbers come first. A note or a tag left empty simply isn\'t shown.',
    className: 'modal--wide',
    body: `
      <form class="editor-form" id="order-form">
        ${groups.map(([name, group]) => group.length ? `
          <div class="order-group">
            <h4 class="order-group-head">${esc(name)}</h4>
            <ul class="admin-list">
              ${group.map((client) => `
                <li class="order-row" data-id="${esc(client.id)}">
                  <strong class="order-row-name">${esc(client.name)}</strong>
                  <label class="order-cell order-cell--num">
                    <span class="tiny">Order</span>
                    <input type="number" data-field="order" value="${esc(client.order ?? 999)}">
                  </label>
                  <label class="order-cell">
                    <span class="tiny">Note</span>
                    <input type="text" data-field="tagline" value="${esc(client.tagline ?? '')}"
                           placeholder="Shown when the row is opened">
                  </label>
                  <label class="order-cell">
                    <span class="tiny">Tag</span>
                    <input type="text" data-field="notes" value="${esc(client.notes ?? '')}"
                           placeholder="Small label beside the name">
                  </label>
                </li>`).join('')}
            </ul>
          </div>` : '').join('')}
        <p class="form-status" role="status" aria-live="polite"></p>
        <div class="editor-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="submit" class="btn btn--gold">Save</button>
        </div>
      </form>`,
    onMount(host) {
      const form = $('#order-form', host);
      const status = $('.form-status', form);

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.dataset.state = '';
        status.textContent = 'Saving…';

        // The whole list goes back at once, each client carrying everything it
        // already had plus whatever was changed here.
        const edits = new Map($$('.order-row', form).map((row) => {
          const value = (field) => $(`[data-field="${field}"]`, row).value.trim();
          const order = Number(value('order'));
          return [row.dataset.id, {
            order: Number.isFinite(order) ? order : 999,
            tagline: value('tagline'),
            notes: value('notes'),
          }];
        }));
        const items = clients.map((client) => ({ ...client, ...(edits.get(client.id) ?? {}) }));

        try {
          await api.put('/api/clients', { items });
          invalidate('clients');
          await load('clients');
          closeModal();
          toast('Saved.');
          await renderRoute(window.location.pathname, { restoreScroll: true });
        } catch (error) {
          status.dataset.state = 'error';
          status.textContent = error.message;
          toast(error.message, 'error');
        }
      });
    },
  });
}

function openRecentWinsEditor() {
  const clients = state.clients ?? [];
  openModal({
    title: 'Recent wins',
    subtitle: 'Tick the clients to feature on the home page. Order follows the list.',
    body: `
      <form class="editor-form" id="wins-form">
        <ul class="admin-list">
          ${clients.map((client) => `
            <li>
              <label style="display:flex;align-items:center;gap:0.75rem;cursor:pointer">
                <input type="checkbox" name="win" value="${esc(client.id)}"
                       ${client.isRecentWin ? 'checked' : ''} style="width:20px;height:20px;min-height:20px">
                <span>${esc(client.name)}</span>
              </label>
            </li>`).join('')}
        </ul>
        <p class="form-status" role="status" aria-live="polite"></p>
        <div class="editor-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="submit" class="btn btn--gold">Save</button>
        </div>
      </form>`,
    onMount(host) {
      const form = $('#wins-form', host);
      const status = $('.form-status', form);
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.textContent = 'Saving…';
        const ids = $$('input[name="win"]:checked', form).map((input) => input.value);
        try {
          await api.put('/api/recent-wins', { ids });
          invalidate('clients');
          await load('clients');
          closeModal();
          toast('Recent wins updated.');
          await renderRoute(window.location.pathname, { restoreScroll: true });
        } catch (error) {
          status.dataset.state = 'error';
          status.textContent = error.message;
        }
      });
    },
  });
}

async function openSubmissionsList() {
  let items = [];
  try {
    ({ items } = await api.get('/api/contact'));
  } catch (error) {
    toast(error.message, 'error');
    return;
  }

  openModal({
    title: 'Messages',
    subtitle: `${items.length} submission${items.length === 1 ? '' : 's'}`,
    body: items.length
      ? `<ul class="admin-list">${items.map((item) => `
          <li>
            <div class="admin-row-head">
              <strong>${esc(item.name)}</strong>
              <span class="tiny">${esc(new Date(item.submittedAt).toLocaleString('en-GB'))}</span>
            </div>
            <a class="link-arrow" href="mailto:${esc(item.email)}">${icon('mail')}<span>${esc(item.email)}</span></a>
            <p class="admin-msg">${esc(item.message)}</p>
            <div><button type="button" class="btn btn--sm" data-del-msg="${esc(item.id)}">Delete</button></div>
          </li>`).join('')}</ul>`
      : `<p class="tiny">No messages yet.</p>`,
    onMount(host) {
      $$('[data-del-msg]', host).forEach((button) => {
        button.addEventListener('click', async () => {
          if (!window.confirm('Delete this message?')) return;
          try {
            await api.del(`/api/contact?id=${encodeURIComponent(button.dataset.delMsg)}`);
            toast('Deleted.');
            closeModal();
            openSubmissionsList();
          } catch (error) {
            toast(error.message, 'error');
          }
        });
      });
    },
  });
}

/* ================================================= Scrolling and cursor === */

/*
  Two things live here, ported from the Edgware Youth site so the two scroll
  and point the same way:

    Lenis   — smooth scrolling: the wheel eases the page instead of jumping it
    Cursor  — a small circle that follows the pointer, gold, which swaps to the
              page's background colour whenever it's over something too close
              to gold to stand out against

  Both are for a computer with a mouse only. On a phone or tablet they never
  start: the phone's own momentum scrolling is better than anything we'd add,
  and there's no pointer to follow. They also stay off for anyone who has
  asked their device to reduce motion. `prefersReducedMotion()` is checked live,
  because the setting can change without a reload.
*/

/** True on a phone or tablet: no hover, and a finger rather than a pointer. */
const isTouchDevice = () =>
  window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches;

/** The one gate both behaviours go through. */
const motionAllowed = () => !prefersReducedMotion() && !isTouchDevice();

/* ------------------------------------------------------------ Lenis ------ */

/*
  Lenis catches the mouse wheel and eases the page to where the wheel was
  sending it, which is what gives the scroll its weight. It moves the real
  scroll position, so everything that listens for scrolling — the nav, the
  hero parallax, the reveals — carries on working untouched.

  The library (vendor/lenis.min.js, 18 KB) is only downloaded when it will be
  used. If it fails to load, the page simply scrolls the ordinary way.

  Things that scroll on their own are marked so Lenis leaves them be:
    data-lenis-prevent             dialogs and the menu, which scroll inside
    data-lenis-prevent-horizontal  carousels: a sideways swipe stays theirs,
                                   while an up-and-down one still moves the page
*/
let lenis = null;

function loadScript(src) {
  return new Promise((resolve) => {
    const tag = document.createElement('script');
    tag.src = src;
    tag.onload = resolve;
    tag.onerror = () => {
      console.warn(`[motion] ${src} did not load — the page scrolls normally instead.`);
      resolve();
    };
    document.head.append(tag);
  });
}

async function mountLenis() {
  if (lenis || !motionAllowed()) return;
  if (!window.Lenis) await loadScript('/vendor/lenis.min.js');
  if (lenis || !window.Lenis || !motionAllowed()) return;
  lenis = new window.Lenis({ autoRaf: true });   // the defaults, same as Edgware Youth
  // A dialog or the menu may already be open: the page behind stays put.
  if (document.querySelector('.modal-backdrop, .nav-menu')) lenis.stop();
}

function destroyLenis() {
  lenis?.destroy();
  lenis = null;
}

/*
  While a dialog or the menu is open the page behind it must not move. Setting
  overflow: hidden (which the dialogs do) doesn't stop Lenis — it moves the
  page itself — so it is paused as well, and resumed on close.
*/
const pauseScrolling = () => lenis?.stop();
const resumeScrolling = () => lenis?.start();

/**
 * Scroll to a position or an element. Goes through Lenis when it's running —
 * a plain window.scrollTo mid-glide would be pulled straight back to where
 * Lenis was heading.
 */
function scrollToTarget(target, { immediate = false, offset = 0 } = {}) {
  if (lenis) {
    lenis.scrollTo(target, { immediate, offset });
    return;
  }
  const behavior = immediate || prefersReducedMotion() ? 'auto' : 'smooth';
  if (typeof target === 'number') { window.scrollTo({ top: target + offset, behavior }); return; }
  if (!target) return;
  // Without Lenis there is no offset option, so work the position out directly —
  // the nav sits over the top of the page and would otherwise cover the target.
  if (offset) window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top + offset, behavior });
  else target.scrollIntoView({ behavior });
}

/* ----------------------------------------------------------- Cursor ------ */

/*
  A 16px circle that chases the pointer, replacing the arrow — the same one
  as Edgware Youth. Each frame it travels 15% of the remaining distance to the
  mouse, which gives the slight lag that makes it feel like an object rather
  than a sprite stuck to the pointer (--cursor-lerp in styles.css). Over
  anything you can click it grows (--cursor-grow).

  ITS COLOUR. It is one of the site's two colours: gold, or the page's own
  background colour (near-black in dark mode, cream in light). It is gold
  unless gold wouldn't stand out against what's underneath — a gold button,
  the glowing hand in the hero, the light half of the intro film — and then
  it swaps to the background colour. Edgware Youth marks its one dark band by
  hand; this site has gold in too many places for that, so the circle works
  out the colour under itself:

    - it looks at every layer under the pointer, top to bottom, and blends
      their backgrounds together the way the browser paints them (a
      see-through glass card lets the page show through, a gold button
      doesn't)
    - where a layer is a picture or video it can read — the intro film, the
      hero's glowing hand — it reads the actual pixel under the pointer
    - where the layer is a CSS gradient (the hero's shaft of light and orange
      bloom), it works out the gradient's colour at that exact point
    - then it compares that colour with gold. If gold would be too close to
      it (a contrast ratio under 3), the other colour is used, provided that
      one does stand out better.

  Pictures from other sites (the Google Drive and Cloudinary posters) can't be
  read — the browser forbids it — so over those it stays gold, which shows up
  well over photos anyway.

  Anything can force a colour with data-cursor="gold" or data-cursor="alt".
  A picture or video that sits behind the page's content, where the pointer
  can't reach it, is read when marked data-cursor-sample (the hero hand is).
*/
let cursorTeardown = null;

/** "rgb(…)", "rgba(…)" or "color(srgb …)" → [r, g, b, alpha]. */
function parseColour(text) {
  const alpha = (value) => (value == null ? 1 : value.endsWith('%') ? parseFloat(value) / 100 : parseFloat(value));
  let match = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/i.exec(text);
  if (match) return [+match[1], +match[2], +match[3], alpha(match[4])];
  match = /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/i.exec(text);
  if (match) return [match[1] * 255, match[2] * 255, match[3] * 255, alpha(match[4])];
  return null;
}

const hexColour = (hex) => {
  const value = String(hex).trim().replace('#', '');
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

/** WCAG relative luminance and contrast ratio — the same maths as the contrast checks in the README. */
function luminance([r, g, b]) {
  const lin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Paint `top` (with its alpha) over `under`, as the browser would. */
const over = (under, top) => under.map((c, i) => (i < 3 ? c + (top[i] - c) * top[3] : 1));

/** Screen blend at an opacity — how the hero's glowing hand is composited. */
const screen = (under, top, opacity) => under.map((c, i) => {
  if (i > 2) return 1;
  const blended = 255 - ((255 - c) * (255 - top[i])) / 255;
  return c + (blended - c) * opacity;
});

/** Paint `top` over `under` where BOTH may be see-through (within one element's layers). */
function overAlpha(under, top) {
  const a = top[3] + under[3] * (1 - top[3]);
  if (a <= 0) return [0, 0, 0, 0];
  const mix = (i) => (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a;
  return [mix(0), mix(1), mix(2), a];
}

/** Split "a, b(c, d), e" at the top-level commas only. */
function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') depth -= 1;
    else if (text[i] === ',' && depth === 0) { parts.push(text.slice(from, i).trim()); from = i + 1; }
  }
  parts.push(text.slice(from).trim());
  return parts.filter(Boolean);
}

/*
  CSS GRADIENTS, WORKED OUT AT A POINT.

  The hero's glow — the shaft of light and the orange bloom — is painted by
  stacked CSS gradients rather than a picture, so there is nothing to "read".
  But a gradient is just a rule: at any point, its colour follows from the
  stops. These few functions apply that rule the same way the browser does
  (linear and radial gradients, percentage and pixel stops, blending
  see-through stops the way CSS does), which tells the cursor exactly what
  colour the glow is under it. Anything unusual it can't follow falls back to
  the average of the gradient's colours.
*/
function gradientStops(args, length) {
  const stops = [];
  for (const part of args) {
    const colourText = /^(rgba?\([^)]*\)|color\(srgb[^)]*\))/i.exec(part)?.[1];
    const colour = colourText && parseColour(colourText);
    if (!colour) return null;
    const positions = [...part.slice(colourText.length).matchAll(/(-?[\d.]+)(%|px)/g)]
      .map(([, value, unit]) => (unit === '%' ? value / 100 : value / length));
    if (!positions.length) stops.push({ colour, at: null });
    positions.forEach((at) => stops.push({ colour, at }));
  }
  if (stops.length < 2) return null;
  // Missing positions: first 0, last 1, the rest spread evenly between known ones.
  if (stops[0].at == null) stops[0].at = 0;
  if (stops[stops.length - 1].at == null) stops[stops.length - 1].at = 1;
  for (let i = 1; i < stops.length; i += 1) {
    if (stops[i].at != null) continue;
    let j = i;
    while (stops[j].at == null) j += 1;
    const from = stops[i - 1].at;
    const step = (stops[j].at - from) / (j - i + 1);
    for (let k = i; k < j; k += 1) stops[k].at = from + step * (k - i + 1);
  }
  // A stop can never sit before the one ahead of it.
  for (let i = 1; i < stops.length; i += 1) stops[i].at = Math.max(stops[i].at, stops[i - 1].at);
  return stops;
}

function colourAlong(stops, t) {
  if (t <= stops[0].at) return stops[0].colour;
  const last = stops[stops.length - 1];
  if (t >= last.at) return last.colour;
  const i = stops.findIndex((stop) => stop.at >= t);
  const a = stops[i - 1];
  const b = stops[i];
  const f = b.at === a.at ? 1 : (t - a.at) / (b.at - a.at);
  // CSS blends through see-through stops without dragging their colour in.
  const alpha = a.colour[3] + (b.colour[3] - a.colour[3]) * f;
  if (alpha <= 0) return [0, 0, 0, 0];
  const channel = (k) => (a.colour[k] * a.colour[3] + (b.colour[k] * b.colour[3] - a.colour[k] * a.colour[3]) * f) / alpha;
  return [channel(0), channel(1), channel(2), alpha];
}

function gradientAt(layer, box, x, y) {
  const match = /^(repeating-)?(linear|radial)-gradient\((.*)\)$/is.exec(layer);
  if (!match) return null;
  const [, repeating, kind, inner] = match;
  const args = splitTopLevel(inner);
  const w = box.width;
  const h = box.height;
  const px = x - box.left;
  const py = y - box.top;
  let t;
  let length;

  if (kind.toLowerCase() === 'linear') {
    let angle = Math.PI;   // "to bottom", the default
    const head = args[0];
    if (/^-?[\d.]+(deg|rad|turn|grad)$/i.test(head)) {
      const value = parseFloat(head);
      angle = /rad/i.test(head) ? value : /turn/i.test(head) ? value * 2 * Math.PI
        : /grad/i.test(head) ? (value * Math.PI) / 200 : (value * Math.PI) / 180;
      args.shift();
    } else if (/^to /i.test(head)) {
      const side = head.toLowerCase();
      const top = side.includes('top');
      const bottom = side.includes('bottom');
      const left = side.includes('left');
      const right = side.includes('right');
      if ((top || bottom) && (left || right)) angle = Math.atan2(right ? h : -h, top ? w : -w);
      else angle = top ? 0 : right ? Math.PI / 2 : left ? (3 * Math.PI) / 2 : Math.PI;
      args.shift();
    }
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    length = Math.abs(w * sin) + Math.abs(h * cos);
    t = 0.5 + ((px - w / 2) * sin - (py - h / 2) * cos) / length;
  } else {
    let rx = null;
    let ry = null;
    let cx = w / 2;
    let cy = h / 2;
    if (!/^(rgba?|color)\(/i.test(args[0])) {
      const head = args.shift();
      const [size, at] = head.split(/\s+at\s+/i);
      const toPx = (token, of) => (token.endsWith('%') ? (parseFloat(token) / 100) * of : parseFloat(token));
      if (at) {
        const [ax = '50%', ay = '50%'] = at.trim().split(/\s+/).map((token) =>
          ({ left: '0%', center: '50%', right: '100%', top: '0%', bottom: '100%' }[token] ?? token));
        cx = toPx(ax, w);
        cy = toPx(ay, h);
      }
      const lengths = (size || '').trim().split(/\s+/).filter((token) => /[\d.]+(%|px)$/.test(token));
      if (lengths.length === 2) { rx = toPx(lengths[0], w); ry = toPx(lengths[1], h); }
      else if (lengths.length === 1) { rx = ry = toPx(lengths[0], w); }
    }
    if (rx == null) {
      // The default size, farthest-corner, for an ellipse.
      rx = Math.max(cx, w - cx) * Math.SQRT2;
      ry = Math.max(cy, h - cy) * Math.SQRT2;
    }
    if (!rx || !ry) return null;
    length = rx;
    t = Math.hypot((px - cx) / rx, (py - cy) / ry);
  }

  const stops = gradientStops(args, length);
  if (!stops) return null;
  if (repeating) {
    const span = stops[stops.length - 1].at - stops[0].at;
    if (span > 0) t = stops[0].at + ((((t - stops[0].at) % span) + span) % span);
  }
  return colourAlong(stops, t);
}

/**
 * What one element paints behind its content at a point: its background
 * colour with every gradient layer on top, in the browser's order (the first
 * layer listed is the one on top).
 */
function backgroundOf(el, x, y) {
  const style = getComputedStyle(el);
  // Gradient text (the display headings) paints its gradient into the letters, not behind them.
  if (/text/.test(style.backgroundClip || style.webkitBackgroundClip || '')) return null;
  let colour = parseColour(style.backgroundColor) || [0, 0, 0, 0];
  const image = style.backgroundImage;
  if (image && image !== 'none') {
    const box = el.getBoundingClientRect();
    for (const layer of splitTopLevel(image).reverse()) {
      if (!/gradient\(/i.test(layer)) continue;   // a url() picture: can't be read
      let painted = gradientAt(layer, box, x, y);
      if (!painted) {
        const stops = (layer.match(/rgba?\([^)]*\)|color\(srgb[^)]*\)/gi) || []).map(parseColour).filter(Boolean);
        if (!stops.length) continue;
        painted = stops.reduce((acc, c) => acc.map((v, i) => v + c[i] / stops.length), [0, 0, 0, 0]);
      }
      colour = overAlpha(colour, painted);
    }
  }
  return colour[3] > 0.02 ? colour : null;
}

/*
  Reading one pixel of a picture, video or canvas. Only our own files can be
  read; a picture from another site would "taint" the reading canvas, so those
  are skipped before they are ever drawn.
*/
const probe = document.createElement('canvas');
probe.width = probe.height = 1;
let probeCtx = probe.getContext('2d', { willReadFrequently: true });
const unreadable = new WeakSet();

function sameOrigin(src) {
  try { return new URL(src, location.href).origin === location.origin; } catch { return false; }
}

function pixelAt(el, x, y) {
  if (!probeCtx || unreadable.has(el)) return null;
  const box = el.getBoundingClientRect();
  if (!box.width || !box.height) return null;
  try {
    if (el instanceof HTMLCanvasElement) {
      const u = (x - box.left) / box.width;
      const v = (y - box.top) / box.height;
      if (u < 0 || v < 0 || u >= 1 || v >= 1) return null;
      const data = el.getContext('2d')?.getImageData(Math.floor(u * el.width), Math.floor(v * el.height), 1, 1).data;
      return data ? [data[0], data[1], data[2], data[3] / 255] : null;
    }
    let width;
    let height;
    if (el instanceof HTMLVideoElement) {
      if (el.readyState < 2 || (!sameOrigin(el.currentSrc) && !el.crossOrigin)) return null;
      width = el.videoWidth;
      height = el.videoHeight;
    } else if (el instanceof HTMLImageElement) {
      if (!el.complete || !el.naturalWidth || (!sameOrigin(el.currentSrc) && !el.crossOrigin)) return null;
      width = el.naturalWidth;
      height = el.naturalHeight;
    } else {
      return null;
    }
    // Where in the picture this point falls, allowing for object-fit.
    const fit = getComputedStyle(el).objectFit;
    const scale = fit === 'cover' ? Math.max(box.width / width, box.height / height)
      : fit === 'contain' || fit === 'scale-down' ? Math.min(box.width / width, box.height / height)
      : null;
    const px = scale ? (x - box.left - (box.width - width * scale) / 2) / scale : ((x - box.left) / box.width) * width;
    const py = scale ? (y - box.top - (box.height - height * scale) / 2) / scale : ((y - box.top) / box.height) * height;
    if (px < 0 || py < 0 || px >= width || py >= height) return null;
    probeCtx.clearRect(0, 0, 1, 1);
    probeCtx.drawImage(el, px, py, 1, 1, 0, 0, 1, 1);
    const data = probeCtx.getImageData(0, 0, 1, 1).data;
    return [data[0], data[1], data[2], data[3] / 255];
  } catch {
    // It turned out unreadable after all: never try it again, and start a
    // fresh reading canvas in case this one was tainted by the attempt.
    unreadable.add(el);
    const fresh = document.createElement('canvas');
    fresh.width = fresh.height = 1;
    probeCtx = fresh.getContext('2d', { willReadFrequently: true });
    return null;
  }
}

/**
 * The colour on screen under a point — or null when it can't be known (a
 * picture from another site, or a video player). Also reports any explicit
 * data-cursor choice.
 */
function colourUnder(x, y, pageBg) {
  const stack = document.elementsFromPoint(x, y).filter((el) => !el.classList.contains('cursor'));
  const forced = stack[0]?.closest('[data-cursor]')?.dataset.cursor;
  if (forced === 'gold' || forced === 'alt') return { forced };

  // Top to bottom, collecting layers until one is solid.
  const layers = [];
  for (const el of stack) {
    if (el.tagName === 'IFRAME') return null;
    const media = el instanceof HTMLImageElement || el instanceof HTMLVideoElement || el instanceof HTMLCanvasElement;
    const colour = media ? pixelAt(el, x, y) : backgroundOf(el, x, y);
    if (media && !colour && el.tagName !== 'CANVAS') return null;   // a picture we can't read
    if (!colour) continue;
    layers.push({ el, colour });
    if (colour[3] >= 0.95) break;
  }

  /*
    Layers the pointer passes straight through — the hero's glow and its
    glowing hand — are marked data-cursor-sample. They paint above whichever
    solid layer holds them and below anything on top of that, in their own
    stacking order.
  */
  const firstSolid = layers.findIndex((layer) => layer.colour[3] >= 0.5);
  const holder = firstSolid === -1 ? null : layers[firstSolid].el;
  const behind = [...document.querySelectorAll('[data-cursor-sample]')]
    .filter((el) => {
      const box = el.getBoundingClientRect();
      return x >= box.left && x < box.right && y >= box.top && y < box.bottom
        && (!holder || (holder !== el && holder.contains(el)));
    })
    .map((el) => ({ el, style: getComputedStyle(el) }))
    .sort((a, b) => ((parseInt(a.style.zIndex, 10) || 0) - (parseInt(b.style.zIndex, 10) || 0))
      || (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

  let colour = [...pageBg, 1];
  const paintBehind = () => {
    for (const { el, style } of behind) {
      const media = el instanceof HTMLImageElement || el instanceof HTMLVideoElement || el instanceof HTMLCanvasElement;
      const paint = media ? pixelAt(el, x, y) : backgroundOf(el, x, y);
      if (!paint) continue;
      const opacity = Number(style.opacity) * paint[3];
      colour = style.mixBlendMode === 'screen'
        ? screen(colour, paint, opacity)
        : over(colour, [paint[0], paint[1], paint[2], opacity]);
    }
  };
  if (firstSolid === -1) paintBehind();
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    colour = over(colour, layers[i].colour);
    if (i === firstSolid) paintBehind();
  }
  return { colour };
}

function mountCursor() {
  if (cursorTeardown || !motionAllowed()) return;

  const root = document.documentElement;
  const tokens = getComputedStyle(root);
  const LERP = Number(tokens.getPropertyValue('--cursor-lerp')) || 0.15;
  const GROW = Number(tokens.getPropertyValue('--cursor-grow')) || 2.5;
  /*
    3:1 is the contrast the accessibility guidelines (WCAG 1.4.11) ask of
    anything you need to see that isn't text — the right bar for a pointer.
    Once swapped, it only swaps back when gold is clearly readable again
    (3.3), so it doesn't flicker at the edge of the moving glow.
  */
  const SWAP_BELOW = 3;
  const SWAP_BACK_ABOVE = 3.3;

  const dot = document.createElement('div');
  dot.className = 'cursor';
  dot.setAttribute('aria-hidden', 'true');
  dot.dataset.ready = 'false';
  dot.dataset.tone = 'gold';
  document.body.append(dot);
  root.dataset.cursor = 'on';

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let x = mouseX;
  let y = mouseY;
  let scale = 1;
  let targetScale = 1;
  let frame = 0;
  let lastCheck = 0;
  let moved = false;

  /* The two colours, read from the theme — they change with it. */
  const palette = () => {
    const style = getComputedStyle(root);
    return { gold: hexColour(style.getPropertyValue('--gold-1')), alt: hexColour(style.getPropertyValue('--bg')) };
  };

  function checkUnder() {
    const under = document.elementFromPoint(mouseX, mouseY);
    targetScale = under?.closest('a, button, label, summary, select, [role="button"], [data-cursor-grow]') ? GROW : 1;

    const { gold, alt } = palette();
    const found = colourUnder(mouseX, mouseY, alt);
    let tone = 'gold';
    if (found?.forced) tone = found.forced;
    else if (found?.colour) {
      const goldContrast = contrast(gold, found.colour);
      const limit = dot.dataset.tone === 'alt' ? SWAP_BACK_ABOVE : SWAP_BELOW;
      if (goldContrast < limit && contrast(alt, found.colour) > goldContrast) tone = 'alt';
    }
    dot.dataset.tone = tone;
  }

  const onMove = (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    moved = true;
    if (dot.dataset.ready === 'false') {
      // First move (or back from outside the window): appear where the pointer
      // is, rather than flying in from wherever it was last.
      x = mouseX;
      y = mouseY;
      checkUnder();   // the right colour from its very first frame
      dot.dataset.ready = 'true';
    }
  };
  const hide = () => { dot.dataset.ready = 'false'; };
  // A video player is someone else's page in a frame: the pointer disappears
  // into it, and inside it the browser shows its own arrow. Step aside.
  const onOver = (event) => { if (event.target.tagName === 'IFRAME') hide(); };

  const tick = (now) => {
    x += (mouseX - x) * LERP;
    y += (mouseY - y) * LERP;
    scale += (targetScale - scale) * LERP;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    /* What's underneath is re-read when the pointer moves, and every few
       frames regardless — the page scrolls under a still pointer, and the
       film and the hand are moving pictures. */
    if (dot.dataset.ready === 'true' && (now - lastCheck > (moved ? 50 : 150))) {
      lastCheck = now;
      moved = false;
      checkUnder();
    }
    frame = requestAnimationFrame(tick);
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  root.addEventListener('mouseleave', hide);
  document.addEventListener('pointerover', onOver);
  frame = requestAnimationFrame(tick);

  cursorTeardown = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', onMove);
    root.removeEventListener('mouseleave', hide);
    document.removeEventListener('pointerover', onOver);
    dot.remove();
    delete root.dataset.cursor;
    cursorTeardown = null;
  };
}

function destroyCursor() {
  cursorTeardown?.();
}

/*
  Someone can turn on "reduce motion", or plug in a mouse, without reloading.
  Start or stop both to match.
*/
function watchMotionPreference() {
  const sync = () => {
    if (motionAllowed()) {
      mountLenis();
      mountCursor();
    } else {
      destroyLenis();
      destroyCursor();
    }
  };
  ['(prefers-reduced-motion: reduce)', '(hover: none)', '(pointer: coarse)']
    .forEach((query) => window.matchMedia(query).addEventListener('change', sync));
}

/* ============================================================ Loader ====== */

/*
  The homepage intro film. index.html sets <html data-loading> before first
  paint and starts the film; this waits for it to end (or a skip), then hands
  off: a copy of the logo is laid exactly over the film's final wordmark — the
  two are drawn from the same artwork, so they line up — and flies into the
  nav's logo while the black lifts away to reveal the page.
*/
const FILM_MARK = { x: 349, y: 297, w: 574, frameW: 1280, frameH: 720 }; // wordmark in the last frame
const LOGO_INSET = { x: 6 / 568, y: 6 / 170, w: 556 / 568 };              // the mark within the logo files

async function playLoader() {
  const root = document.documentElement;
  const loader = $('.loader');
  if (!root.hasAttribute('data-loading') || !loader) return;
  const film = $('.loader-video', loader);

  await new Promise((resolve) => {
    let done = false;
    const onKey = (event) => {
      if (['Escape', 'Enter', ' '].includes(event.key)) { event.preventDefault(); finish(); }
    };
    const timers = [
      // A slow connection shouldn't hold the site hostage: if the film hasn't
      // started within 3.5s, or hasn't finished within 6.5s, go straight in.
      setTimeout(() => { if (film.currentTime < 0.2) finish(); }, 3500),
      setTimeout(() => finish(), 6500),
    ];
    function finish() {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      film.removeEventListener('ended', finish);
      film.removeEventListener('error', finish);
      loader.removeEventListener('click', finish);
      document.removeEventListener('keydown', onKey);
      resolve();
    }
    if (film.ended) { finish(); return; }
    film.addEventListener('ended', finish);
    film.addEventListener('error', finish);
    loader.addEventListener('click', finish);
    document.addEventListener('keydown', onKey);
    film.play()?.catch(() => finish());
  });

  try {
    await handOffLogo(loader, film);
  } finally {
    root.removeAttribute('data-loading');
    loader.remove();
  }
}

async function handOffLogo(loader, film) {
  const target = $('.nav .brand-logo');
  if (!target) return;

  // Where the film's wordmark sits on screen. The film is object-fit: contain,
  // so it's scaled uniformly and centred in the viewport.
  const box = film.getBoundingClientRect();
  const k = Math.min(box.width / FILM_MARK.frameW, box.height / FILM_MARK.frameH);
  const originX = box.left + (box.width - FILM_MARK.frameW * k) / 2;
  const originY = box.top + (box.height - FILM_MARK.frameH * k) / 2;
  const width = (FILM_MARK.w * k) / LOGO_INSET.w;
  const height = width * (170 / 568);
  const left = originX + FILM_MARK.x * k - LOGO_INSET.x * width;
  const top = originY + FILM_MARK.y * k - LOGO_INSET.y * height;

  // The flyer: the dark-theme artwork, which matches the film; on the light
  // theme it cross-fades to the dark-on-light artwork on the way.
  const light = currentTheme() === 'light';
  const flyer = document.createElement('div');
  flyer.className = 'loader-flyer';
  flyer.setAttribute('aria-hidden', 'true');
  Object.assign(flyer.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
  flyer.innerHTML = `<img src="${LOGO_DARK}" alt="">${light ? `<img class="loader-flyer-alt" src="${target.src}" alt="">` : ''}`;
  document.body.append(flyer);
  target.style.visibility = 'hidden';

  try {
    // 1. The logo settles in over the film's own wordmark, and the film goes.
    await flyer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' }).finished;
    film.style.opacity = '0';

    // 2. It flies into the nav while the black lifts away. Measured now, not
    //    earlier, in case anything shifted while the film played.
    const end = target.getBoundingClientRect();
    loader.classList.add('loader--lifting');
    const flight = flyer.animate(
      [{ transform: 'translate(0, 0) scale(1)' },
       { transform: `translate(${end.left - left}px, ${end.top - top}px) scale(${end.width / width})` }],
      { duration: 1100, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' });
    flyer.querySelector('.loader-flyer-alt')
      ?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, delay: 400, easing: 'ease', fill: 'forwards' });
    await flight.finished;
  } finally {
    target.style.visibility = '';
    flyer.remove();
  }
}

/* ============================================================== Boot ====== */

async function boot() {
  /* Settings are needed by the footer on every route, so fetch them up front. */
  try {
    await load('settings');
  } catch (error) {
    console.error('Could not load settings', error);
    state.settings = { contact: { email: 'marketing@advatar.co.uk' } };
  }

  // Copy overrides are cosmetic: if they fail to load, the default text stands.
  try {
    await load('copy');
  } catch {
    state.copy = {};
  }

  try {
    const { authed, configured } = await api.get('/api/auth');
    state.authConfigured = configured;
    setAuthed(authed);
  } catch {
    setAuthed(false);
  }

  await renderRoute(window.location.pathname);
  /*
    The cursor is mounted after the intro film, not before: while the film is
    playing there is nothing on screen to point at, and a circle drifting over
    it was a distraction. Until then the ordinary arrow is left alone.
  */
  await playLoader();
  mountCursor();
  mountLenis();
  watchMotionPreference();
  playThemeNotice();
}

boot();
