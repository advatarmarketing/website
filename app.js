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
};

/** Fetch a collection once and cache it. `invalidate(key)` forces a refetch. */
async function load(key) {
  if (state[key] != null) return state[key];
  const payload = await api.get(CACHE_KEYS[key]);
  state[key] = key === 'settings' ? payload.settings : payload.items;
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
function openModal({ title, subtitle = '', body, onMount, labelledBy = 'modal-title' }) {
  closeModal();

  const opener = document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${esc(labelledBy)}">
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

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* Private mode — the choice just won't persist. */
  }
  // The nav logo differs per theme, so re-render whichever marks are on screen.
  $$('[data-brand]').forEach((node) => { node.innerHTML = brandInner(); });
}

const toggleTheme = () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');

const themeToggleButton = (extraClass = '') => `
  <button type="button" class="icon-btn theme-toggle ${extraClass}" data-theme-toggle
          aria-label="Switch to ${currentTheme() === 'dark' ? 'light' : 'dark'} mode">
    ${icon('sun', 'icon-sun')}${icon('moon', 'icon-moon')}
  </button>`;

/* ----------------------------------------------------------------- Logo --- */

/*
  Built-in fallback mark: the "A" with an upward arrow in its counter, over the
  underscore bar. Used until real logo files are set via settings.logoLightUrl /
  logoDarkUrl in Web Dev Edit.
*/
const LOGO_FALLBACK = `
  <svg viewBox="0 0 30 32" aria-hidden="true" focusable="false" fill="none">
    <path d="M13.2 3h3.6l9.7 21.2h-5.3L15 8.7 8.8 24.2H3.5z" fill="currentColor"/>
    <path d="M8.9 18.8h12.2v3.1H8.9z" fill="currentColor"/>
    <path d="M15 15.5V8.6" stroke="currentColor" stroke-width="1.1"/>
    <path d="M12.9 10.6 15 8.2l2.1 2.4" stroke="currentColor" stroke-width="1.1"
          stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3.5 26.9h19.1V31H3.5z" fill="currentColor"/>
    <path d="M25.1 26.9h1.2l1 2.3 1-2.3h1.2V31h-1v-2.4L27.6 31h-.6l-.9-2.4V31h-1z" fill="currentColor"/>
  </svg>`;

/** Inner markup for the brand mark — a real logo image, or the fallback. */
function brandInner() {
  const settings = state.settings ?? {};
  const url = safeUrl(currentTheme() === 'dark' ? settings.logoDarkUrl : settings.logoLightUrl);
  return url
    ? `<img class="brand-logo" src="${url}" alt="Advatar" decoding="async">`
    : `${LOGO_FALLBACK}<span class="brand-word">Advatar</span>`;
}

