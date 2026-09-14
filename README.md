# Advatar — website

Static single-page marketing site: one `index.html` shell, one `app.js`, one `styles.css`,
no framework and no build step, with a small set of Vercel functions and a key-value
store behind it. Every piece of content is editable in the browser through **Web dev
edit** mode — nothing on the site is hardcoded.

```
index.html      SPA shell: #app mount, theme bootstrap, grain + ambient layers, font links
styles.css      design tokens + every component
app.js          router, page renderers, modal/toast/glass components, edit mode
api/            one file per endpoint (Vercel serverless functions)
lib/kv.js       the data layer — the ONE file to change if you swap database
lib/            auth, http helpers, collection CRUD factory, seed loader
data/seed.json  initial content; also the fallback for any key never written
assets/         logos (dark + light), intro film, film-grain tile, keyed hero video and poster
vercel.json     SPA rewrites, security headers
```

## Running locally

```bash
npm install
npx vercel dev
```

Create a `.env` file first (it is gitignored):

```
ADMIN_PASSWORD=pick-something-long
SESSION_SECRET=<64 random hex chars>
ALLOW_SEED=1
ADVATAR_LOCAL_STORE=1
```

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Without `KV_REST_API_URL` / `KV_REST_API_TOKEN`, the data layer falls back to a local
JSON file at `.data/store.json`. That is fine for local work but **does not persist on
Vercel** — serverless filesystems are ephemeral and per-instance.

**Local dev never touches production.** The Upstash variables are enabled for the
Development environment, and newer Vercel CLIs pull those into `vercel dev` automatically —
which would make every local test edit land on the live site. `lib/kv.js` therefore uses the
local file store whenever `VERCEL_ENV` is `development` or `ADVATAR_LOCAL_STORE=1`. Deployed
functions (production and preview) are unaffected.

## Database

The original plan called for Vercel KV. Vercel KV has since been retired as a
first-party product; **Upstash for Redis** is its direct successor and is what
`lib/kv.js` targets. Provision it from the Vercel Marketplace:

```bash
vercel integration add upstash/upstash-kv
```

This injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` into the project automatically.
Pull them locally with `vercel env pull`.

Moving to Postgres later (Neon, Supabase) means rewriting `lib/kv.js` and nothing else —
every route above it only calls `get(key)` / `set(key, value)`.

## Seeding

`POST /api/seed` loads `data/seed.json` into the store. It is double-gated: `ALLOW_SEED=1`
**and** a valid edit-mode session.

```bash
# after logging into edit mode in the browser, or with a session cookie:
curl -X POST https://your-domain/api/seed          # only fills keys that are unset
curl -X POST https://your-domain/api/seed?force=1  # overwrites everything
```

Delete `api/seed.js` (or leave `ALLOW_SEED` unset) once the real content is in.

Routes also fall back to the seed for any key that has never been written, so a fresh
deployment renders correctly even before you seed.

## Edit mode

The low-contrast **Web dev edit** pill sits bottom-right in the footer. It prompts for
`ADMIN_PASSWORD` and, on success, sets an httpOnly, `SameSite=Lax`, 8-hour session cookie
signed with `SESSION_SECRET`.

Once unlocked, small `edit` chips appear beside every editable region:

| Page       | What you can edit                                                    |
|------------|----------------------------------------------------------------------|
| Home       | Hero video / poster / hand asset URLs; light + dark logos; background texture; which clients are Recent Wins |
| Our Work   | Clients (videos, category, notes, case-study flag), each industry's feature reel, websites, photography, branding, results |
| About      | Founded / clients / team numbers — these feed the copy directly       |
| Contact    | WhatsApp number, email; read and delete contact submissions           |
| We're Hiring | Behind-the-scenes gallery; add/edit/delete vacancies                |

For visitors without a session the edit affordances are **not rendered at all** — they are
absent from the DOM, not merely hidden — and every write is re-authorised server-side.

### Editing any text

The edit bar has an **Edit text** switch. With it on, every heading, paragraph, button
label, eyebrow and nav item is outlined; click one to edit it in place. **Enter** saves,
**Shift+Enter** adds a line break, **Escape** cancels, and **Reset** returns to the original
wording. While it's on, clicks edit rather than navigate — switch it off to browse normally.

Overrides are stored as a single `copy` object (`/api/copy`), keyed by each element's
`data-copy` attribute. The original wording lives in the page markup, so an empty store is
simply the site as designed. Client names, videos and job details are data rather than copy —
edit those in their managers, as before.

### Syncing clients

Once the client list has been edited on the live site, the stored list is what shows —
changes to `data/seed.json` never appear there on their own. **Sync clients** (beside Manage
clients on Our Work) lists what the seed has that the live list doesn't — new clients, and
category changes — and applies only what you tick. It never deletes anything, and never
touches videos, taglines or flags.

### Look Inside images

**Edit step images** on the Look Inside page takes one line per image: the step number, then
an image URL **or a Google Drive link**, then an optional caption — e.g.
`3 | https://drive.google.com/file/d/…/view | Our first meeting`. Drive links are stored as
the file id and shown through Drive's thumbnail service, so the file must be shared as
"Anyone with the link". Steps without an image show a placeholder.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | yes | Unlocks edit mode |
| `SESSION_SECRET` | yes | Signs the session cookie |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | yes in production | Upstash Redis; set by the integration |
| `ALLOW_SEED` | no | Set to `1` to enable `POST /api/seed` |
| `ADVATAR_LOCAL_STORE` | local only | `1` keeps `vercel dev` on the local file store. Never set it on Vercel |
| `RESEND_API_KEY` + `CONTACT_NOTIFY_TO` | no | Emails you each contact submission |
| `CONTACT_NOTIFY_FROM` | no | Verified Resend sender address |

