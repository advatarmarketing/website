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
function openModal({ title, subtitle = '', body, onMount, labelledBy = 'modal-title', className = '' }) {
  closeModal();

  const opener = document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal ${esc(className)}" role="dialog" aria-modal="true" aria-labelledby="${esc(labelledBy)}">
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
    document.removeEventListener('keydown', onKeydown);
    backdrop.remove();
    document.body.style.overflow = '';
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
  const url = safeUrl(dark ? settings.logoDarkUrl : settings.logoLightUrl) || (dark ? LOGO_DARK : LOGO_LIGHT);
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

        <!--
          LOGIN BUTTON — DO NOT BUILD UNTIL EXPLICITLY ASKED.
          Phase 9 fills this slot with a "Login" pill linking to the CRM app.
          Leave empty until then.
        -->
        <div class="nav-login-slot"></div>

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
    // The fill is blurred to nothing, so a tiny thumbnail does — dozens of tiles
    // decoding full-size posters twice over is what phones run out of memory on.
    return `<div class="${shape} media--video" data-video="${esc(driveFileId)}" data-title="${label}">
      <img class="media-thumb-fill" src="${esc(driveThumb(driveFileId, 60))}" alt="" loading="lazy"
           decoding="async" referrerpolicy="no-referrer">
      <img class="media-thumb" src="${esc(driveThumb(driveFileId, 540))}" alt="" loading="lazy"
           decoding="async" referrerpolicy="no-referrer">
      <div class="media-frame"></div>
      <button type="button" class="media-play" aria-label="Play ${label}">${icon('play')}</button>
    </div>`;
  }
  const url = safeUrl(imageUrl);
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

  const desktopVideo = safeUrl(settings.heroVideoDesktopUrl);
  const mobileVideo = safeUrl(settings.heroVideoMobileUrl);
  const poster = safeUrl(settings.heroPosterUrl);
  const hand = safeUrl(settings.heroHandAssetUrl);

  /*
    Hero media is optional by design. With no assets the CSS light shaft alone
    still reads as a finished hero — see .hero-light in styles.css.
  */
  const heroMedia = desktopVideo || mobileVideo
    ? `<div class="hero-media">
         <video autoplay muted loop playsinline ${poster ? `poster="${poster}"` : ''}>
           ${mobileVideo ? `<source src="${mobileVideo}" media="(max-width: 720px)">` : ''}
           ${desktopVideo ? `<source src="${desktopVideo}">` : ''}
         </video>
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

    settings.heroHandAssetUrl still overrides it, and accepts an image or a video.
  */
  const handIsVideo = /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(hand);
  const heroHand = hand
    ? (handIsVideo
        ? `<video class="hero-hand" autoplay muted loop playsinline preload="metadata" aria-hidden="true">
             <source src="${hand}">
           </video>`
        : `<img class="hero-hand" src="${hand}" alt="" decoding="async">`)
    : `<video class="hero-hand" autoplay muted loop playsinline preload="metadata"
              poster="/assets/hero-hand-poster.jpg" aria-hidden="true">
         <source src="/assets/hero-hand-mobile.mp4" media="(max-width: 720px)" type="video/mp4">
         <source src="/assets/hero-hand.mp4" type="video/mp4">
       </video>`;

  const teasers = [
    { n: '01', glyph: 'film', title: 'Video Marketing', copy: 'What we specialise in.', href: '/our-work#video' },
    { n: '02', glyph: 'layers', title: 'Website Marketing', copy: 'Creators of beautiful webpages & e-commerce.', href: '/our-work#websites' },
    { n: '03', glyph: 'diamond', title: 'Branding', copy: 'Elevating your brand.', href: '/our-work#branding' },
  ];

  const winCard = (client, index) => `
    <article class="win-card" data-reveal style="--i:${index}">
      ${mediaTile({
        driveFileId: client.videos?.[0]?.driveFileId,
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
    <section class="hero">
      ${heroMedia}
      <div class="hero-light"></div>
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

function mountHome() {
  // Delegated: the carousel's loop clones are created after this runs.
  $('main')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-win]');
    if (!button) return;
    const client = state.clients?.find((item) => item.id === button.dataset.win);
    if (client) openClientModal(client);
  });

  mountCarousel($('[data-carousel]'));
  mountHeroParallax();
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

/** Clients grouped by industry, as [name, clients] pairs in display order. */
function industriesOf(clients) {
  const rank = (name) => {
    const index = CATEGORY_ORDER.indexOf(name);
    return index === -1 ? CATEGORY_ORDER.length : index;
  };
  const grouped = clients.reduce((map, client) => {
    const key = client.category || 'Uncategorised';
    map.set(key, [...(map.get(key) ?? []), client]);
    return map;
  }, new Map());
  // Personal Brands & Creators always has its place, even before any are added.
  if (!grouped.has('Personal Brands & Creators')) grouped.set('Personal Brands & Creators', []);
  return [...grouped].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
}

const sameIndustry = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/**
 * The reel that opens an industry: the one chosen for it in edit mode, or, until
 * one is, the first client video in the group. Either way it is left out of the
 * client rows below it, so no reel shows twice.
 */
function industryLead(name, group, settings) {
  const chosen = (settings.industryReels ?? []).find((entry) => sameIndustry(entry.industry, name));
  if (chosen?.video) return { driveFileId: chosen.video, title: chosen.title || '' };
  const client = group.find((item) => item.videos?.some((video) => video.driveFileId));
  const video = client?.videos.find((item) => item.driveFileId);
  return video ? { driveFileId: video.driveFileId, title: client.name } : null;
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
    Every reel in an industry is on show at once — one small drifting row, like
    the home carousel, each card named for its client — rather than behind a
    button per client. The lead reel is left out, so nothing appears twice, and
    clients with no reels yet are simply named underneath.
  */
  const industryReels = (group, leadId) => {
    const cards = group.flatMap((client) => (client.videos ?? [])
      .filter((video) => video.driveFileId && video.driveFileId !== leadId)
      .map((video) => ({ client, video })));
    const quiet = group.filter((client) => !(client.videos ?? []).some((video) => video.driveFileId));
    const row = cards.length
      ? `<div class="carousel carousel--videos carousel--industry" data-carousel>
           <div class="carousel-track" data-autoscroll="true">
             ${cards.map(({ client, video }, index) => `
               <figure class="video-card" style="--i:${index}">
                 ${mediaTile({ driveFileId: video.driveFileId, title: `${client.name} — ${video.title || 'reel'}` })}
                 <figcaption>
                   <span class="video-card-client">${esc(client.name)}</span>
                   ${video.title ? `<span class="tiny">${esc(video.title)}</span>` : ''}
                 </figcaption>
               </figure>`).join('')}
           </div>
         </div>`
      : '';
    const also = quiet.length
      ? `<p class="tiny industry-also"><span data-copy="work.industry.also">Also worked with</span>
           ${quiet.map((client) => esc(client.name)).join(' · ')}</p>`
      : '';
    return row + also;
  };

  const industryPanel = ([name, group], index) => {
    const lead = industryLead(name, group, settings);
    return `
    <div class="disclosure" data-reveal style="--i:${index}">
      <button type="button" class="disclosure-head" data-toggle="industry-${esc(name)}"
              aria-expanded="false" aria-controls="industry-${esc(name)}">
        <span class="disclosure-title">${esc(name)}</span>
        <span class="disclosure-meta">${icon('chevronRight')}</span>
      </button>
      <div class="disclosure-panel" id="industry-${esc(name)}" hidden>
        ${group.length ? `
        <div class="industry-layout">
          <figure class="industry-lead">
            ${mediaTile({
              driveFileId: lead?.driveFileId,
              title: `${name} — ${lead?.title || 'feature reel'}`,
              empty: 'Feature reel coming soon',
            })}
            <figcaption>
              <span class="industry-lead-label">${icon('film')}<span data-copy="work.industry.lead">Feature reel</span></span>
              ${lead?.title ? `<span class="industry-lead-title">${esc(lead.title)}</span>` : ''}
              <ul class="industry-names">
                ${group.slice(0, 3).map((client) => `<li>${esc(client.name)}</li>`).join('')}
              </ul>
            </figcaption>
          </figure>
          <div class="industry-clients">${industryReels(group, lead?.driveFileId)}</div>
        </div>`
        : `<p class="tiny" style="padding-block:0.25rem 1.25rem">No clients in ${esc(name)} yet — add them in edit mode.</p>`}
      </div>
    </div>`;
  };

  const photoCategory = (category, index) => `
    <div class="disclosure" data-reveal style="--i:${index}">
      <button type="button" class="disclosure-head" data-toggle="photo-${esc(category.id)}"
              aria-expanded="false" aria-controls="photo-${esc(category.id)}">
        <span class="disclosure-title">${esc(category.name)}</span>
        <span class="disclosure-meta">
          <span class="tiny">${category.photos?.length ?? 0} photo${category.photos?.length === 1 ? '' : 's'}</span>
          ${icon('chevronRight')}
        </span>
      </button>
      <div class="disclosure-panel" id="photo-${esc(category.id)}" hidden data-animate="true">
        <div class="photo-layout">
          ${mediaTile({ imageUrl: category.coverPhotoUrl, title: `${category.name} — cover`, ratio: 'square', empty: 'Cover photo coming soon' })}
          ${category.photos?.length
            ? `<div class="photo-grid">${category.photos.map((photo, index) =>
                mediaTile({ imageUrl: photo, title: `${category.name} ${index + 1}`, ratio: 'square' })).join('')}</div>`
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
            style="margin-bottom:clamp(1.75rem,4vw,2.75rem)">Our Drive? Results.</h2>
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
                     ${mediaTile({ driveFileId: client.videos?.[0]?.driveFileId, title: `${client.name} — reel`, empty: 'Video coming soon' })}
                     <figcaption class="tiny">${esc(client.tagline || client.name)}</figcaption>
                   </figure>`).join('')}
               </div>
             </div>`
          : emptyState('No featured reels yet', 'Mark clients as featured in edit mode to show them here.')}

        <!-- Both ways into the client work, side by side. -->
        <div class="work-actions" data-reveal>
          <button type="button" class="btn btn--ghost" data-toggle="industries"
                  aria-expanded="false" aria-controls="industries">
            ${icon('film')}<span data-copy="work.video.by-industry">See more by industry</span>
          </button>
          <button type="button" class="btn btn--ghost" data-toggle="all-clients"
                  aria-expanded="false" aria-controls="all-clients">
            ${icon('layers')}<span data-copy="work.video.all-clients">View all client work</span>
          </button>
          ${editOnly(`<button type="button" class="edit-chip" data-edit="clients">${icon('pencil')} Manage clients</button>
            <button type="button" class="edit-chip" data-edit="industry-reels">${icon('film')} Feature reels</button>
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
              <p class="lede">${clients.length} client${clients.length === 1 ? '' : 's'}.
                <span class="dim" data-copy="work.all.lede-dim">Listed once each, under their primary category.</span></p>
            </div>

            ${industries.map(([name, group]) => `
              <div class="client-index" data-reveal>
                <h4 class="client-index-head">
                  <span>${esc(name)}</span>
                </h4>
                <ul class="client-index-list">
                  ${group.map((client) => `
                    <li>
                      <button type="button" class="client-index-row" data-toggle="idx-${esc(client.id)}"
                              aria-expanded="false" aria-controls="idx-${esc(client.id)}">
                        <span class="client-index-name">${esc(client.name)}</span>
                        ${client.notes ? `<span class="tag tag--soft">${esc(client.notes)}</span>` : ''}
                        <span class="client-index-count tiny">
                          ${client.videos?.length ? `${client.videos.length} video${client.videos.length === 1 ? '' : 's'}` : 'No work added yet'}
                        </span>
                        ${icon('chevronRight')}
                      </button>
                      <div class="disclosure-panel" id="idx-${esc(client.id)}" hidden data-animate="true">
                        ${client.videos?.length
                          ? `<div style="padding-block:1rem 1.25rem">${videoCarousel(client)}</div>`
                          : `<p class="tiny" style="padding-block:0.85rem 1.25rem">
                               No work added for ${esc(client.name)} yet — add their Drive links in edit mode.
                             </p>`}
                      </div>
                    </li>`).join('')}
                  ${group.length ? '' : `<li class="client-index-empty tiny">No clients in ${esc(name)} yet — add them in edit mode.</li>`}
                </ul>
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
        <h2 class="display display--lg" data-reveal data-copy="work.photo.title" style="margin-bottom:2.5rem">Shot properly, lit properly.</h2>
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
        <h2 class="display display--lg" data-reveal data-copy="work.branding.title" style="margin-bottom:2.5rem">Elevating your brand.</h2>
        ${branding.length
          ? `<div class="branding-masonry">${branding.map((item, index) => `
              <figure data-reveal style="--i:${index}">
                ${mediaTile({ imageUrl: item.mediaUrl, title: item.clientName || item.type, ratio: 'square' })}
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
      </div>
    </section>

    <section class="section">
      <div class="shell contact-grid">
        <div class="stack-2" data-reveal>
          <p class="lede" data-copy="contact.whatsapp-lede">WhatsApp us and we'll get back to you before you take a bite out of your next meal.</p>
          <div>${whatsapp}</div>
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

  /* An image beside each step: a URL, or a Drive file shown via its thumbnail. */
  const imageFor = (number) => {
    const entry = images.get(number);
    if (!entry) {
      return `<div class="process-media media--empty">${icon('image')}<span>Image coming soon</span></div>`;
    }
    const src = /^(https?:|\/)/.test(entry.image) ? safeUrl(entry.image) : esc(driveThumb(entry.image, 1600));
    return `<figure class="process-media">
      <img src="${src}" alt="${esc(entry.caption || '')}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
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

function mountLookInside() {
  const process = $('.process');
  const steps = $$('.process-step');
  if (!process || !steps.length) return;

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
          ? `<div class="bts-strip" data-reveal>${gallery.map((entry) =>
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
        <h2 class="display display--lg" data-reveal data-copy="hiring.vacancies" style="margin-bottom:2rem">Vacancies.</h2>

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
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      return;
    }
  }
  if (!restoreScroll) window.scrollTo(0, 0);
}

function navigate(path, { replace = false } = {}) {
  const url = new URL(path, window.location.origin);
  const samePage = url.pathname === window.location.pathname;

  if (replace) history.replaceState({}, '', url);
  else history.pushState({}, '', url);

  if (samePage && url.hash) {
    document.getElementById(url.hash.slice(1))
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
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
  phone reloads the tab once it holds too many. So a player only exists while
  its tile is on screen: it arrives once the tile has settled into view (a quick
  scroll past loads nothing), goes again shortly after the tile leaves, and only
  a handful are ever live at once. The one being watched is never evicted.
*/
const LIVE_LIMIT = window.matchMedia('(hover: none), (max-width: 720px)').matches ? 4 : 10;
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
  frame.innerHTML = `<iframe src="${driveEmbed(tile.dataset.video)}" title="${esc(tile.dataset.title || 'Video')}"
    allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen
    referrerpolicy="no-referrer"></iframe>`;
  if (frameSizer) frameSizer.observe(frame);
  else sizePlayer(frame);

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
        if (entry.isIntersecting) {
          laterFor(tile, () => {
            if (tile.isConnected && tile.dataset.inView === 'true') hydrateVideo(tile);
          }, 300);
        } else if (tile.dataset.hydrated === 'true') {
          laterFor(tile, () => {
            if (tile.dataset.inView !== 'true' && !document.fullscreenElement) releaseVideo(tile);
          }, 1500);
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

new MutationObserver((records) => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.matches('.media--video')) watchVideo(node);
      node.querySelectorAll('.media--video').forEach(watchVideo);
    }
    // Tiles that have left the page give up their players and their slots.
    for (const node of record.removedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.matches('.media--video')) forgetVideo(node);
      node.querySelectorAll('.media--video').forEach(forgetVideo);
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
});

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
  if (img instanceof HTMLImageElement && img.classList.contains('media-thumb')) {
    img.closest('.media--video')?.classList.add('media--thumb-failed');
  }
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
  $$('[data-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      if (!panel) return;
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));

      if (panel.dataset.animate === 'true') {
        if (open) {
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
        panel.hidden = open;
      }

      if (!open) {
        /*
          A [data-reveal] inside a hidden panel can never intersect, so its reveal
          would never fire and it would open as blank space. Anything revealed by
          opening a panel is, by definition, already "in view" — mark it shown.
        */
        $$('[data-reveal]', panel).forEach((node) => { node.dataset.shown = 'true'; });
        // Carousels inside a closed panel had no width to measure; mount them now.
        requestAnimationFrame(() => $$('[data-carousel]', panel).forEach((node) => mountCarousel(node)));
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
  const url = safeUrl(state.settings?.textureUrl);
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
    { node: $('.hero-media'), rate: 0.35, base: '' },
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

  const loopWidth = () => track.scrollWidth / 2;

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
    const SPEED = 14;                 // px per second — a slow walk, not a slide
    const canHover = window.matchMedia('(hover: hover)').matches;
    let paused = false;
    let last = performance.now();
    let frame = 0;
    // Sub-pixel carry, or a 14px/s speed would floor to zero every frame.
    let carry = 0;
    /*
      A finger on the row, or its momentum still carrying it, holds the drift —
      otherwise the drift writes scrollLeft every frame and fights the swipe.
      Any scroll the drift didn't make is someone scrolling.
    */
    let holdUntil = 0;
    let expected = track.scrollLeft;
    const holdFor = (ms) => { holdUntil = performance.now() + ms; };
    track.addEventListener('touchstart', () => holdFor(60000), { passive: true });
    track.addEventListener('touchend', () => holdFor(2500), { passive: true });
    track.addEventListener('touchcancel', () => holdFor(2500), { passive: true });
    track.addEventListener('scroll', () => {
      if (Math.abs(track.scrollLeft - expected) > 2 && holdUntil < performance.now() + 2500) holdFor(2500);
    }, { passive: true });

    const tick = (now) => {
      if (!track.isConnected) return;   // its modal closed, or the page changed
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      // Hovering the row (players included) or having pressed into one of its
      // players holds the drift, so a video never slides away mid-watch. Hover
      // only counts for a real mouse: a phone keeps :hover stuck on whatever
      // was last tapped, which would freeze the row for good.
      const watching = (canHover && track.matches(':hover'))
        || (document.activeElement?.tagName === 'IFRAME' && track.contains(document.activeElement))
        || Boolean(track.querySelector('.media--video[data-engaged="true"]'));
      if (!paused && !watching && !track.dataset.dragging && now >= holdUntil) {
        carry += SPEED * dt;
        const whole = Math.floor(carry);
        if (whole) {
          carry -= whole;
          track.scrollLeft += whole;
          const width = loopWidth();
          if (width && track.scrollLeft >= width) track.scrollLeft -= width;
        }
      }
      expected = track.scrollLeft;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const pause = () => { paused = true; };
    const resume = () => { last = performance.now(); paused = false; };

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
      <!--
        LOGIN BUTTON — DO NOT BUILD UNTIL EXPLICITLY ASKED.
        Phase 9 fills this slot with a "Login" pill linking to the CRM app.
      -->
      <div class="nav-login-slot"></div>
    </div>`;

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
  A tiny schema-driven form builder. `rows` renders a textarea where each line is
  "col1 | col2 | ..." — it keeps repeating structures (videos, stats, gallery)
  editable without building a drag-and-drop UI.
*/

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

    case 'select':
      return `<div class="field field--select">${label}
                <select id="${id}" name="${esc(field.name)}">
                  ${field.options.map((option) =>
                    `<option value="${esc(option)}" ${option === value ? 'selected' : ''}>${esc(option)}</option>`).join('')}
                </select>${icon('chevronDown')}${hint}
              </div>`;

    case 'lines': {
      const text = Array.isArray(value) ? value.join('\n') : '';
      return `<div class="field">${label}<textarea id="${id}" name="${esc(field.name)}">${esc(text)}</textarea>
                <p class="tiny" style="margin:0">${esc(field.hint || 'One per line.')}</p></div>`;
    }

    case 'rows': {
      const keys = field.columns.map((column) => column.key);
      const text = (Array.isArray(value) ? value : [])
        .map((row) => keys.map((key) => row?.[key] ?? '').join(' | '))
        .join('\n');
      return `<div class="field">${label}<textarea id="${id}" name="${esc(field.name)}" rows="6">${esc(text)}</textarea>
                <p class="tiny" style="margin:0">One per line, columns separated by <code>|</code> —
                  ${esc(field.columns.map((column) => column.label).join(' | '))}</p></div>`;
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

    case 'rows':
      return input.value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const cells = line.split('|').map((cell) => cell.trim());
          return Object.fromEntries(field.columns.map((column, index) => [column.key, cells[index] ?? '']));
        });

    default:
      return input.value.trim();
  }
}

const buildForm = (fields, record) =>
  `<div class="editor-grid">${fields.map((field) =>
    fieldHtml(field, getPath(record ?? {}, field.name))).join('')}</div>`;

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

const CLIENT_FIELDS = [
  { name: 'name', label: 'Client name', type: 'text' },
  { name: 'category', label: 'Industry', type: 'text', hint: 'Groups the client on Our Work — e.g. "Personal Brands & Creators".' },
  { name: 'tagline', label: 'Tagline', type: 'text' },
  { name: 'websiteUrl', label: 'Website URL', type: 'text' },
  { name: 'logoUrl', label: 'Logo URL', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'text', hint: 'e.g. "Also event photography coverage".' },
  { name: 'order', label: 'Order', type: 'number' },
  { name: 'featured', label: 'Featured (selected reels)', type: 'checkbox' },
  { name: 'isRecentWin', label: 'Show in Recent Wins', type: 'checkbox' },
  { name: 'isCaseStudy', label: 'Show in Case studies', type: 'checkbox' },
  {
    name: 'videos', label: 'Videos', type: 'rows',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'driveFileId', label: 'Drive file ID or share link' },
      { key: 'kind', label: 'reel / bts' },
    ],
  },
];

