---
description: "Task list for EXIF Data Stripper & Viewer implementation"
---

# Tasks: EXIF Data Stripper & Viewer

**Input**: Design documents from `specs/005-exif-stripper/`
**Prerequisites**: spec.md, plan.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in all task descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the static file structure and confirm/vendor the JSZip dependency

- [ ] T001 Check whether JSZip is already vendored from the pdf-merger-splitter feature (look for `tools/vendor/jszip/jszip.min.js`). If present, note the path for reuse. If absent, vendor it: add `jszip` to `package.json`, run `npm install`, update `scripts/sync-vendor.mjs` to copy the browser bundle, run `npm run vendor:update`, commit `tools/vendor/jszip/jszip.min.js` and the updated `tools/vendor/manifest.json`.
- [ ] T002 Create `tools/exif-stripper.html` from `tools/template.html` — set page title to "Free EXIF Remover — Strip GPS & Metadata from Photos Online", add meta description ("Remove GPS location, device info, and all hidden metadata from photos. Free, private — your images never leave your browser."), wire `<link>` tags for `../common.css` and `./exif-stripper/style.css`, add `<script>` tag for `../vendor/jszip/jszip.min.js`, add `<script type="module">` for `./exif-stripper/main.js`
- [ ] T003 [P] Create `tools/exif-stripper/style.css` stub with layout rules for: drop zone, file summary list, metadata table, GPS warning banner, field group checkboxes, action buttons, and error/empty states
- [ ] T004 [P] Create `tools/exif-stripper/main.js` ES Module stub with a single `console.log('EXIF stripper loaded')` to confirm wiring

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core EXIF parsing, binary stripping, and state model that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Define the `state` object in `tools/exif-stripper/main.js`: `{ files: [], mode: 'single', selectedGroups: new Set(['location','device','timestamps','camera','all']) }` with safe defaults (all groups selected = maximum privacy protection)
- [ ] T006 [P] Define `EXIF_TAGS` static lookup table in `main.js` — a plain JS object mapping the ~60 most common EXIF tag IDs (hex) to `{ label, group }`. Groups: `'location'` (GPS IFD tags: GPSLatitude, GPSLongitude, GPSAltitude, etc.), `'device'` (Make, Model, Software, LensModel, etc.), `'timestamps'` (DateTime, DateTimeOriginal, DateTimeDigitized, etc.), `'camera'` (ExposureTime, FNumber, ISO, FocalLength, Flash, WhiteBalance, etc.)
- [ ] T007 Implement `loadFile(file)` in `main.js` — wraps `FileReader.readAsArrayBuffer(file)` in a Promise; resolves with `{ file, buffer: ArrayBuffer }`
- [ ] T008 Implement `isJpeg(buffer)` and `isPng(buffer)` in `main.js` — check magic bytes (`0xFF 0xD8` for JPEG at byte 0–1; `0x89 0x50 0x4E 0x47` for PNG at byte 0–3); return boolean
- [ ] T009 Implement `parseExif(buffer)` in `main.js` — uses `DataView` to walk JPEG marker stream, locate APP1 marker (`0xFF 0xE1`) with `"Exif\0\0"` identifier (6-byte signature after length), read TIFF byte-order header (`"II"` = little-endian, `"MM"` = big-endian), parse IFD0 tag entries (tag ID, type, count, value offset), follow ExifIFD and GPS IFD sub-IFD pointers, read each tag's value and look up label + group from `EXIF_TAGS`; return flat `ExifTagMap` object `{ [tagId]: { label, rawValue, humanValue, group } }` or empty object if no EXIF found
- [ ] T010 Implement `formatGPS(gpsTagMap)` in `main.js` — converts EXIF rational GPS values (degree/minute/second arrays) to decimal degrees; builds a Google Maps URL `https://maps.google.com/?q={lat},{lng}`; returns `{ lat, lng, mapsUrl }` or null if GPS data is incomplete
- [ ] T011 Implement `stripAllExif(buffer)` in `main.js` — for JPEG: use `DataView` to walk all markers; copy all marker segments except APP1 segments that begin with `"Exif\0\0"` into a new `Uint8Array`; preserve the SOI marker (`0xFF 0xD8`), all non-EXIF markers, and the image data; return a `Blob('image/jpeg')` of the reconstructed bytes
- [ ] T012 Implement `stripPng(file)` in `main.js` — create an offscreen `<canvas>`, create an `Image` element, set `img.src = URL.createObjectURL(file)`, on `img.onload` call `ctx.drawImage(img, 0, 0)` then `canvas.toBlob(resolve, 'image/png')`; revoke the object URL; return a `Blob('image/png')`

