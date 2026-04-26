# SubTrack — Project Guide

Subscription tracker web app. Pure HTML/CSS/JS frontend with Vercel serverless API and Neon Postgres for cross-device sync.

## Live URLs
- **Production**: https://sub-tracker-nutface.vercel.app
- **GitHub**: https://github.com/nutface55/sub-tracker (branch: `main`)
- **Vercel project**: `nutface/sub-tracker`

## Stack
- Frontend: vanilla HTML/CSS/JS — no framework, no build step
- Database: Neon Postgres (shared Vercel integration `neon-amethyst-planet`, same team as gold-dashboard)
- API: single Vercel serverless function at `api/data.js`
- Auth: 6-digit numeric passcode stored in `localStorage` — same passcode on any device = same synced data

## File Map
| File | Purpose |
|------|---------|
| `index.html` | Entry point (served at `/`). All CSS lives here. |
| `SubTrack.html` | Mirror of index.html — keep both in sync when editing HTML/CSS |
| `st-data.js` | Data layer: globals, helpers, `persist()`, `loadState()`, passcode logic |
| `st-render.js` | Renders stats bar, tabs, category chips, table rows, cards, footer |
| `st-panel.js` | Add/edit slide-in panel, all modals (shortcuts, exchange rates, budget), dark mode, CSV import/export |
| `st-views.js` | Chart view (SVG bar chart) and calendar view (12-month grid), `setView()` |
| `st-init.js` | Event listeners, keyboard shortcuts, resize handling, app bootstrap |
| `api/data.js` | Serverless function: `GET /api/data?key=xxx` and `POST /api/data?key=xxx` |

## Global State
All state lives on `window`:
- `SUBS` — array of subscription objects
- `RATES` — exchange rates to THB (`{ THB:1, USD:36.2, ... }`)
- `BUDGET` — monthly cap in THB (0 = no cap)
- `STATE` — `{ filter, query, catFilter, view, dark }`
- `TODAY` — `new Date()` (used for all date math)

Persisted to `localStorage` key `subtrack.v2` AND synced to Neon via `/api/data`.

## Sync / Passcode
- User's passcode is stored in `localStorage` as `subtrack.userkey`
- On load: if no key (or old UUID format) → passcode screen appears
- `loadState()` is async: renders from localStorage immediately, then fetches from server and re-renders
- `persist()` saves to localStorage instantly + debounced POST to API (600ms)
- Passcode minimum: 6 digits (enforced in both frontend and `api/data.js`)

## Database
Single table in Neon Postgres:
```sql
CREATE TABLE IF NOT EXISTS user_data (
  user_key   TEXT PRIMARY KEY,
  subs       JSONB    DEFAULT '[]',
  rates      JSONB    DEFAULT '{}',
  budget     NUMERIC  DEFAULT 0,
  dark       BOOLEAN  DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
Table is auto-created on first API call (`CREATE TABLE IF NOT EXISTS`).

## Responsive Breakpoints
| Width | Layout |
|-------|--------|
| > 1024px | Full table, all columns |
| 768–1024px | iPad mini: full table, annual column restored, 460px side panel, 3-col calendar |
| ≤ 767px | Mobile: card list, bottom-sheet panel/modals, FAB, compact stat pills |
| ≤ 390px | iPhone SE: stat labels hidden, tab counts hidden |

## Features
- Add/edit/delete/pause/duplicate subscriptions
- Multi-currency (THB base; USD/EUR/GBP/SGD/JPY via editable exchange rates)
- Categories with color-coded filter chips
- Trial badge + trial end date
- Price history (auto-logged on cost change)
- Renewal reminders (badge appears N days before)
- Split billing (shows your share)
- Notes field per subscription
- Drag-to-reorder rows
- Dark mode (persisted)
- Chart view: 12-month projected spend bar chart
- Calendar view: 12-month renewal grid
- Budget cap (click monthly total in header)
- CSV export/import
- Keyboard shortcuts (`/` search, `⌘N` add, `D` dark, `1/2/3` views, `?` shortcuts)

## Deploying
```bash
vercel --prod --yes
```
No build step — Vercel detects static + `api/` automatically. Bump `?v=N` on script tags in both `index.html` and `SubTrack.html` to bust browser cache after JS changes.

## Things Left To Do / Ideas
- Push notifications for upcoming renewals
- Recurring renewal auto-advance (bump `renews` date after each cycle)
- Better passcode UI (dots instead of input field, on-screen numpad for mobile)
- Receipt/invoice attachment per subscription (Vercel Blob)
- Shared household view (multiple passcodes pointing to same data)
