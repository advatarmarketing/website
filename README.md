# Advatar — website

Static single-page marketing site: one `index.html` shell, one `app.js`, one `styles.css`,
no framework and no build step, with a small set of Vercel functions and a key-value
store behind it. Every piece of content is editable in the browser through **Web dev
edit** mode — nothing on the site is hardcoded.

```
index.html      SPA shell: #app mount, grain filter, hairline grid, font links
styles.css      design tokens + every component
app.js          router, page renderers, modal/toast/glass components, edit mode
api/            one file per endpoint (Vercel serverless functions)
lib/kv.js       the data layer — the ONE file to change if you swap database
lib/            auth, http helpers, collection CRUD factory, seed loader
data/seed.json  initial content; also the fallback for any key never written
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
```

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Without `KV_REST_API_URL` / `KV_REST_API_TOKEN`, the data layer falls back to a local
JSON file at `.data/store.json`. That is fine for local work but **does not persist on
Vercel** — serverless filesystems are ephemeral and per-instance.

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
| Our Work   | Clients (videos, category, notes, case-study flag), websites, photography, branding, results |
| About      | Founded / clients / team numbers — these feed the copy directly       |
| Contact    | WhatsApp number, email; read and delete contact submissions           |
| We're Hiring | Behind-the-scenes gallery; add/edit/delete vacancies                |

For visitors without a session the edit affordances are **not rendered at all** — they are
absent from the DOM, not merely hidden — and every write is re-authorised server-side.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | yes | Unlocks edit mode |
| `SESSION_SECRET` | yes | Signs the session cookie |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | yes in production | Upstash Redis; set by the integration |
| `ALLOW_SEED` | no | Set to `1` to enable `POST /api/seed` |
| `RESEND_API_KEY` + `CONTACT_NOTIFY_TO` | no | Emails you each contact submission |
| `CONTACT_NOTIFY_FROM` | no | Verified Resend sender address |

Contact submissions are stored regardless; email notification is purely additive and a
failure there never fails the submission.

## Themes

Two themes share one set of token names. Dark is the base `:root` declaration;
`:root[data-theme="light"]` overrides the palette half. **Light is the default** — a tiny
inline script in `<head>` stamps the attribute from `localStorage` before first paint, so
there is no flash of the wrong theme. The sun/moon toggle sits in the nav on every page
and again inside the menu panel.

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
- **Grain** — fixed `feTurbulence` overlay. 12% at `mix-blend-mode: overlay` on dark;
  6% at `soft-light` on light, where stronger grain reads as dirt.
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
- **Look Inside** — a progress rail fills as you scroll, with a marker per step that lights
  as its text becomes active.
- **Instant by design** — the Our Work industry/client panels show and hide with no
  animation, as the original brief required. Photography and Websites unravel with a
  transition; they opt in via `data-animate="true"`.
- **`prefers-reduced-motion`** — reveals appear instantly, parallax and glow drift stop,
  hover displacement is removed. Reveals also short-circuit if `IntersectionObserver` is
  missing, so content can never be left invisible.

## Clients

`data/seed.json` carries 45 clients across 8 categories, deduplicated from the spreadsheet
so nobody appears twice. Where a client also had event-photography coverage, that is
recorded in their `notes` field rather than duplicating them under a second category.

Two flags drive where a client appears:

- `isRecentWin` — the Home page carousel.
- `isCaseStudy` — the Results "see more" view. Defaults to `isRecentWin`, so featuring a
  client as a case study later is a single checkbox in edit mode.

The hero needs no assets: the amber light shaft is pure CSS and recomposes on mobile so
the headline always sits on dark ground. Supplying `heroVideoDesktopUrl` /
`heroVideoMobileUrl` / `heroPosterUrl` / `heroHandAssetUrl` layers real footage underneath it.

## Not built

Phase 9 (the **Login** button linking to the CRM) is deliberately not built. The nav slot
is reserved and marked in both `app.js` and `styles.css` with
`LOGIN BUTTON — DO NOT BUILD UNTIL EXPLICITLY ASKED`.