**Checkpoint**: Foundation ready — `parseExif()` correctly reads EXIF tags from a real JPEG; `stripAllExif()` produces a blob that ExifTool reports as having zero EXIF tags

---

## Phase 3: User Story 1 — Strip & Download (Priority: P1) 🎯 MVP

**Goal**: User drops a JPEG or PNG → sees metadata table with GPS warning → clicks "Strip All & Download" → receives a clean file with no EXIF

**Independent Test**: Drop an iPhone JPEG (with GPS). Confirm metadata table shows GPS field with map link and GPS warning banner appears. Click "Strip All & Download". Open downloaded file in ExifTool — confirm zero EXIF tags. Open in image viewer — confirm visually identical. DevTools Network: zero outbound requests.

### Implementation for User Story 1

- [ ] T013 [US1] Add drag-and-drop zone to `tools/exif-stripper.html`: a `<div id="drop-zone">` with instructional text ("Drop a JPEG or PNG here, or click to browse") and a hidden `<input type="file" id="file-input" accept="image/jpeg,image/png">`
- [ ] T014 [US1] Add metadata display section to `tools/exif-stripper.html`: a `<div id="gps-warning" hidden>` banner for GPS alert (with "⚠️ GPS location detected" text and "Remove GPS only" `<button id="remove-gps-btn">`), and a `<table id="exif-table">` for the full tag list
- [ ] T015 [US1] Add action buttons to `tools/exif-stripper.html`: `<button id="strip-all-btn">Strip All & Download</button>` and `<button id="reset-btn">Clear / Reset</button>`
- [ ] T016 [US1] Add empty/no-exif state `<p id="no-exif-msg" hidden>No metadata detected in this image.</p>` and format error `<p id="format-error" hidden>Unsupported file format. Please use JPEG or PNG.</p>` to `tools/exif-stripper.html`
- [ ] T017 [US1] Wire drag-and-drop events (`dragover`, `dragleave`, `drop`) on `#drop-zone` and `change` event on `#file-input` to a `handleFileSelect(files)` handler in `main.js`; `handleFileSelect` calls `loadFile`, then `isJpeg`/`isPng`, then `parseExif`, then `renderMetadataTable(exifMap)` and updates state
- [ ] T018 [US1] Implement `renderMetadataTable(exifMap)` in `main.js` — builds `<tr>` rows for each tag entry (label in first column, humanValue in second); for GPS tags, render the value as a map link `<a href="{mapsUrl}" target="_blank">`; toggle `#gps-warning` visibility based on presence of GPS tags; toggle `#no-exif-msg` when map is empty
- [ ] T019 [US1] Wire `#strip-all-btn` click to `handleStripAll()` in `main.js` — calls `stripAllExif(buffer)` for JPEG or `stripPng(file)` for PNG; triggers download via `URL.createObjectURL(blob)` + temporary `<a download="{filename}">` + click + `URL.revokeObjectURL`
- [ ] T020 [US1] Wire `#reset-btn` click to `handleReset()` in `main.js` — clears `state.files`, hides metadata table and warning banner, removes table rows, resets file input value, shows drop zone in initial state

**Checkpoint**: User Story 1 fully functional — single JPEG/PNG file is processed locally, metadata table displays all tags, GPS warning appears when relevant, stripped file downloads with zero EXIF, no network requests

---

## Phase 4: User Story 2 — Selective Strip (Priority: P2)

**Goal**: User selects which metadata field groups to remove before downloading, enabling precise control (e.g., GPS only, or all except color profile)

**Independent Test**: Load a JPEG with GPS, timestamps, and device info. Uncheck all groups except "Location". Click "Strip Selected & Download". Open result in ExifTool — confirm only GPS tags are absent; timestamps and device fields are still present.

### Implementation for User Story 2