Contact submissions are stored regardless; email notification is purely additive and a
failure there never fails the submission.

## Themes

Two themes share one set of token names. Dark is the base `:root` declaration;
`:root[data-theme="light"]` overrides the palette half. **Dark is the default** — a tiny
inline script in `<head>` stamps the attribute from `localStorage` before first paint, so
there is no flash of the wrong theme. The sun/moon toggle sits in the nav on every page
and again inside the menu panel; where the View Transitions API exists, switching crossfades
the whole page.

**Theme notice.** On a browser's first visit, once the page is showing, the toggle is
spotlighted for a few seconds with a "Switch light / dark anytime" hint. The theme itself never
changes. It shows once per browser; add `?hint=1` to any URL to show it again.

## Intro film and logo

A fresh load of the **homepage** opens on the intro film (`assets/loader.mp4`, 5.4s, silent).
When it ends on the Advatar wordmark, the wordmark flies from the centre of the screen into
the nav, landing exactly on the logo, while the black backdrop fades away to reveal the page.

- Click, tap, **Escape**, **Enter** or **Space** skips straight to the flight.
- It never plays on other pages, for `prefers-reduced-motion`, or with `?loader=0`. If the
  film can't load or play, the page is released at once, and a 15-second failsafe in
  `index.html` covers the case where `app.js` never runs.
- The film was trimmed from the supplied 10s cut: the wordmark is fully settled at 5.4s, and
  the rest was a static hold.
- The flight is measured against the film's frame. `FILM_MARK` in `app.js` is the wordmark's
  position in the 1280×720 frame, so if the film is ever replaced, re-measure it there.

The logos are `assets/logo-dark.png` (white, for dark mode) and `assets/logo-light.png`
(black, for light mode), cropped tight from the supplied artwork on a transparent
background. Custom logo URLs set in edit mode still override them, but a logo with a
different shape won't line up with the film's wordmark during the flight.

Two accent tokens exist on purpose:

- `--gold-1` — the accent for large display text, icons, borders and glows.
- `--gold-text` — the accent that is safe on **small text**. On dark they are the same
  colour; in light mode `--gold-1` (`#C97A2E`) only reaches 3.1:1, so small text uses the
  deeper `#8F5620` (5.6:1) instead.

Contrast is verified, not assumed: every text node on all six pages was measured in both
themes against its real composited backdrop, and all of it clears WCAG AA. If you change a
palette value, re-check it — the failure mode is silent.

## Design system

Tokens live at the top of `styles.css`.

- **Type** — General Sans (Fontshare) for display, Inter for UI. Nothing below 12px.
- **Grain** — a 512px tile cut from a scanned film-grain texture, contrast-boosted so blend
  modes actually bite, re-exposed every "frame" so it reads as film rather than a static
  overlay. 30% `overlay` on dark; 7.5% `multiply` on light. It sits **below** all content, so
  photos and video are never grained.
- **Texture** — nothing sits on flat colour. A fixed warm gradient mesh (`.ambient`) sits
  behind every page; setting `settings.textureUrl` layers a blurred, dimmed still from real
  work beneath it.
- **Golden glow** — reusable blurred radial `.glow` with a slow continuous drift, scaled
  down in light mode via `--glow-scale` so it reads as warmth, not as a glow effect.
- **Liquid glass** — `.glass-card`: `backdrop-filter: blur(20px) saturate(140%)`, 1px
  border, 20px radius, lifting slightly on hover.