function navFragment(path) {
  const link = ({ href, label }) =>
    `<li><a href="${href}"${href === path ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`;

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
          <p class="tiny" style="max-width:26ch">Impact-focused marketing. Video at the core.</p>
        </div>

        <nav aria-label="Footer">
          <ul class="footer-links">
            ${NAV_ITEMS.map((item) => `<li><a href="${item.href}">${esc(item.label)}</a></li>`).join('')}
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

/** Section eyebrow: monoline glyph + label. */
const eyebrow = (label, glyph = 'diamond') =>
  `<p class="eyebrow">${icon(glyph)}<span>${esc(label)}</span></p>`;

/** Media tile: a Drive embed, an image, or a labelled empty placeholder. */
function mediaTile({ driveFileId, imageUrl, title, ratio = 'reel', empty = 'Asset coming soon' }) {
  const shape = `media media--${ratio}`;
  if (driveFileId) {
    return `<div class="${shape}"><iframe src="${driveEmbed(driveFileId)}"
      title="${esc(title || 'Video')}" allow="autoplay; encrypted-media"
      referrerpolicy="no-referrer" loading="lazy" allowfullscreen></iframe></div>`;
  }
  const url = safeUrl(imageUrl);
  if (url) {
    return `<div class="${shape}"><img src="${url}" alt="${esc(title || '')}" loading="lazy" decoding="async"></div>`;
  }
  return `<div class="${shape} media--empty">${icon('image')}<span>${esc(empty)}</span></div>`;
}

/**
 * Admin-only markup. Returns nothing at all unless there is a live session, so
 * the edit surface is absent from the DOM for visitors rather than merely
 * hidden with CSS. Writes are re-authorised server-side regardless.
 */
const editOnly = (html) => (state.authed ? html : '');

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
          <span>See more</span>${icon('arrowRight')}
        </button>
      </div>
    </article>`;

  return `
  <main id="main">
    <section class="hero">
      ${heroMedia}
      <div class="hero-light"></div>
      ${hand ? `<img class="hero-hand" src="${hand}" alt="" decoding="async">` : ''}
      <div class="glow" style="--glow-w:46rem;--glow-h:46rem;--glow-a:0.5;right:-6rem;top:20%"></div>

      <div class="hero-content">
        <h1 class="display display--xl">Marketing that leaves a mark,<br>not just a metric.</h1>
        <div class="hero-cta">
          <a class="btn btn--gold" href="/our-work">See our work ${icon('arrowRight')}</a>
        </div>
      </div>

      <div class="hero-foot">
        <p>Video marketing at the core — with web design, photography, branding and paid ads built around it.</p>
        <div class="with-mark">
          ${icon('cross')}
          <p>An impact-focused agency for clients who want the whole picture handled, properly.</p>
        </div>
      </div>
    </section>

    <section class="section" id="recent-wins">
      <div class="shell">
        <div class="section-head" data-reveal>
          <div>
            ${eyebrow('Recent wins', 'plus')}
            <h2 class="display display--lg">The latest work.</h2>
          </div>
          <p class="lede">Fresh off the edit.
            <span class="dim">A snapshot of who we've been building for lately.</span></p>
        </div>
        ${wins.length
          ? `<div class="carousel" data-carousel data-at-end="false">
               <div class="carousel-track">${wins.map(winCard).join('')}</div>
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
                <h3>${esc(teaser.title)}</h3>
                <p>${esc(teaser.copy)}</p>
              </div>
            </a>`).join('')}
        </div>
      </div>
    </section>
  </main>`;
}

function mountHome() {
  $$('[data-win]').forEach((button) => {
    button.addEventListener('click', () => {
      const client = state.clients?.find((item) => item.id === button.dataset.win);
      if (client) openClientModal(client);
    });
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
      ? `<div class="reel-grid">${videos
          .map((video) => `
            <figure style="margin:0;display:grid;gap:0.6rem">
              ${mediaTile({ driveFileId: video.driveFileId, title: `${client.name} — ${video.title}` })}
              <figcaption class="tiny">${esc(video.title)}</figcaption>
            </figure>`)
          .join('')}</div>`
      : emptyState('No videos yet', `Videos for ${client.name} haven't been added yet.`),
  });
}

/* ------------------------------------------------------------ Our Work --- */

