---
description: "Task list for Privacy-First PDF Redactor implementation"
---

# Tasks: Privacy-First PDF Redactor

**Input**: Design documents from `specs/001-pdf-redactor/`
**Prerequisites**: spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding and static file structure

- [ ] T001 Create `tools/pdf-redactor/` directory with `index.html`, `main.js`, and `style.css` stubs
- [ ] T002 [P] Add local vendor script tags in `index.html` for shared `/vendor/pdfjs/` and `/vendor/pdf-lib/` assets
- [ ] T003 [P] Create base HTML layout in `index.html`: file input, page navigation controls, canvas container, download button

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement PDF file loading via File API — read local file into an ArrayBuffer in `main.js`
- [ ] T005 [P] Initialise PDF.js worker configuration using the local `/vendor/pdfjs/pdf.worker.min.js` path in `main.js`
- [ ] T006 [P] Implement page-indexed redaction rectangle store — an in-memory map of page number → array of `{x, y, width, height}` objects in `main.js`
- [ ] T007 Implement page navigation state — track current page index and total page count
- [ ] T008 [P] Add error handling helper — display user-facing error messages for invalid files and load failures

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Load and View a PDF Locally (Priority: P1) 🎯 MVP

**Goal**: User selects a local PDF; each page renders in the browser with no server contact.

**Independent Test**: Load a multi-page PDF, confirm visual render of each page, verify no outbound network requests in browser DevTools Network tab.

### Implementation for User Story 1

- [ ] T009 [US1] Wire file input `change` event to the PDF loading function in `main.js`
- [ ] T010 [US1] Implement `renderPage(pageNum)` — fetch the PDF page from PDF.js, scale to canvas dimensions, draw to canvas in `main.js`
- [ ] T011 [US1] Implement page navigation UI — "Previous" / "Next" buttons update current page and call `renderPage()` in `main.js`
- [ ] T012 [US1] Display current page indicator ("Page 2 of 10") in `index.html` and update it dynamically
- [ ] T013 [US1] Show loading indicator while PDF.js is rendering a page; hide on completion
- [ ] T014 [US1] Trigger FR-011 error message when the selected file fails PDF.js validation

**Checkpoint**: User Story 1 fully functional — PDF loads and renders locally, page navigation works, no server requests

---

## Phase 4: User Story 2 — Draw and Preview Redaction Rectangles (Priority: P2)

**Goal**: User draws black redaction boxes on any page; boxes persist across page navigation and survive zoom changes.

**Independent Test**: Draw boxes on page 1, navigate to page 2, return — boxes on page 1 are still displayed correctly and aligned with content.

### Implementation for User Story 2

- [ ] T015 [US2] Add mouse event listeners (`mousedown`, `mousemove`, `mouseup`) to the canvas in `main.js` to capture drag gestures
- [ ] T016 [US2] Implement live drawing — render an in-progress black rectangle as the user drags, without committing it to the store
- [ ] T017 [US2] On `mouseup`, commit the completed rectangle to the page's redaction store entry; validate minimum size (discard zero-area rects)
- [ ] T018 [US2] Implement `drawRedactions(pageNum)` — after `renderPage()` completes, overlay all stored rectangles for that page as solid black fills on the canvas
- [ ] T019 [US2] Call `drawRedactions()` after every `renderPage()` call so boxes reappear when navigating back to a page
- [ ] T020 [US2] Implement zoom tracking — store a scale factor and normalise rectangle coordinates to page-relative values at draw time so boxes survive zoom changes
- [ ] T021 [US2] Add "Clear Page" button — removes all redaction rectangles for the current page from the store and re-renders the page
- [ ] T022 [US2] Style the canvas container and drawing cursor (crosshair) in `style.css`

**Checkpoint**: User Stories 1 AND 2 independently functional — redaction boxes draw, persist, and stay aligned

---

## Phase 5: User Story 3 — Export a Truly Redacted PDF (Priority: P3)

**Goal**: User downloads a new PDF where redacted regions are rasterized pixel data with no recoverable text.

**Independent Test**: Redact a known phrase, download PDF, open in Adobe Reader / browser PDF viewer, attempt select-all and copy — no text is returned from redacted regions.

### Implementation for User Story 3

- [ ] T023 [US3] Implement `exportRedactedPDF()` function in `main.js`
- [ ] T024 [US3] For each page: render the page + its redaction overlays to an offscreen canvas, then export the canvas as a PNG `dataURL`
- [ ] T025 [US3] Use pdf-lib to create a new PDF document; for each page add the PNG image as a full-page embed (no text layer)
- [ ] T026 [US3] Serialize the pdf-lib document to a `Uint8Array`, wrap in a `Blob`, and trigger download via `URL.createObjectURL` + a temporary `<a>` element
- [ ] T027 [US3] Show progress indicator during multi-page export; disable the download button while export is running
- [ ] T028 [US3] Handle edge case: if no redactions have been drawn, show a confirmation prompt before exporting a fully-rasterized PDF (all text lost)
- [ ] T029 [US3] Revoke the object URL after download is triggered to free browser memory

**Checkpoint**: All user stories functional — full load → mark → export workflow complete

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Quality, accessibility, and cross-browser consistency

- [ ] T030 [P] Test in Chrome, Firefox, and Safari — resolve any canvas rendering or local vendor asset compatibility issues
- [ ] T031 [P] Add responsive CSS layout so the tool is usable on both desktop and tablet viewports in `style.css`
- [ ] T032 Validate privacy guarantee: run browser DevTools Network audit during a full load → mark → export session and confirm zero outbound file requests
- [ ] T033 [P] Add `<meta>` description and page title for GitHub Pages discoverability in `index.html`
- [ ] T034 Add link to the tool from the project's main index page (if one exists)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — no story dependencies
- **User Story 2 (Phase 4)**: Depends on US1 rendering infrastructure (T010 `renderPage`)
- **User Story 3 (Phase 5)**: Depends on US1 (page rendering) and US2 (redaction store)
- **Polish (Phase N)**: Depends on all stories complete

### Parallel Opportunities

- T002, T003 (Phase 1) can run in parallel
- T005, T006, T008 (Phase 2) can run in parallel after T004
- T030, T031, T033 (Phase N) can all run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (local PDF load and render)
4. **STOP and VALIDATE**: Confirm PDF renders locally with zero network requests
5. Demo / deploy as an initial release

### Incremental Delivery

1. Setup + Foundational → base scaffold ready
2. US1 complete → local PDF viewer (privacy-safe render)
3. US2 complete → redaction drawing UI
4. US3 complete → true redacted PDF export (full feature)
5. Polish → cross-browser and UX refinements

---

## Notes

- [P] tasks = different files or concerns, no dependencies between them
- [Story] label maps each task to a specific user story for traceability
- Each user story should be independently completable and demonstrable
- Commit after each task or logical group
- Stop at each checkpoint to validate the story independently
- The output PDF must contain only raster image data for redacted pages — verify this is the case before marking US3 complete