const WEBSITE_FIELDS = [
  { name: 'name', label: 'Site name', type: 'text' },
  { name: 'liveUrl', label: 'Live URL', type: 'text' },
  { name: 'screenshotUrl', label: 'Screenshot URL', type: 'text' },
  { name: 'tags', label: 'Tags', type: 'lines', hint: 'One tag per line.' },
  { name: 'order', label: 'Order', type: 'number' },
];

const PHOTO_FIELDS = [
  { name: 'name', label: 'Category name', type: 'text' },
  { name: 'coverPhotoUrl', label: 'Cover photo URL', type: 'text' },
  { name: 'photos', label: 'Photos', type: 'lines', hint: 'One image URL per line.' },
  { name: 'order', label: 'Order', type: 'number' },
];

const BRANDING_FIELDS = [
  { name: 'clientName', label: 'Client name', type: 'text' },
  { name: 'type', label: 'Type', type: 'select', options: ['logo', 'carousel', 'edit'] },
  { name: 'mediaUrl', label: 'Media URL', type: 'text' },
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
      subtitle: 'Leave any of these blank and the CSS-only golden hero is used instead.',
      fields: [
        { name: 'heroVideoDesktopUrl', label: 'Hero video — desktop', type: 'text' },
        { name: 'heroVideoMobileUrl', label: 'Hero video — mobile', type: 'text' },
        { name: 'heroPosterUrl', label: 'Poster image (slow-connection fallback)', type: 'text' },
        { name: 'heroHandAssetUrl', label: 'Hand asset (PNG/WebP with transparency)', type: 'text' },
      ],
    }),

    brand: () => openSettingsEditor({
      title: 'Logos & texture',
      subtitle: 'Leave the logos empty to use the built-in Advatar wordmark.',
      fields: [
        { name: 'logoLightUrl', label: 'Logo — light mode (dark artwork)', type: 'text' },
        { name: 'logoDarkUrl', label: 'Logo — dark mode (light artwork)', type: 'text' },
        {
          name: 'textureUrl', label: 'Background texture', type: 'text',
          hint: 'A still from your work. It is blurred and dimmed behind every page.',
        },
      ],
    }),

    results: () => openSettingsEditor({
      title: 'Results',
      fields: [{
        name: 'resultsStats', label: 'Results', type: 'rows',
        columns: [{ key: 'label', label: 'Label' }, { key: 'value', label: 'Number' }],
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
      fields: [{
        name: 'hiringGallery', label: 'Behind the scenes', type: 'rows',
        columns: [
          { key: 'imageUrl', label: 'Image URL' },
          { key: 'driveFileId', label: 'or Drive file ID' },
          { key: 'caption', label: 'Caption' },
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

    'recent-wins': openRecentWinsEditor,
    'industry-reels': openIndustryReelsEditor,
    submissions: openSubmissionsList,
    'sync-clients': openClientSync,

    'look-images': () => openSettingsEditor({
      title: 'Look Inside images',
      subtitle: 'One line per image: the step number, then an image URL or a Google Drive link. Drive files must be shared as "Anyone with the link".',
      fields: [{
        name: 'lookInsideImages', label: 'Step images', type: 'rows',
        columns: [
          { key: 'step', label: 'Step (1–10)' },
          { key: 'image', label: 'Image URL or Drive link' },
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
 * The reel that opens each industry on Our Work. One Drive link per industry;
 * a blank one falls back to that industry's first client video.
 */
function openIndustryReelsEditor() {
  const names = industriesOf(state.clients ?? []).map(([name]) => name);
  const current = state.settings?.industryReels ?? [];
  const entryFor = (name) => current.find((entry) => sameIndustry(entry.industry, name)) ?? {};

  openModal({
    title: 'Feature reels',
    subtitle: 'The reel that opens each industry. Upload the video to Google Drive, share it as "Anyone with the link", and paste the link here. Leave one blank to lead with that industry\'s first client video.',
    body: `
      <form class="editor-form" id="reels-form">
        <div class="editor-grid">
          ${names.map((name, index) => {
            const entry = entryFor(name);
            return `
            <div class="field" data-industry="${esc(name)}">
              <label for="reel-${index}">${esc(name)}</label>
              <input id="reel-${index}" name="video" type="text" placeholder="Google Drive link"
                     value="${esc(entry.video ? `https://drive.google.com/file/d/${entry.video}/view` : '')}">
              <input name="title" type="text" placeholder="Caption (optional) — e.g. the client's name"
                     aria-label="${esc(name)} caption" value="${esc(entry.title ?? '')}">
            </div>`;
          }).join('')}
        </div>
        <p class="form-status" role="status" aria-live="polite"></p>
        <div class="editor-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="submit" class="btn btn--gold">Save</button>
        </div>
      </form>`,
    onMount(host) {
      const form = $('#reels-form', host);
      const status = $('.form-status', form);
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.dataset.state = '';
        status.textContent = 'Saving…';
        const edited = $$('[data-industry]', form).map((field) => ({
          industry: field.dataset.industry,
          video: $('[name="video"]', field).value.trim(),
          title: $('[name="title"]', field).value.trim(),
        })).filter((entry) => entry.video);
        // Industries that no longer have clients keep their reel for when they return.
        const kept = current.filter((entry) => !names.some((name) => sameIndustry(name, entry.industry)));
        try {
          const { settings } = await api.put('/api/settings', { industryReels: [...edited, ...kept] });
          state.settings = settings;
          const missing = edited.length - settings.industryReels.filter((entry) =>
            edited.some((item) => sameIndustry(item.industry, entry.industry))).length;
          closeModal();
          toast(missing ? `Saved — ${missing} link${missing === 1 ? " wasn't a Drive link" : "s weren't Drive links"}.` : 'Feature reels saved.',
            missing ? 'error' : undefined);
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

/* ============================================================ Loader ====== */

/*
  The homepage intro film. index.html sets <html data-loading> before first
  paint and starts the film; this waits for it to end (or a skip), then hands
  off: a copy of the logo is laid exactly over the film's final wordmark — the
  two are drawn from the same artwork, so they line up — and flies into the
  nav's logo while the black lifts away to reveal the page.
*/
const FILM_MARK = { x: 367, y: 301, w: 539, frameW: 1280, frameH: 720 }; // wordmark in the last frame
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
      // started within 3.5s, or hasn't finished within 9s, go straight in.
      setTimeout(() => { if (film.currentTime < 0.2) finish(); }, 3500),
      setTimeout(() => finish(), 9000),
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
  await playLoader();
  playThemeNotice();
}

boot();