- **Hairline grid** — fixed vertical rules with `×` markers, hidden under 900px.

## Motion

- **Scroll reveals** — anything marked `[data-reveal]` fades and lifts in on entry, with a
  `--i` stagger for grouped items. Driven by one shared IntersectionObserver.
- **Hero parallax** — the background layers track scroll at 0.28–0.45×, and the hero
  content fades out as the next section rises over it.
- **Look Inside** — a sticky, scroll-filled timeline. Each step's name pins beside the line
  while its text and image scroll past, then hands over to the next. The gold fill grows
  continuously with scroll — its tip always on the reading line, 55% down the screen — and
  lights each marker as it arrives. A step's name reveals together with its text. Below
  900px the name moves above the text and the markers shrink, but the line and fill stay.
- **Carousels** — Recent Wins and every client's video list drift slowly sideways and loop
  seamlessly. The loop clones are only made when a row is wider than the screen, so one or
  two videos simply sit still. Hover, focus, a player being watched, or a hidden tab pauses
  the drift; rows can be dragged with the mouse or swiped.
- **Instant by design** — the Our Work industry/client panels show and hide with no
  animation, as the original brief required. Photography and Websites unravel with a
  transition; they opt in via `data-animate="true"`.
- **`prefers-reduced-motion`** — reveals appear instantly, parallax and glow drift stop,
  hover displacement is removed. Reveals also short-circuit if `IntersectionObserver` is
  missing, so content can never be left invisible.

## Clients

`data/seed.json` carries 48 clients across 9 categories, deduplicated from both tabs of the
client spreadsheet so nobody appears twice. **Personal Brands & Creators** always leads the
category order, and **Car & Transport** always comes last. Where a client also had event-photography coverage, that is
recorded in their `notes` field rather than duplicating them under a second category.

Two flags drive where a client appears:

- `isRecentWin` — the Home page carousel.
- `isCaseStudy` — the Results "see more" view. Defaults to `isRecentWin`, so featuring a
  client as a case study later is a single checkbox in edit mode.

The hero needs no assets: the amber light shaft is pure CSS and recomposes on mobile so
the headline always sits on dark ground. Supplying `heroVideoDesktopUrl` /
`heroVideoMobileUrl` / `heroPosterUrl` / `heroHandAssetUrl` layers real footage underneath it.

## Videos

Client videos are Google Drive files that **play inline, right in their tile** — one press
on the player plays it, and fullscreen is in the player's own controls. There is no pop-up.

- Each tile shows the poster (the sharp frame over a blurred fill of itself). As the tile
  scrolls into view, Drive's player drops into a box sized to the video's **true shape**,
  centred in the tile — a square video gets a square player, with no black bars.
- Drive's player won't lay itself out narrower than 320px; in a smaller tile it overflows
  and crops. So it is laid out at 480px (or the frame's width, if wider) and scaled down to
  the tile. Browsers drop the scale when the player goes fullscreen.
- Drive's **Pop out** button opens the file in a new tab. A shield over that corner, sized in
  the player's own units, swallows the click.
- Carousels hold still while a row is hovered or one of its players has been clicked into,
  so a video never slides away mid-watch.

For a poster to appear, the Drive file must be shared as **Anyone with the link**. A file
that isn't still shows as a play tile.

**Players are rationed.** Every Drive embed is a whole web page, and a phone reloads the tab
once it holds too many — which is what made the site "refresh" mid-scroll. So a player
only exists while its tile is on screen: it loads once the tile has settled into view, is
released a moment after it leaves, and no more than 4 (phones) or 10 (desktop) are ever
live at once. The one being watched is never evicted. Posters use a small thumbnail for the
same reason.

On touch screens a carousel's drift holds while a finger is on it and for a couple of
seconds after, so it never fights a swipe.

### Our Work reels

- **Selected reels** — clients ticked *Featured*, as a drifting carousel (up to 12).
- **By industry** — each industry opens on its **feature reel**, then every other reel in
  that industry in one small drifting row, each card named for its client. Clients with no
  reels yet are listed underneath. No reel appears twice.
- **Feature reels** (edit chip beside Manage clients) — one Google Drive link per industry.
  Upload the video to Drive, share it as "Anyone with the link", paste the link. Leave one
  blank and that industry leads with its first client video instead.

## Not built

Phase 9 (the **Login** button linking to the CRM) is deliberately not built. The nav slot
is reserved and marked in both `app.js` and `styles.css` with
`LOGIN BUTTON — DO NOT BUILD UNTIL EXPLICITLY ASKED`.