- [ ] T021 [US2] Add field group checkboxes section to `tools/exif-stripper.html` (visible after a file loads): fieldset with `<input type="checkbox">` for each group — `id="group-all"` (All, checked by default), `id="group-location"` (Location / GPS), `id="group-device"` (Device Info), `id="group-timestamps"` (Timestamps), `id="group-camera"` (Camera Settings). Add `<button id="strip-selected-btn">Strip Selected & Download</button>` below the checkboxes.
- [ ] T022 [US2] Implement master "All" checkbox logic in `main.js` — when `#group-all` is checked, check all other checkboxes; when any individual group is unchecked, uncheck `#group-all`; wire all checkboxes to update `state.selectedGroups`
- [ ] T023 [US2] Wire `#remove-gps-btn` click in `main.js` — sets `state.selectedGroups` to `new Set(['location'])`, unchecks all other group checkboxes, checks only `#group-location`, then calls `handleStripSelected()`
- [ ] T024 [US2] Implement `stripSelectiveExif(buffer, groupsToRemove)` in `main.js` — for JPEG: parse IFD entries, identify all tag IDs belonging to the groups in `groupsToRemove` (using `EXIF_TAGS` group field), rewrite the EXIF APP1 segment omitting those tags; if the GPS IFD is being removed, omit the GPS IFD pointer tag (0x8825) from IFD0; return a `Blob('image/jpeg')`. Note: if full IFD rewriting proves fragile, fall back to `stripAllExif` when all groups are selected, or document the limitation.
- [ ] T025 [US2] Wire `#strip-selected-btn` click to `handleStripSelected()` in `main.js` — reads `state.selectedGroups`, calls `stripSelectiveExif(buffer, state.selectedGroups)` for JPEG (or `stripPng` for PNG since Canvas strips all), triggers download; show a warning toast if `state.selectedGroups` is empty ("No groups selected — nothing to remove")

**Checkpoint**: User Stories 1 AND 2 independently functional — selective stripping by group works; GPS-only removal via banner shortcut works

---

## Phase 5: User Story 3 — Batch Strip (Priority: P3)

**Goal**: User loads up to 10 images; sees a per-file summary; clicks "Strip All & Download as ZIP" to get a single zip archive of all cleaned images

**Independent Test**: Drop 5 JPEG files (mix of GPS and non-GPS). Confirm per-file summary list shows each filename, GPS indicator, and tag count. Click "Strip All & Download as ZIP". Extract zip — confirm 5 files, all with EXIF removed, filenames preserved.

### Implementation for User Story 3

- [ ] T026 [US3] Update `<input type="file">` in `tools/exif-stripper.html` to `accept="image/jpeg,image/png" multiple` and update drop zone instructional text to mention multiple files
- [ ] T027 [US3] Add batch summary list to `tools/exif-stripper.html`: `<ul id="file-list">` where each `<li>` will show filename, GPS indicator badge, EXIF tag count, and processing status (pending / stripped / error)
- [ ] T028 [US3] Add `<button id="strip-all-zip-btn" hidden>Strip All & Download as ZIP</button>` and `<div id="batch-progress" hidden>` progress indicator to `tools/exif-stripper.html`; show `#strip-all-zip-btn` when more than 1 file is loaded, show `#strip-all-btn` when exactly 1 file is loaded
- [ ] T029 [US3] Update `handleFileSelect(files)` in `main.js` to accept a `FileList` of up to 10 files; for each file call `loadFile` → `parseExif`; push an `ImageEntry` `{ file, buffer, exifMap, hasGps, tagCount, status: 'pending' }` to `state.files`; call `renderFileList()` after all files load
- [ ] T030 [US3] Implement `renderFileList()` in `main.js` — builds the `<ul id="file-list">` from `state.files`; for each entry render: filename, GPS indicator ("📍 GPS" badge if `hasGps`, greyed out if not), tag count, status indicator; clicking a file entry in the list shows its full metadata table in the detail panel
- [ ] T031 [US3] Implement `handleBatchStrip()` in `main.js` — iterates `state.files`, shows `#batch-progress`, for each file calls `stripAllExif(buffer)` (JPEG) or `stripPng(file)` (PNG), adds the resulting `Blob` to a JSZip archive with `zip.file(filename, blob)`, updates the file's status in the list; after all files, calls `zip.generateAsync({ type: 'blob' })` and triggers download of `exif-stripped.zip` via `URL.createObjectURL`
- [ ] T032 [US3] Wire `#strip-all-zip-btn` click to `handleBatchStrip()` in `main.js`; handle per-file errors by marking the entry's status as 'error' and continuing to the next file

