# Implementation Plan: EXIF Data Stripper & Viewer

**Branch**: `005-exif-stripper` | **Date**: 2026-04-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/005-exif-stripper/spec.md`

---

## Summary

Build a fully browser-local EXIF metadata viewer and stripper for JPEG and PNG images. The tool reads image files client-side using `FileReader` and `DataView`, parses the EXIF APP1 segment to display a human-readable tag table (including GPS as a map link), then strips metadata via a binary splice (JPEG) or Canvas re-encode (PNG) — no server required, no image quality loss. Batch mode packages multiple stripped images into a zip archive using the shared JSZip vendor library.

---

## Technical Context

**Language/Version**: HTML5, CSS3, modern JavaScript (ES Modules, no build step)
**Primary Dependencies**:
- JSZip (vendored under `/tools/vendor/` — shared with PDF Merger & Splitter if already present, otherwise vendored fresh): batch zip packaging
- No library required for EXIF parsing or JPEG stripping — pure `DataView` + `Uint8Array` manipulation
**Storage**: N/A — all state is in-memory for the session
**Testing**: Manual browser smoke tests per acceptance scenarios; ExifTool for output validation
**Target Platform**: Static GitHub Pages; Chrome 90+, Firefox 88+, Safari 15+
**Project Type**: Single-page client-side web tool
**Performance Goals**: Single-file metadata table renders within 2 seconds of file load; batch of 10 files stripped and zipped in under 20 seconds
**Constraints**: Zero server requests; offline-capable after first load; binary splice for JPEG (no re-encode quality loss); GitHub Pages compatible
**Scale/Scope**: Single HTML page tool; ~400–600 lines of JS total

---

## Constitution Check

| Principle | Status |
|-----------|--------|
| 100% client-side — no backend | ✅ Pass — FileReader + DataView + Canvas + Blob, zero server calls |
| GitHub Pages compatible | ✅ Pass — static HTML/CSS/JS only |
| Privacy first — no data transmission | ✅ Pass — all processing happens in-browser; image bytes never leave the device |
| Replaces a paywalled/server-upload feature | ✅ Pass — every major competitor (exifpurge.com, verexif.com, online-metadata.com) requires server upload; batch mode is paywalled |
| Vanilla JS / ES Modules | ✅ Pass — no framework, no bundler; JSZip is a single vendored file |
| No-Backend rule | ✅ Pass — Browser APIs only (FileReader, DataView, Canvas, Blob, URL.createObjectURL) |

---

## Project Structure

### Documentation (this feature)

```text
specs/005-exif-stripper/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task breakdown
```

### Source Code (repository root)

```text
tools/
├── exif-stripper.html              # Tool entry page (from tools/template.html)
├── vendor/
│   └── jszip/
│       └── jszip.min.js            # Shared vendored JSZip (confirm path with pdf-merger-splitter)
└── exif-stripper/
    ├── main.js                     # All tool logic (ES Module)
    └── style.css                   # Tool-specific styles (shared tokens from common.css)
