# Feature Specification: EXIF Data Stripper & Viewer

**Feature Branch**: `005-exif-stripper`
**Created**: 2026-04-02
**Status**: Draft
**Input**: Issue #38 — [PROPOSAL] - EXIF Data Stripper & Viewer (https://github.com/JackTreble/Web-Tools/issues/38)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Strip & Download (Priority: P1)

A user drops one or more image files (JPEG or PNG) onto the tool. The tool immediately parses and displays a human-readable table of all detected EXIF metadata — including GPS coordinates rendered as a map link, device model, timestamps in local time, and all other standard tags. A prominent warning banner appears if GPS coordinates are present. The user clicks "Strip All & Download" and receives a clean image file (or files) with all EXIF data removed. Zero bytes of image data are transmitted to any external server at any point.

**Why this priority**: This is the complete privacy-protection use case. The majority of users only need one action: remove all metadata and get a clean file. It is the core differentiator against every competing tool that requires a server upload.

**Independent Test**: Drop a JPEG taken with an iPhone (confirmed to contain GPS and device metadata) onto the tool. Confirm the metadata table appears with GPS coordinates and a map link. Click "Strip All & Download". Open the downloaded file in ExifTool or a browser EXIF reader — confirm zero EXIF tags remain. Run DevTools Network tab throughout — confirm zero outbound requests.

**Acceptance Scenarios**:

1. **Given** the user drops a JPEG file, **When** the file loads, **Then** a metadata table is displayed listing all detected EXIF tags with human-readable values within 2 seconds.
2. **Given** the loaded JPEG contains GPS coordinates, **When** the metadata table renders, **Then** a prominent warning banner appears ("⚠️ GPS location detected") and GPS fields are shown as a clickable map link.
3. **Given** the metadata table is displayed, **When** the user clicks "Strip All & Download", **Then** a clean JPEG file is downloaded with the EXIF APP1 segment removed and all other image data preserved.
4. **Given** the user drops a PNG file, **When** they click "Strip All & Download", **Then** a clean PNG is downloaded with metadata removed (via Canvas re-encode).
5. **Given** the tool is open, **When** any file is processed, **Then** DevTools Network confirms zero bytes of image data leave the browser.
6. **Given** the user clicks "Clear / Reset", **When** the action completes, **Then** all loaded files and metadata are removed and the UI returns to the initial drop state.

---

### User Story 2 — Selective Strip (Priority: P2)

After viewing the metadata table, the user wants to keep some fields (e.g., color profile) but remove others (e.g., GPS only). The tool provides toggle-able field groups: Location, Device Info, Timestamps, Camera Settings, and an "All" master toggle. The user deselects the groups they want to keep, then clicks "Strip Selected & Download" to receive a file with only the chosen groups removed.

**Why this priority**: Selective stripping addresses power users and professional workflows (e.g., photographers who need to preserve color profile or copyright metadata while removing location data). It is the primary advanced feature that competing paid tools monetize.

**Independent Test**: Load a JPEG with GPS, device, and timestamp metadata. Uncheck "Location" only, leaving all other groups enabled. Click "Strip Selected & Download". Open the result in an EXIF reader — confirm GPS fields are absent but timestamps and device model are still present.

**Acceptance Scenarios**:

1. **Given** the metadata table is displayed, **When** the user unchecks "Location" and clicks "Strip Selected & Download", **Then** the downloaded file has no GPS fields but retains timestamps and device information.
2. **Given** all field group checkboxes are checked, **When** the user clicks "Strip Selected & Download", **Then** the result is equivalent to stripping all EXIF (same as P1 behavior).
3. **Given** no field group checkboxes are checked, **When** the user clicks "Strip Selected & Download", **Then** the file is downloaded unchanged (or with a warning that no groups are selected).
4. **Given** the user clicks the "Remove GPS only" shortcut button in the GPS warning banner, **When** the action completes, **Then** only Location group fields are removed and the file is downloaded.

---

### User Story 3 — Batch Strip (Priority: P3)

The user loads multiple images (up to 10) at once. The tool shows a per-file summary of detected metadata (file name, GPS present Y/N, tag count). The user clicks "Strip All & Download as ZIP" and receives a single zip archive containing all cleaned images.

**Why this priority**: Batch processing is a gating feature behind paid tiers on every major competitor. It directly addresses the use case of a user returning from a trip or event with many photos to clean before posting online.

**Independent Test**: Drop 5 JPEG files onto the tool. Confirm a per-file summary list appears with each file name, GPS indicator, and tag count. Click "Strip All & Download as ZIP". Extract the zip — confirm it contains exactly 5 files, all with EXIF removed, all visually identical to the originals.

**Acceptance Scenarios**:

1. **Given** the user drops 5 JPEG files, **When** they load, **Then** a per-file summary list appears showing file name, GPS present indicator, and total EXIF tag count for each file.
2. **Given** multiple files are loaded, **When** the user clicks "Strip All & Download as ZIP", **Then** a zip archive is downloaded containing one stripped image per input file.
3. **Given** a batch of 10 images is loaded, **When** the user strips and downloads, **Then** the zip is ready in under 20 seconds.
4. **Given** a batch is loaded, **When** the user clicks "Clear / Reset", **Then** all files are removed and the tool returns to the initial state.

---

### Edge Cases

