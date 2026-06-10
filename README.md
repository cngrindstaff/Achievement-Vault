# Achievement Vault

A web app for tracking video game completion — achievements, collectibles, quest steps, and other checklist items. Items can have multiple checkboxes when progress has degrees (for example, Keepsakes in Hades leveling up to 3).

## How it works

Data is stored in **MySQL**. The hierarchy is:

**Games** → **Section Groups** → **Sections** → **Records** (checklist rows with checkboxes)

Games can also have **Game Tables** — separate reference tables with up to six custom columns per row.

A **Node/Express** server serves the frontend from `public/`, exposes a JSON API under `/api/db/`, and calls MySQL stored procedures for all data access.

## Prerequisites

- Node.js
- MySQL database with the schema and procedures from `sql/`
- Environment variables (see `sample.env`)

## Setup

1. Copy `sample.env` to `.env` and fill in the required values:
   - `AV_USERNAME` / `AV_PASSWORD` — HTTP Basic Auth credentials
   - `AV_SESSION_SECRET` — session cookie signing key
   - `AV_MY_SQL_DB_*` — database connection settings
2. Install dependencies:

```bash
npm install
```

3. Apply SQL scripts from `sql/` as needed (see `CHANGELOG.md` for recent migrations such as audit logging and move-record support).

## Running locally

```bash
npm start
```

Or directly:

```bash
node backend/server.js
```

Open http://localhost:3000/

For auto-restart on file changes:

```bash
npx nodemon backend/server.js
```

On Windows, `runlocal.cmd` opens Chrome and starts the server with `npx nodemon`.

**Authentication:** The app uses HTTP Basic Auth on first visit. After a successful login, `express-session` keeps a cookie so you are not prompted again (default 7 days; set `AV_SESSION_DAYS` in `.env`).

## Project structure

```
backend/
  server.js              Express app, static files, auth, API routes
  routes/db.js           REST API → MySQL stored procedures
  middleware/            Session + Basic Auth
  services/auditLog.js   Append-only audit trail
public/
  *.html                 Page shells (most UI is built by JS at runtime)
  js/script_*.js         Page scripts and shared modules
  css/styles.scss        Main stylesheet (compile to styles.css)
```

See **`agent.md`** for architecture details, API route tables, database notes, and development patch history.

## Page flow

| Page | URL | Script |
|------|-----|--------|
| Home | `/` | `script_home.js` — game list, add game |
| Game | `/game?id=` | `script_gamePage.js` — links to checklists and tables |
| Checklist groups | `/checklistGroups?gameId=` | `script_checklistGroups.js` — section groups; add, edit, reorder |
| Checklist | `/checklist?gameId=&sectionGroupId=` | `script_checklist.js` — main tracking UI |
| Tables | `/table?id=` | `script_tablePage.js` — reference data tables |
| Reorder sections | `/reorder_sections?gameId=&sectionGroupId=` | `script_reorder_sections.js` |
| Reorder records | `/reorder_records?gameId=&sectionId=&sectionGroupId=` | `script_reorder_records.js` |
| Changelog | `/changelog` | `script_changelog.js` |

Navigation uses a shared slide-out menu (`script_nav.js`). Version history lives in `CHANGELOG.md`.

### Checklist page features

- Filter by name or description (with highlight)
- **Show Completed Records** — unchecked hides fully completed rows
- **Show Hidden** — include hidden sections and records
- **Expand All**
- **Sort by Name** — sections and records A–Z; incomplete records first within each section
- **Completed Sections Last** — fully completed sections move to the bottom (faded headers)
- Add/edit/delete sections and records via modals on the checklist page
- Move records between sections (`script_moveRecords.js`)
- Reorder sections or records via dedicated reorder pages

**Record sort preferences** (per section, applied client-side): `order-name`, `name`, `completed-order-name`, `completed-name`. Unset defaults to `order-name`.

## Adding a new route

1. Create `public/yourpage.html` and `public/js/script_yourpage.js`
2. Register a clean URL in `backend/server.js` (follow the existing `app.get('/checklist', ...)` pattern)
3. Call `initNav({ currentPage: '...' })` from `script_nav.js` if the page should use the slide-out menu

## Development notes

- **ES modules** — `package.json` sets `"type": "module"`. Page scripts use `import`/`export` with `type="module"` in HTML.
- **SCSS** — Edit `public/css/styles.scss` and compile to `public/css/styles.css`. If `sass` is not installed globally: `npm install -g sass`. When using a JetBrains File Watcher, set scope to **Current File** ([RIDER-55683](https://youtrack.jetbrains.com/issue/RIDER-55683/Unknown-scope-sign-for-Project-scope-in-SCSS-new-file-watcher)).
- **Debug logging** — Set `DEBUG_LOGGING=true` in `.env`. For checklist record-fetch diagnostics, run `localStorage.setItem('AV_DEBUG_RECORDS','1')` in DevTools and reload.

## Icon

Game controller icon from [Flaticon](https://www.flaticon.com/free-icon/game-controller_8002123?term=controller&page=1&position=12&origin=search&related_id=8002123).
