## v3.1.0 - 2026-02-24

### Added

- Added support for managing Section Groups.

### Changed

- Manage Section page now supports manually editing the order number.
- Drag-and-drop on Manage Section and Manage Section Records pages no longer auto-updates all order numbers. 
It sets the order number to the previous one + 1
- Saving a re-order now refreshes the list on success
- Added version numbering

---

## v3.0.1 - 2026-02-24

### Changed

- Consolidated multiple DB API routes to prevent code duplication.

---

## v3.0.0 - 2026-02-13

### Changed

- Changed to a more modern design.

---

## v2.0.0

Version 2 implemented MySQL support to keep records consistently updated. No more browser memory was used.

---

## 1.1.0

Version 1.1 added a Node backend, and updated a Google Sheets doc when a change was made, so the CSVs could be updated.
It was messy, but it worked until I could get version 2 live.

---

## 1.0.0

The initial version had a vanilla JS frontend (jQuery, no framework). 
It pulled from local CSVs and stored changes in browser memory. 

--

# Format

## v#.#.# - yyyy-mm-dd

### Changed

- Changes go here

### Added

- Added items go here

### Removed

- Removed items go here

### Fixed

- Fixed items go here