- What happens when a JPEG has no EXIF segment (APP1 marker absent)? → Show "No metadata detected" message; still allow download of original.
- What happens when a file is not a recognized image format? → Show a clear error message per file; skip it in batch processing.
- What happens when a PNG has no embedded metadata chunks? → Show "No metadata detected"; re-encode via Canvas produces a clean file anyway.
- What happens when GPS coordinates are present but malformed (non-standard rational values)? → Display raw hex value; still remove the segment.
- What happens when a JPEG has multiple APP1 segments? → Remove all EXIF-flagged APP1 segments; preserve any non-EXIF APP segments (e.g., XMP in APP1 with different identifier).
- What happens when the user loads a very large image (>20 MB)? → Process normally; warn if Canvas re-encode (PNG path) may be slow.
- What happens when the browser does not support FileReader or DataView? → Show a compatibility warning; degrade gracefully.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool MUST accept JPEG and PNG image files via drag-and-drop and file picker input.
- **FR-002**: The tool MUST parse JPEG EXIF data using `FileReader` + `DataView` to locate and read the APP1 segment, entirely in-browser.
- **FR-003**: The tool MUST display a human-readable metadata table showing all detected EXIF tags with descriptive labels (not raw tag IDs), including GPS as a clickable map link and timestamps in local time.
- **FR-004**: The tool MUST display a prominent GPS warning banner when GPS coordinates are present in the loaded image.
- **FR-005**: The tool MUST strip all EXIF metadata from JPEG files using a binary splice operation (locate APP1 marker `0xFFE1`, measure segment length, copy byte array around it) without re-encoding the image.
- **FR-006**: The tool MUST strip PNG metadata by re-encoding via Canvas API (`ctx.drawImage` + `toBlob()`).
- **FR-007**: The tool MUST provide toggle-able field group controls (Location, Device Info, Timestamps, Camera Settings, All) for selective metadata removal.
- **FR-008**: The tool MUST provide a "Remove GPS only" shortcut action in the GPS warning banner.
- **FR-009**: The tool MUST support batch processing of multiple images (up to 10) simultaneously.
- **FR-010**: The tool MUST package batch output into a single zip archive using JSZip (vendored under `/tools/vendor/`).
- **FR-011**: The tool MUST provide a "Strip All & Download" action for single files and "Strip All & Download as ZIP" for batch mode.
- **FR-012**: The tool MUST provide a "Clear / Reset" action that removes all loaded files and returns the UI to its initial state.
- **FR-013**: Zero bytes of image data MUST be transmitted to any external server during any operation.
- **FR-014**: Output JPEG quality MUST match input — the binary splice operation must not introduce any re-encoding or quality loss.
- **FR-015**: The tool MUST function in the latest two major versions of Chrome, Firefox, and Safari.

### Key Entities

- **ImageEntry**: A loaded image file — includes the raw `File` object, the parsed `ArrayBuffer`, the extracted EXIF tag map, GPS presence flag, and the processing state (pending / stripped / error).
- **ExifTagMap**: A flat key-value map of EXIF tag ID → `{ label, rawValue, humanValue, group }`. Drives both the metadata display table and the selective stripping logic.
- **FieldGroup**: A named set of EXIF tag IDs (Location, Device Info, Timestamps, Camera Settings). Used to scope selective removal.
- **StrippedBlob**: The output artifact — a `Blob` containing the cleaned image bytes, ready for download or zip packaging.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero bytes of image data are transmitted to any external server during any session operation.
- **SC-002**: GPS coordinates are fully removed and unrecoverable in the stripped output file (verified by ExifTool or equivalent reader).
- **SC-003**: Output JPEG is visually identical to input when opened in any image viewer — no quality loss, no dimension change, no color shift.
- **SC-004**: A batch of 10 images is stripped and packaged into a zip archive in under 20 seconds on a typical consumer laptop.
- **SC-005**: The EXIF viewer correctly reads and displays standard tags from JPEG files produced by iOS, Android, and DSLR cameras.
- **SC-006**: The tool functions correctly in the latest two major versions of Chrome, Firefox, and Safari without any plugin or extension.

---

## Assumptions

- Users have modern browsers with `FileReader`, `DataView`, `Uint8Array`, `Canvas`, `Blob`, and `URL.createObjectURL` support (Chrome 90+, Firefox 88+, Safari 15+).
- JSZip is already vendored in this repo (shared with PDF Merger & Splitter) under `/tools/vendor/`; the plan will confirm the exact path before implementation.
- The tool ships as `tools/exif-stripper.html` + `tools/exif-stripper/main.js` + `tools/exif-stripper/style.css`.
- JPEG EXIF stripping is a pure binary splice: read `ArrayBuffer` via `FileReader`, use `DataView` to locate the `0xFFE1` APP1 marker with the `"Exif\0\0"` identifier, excise the segment bytes, reconstruct the remaining bytes as a `Blob`.
- PNG metadata stripping via Canvas re-encode is lossless in visual quality for PNG (lossless format), though file size may change slightly.
- EXIF tag parsing uses the standard EXIF 2.3 tag registry (IFD0, IFD1, ExifIFD, GPS IFD). A lightweight in-JS tag table is sufficient — no WASM or heavy library needed.
- Logo embedding, dynamic metadata editing (write-back), and RAW format support are explicitly out of scope for this version.