async function renderOurWork() {
  const [settings, clients, websites, photography, branding] = await Promise.all([
    load('settings'), load('clients'), load('websites'), load('photography'), load('branding'),
  ]);

  const featured = clients.filter((client) => client.featured).slice(0, 4);
  const stats = settings.resultsStats ?? [];

  /* Group clients by industry for the unravel panels. */
  const industries = [...clients.reduce((map, client) => {
    const key = client.category || 'Uncategorised';
    map.set(key, [...(map.get(key) ?? []), client]);
    return map;
  }, new Map())].sort((a, b) => a[0].localeCompare(b[0]));

  const resultsRow = stats.length
    ? stats.map((stat) =>
        `<span class="result">${icon('arrowUp')}${esc(stat.label)}</span>`
      ).join('<span class="divider" aria-hidden="true">|</span>')
    : '<span class="result muted">Add your results in edit mode</span>';

  const clientRow = (client) => `
    <div class="client-row" data-client-row="${esc(client.id)}">
      <div>
        ${mediaTile({ driveFileId: client.videos?.[0]?.driveFileId, title: `${client.name} — reel`, empty: 'Video coming soon' })}
      </div>
      <div>
        <div class="client-row-head">
          <div>
            <h4 class="disclosure-title" style="font-size:1.0625rem">${esc(client.name)}</h4>
            ${client.tagline ? `<p class="tiny" style="margin:0.25rem 0 0">${esc(client.tagline)}</p>` : ''}
          </div>
          <button type="button" class="icon-btn" data-toggle="client-${esc(client.id)}"
                  aria-expanded="false" aria-controls="client-${esc(client.id)}"
                  aria-label="Show all videos for ${esc(client.name)}">${icon('chevronRight')}</button>
        </div>
        <div class="disclosure-panel" id="client-${esc(client.id)}" hidden>
          ${client.videos?.length
            ? `<div class="reel-grid" style="margin-top:1rem">${client.videos.map((video) => `
                <figure style="margin:0;display:grid;gap:0.5rem">
                  ${mediaTile({ driveFileId: video.driveFileId, title: `${client.name} — ${video.title}` })}
                  <figcaption class="tiny">${esc(video.title)}</figcaption>
                </figure>`).join('')}</div>`
            : `<p class="tiny" style="margin-top:1rem">No videos added for ${esc(client.name)} yet.</p>`}
        </div>
      </div>
    </div>`;

  const industryPanel = ([name, group]) => `
    <div class="disclosure">
      <button type="button" class="disclosure-head" data-toggle="industry-${esc(name)}"
              aria-expanded="false" aria-controls="industry-${esc(name)}">
        <span class="disclosure-title">${esc(name)}</span>
        <span class="disclosure-meta">
          <span class="tiny">${group.length} client${group.length === 1 ? '' : 's'}</span>
          ${icon('chevronRight')}
        </span>
      </button>
      <div class="disclosure-panel" id="industry-${esc(name)}" hidden>
        <div class="stack-2" style="grid-template-columns:minmax(0,20rem) minmax(0,1fr);display:grid;align-items:start">
          <div>
            ${mediaTile({ driveFileId: group[0]?.videos?.[0]?.driveFileId, title: `${name} — key video`, empty: 'Key video coming soon' })}
            <ul class="industry-names">
              ${group.slice(0, 3).map((client) => `<li>${esc(client.name)}</li>`).join('')}
            </ul>
          </div>
          <div>${group.map(clientRow).join('')}</div>
        </div>
      </div>
    </div>`;

  const photoCategory = (category) => `
    <div class="disclosure">
      <button type="button" class="disclosure-head" data-toggle="photo-${esc(category.id)}"
              aria-expanded="false" aria-controls="photo-${esc(category.id)}">
        <span class="disclosure-title">${esc(category.name)}</span>
        <span class="disclosure-meta">
          <span class="tiny">${category.photos?.length ?? 0} photo${category.photos?.length === 1 ? '' : 's'}</span>
          ${icon('chevronRight')}
        </span>
      </button>
      <div class="disclosure-panel" id="photo-${esc(category.id)}" hidden data-animate="true">
        <div style="display:grid;gap:1rem;grid-template-columns:minmax(0,18rem) minmax(0,1fr);align-items:start">
          ${mediaTile({ imageUrl: category.coverPhotoUrl, title: `${category.name} — cover`, ratio: 'square', empty: 'Cover photo coming soon' })}
          ${category.photos?.length
            ? `<div class="photo-grid">${category.photos.map((photo, index) =>
                mediaTile({ imageUrl: photo, title: `${category.name} ${index + 1}`, ratio: 'square' })).join('')}</div>`
            : `<p class="tiny">No ${esc(category.name.toLowerCase())} photos added yet.</p>`}
        </div>
      </div>
    </div>`;

  const siteCard = (entry) => `
    <article class="glass-card">
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
        ${eyebrow('Results', 'arrowUp')}
        <div class="results-row" data-reveal>${resultsRow}</div>
        <div style="margin-top:1.5rem;display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center">
          <button type="button" class="link-arrow" data-results-modal><span>See more</span>${icon('arrowRight')}</button>
          ${editOnly(`<button type="button" class="edit-chip" data-edit="results">${icon('pencil')} Edit results</button>`)}
        </div>
      </div>
    </section>

    <section class="section" id="video">
      <div class="shell">
        <div class="section-head" data-reveal>
          <div>
            ${eyebrow('Video marketing', 'film')}
            <h2 class="display display--lg">Selected reels.</h2>
          </div>
          <p class="lede">The work that moves numbers.
            <span class="dim">Grouped by industry so you can find your own.</span></p>
        </div>

        ${featured.length
          ? `<div class="reel-grid">${featured.map((client, index) => `
              <figure data-reveal style="display:grid;gap:0.75rem;--i:${index}">
                ${mediaTile({ driveFileId: client.videos?.[0]?.driveFileId, title: `${client.name} — reel`, empty: 'Video coming soon' })}
                <figcaption class="tiny">${esc(client.tagline || client.name)}</figcaption>
              </figure>`).join('')}</div>`
          : emptyState('No featured reels yet', 'Mark clients as featured in edit mode to show them here.')}

        <div style="margin-top:2rem;display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center">
          <button type="button" class="btn btn--ghost" data-toggle="industries"
                  aria-expanded="false" aria-controls="industries">See more by industry</button>
          ${editOnly(`<button type="button" class="edit-chip" data-edit="clients">${icon('pencil')} Manage clients</button>`)}
        </div>

        <div class="disclosure-panel" id="industries" hidden style="margin-top:2rem">
          ${industries.length
            ? industries.map(industryPanel).join('')
            : emptyState('No clients yet', 'Add clients in edit mode and they will group by industry here.')}

          <!-- R9: the full client index, alongside the showcase above. -->
          <div class="all-clients">
            <div class="section-head" style="margin-bottom:1.5rem">
              <div>
                ${eyebrow('All clients', 'layers')}
                <h3 class="display display--md">Everyone we've worked with.</h3>
              </div>
              <p class="lede">${clients.length} client${clients.length === 1 ? '' : 's'}.
                <span class="dim">Listed once each, under their primary category.</span></p>
            </div>

            ${industries.map(([name, group]) => `
              <div class="client-index">
                <h4 class="client-index-head">
                  <span>${esc(name)}</span>
                  <span class="tiny">${group.length}</span>
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
                          ? `<div class="reel-grid" style="padding-block:1rem">${client.videos.map((video) => `
                              <figure style="display:grid;gap:0.5rem">
                                ${mediaTile({ driveFileId: video.driveFileId, title: `${client.name} — ${video.title}` })}
                                <figcaption class="tiny">${esc(video.title)}</figcaption>
                              </figure>`).join('')}</div>`
                          : `<p class="tiny" style="padding-block:0.85rem 1.25rem">
                               No work added for ${esc(client.name)} yet — add their Drive links in edit mode.
                             </p>`}
                      </div>
                    </li>`).join('')}
                </ul>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="websites">
      <div class="shell">
        <div class="section-head" data-reveal>
          <div>
            ${eyebrow('Websites', 'layers')}
            <h2 class="display display--lg">Beautifully designed and crafted websites,<br>just like this one.</h2>
          </div>
        </div>
        ${websites.length
          ? `<div class="site-grid">${websites.slice(0, 3).map(siteCard).join('')}</div>
             ${websites.length > 3 ? `
               <div style="margin-top:1.5rem">
                 <button type="button" class="btn btn--ghost" data-toggle="more-sites"
                         aria-expanded="false" aria-controls="more-sites">View more</button>
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
        <h2 class="display display--lg" data-reveal style="margin-bottom:2.5rem">Shot properly, lit properly.</h2>
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
        <h2 class="display display--lg" data-reveal style="margin-bottom:2.5rem">Elevating your brand.</h2>
        ${branding.length
          ? `<div class="branding-masonry">${branding.map((item) => `
              <figure style="margin:0">
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
              ? `<div class="reel-grid">${client.videos.map((video) => `
                  <figure style="display:grid;gap:0.5rem">
                    ${mediaTile({ driveFileId: video.driveFileId, title: `${client.name} — ${video.title}` })}
                    <figcaption class="tiny">${esc(video.title)}</figcaption>
                  </figure>`).join('')}</div>`
              : `<div class="reel-grid">${mediaTile({ title: client.name, empty: 'Video coming soon' })}</div>`}
          </article>`).join('')}</div>`
      : emptyState(
          'No case studies yet',
          'Flag clients as case studies in edit mode — recent wins are included by default.'
        ),
  });
}

/* --------------------------------------------------------------- About --- */

async function renderAbout() {
  const settings = await load('settings');
  const { founded, clientsCount, teamCount } = settings.aboutStats ?? {};

  const stat = (num, label) => `
    <div class="glass-card stat">
      <span class="num">${esc(num || '—')}</span>
      <span class="label micro">${esc(label)}</span>
    </div>`;

  return `
  <main id="main" class="page">
    <section class="section">
      <div class="shell" data-reveal>
        <div class="glow" style="--glow-w:40rem;--glow-h:30rem;--glow-a:0.3;right:-8rem;top:-4rem"></div>
        ${eyebrow('About', 'diamond')}
        <figure class="quote-block">
          <blockquote class="display">Lost until the love for impact found me.</blockquote>
          <figcaption>Ar-Rayyan Monsur — Founder of Advatar</figcaption>
        </figure>
      </div>
    </section>

    <section class="section">
      <div class="shell stack-2">
        <p class="lede" data-reveal style="max-width:54ch">
          Founded in ${esc(founded || '2024')}, Advatar has worked with over
          ${esc(clientsCount || '50')} clients.
        </p>

        <div class="stat-row">
          ${stat(founded, 'Founded')}
          ${stat(clientsCount ? `${clientsCount}+` : '', 'Clients')}
          ${stat(teamCount, 'Team members')}
        </div>
        ${editOnly(`
        <div>
          <button type="button" class="edit-chip" data-edit="about">${icon('pencil')} Edit stats</button>
        </div>
        `)}

        <div class="stack-2">
          <p class="lede" data-reveal style="max-width:54ch">
            The founder, Ar-Rayyan Monsur, has been working in marketing since 2021
            and graduated in Economics at the University of Leicester.
          </p>
          <p class="lede" data-reveal style="max-width:54ch">
            The team now expands to ${esc(teamCount || '13')} dedicated team members and is growing.
            Want to join the team, <a class="text-link" href="/hiring">register your interest here</a>
          </p>
        </div>
      </div>
    </section>

    <section class="section ihsan">
      <div class="ihsan-mark" aria-hidden="true" lang="ar">إحسان</div>
      <div class="shell ihsan-body" data-reveal>
        ${eyebrow('Ihsan', 'plus')}
        <p class="lede" style="max-width:56ch;font-size:clamp(1.0625rem,1.6vw,1.375rem)">
          Our aim is to work upon the term of &ldquo;Ihsan&rdquo;
          (<span lang="ar" class="ihsan-inline">إحسان</span>) or in other words, Excellence
          &mdash; and we never release a bit of work that we&rsquo;re not impressed by ourselves.
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
         ${icon('whatsapp')} WhatsApp us</a>`
    : `<button type="button" class="btn" disabled aria-describedby="wa-note">${icon('whatsapp')} WhatsApp us</button>
       <p class="tiny" id="wa-note" style="margin-top:0.75rem">
         Add your full WhatsApp number in edit mode to switch this on.</p>`;

  return `
  <main id="main" class="page">
    <section class="section">
      <div class="shell">
        <div class="glow" style="--glow-w:36rem;--glow-h:26rem;--glow-a:0.26;left:-8rem;top:-4rem"></div>
        ${eyebrow('Contact', 'mail')}
        <h1 class="display display--lg" data-reveal style="max-width:18ch">Let's talk about what you're building.</h1>
      </div>
    </section>

    <section class="section">
      <div class="shell contact-grid">
        <div class="stack-2" data-reveal>
          <p class="lede">WhatsApp us and we'll get back to you before you take a bite out of your next meal.</p>
          <div>${whatsapp}</div>
        </div>

        <div class="or-divider" aria-hidden="true"><span>Or</span></div>

        <div class="stack-2" data-reveal style="--i:1">
          <form class="editor-form" id="contact-form" novalidate>
            <div class="field">
              <label for="cf-name">Name</label>
              <input id="cf-name" name="name" type="text" autocomplete="name" required maxlength="120">
            </div>
            <div class="field">
              <label for="cf-email">Email</label>
              <input id="cf-email" name="email" type="email" autocomplete="email" required maxlength="200">
            </div>
            <div class="field">
              <label for="cf-message">Message</label>
              <textarea id="cf-message" name="message" required maxlength="4000"></textarea>
            </div>

            <!-- Honeypot. Hidden from people, irresistible to bots. -->
            <div class="hp" aria-hidden="true">
              <label for="cf-company">Company</label>
              <input id="cf-company" name="company" type="text" tabindex="-1" autocomplete="off">
            </div>

            <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
              <button class="btn btn--gold" type="submit">Send message ${icon('arrowRight')}</button>
              <p class="form-status" role="status" aria-live="polite"></p>
            </div>
          </form>

          <p class="tiny">
            Prefer email?
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
  return `
  <main id="main" class="page">
    <section class="section">
      <div class="shell">
        <div class="glow" style="--glow-w:34rem;--glow-h:26rem;--glow-a:0.24;right:-8rem;top:-4rem"></div>
        ${eyebrow('Look inside', 'eye')}
        <h1 class="display display--lg" data-reveal style="max-width:20ch">What it's actually like to work with us.</h1>
        <p class="lede" style="margin-top:1.5rem">Start to finish.
          <span class="dim">No mystery, no black box — here's every step.</span></p>
      </div>
    </section>

    <section class="section">
      <div class="shell timeline">
        <ol class="timeline-rail" aria-hidden="true" style="--progress:0">
          ${PROCESS_STEPS.map((step, index) => `
            <li data-rail="${index}" data-active="${index === 0}" data-passed="${index === 0}">
              <span class="dot"></span><span class="rail-label">${esc(step.label)}</span>
            </li>`).join('')}
        </ol>

        <ol class="timeline-steps" style="list-style:none;margin:0;padding:0">
          ${PROCESS_STEPS.map((step, index) => `
            <li class="timeline-step" data-step="${index}" data-visible="false">
              <span class="step-num">${String(index + 1).padStart(2, '0')}</span>
              <h3>${esc(step.title)}</h3>
              <p>${esc(step.copy)}</p>
            </li>`).join('')}
        </ol>
      </div>
    </section>
  </main>`;
}

