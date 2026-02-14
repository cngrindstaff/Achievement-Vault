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
- `hiddenFilter` parameter is used across many endpoints to optionally include/exclude hidden sections and records.
- Drag-and-drop logic is duplicated between `script_manage_sections.js` and `script_manage_sectionRecords.js` (nearly identical `enableDragAndDrop`, `getDragAfterElement`, `updateListOrders`, `highlightChanged*` functions).
- The `manage_sectionRecords.js` save button has a duplicate event listener — one inside `$(document).ready()` and one inside `initializeGameRecordsReorder()`.

---

## Patch Notes

### Feb 7, 2026 — Checklist page refactored to use `<template>` elements

**Files changed:** `checklist.html`, `js/script_checklist.js`

**What changed:**
- **`checklist.html`** — No longer an empty shell. Now contains the full static page structure (nav links, headings, controls panel, grid container, total completion) plus three `<template>` elements for repeating UI patterns:
  - `#section-header-template` — collapsible accordion bar
  - `#section-body-template` — section content container
  - `#checklist-item-template` — single record row (label, description, checkbox area)
- **`script_checklist.js`** — No longer builds any HTML from strings. Changes:
  - Static elements (nav, headings, controls) are just populated via `document.getElementById().textContent` and `.href` since they already exist in HTML
  - `processData()` and `renderFilteredChecklist()` consolidated into one `renderChecklist(sections, allRecordsBySection, { startExpanded, filterValue })` function
  - `renderChecklist()` uses `template.content.cloneNode(true)` to clone templates, then sets data attributes and text content on the cloned DOM nodes
  - `generateCheckboxes()` (which returned HTML strings) replaced by `createCheckbox()` which returns a real `document.createElement('input')` element
  - New `createChecklistItem()` function clones the checklist-item template, populates it, and returns the DOM fragment
  - New `fetchAllRecords()` helper extracted for the parallel records fetch (used by both initial load and filter re-render)
  - Section header click handling moved from inline `.on('click')` per header to event delegation on `#grid-checklist-container` — also fixed inconsistency where initial load didn't toggle the chevron icon but filtered view did (now both do)
  - Removed dead code: unused `sendGridUrl`/`googleSheetsAppendUrl` constants, unused `getSectionGroupsByGameId` import, unused `hasDataTables`/`gameName`/`sectionGroupName` variables, commented-out `sendEmail`/`sendDataToSheets` functions
  - Fixed variable scoping: `gameId` and `sectionGroupId` were re-declared with `var` inside `$(document).ready`, shadowing the module-level `let` declarations. This meant `generateCheckboxes()` (at module level) was reading `null` for `gameId`. Now properly sets the module-level variables without re-declaring.
  - Uses `document.createDocumentFragment()` to batch all section DOM nodes before appending to the container (same performance pattern as before)

**Pattern for other pages to follow:**
1. Put static page structure in the HTML file (nav, headings, containers)
2. Add `<template>` elements for any repeating UI patterns
3. JS just: fetches data, clones templates, sets properties on cloned nodes, appends to container
4. Use event delegation on parent containers instead of binding click handlers inline per element

**What NOT to do (lessons from this refactor):**
- Don't re-declare module-level variables with `var` inside callbacks — it creates silent shadowing bugs
- Don't have two separate render functions that build the same HTML differently — consolidate into one with options

### Feb 7, 2026 — Template refactor applied to home, game, checklistGroups, and table pages

**Files changed:** `index.html`, `js/script_home.js`, `game.html`, `js/script_gamePage.js`, `checklistGroups.html`, `js/script_checklistGroups.js`, `table.html`, `js/script_tablePage.js`

**What changed (same pattern as checklist refactor, applied to four more pages):**
- **`index.html`** + `script_home.js` — Added `#game-list-item-template`. JS clones it per game instead of `document.createElement('p')`. Template reference cached at module level.
- **`game.html`** + `script_gamePage.js` — Static nav/heading already existed; added `id="game-name"` to h1. Added `#game-link-template` for the navigation links (Checklists, Tables, Admin). New `appendGameLink()` helper clones template and sets href/text/class. Fixed home link href from `../../` to `./`. Removed unused variables (`gameName`, `passed_gameName`, `countOfSectionGroups` at module level).
- **`checklistGroups.html`** + `script_checklistGroups.js` — Was a completely empty shell. Now has full static structure (nav, headings, list container) plus `#section-group-item-template`. All `mainContainer.append(...)` string building removed. Removed unused variables (`gameName`, `htmlTitle`, `linkToHomePage`).
- **`table.html`** + `script_tablePage.js` — Was a near-empty shell. Now has full static structure plus `#table-section-header-template` and `#table-section-body-template`. `createTableSection()` clones templates instead of building HTML strings. Section header click handling moved to event delegation. `showNoTablesMessage()` uses `document.createElement` instead of `.innerHTML`. `displayTable()` and `sortTable()` were already using `createElement` so those just got minor cleanup. Removed unused variables (`gameName`, `hasDataTables`, `htmlTitle`, `linkToHomePage`).

**Pages still using old pattern (not yet refactored):**
- `manage_sections.html` + `script_manage_sections.js`
- `manage_sectionRecords.html` + `script_manage_sectionRecords.js`

### Feb 7, 2026 — Full CSS/SCSS redesign

**Files changed:** `css/styles.scss` (compiled to `css/styles.css`)

**Design direction:** Warm neutral "soft mode" — not dark mode, not stark white. Easy on the eyes in any lighting.

