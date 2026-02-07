Use this file to reference work you've done previously and post patch notes. Also reflect on any changes or mistakes that you've made and put them in here to learn from them, so you don't do them again. 

---

## Codebase Overview (Feb 7, 2026)

**Achievement Vault** is a game completion/achievement tracking web app. It uses a Node/Express backend with MySQL (via stored procedures) and a vanilla JS frontend (jQuery, no framework). All HTML is dynamically built by JS files at runtime.

### Architecture Pattern
- **HTML files** are minimal shells — just a `<div>` container and a `<script>` tag. They load shared CSS, jQuery, and xlsx library.
- **JS files** do all the heavy lifting: they call the Node backend API endpoints, get JSON data, loop through it, and dynamically build the DOM using `document.createElement` and jQuery `.append()`.
- **Backend** (`backend/routes/db.js`) is an Express router that calls MySQL stored procedures and returns JSON. All routes are prefixed with `/api/db/`.
- **`server.js`** serves static files from `public/` and has custom routes so `.html` extensions are optional (e.g., `/game` serves `game.html`).

### Data Model (conceptual)
- **Games** — top-level entities (e.g., a video game)
- **SectionGroups** — groups of sections within a game (e.g., "100% Completion")
- **Sections** — categories within a section group (e.g., "Collectibles", "Quests")
- **Records** — individual checklist items within a section (with checkboxes for tracking completion)
- **GameTables / TableRecords** — separate data tables for a game (non-checklist reference data with up to 6 custom fields)

### Page Flow
1. **`index.html`** + `script_home.js` — Home page. Fetches all games (`/api/db/games/all`), displays them as clickable list items. Clicking navigates to `/game?id=X&name=Y`.
2. **`game.html`** + `script_gamePage.js` — Game landing page. Uses `getGameDataV2()` which returns game info plus counts of tables/section groups. Shows links to: Checklists, Other Tables (if any), Admin.
3. **`checklistGroups.html`** + `script_checklistGroups.js` — Lists all section groups for a game. Clicking one navigates to `/checklist?gameId=X&sectionGroupId=Y`.
4. **`checklist.html`** + `script_checklist.js` — The main checklist view. Fetches sections by section group ID, then fetches records for each section in parallel. Builds collapsible sections with checkboxes. Features:
   - Filter input (search by name/description with highlighting via `<mark>`)
   - "Show Completed" toggle
   - "Expand All" toggle  
   - Completion tracking (per-section and total percentage)
   - Checkbox changes call `updateRecordCompletion()` to persist to DB
   - Record ordering handled client-side via `getRecordsBySectionIdV2()` with sort preferences: `order-name`, `completed-order-name`, `completed-name`, `name`
5. **`table.html`** + `script_tablePage.js` — Displays non-checklist data tables for a game. Fetches game tables by game ID, then table records by table ID. Builds HTML `<table>` elements with sortable columns (click header to sort). Tables are in collapsible sections.
6. **`manage_sections.html`** + `script_manage_sections.js` — Admin page for reordering sections via drag-and-drop. Each section card has a "Manage Records" button to navigate to record management.
7. **`manage_sectionRecords.html`** + `script_manage_sectionRecords.js` — Admin page for managing individual records within a section. Supports:
   - Drag-and-drop reordering
   - Add new record (modal form)
   - Edit existing record (populates same modal)
   - Delete record
   - Fields: Name, Description, NumberOfCheckboxes, NumberAlreadyCompleted, ListOrder, LongDescription, Hidden

### Shared JS Modules
- **`script_db_helper.js`** — Central API layer. All fetch calls to the backend live here. Exports functions like `getGameData()`, `getGameDataV2()`, `getSectionsByGameId()`, `getRecordsBySectionIdV2()`, `updateRecordCompletion()`, `getGameTablesByGameId()`, `getTableRecordsByTableId()`, `updateGameRecord()`, `insertGameRecord()`, `deleteGameRecord()`, `getSectionGroupsByGameId()`, `getSectionGroupById()`, `getSectionsBySectionGroupId()`, `updateGameSection()`, `insertGameSection()`, `updateGameSectionsListOrder()`, `updateSectionRecordsListOrder()`.
- **`script_utilities.js`** — Helper functions: `getQueryParam()` (reads URL params), `createSlug()` (converts strings to URL-safe slugs), `trimBeforeParenthesis()`, `removeTrailingSpace()`, `logAllAttributes()`.