function mountLookInside() {
  const steps = $$('.timeline-step');
  const rail = $('.timeline-rail');
  const rails = $$('.timeline-rail li');
  if (!steps.length) return;

  /** Light every marker up to `index`, and fill the bar to match (R7). */
  function setActive(index) {
    rails.forEach((item) => {
      const position = Number(item.dataset.rail);
      item.dataset.active = String(position === index);
      item.dataset.passed = String(position <= index);
    });
    // Fill proportionally to the active marker's position along the rail.
    const progress = rails.length > 1 ? index / (rails.length - 1) : 1;
    rail?.style.setProperty('--progress', String(progress));
  }

  /* With reduced motion — or no observer — show everything up front. */
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    steps.forEach((step) => { step.dataset.visible = 'true'; });
    setActive(rails.length - 1);
    return;
  }

  setActive(0);

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.dataset.visible = 'true';
      setActive(Number(entry.target.dataset.step));
    }
  }, { rootMargin: '-25% 0px -35% 0px', threshold: 0.01 });

  steps.forEach((step) => observer.observe(step));
  registerCleanup(() => observer.disconnect());
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
      <label for="${id}">${esc(label)}</label>
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
        <h1 class="display display--lg" data-reveal style="max-width:18ch">Build something you're proud of.</h1>
      </div>
    </section>

    <section class="section">
      <div class="shell">
        ${gallery.length
          ? `<div class="bts-strip">${gallery.map((entry) =>
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
          At Advatar, growth isn't just something we chase for clients — we build it into how we work together.
          <span class="dim">This is a place to stretch, take ownership, and do work you're proud to put your name on.</span>
        </p>

        <div style="margin-top:clamp(2.5rem,6vw,4rem)">
          ${eyebrow('Our values in action', 'plus')}
          <p class="tiny" style="margin:-1.5rem 0 0">The principles that guide how we work and collaborate.</p>
          <ol class="values-list">
            ${VALUES.map((value, index) => `
              <li><span class="value-num">${String(index + 1).padStart(2, '0')}</span>${esc(value)}</li>`).join('')}
          </ol>
        </div>

        <div class="stack" style="margin-top:2.5rem">
          <p class="lede">If you want to build something you're proud of — and help others do the same — we'd like to meet you.</p>
          <div><a class="btn btn--gold" href="#vacancies">Join us ${icon('arrowRight')}</a></div>
        </div>
      </div>
    </section>

    <section class="section" id="vacancies">
      <div class="shell">
        ${eyebrow('Open roles', 'briefcase')}
        <h2 class="display display--lg" data-reveal style="margin-bottom:2rem">Vacancies.</h2>

        <div class="job-filters">
          <div class="field">
            <label for="job-q">Keyword</label>
            <input id="job-q" type="search" data-filter="job-q" placeholder="Role, skill, keyword">
          </div>
          <div class="field">
            <label for="job-loc">Location</label>
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
        panel.hidden = false;
        panel.classList.add('disclosure-panel--animated');
        // Next frame, so the transition has a start value to animate from.
        requestAnimationFrame(() => { panel.dataset.open = String(!open); });
      } else {
        panel.hidden = open;
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
    { node: $('.hero-media'), rate: 0.35 },
    { node: $('.hero-light'), rate: 0.28 },
    { node: $('.hero-hand'), rate: 0.45 },
  ].filter((layer) => layer.node);

  const content = $('.hero-content');
  const foot = $('.hero-foot');
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    const height = hero.offsetHeight || 1;
    if (y > height) return;                    // hero is off-screen; nothing to do

    for (const { node, rate } of layers) {
      node.style.transform = `translate3d(0, ${y * rate}px, 0)`;
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
 * Single-row swipeable carousel (R4): native scroll-snap for touch and
 * trackpad, pointer-drag for mouse, and a right-edge fade + nudge button that
 * disappear once the end is reached.
 */
function mountCarousel(root) {
  if (!root) return;
  const track = $('.carousel-track', root);
  const next = $('.carousel-nav', root);
  if (!track) return;

  const updateEnd = () => {
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
    root.dataset.atEnd = String(atEnd);
  };

  const step = () => Math.max(track.clientWidth * 0.8, 260);
  next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

  track.addEventListener('scroll', updateEnd, { passive: true });
  updateEnd();

  /* Mouse drag. Touch is left to the browser's own momentum scrolling. */
  let dragging = false;
  let startX = 0;
  let startScroll = 0;

  const onPointerDown = (event) => {
    if (event.pointerType === 'touch') return;
    dragging = true;
    startX = event.clientX;
    startScroll = track.scrollLeft;
    track.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!dragging) return;
    const delta = event.clientX - startX;
    // Only claim the gesture once it's clearly a drag, so clicks still work.
    if (!track.dataset.dragging && Math.abs(delta) < 4) return;
    track.dataset.dragging = 'true';
    track.scrollLeft = startScroll - delta;
  };

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    if (track.hasPointerCapture?.(event.pointerId)) track.releasePointerCapture(event.pointerId);
    // Defer so the click that ends a drag is swallowed, not followed.
    requestAnimationFrame(() => { delete track.dataset.dragging; });
  };

  track.addEventListener('pointerdown', onPointerDown);
  track.addEventListener('pointermove', onPointerMove);
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  const onResize = () => updateEnd();
  window.addEventListener('resize', onResize);
  registerCleanup(() => window.removeEventListener('resize', onResize));
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
              ${item.glyph ? icon(item.glyph) : ''}<span>${esc(item.label)}</span>
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
  renderEditBar();
}

function renderEditBar() {
  $('.edit-bar')?.remove();
  if (!state.authed) return;

  const bar = document.createElement('div');
  bar.className = 'edit-bar';
  bar.innerHTML = `
    <span>Edit mode</span>
    <button type="button" class="icon-btn" data-logout aria-label="Log out of edit mode">${icon('logout')}</button>`;
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
  { name: 'category', label: 'Industry', type: 'text', hint: 'Groups the client on Our Work.' },
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
    submissions: openSubmissionsList,
  };

  $$('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => handlers[button.dataset.edit]?.());
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

/* ============================================================== Boot ====== */

async function boot() {
  /* Settings are needed by the footer on every route, so fetch them up front. */
  try {
    await load('settings');
  } catch (error) {
    console.error('Could not load settings', error);
    state.settings = { contact: { email: 'marketing@advatar.co.uk' } };
  }

  try {
    const { authed, configured } = await api.get('/api/auth');
    state.authConfigured = configured;
    setAuthed(authed);
  } catch {
    setAuthed(false);
  }

  await renderRoute(window.location.pathname);
}

boot();