**Color palette:**
- Body: `#dfdbd5` (warm stone gray)
- Surfaces: `#f2efeb` (warm off-white for cards, sections, controls — sits above body with box-shadow)
- Accent: teal refined — `#175f63` for headers/interactive, `#1f7f84` for hover, `#2fbfc6` for active states
- Text: `#1c2b2d` primary, `#556565` secondary, `#8a9696` muted (warm charcoal tones)
- Status: `#2d9d5c` success, `#d94452` danger, `#ffe066` filter highlight

**Typography:**
- Headings: Merriweather serif (was loaded from CDN but never used until now)
- Body: Roboto sans-serif (unchanged)
- Better size/weight hierarchy: h1 1.75rem bold, h2 1.15rem light, h3 1rem light

**Component changes:**
- Cards with depth: game list items, section headers, admin cards have `box-shadow` and `translateY(-1px)` lift on hover
- Styled native checkboxes: `appearance: none` with custom teal fill + white checkmark on all `<input type="checkbox">`
- Collapsible sections: warm off-white surface instead of bright teal, clean subtle border
- Table headers: dark teal with uppercase letter-spacing, even/odd rows alternate surface colors
- Buttons: consistent dark teal, shadow, lift on hover
- Modal: warm off-white surface, larger radius, shadow, cleaner close button
- Controls panel: white card with shadow, clean white filter input
- Toggle switches: muted gray off, teal on, inset shadow for depth

**Structural cleanup:**
- Replaced all old `$teal_*` variables with organized design token system (`$bg-*`, `$accent-*`, `$text-*`, `$shadow-*`, `$radius-*`)
- Consolidated duplicate `@keyframes shake` into one
- Removed unused `createCorners`/`createLinearGradient` mixins from styles.scss (still in mixins.scss)
- Used modern Sass syntax (no deprecated `darken()` calls)
- Added `box-sizing: border-box` global reset
- Added `$transition-fast` / `$transition-normal` tokens for consistent animation timing

### Feb 7, 2026 — CSS polish tweaks

**Files changed:** `css/styles.scss` (compiled to `css/styles.css`), `checklist.html`

**Small adjustments based on live testing:**
- Lightened teal headers from `$accent-600` to `$accent-500` (hover to `$accent-400`) — less "serious" feel
- Added `color: #fff` on hover for headers/game-list-items to maintain contrast against the lighter hover background
- Right-aligned the controls panel with `margin-left: auto`
- Widened filter input (`width: 100%`, `max-width: 400px`) and removed an inline `style="width:33%"` from `checklist.html` that was overriding the CSS
- Tightened `.grid-item-2-row` padding (`8px → 4px` top/bottom), margin (`2px → 1px`), gap (`15px → 10px`) to fit more rows on mobile

### Feb 7, 2026 — Subtle UI transitions and animations

**Files changed:** `css/styles.scss`, `js/script_checklist.js`, `js/script_tablePage.js`

**Section expand/collapse:**
- Replaced instant jQuery `.toggle()` / `.show()` / `.hide()` with smooth `.slideToggle(250)` / `.slideDown(250)` / `.slideUp(250)` on both the checklist and table pages
- Sections have `overflow: hidden` for clean clipping during slide

**Chevron rotation:**
- Instead of swapping between `fa-chevron-down` and `fa-chevron-up` icon classes (instant jump), the chevron stays as `fa-chevron-down` and gets rotated 180° via CSS `transform: rotate(180deg)` with `0.3s ease` transition
- Controlled by toggling an `.open` class on the `.section-header`

**Checkbox animations:**
- `checkbox-pop` keyframe: scales checkbox to 125% and back on check
- `checkmark-draw` keyframe: clips the checkmark in from left to right
- `:active` press-down effect (`scale(0.9)`) for tactile feedback
- Smooth transitions on background-color, border-color, box-shadow, and transform

### Feb 7, 2026 — Performance optimization (DOM batching + parallel fetches)

**Files changed:** `js/script_home.js`, `js/script_checklistGroups.js`, `js/script_tablePage.js`, `js/script_checklist.js`

**Problem:** Pages felt slower after the template refactor. The templates themselves are fast (`cloneNode` is efficient), but the rendering patterns exposed two existing bottlenecks.

**Fix 1 — DOM batching with `DocumentFragment`:**
- `script_home.js` and `script_checklistGroups.js` were appending each cloned item directly to the live DOM inside the loop, triggering a browser layout reflow on every append.
- Now all items are built into an off-screen `DocumentFragment`, then appended in one operation — one reflow instead of N.
- (`script_checklist.js` already used a fragment — no change needed there.)

**Fix 2 — Parallel network requests with `Promise.all`:**
- `script_checklist.js`: Was fetching game data, section group data, and sections sequentially (3 round trips). Now fires all 3 in parallel. Time goes from `A + B + C` to `max(A, B, C)`.
- `script_checklistGroups.js`: Was fetching game data then section groups sequentially. Now parallel via `Promise.all`, and the separate `loadSectionGroups()` async function was replaced by a synchronous `renderSectionGroups()` that receives already-fetched data.
- `script_tablePage.js` (biggest win): Had a `for...of await` loop that fetched each table's records one-by-one sequentially. With 5 tables, that's 5 sequential HTTP round trips. Now all table records are fetched in parallel with `Promise.all`, then the DOM is built in one synchronous pass with a fragment. `createTableSection()` changed from `async` to synchronous since it no longer fetches data itself.

**Lesson:** When refactoring rendering patterns, also audit the data-fetching layer. Sequential `await` in loops is a common hidden bottleneck — always check if independent fetches can be parallelized.