```

**Structure Decision**: Single-page tool following the established pattern (`001-pdf-redactor`, `002-video-trimmer-gif-exporter`, `004-qr-code-generator`). Tool entry HTML at `/tools/exif-stripper.html`, logic and styles scoped to `/tools/exif-stripper/`. Shared styling from `/tools/common.css`. JSZip vendored under `/tools/vendor/jszip/` — check whether this is already present from the PDF Merger & Splitter tool before adding a new copy.

---

## Phase Design

### Phase 1 — Setup

Scaffold the file structure and wire the HTML shell. No logic yet.

- Create `tools/exif-stripper.html` from `tools/template.html` with correct title ("Free EXIF Remover — Strip GPS & Metadata from Photos"), meta description, `<link>` tags for `../common.css` and `./exif-stripper/style.css`, `<script>` tag for the vendored JSZip, and `<script type="module">` for `./exif-stripper/main.js`.
- Create `tools/exif-stripper/style.css` stub.
- Create `tools/exif-stripper/main.js` ES Module stub.
- Confirm whether JSZip is already vendored from the PDF Merger & Splitter feature. If yes, reuse the existing path. If no, vendor JSZip via the npm dev workflow: pin the package in `package.json`, run `npm install`, update `scripts/sync-vendor.mjs`, run `npm run vendor:update`, commit the file to `tools/vendor/jszip/jszip.min.js`.

### Phase 2 — Foundational

Core EXIF parsing and binary stripping engine shared by all user stories.

- **`loadFile(file)`**: Reads a `File` via `FileReader.readAsArrayBuffer()` and resolves with the `ArrayBuffer`.
- **`parseExif(buffer)`**: Uses `DataView` to walk the JPEG marker structure. Locates the APP1 marker (`0xFF 0xE1`) with `"Exif\0\0"` identifier. Reads the IFD0 (main image), ExifIFD, and GPS IFD tag entries using the TIFF byte order header. Returns a flat `ExifTagMap` keyed by tag ID, each entry containing `{ label, rawValue, humanValue, group }`.
- **`EXIF_TAGS`**: A static JS object (in-module lookup table) mapping the ~60 most common EXIF tag IDs to `{ label, group }`. Covers IFD0 (Make, Model, Orientation, DateTime, etc.), ExifIFD (ExposureTime, FNumber, ISO, etc.), and GPS IFD (GPSLatitude, GPSLongitude, etc.).
- **`formatGPS(gpsIfd)`**: Converts rational GPS values to decimal degrees and builds a Google Maps URL for the map link.
- **`stripAllExif(buffer)`**: For JPEG — walks the marker stream, identifies all APP1 segments with the `"Exif\0\0"` identifier, copies all other bytes into a new `Uint8Array`, returns a `Blob('image/jpeg')` of the stripped bytes.
- **`stripSelectiveExif(buffer, tagsToRemove)`**: For JPEG — similar to stripAll but only rewrites the EXIF IFD entries, zeroing out or omitting the specified tag IDs. (If complexity is high, fall back to full strip + re-parse; evaluate at implementation time.)
- **`stripPng(file)`**: For PNG — draws the image onto an offscreen `<canvas>` via `drawImage`, exports via `canvas.toBlob('image/png')`. Canvas export drops all PNG metadata chunks automatically.
- **`isJpeg(buffer)` / `isPng(buffer)`**: Quick format detection from magic bytes (`0xFF 0xD8` for JPEG, `0x89 0x50 0x4E 0x47` for PNG).
- **State object**: `{ files: ImageEntry[], mode: 'single' | 'batch', selectedGroups: Set<string> }` — single source of truth for UI updates.

### Phase 3 — User Story 1: Strip & Download (P1 MVP)

Build the minimal working tool: drop file → view metadata → strip all → download clean file.

- Drag-and-drop zone and `<input type="file" accept="image/jpeg,image/png">` file picker.
- On file load: call `loadFile` → `parseExif` → render metadata table in HTML (tag label, human value; GPS row links to map; GPS warning banner toggled on/off).
- "Strip All & Download" button: calls `stripAllExif` (JPEG) or `stripPng` (PNG), triggers download via `URL.createObjectURL` + temporary `<a>` element.
- "Clear / Reset" button: clears state, removes table, returns UI to drop state.
- Empty/no-EXIF state: show "No metadata detected" message when `parseExif` returns an empty map.

### Phase 4 — User Story 2: Selective Strip (P2)

Add field group toggles and per-group removal.

- Field group checkboxes in the UI: Location, Device Info, Timestamps, Camera Settings, All (master toggle).
- "Remove GPS only" shortcut button rendered inside the GPS warning banner.
- "Strip Selected & Download" button: collects checked groups, maps them to tag ID sets, calls `stripSelectiveExif` (JPEG) or falls back to full strip for PNG (Canvas re-encode strips all metadata regardless of group selection).
- Warning if no groups are selected.
- Group checkboxes pre-checked to "All" by default (safest default per spec).

### Phase 5 — User Story 3: Batch Strip (P3)

Add multi-file loading and zip download.

- Update file picker and drop zone to accept multiple files.
- Per-file summary list: file name, GPS indicator (Y/N), EXIF tag count.
- "Strip All & Download as ZIP" button: strips each file in sequence, adds each `Blob` to a JSZip archive with the original filename, calls `zip.generateAsync({ type: 'blob' })`, triggers download of the zip file.
- Progress indicator: show which file is currently being processed during batch strip.
- Per-file error handling: if one file fails (not a valid image, etc.), mark it with an error state and continue processing the rest.

### Phase N — Polish & Cross-Cutting

- Mobile-responsive layout: drop zone and metadata table stack correctly on narrow viewports.
- SEO: descriptive `<title>`, `<meta name="description">` with search-aligned copy ("remove EXIF data online free", "strip GPS from photo", "remove metadata from image before sharing"), meaningful headings, "How to use" section.
- Accessibility: labels on all inputs, ARIA roles on drag-and-drop zone, keyboard-navigable controls.
- Privacy validation: DevTools Network audit — confirm zero outbound requests during a full session.
- Cross-browser test: Chrome, Firefox, Safari latest two versions.

---

## Complexity Tracking

No constitution violations. Complexity is rated 3/10 per the issue. JPEG EXIF stripping is a well-documented binary splice (~50 lines of DataView code). The EXIF viewer (parsing the tag table) adds modest complexity. Batch mode + JSZip adds UI complexity but not architectural complexity. PNG via Canvas is trivial.

| Concern | Decision |
|---------|----------|
| EXIF parsing library | No external library — a static JS tag table (~60 entries) covers the common tags. Avoids a heavy dependency (exif.js is 30 KB+; DataView approach is ~100 lines). |
| Selective strip complexity | If per-tag IFD rewriting proves fragile, fall back to full EXIF strip — the spec allows this for PNG already. Evaluate at T-time. |
| JSZip sharing | Confirm whether JSZip is already vendored from pdf-merger-splitter before adding a new copy. Reuse if present. |

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| EXIF parsing | Vanilla `DataView` + static tag table | No external dependency; covers the ~60 tags that matter; JPEG binary format is well-documented |
| JPEG stripping | Binary splice (locate APP1 + `"Exif\0\0"`, excise bytes) | Lossless — no re-encode, no quality loss; straightforward Uint8Array manipulation |
| PNG stripping | Canvas `drawImage` + `toBlob('image/png')` | Canvas export drops all metadata chunks automatically; one-liner implementation |
| Selective strip (JPEG) | Attempt per-tag IFD rewriting; fall back to full strip if fragile | Selective is a P2 feature — correctness and simplicity take priority over perfect per-field control |
| Batch packaging | JSZip (vendored, shared) | Consistent with pdf-merger-splitter; MIT licensed; ~90 KB minified; no CDN required |
| State management | Plain JS object + re-render on change | No framework needed for a tool of this complexity |