**Checkpoint**: All three user stories independently functional — single-file strip, selective strip, and batch strip + zip all work correctly

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: UX refinements, accessibility, SEO, and cross-browser validation

- [ ] T033 [P] Add "How to use" section to `tools/exif-stripper.html` with plain-language steps and keyword-rich copy aligned to search intent: "remove EXIF data online free", "strip GPS from photo online", "remove metadata from image before sharing", "EXIF remover no upload", "remove location from photo"
- [ ] T034 [P] Add mobile-responsive layout to `tools/exif-stripper/style.css` — drop zone and metadata table stack correctly on narrow viewports; action buttons full-width on mobile
- [ ] T035 [P] Add ARIA labels and roles to `tools/exif-stripper.html` — `role="region"` on drop zone with `aria-label="Image upload area"`, `aria-live="polite"` on GPS warning banner, `for`/`id` pairings on all checkbox labels
- [ ] T036 Validate privacy: open DevTools Network tab, perform a full session (drop JPEG → view table → strip → download; then batch mode → download zip); confirm zero outbound requests at all steps
- [ ] T037 [P] Cross-browser test: verify file loading, EXIF parsing, metadata table display, GPS warning, strip & download, and batch zip work in Chrome, Firefox, and Safari latest two versions
- [ ] T038 [P] Add a link to the EXIF Stripper from the project's main index page (if one exists)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — no story dependencies
- **User Story 2 (Phase 4)**: Depends on US1 (same state, file, and rendering infrastructure); can be worked on after Phase 3 MVP is confirmed working
- **User Story 3 (Phase 5)**: Depends on Foundational; T026–T030 (HTML + renderFileList) can run in parallel with Phase 4 after Phase 2 completes; `handleBatchStrip` depends on `stripAllExif` from Phase 2
- **Polish (Phase N)**: Depends on all desired user stories being complete

### Parallel Opportunities

- T003, T004 (Phase 1 stubs) can run in parallel after T001 and T002
- T006 (`EXIF_TAGS` table) can be written in parallel with T007–T008 (no dependency between them)
- T009 (`parseExif`) depends on T006 (EXIF_TAGS lookup)
- T010 (`formatGPS`) can run in parallel with T011 (`stripAllExif`) — both read from EXIF data but are independent functions
- T013–T016 (Phase 3 HTML additions) can run in parallel — different sections of the same file
- T026–T028 (Phase 5 HTML additions) can run in parallel with T021–T023 (Phase 4 HTML additions)
- T033, T034, T035, T037, T038 (Phase N) can all run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (scaffold + confirm/vendor JSZip)
2. Complete Phase 2: Foundational (parseExif + stripAllExif + stripPng)
3. Complete Phase 3: User Story 1 (drop zone → metadata table → strip → download)
4. **STOP and VALIDATE**: Drop a real iPhone JPEG, confirm GPS warning, verify stripped output in ExifTool, run DevTools Network audit
5. Deploy/demo — already more private than every server-based alternative

### Incremental Delivery

1. Setup + Foundational → parsing and stripping engine works
2. US1 → single file strip & download (MVP shipped)
3. US2 → selective field group stripping + GPS shortcut
4. US3 → batch mode + zip download
5. Polish → mobile layout, SEO, accessibility, cross-browser

---

## Notes

- [P] tasks = different files or non-conflicting sections, no sequential dependencies
- [Story] label maps each task to a specific user story for traceability
- JPEG stripping MUST use binary splice — do not re-encode JPEG pixels (quality loss)
- PNG stripping via Canvas is acceptable (PNG is lossless; output may differ in file size but not visual quality)
- JSZip must be loaded from `/tools/vendor/` — never from a CDN
- `URL.revokeObjectURL` must be called after each download to prevent memory leaks
- Verify stripped output with ExifTool at each phase checkpoint
- Stop at each checkpoint to validate the story independently before moving to the next