### Styling
- **`styles.scss`** — Main stylesheet compiled to `styles.css`. Uses a teal color scheme (5 teal shades + light/medium/dark font colors). Key classes:
  - `.game-list-item`, `.section-header` — clickable list/accordion items
  - `.section` — collapsible content (hidden by default)
  - `.grid-item-1-row`, `.grid-item-2-row` — checklist item layouts (1-row = name only, 2-row = name + description)
  - `.section-card`, `.record-card` — draggable admin cards
  - `.modal` — add/edit record modal
  - `.controls-panel` — filter/toggle controls container
  - `.filter-input`, `.switch` — custom styled inputs
- **`mixins.scss`** — SCSS mixins for decorative corner effects and linear gradients.

### Navigation Pattern
- Every sub-page has home (house icon) and back (arrow icon) links in a `.link-container` div
- Navigation uses query parameters: `id`, `gameId`, `sectionId`, `sectionGroupId`
- `script_home.js` is the only non-module script (no imports/exports); all others use ES6 modules

### Backend API Routes Summary (`/api/db/...`)
| Method | Route | Stored Procedure | Purpose |
|--------|-------|-------------------|---------|
| GET | `/games/all` | `GetAllGames()` | List all games |
| GET | `/games/:gameId` | `GetGameById(?)` | Get single game |
| GET | `/games/v2/:gameId` | `GetGameByIdV2(?)` | Get game + table/sectionGroup counts |
| GET | `/sections/:gameId/:hiddenFilter` | `GetGameSectionsByGameID(?,?)` | Sections by game |
| GET | `/sections/sectionGroupId/:sectionGroupId/:hiddenFilter` | `GetGameSectionsBySectionGroupID(?,?)` | Sections by section group |
| GET | `/section/:sectionId` | `GetSectionById(?)` | Single section |
| POST | `/section/insert` | `InsertGameSection(?,?,?,?,?)` | Create section |
| PUT | `/section/update/:sectionId/:gameId` | `UpdateGameSection(?,?,?,?,?)` | Update section |
| PUT | `/sections/updateListOrder` | `UpdateGameSectionsListOrder(?,@rowsUpdated)` | Batch reorder sections |
| GET | `/records/:sectionId/order/:pref/hiddenFilter/:filter` | `GetGameRecordsByGameSectionID(?,?,?)` | Records with server-side ordering |
| GET | `/records/v2/:sectionId/hiddenFilter/:filter` | `GetGameRecordsByGameSectionIDV2(?,?)` | Records with client-side ordering |
| GET | `/record/:recordId` | `GetGameRecordByRecordID(?)` | Single record |
| POST | `/record/insert` | `InsertGameRecord(?,?,?,?,?,?,?,?,?)` | Create record |
| PUT | `/record/update/:recordId` | `UpdateGameRecord(?,?,?,?,?,?,?,?,?,?)` | Update record |
| PUT | `/record/updateCompletion/:recordId` | `UpdateGameRecordCompletion(?,?)` | Update checkbox completion |
| DELETE | `/record/delete/:recordId` | `DeleteGameRecord(?)` | Delete record |
| PUT | `/records/updateListOrder` | `UpdateSectionRecordsListOrder(?,@rowsUpdated)` | Batch reorder records |
| GET | `/gameTables/:gameId` | `GetAllGameTablesByGameID(?)` | Game tables by game |
| GET | `/tableRecords/:tableId` | `GetAllTableRecordsByTableID(?)` | Table records by table |
| GET | `/sectionGroups/:gameId/:hiddenFilter` | `GetSectionGroupsByGameID(?,?)` | Section groups by game |
| GET | `/sectionGroup/:sectionGroupId` | `GetSectionGroupById(?)` | Single section group |

### Key Libraries
- jQuery 3.6.0 (CDN)
- xlsx.js 0.18.5 (CDN) — included but usage not seen in current JS (likely for Excel import/export functionality)
- Font Awesome 6.0.0-beta3 (CDN) — icons for navigation, chevrons
- Google Fonts: Merriweather, Roboto

### Notes / Things to Be Aware Of
- `script_home.js` is NOT an ES6 module (uses `window.onload`), while all other page scripts use `import`/`export` and `type="module"`.
- The checklist page has two rendering paths: initial load via `processData()` and filtered re-render via `renderFilteredChecklist()` — they build similar HTML but have slightly different behavior (filtered always starts expanded with sections visible).
- `hiddenFilter` parameter is used across many endpoints to optionally include/exclude hidden sections and records.
- Drag-and-drop logic is duplicated between `script_manage_sections.js` and `script_manage_sectionRecords.js` (nearly identical `enableDragAndDrop`, `getDragAfterElement`, `updateListOrders`, `highlightChanged*` functions).
- The `manage_sectionRecords.js` save button has a duplicate event listener — one inside `$(document).ready()` and one inside `initializeGameRecordsReorder()`.
- There are commented-out integrations with SendGrid (email) and Google Sheets (logging) that are no longer active.