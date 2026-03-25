---
description: "Task list for Privacy-First Video Trimmer & GIF/WebP Exporter implementation"
---

# Tasks: Privacy-First Video Trimmer & GIF/WebP Exporter

**Input**: Design documents from `specs/002-video-trimmer-gif-exporter/`
**Prerequisites**: spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding and static file structure

- [ ] T001 Create `tools/video-trimmer/` directory with `index.html`, `main.js`, and `style.css` stubs
- [ ] T002 [P] Add CDN script tag in `index.html` for FFmpeg.wasm (v0.12, single-threaded build)
- [ ] T003 [P] Create base HTML layout in `index.html`: drag-drop zone / file input, video element, timeline canvas container, format picker, process button, progress bar, download button

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement FFmpeg.wasm loader in `main.js` — fetch and initialise the single-threaded build, expose a ready-state flag, and show a loading progress bar on first visit
- [ ] T005 [P] Implement video file ingestion via File API — accept a File object and create an object URL bound to the video element
- [ ] T006 [P] Implement drag-and-drop file acceptance on the drop zone in `main.js` (prevent default, extract file, pass to ingestion)
- [ ] T007 [P] Implement trim range state module in `main.js` — store `{ startTime, endTime }` with validation (end > start, minimum 0.1 s duration)
- [ ] T008 [P] Add error display helper — render user-facing error messages for unsupported files and processing failures

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Load and Preview a Video File Locally (Priority: P1) 🎯 MVP

**Goal**: User loads a video from disk; it plays back in the browser with no server contact.

**Independent Test**: Load a video via drag-and-drop and via file picker, confirm playback works in browser, verify zero outbound requests in DevTools Network tab.

### Implementation for User Story 1

- [ ] T009 [US1] Wire file input `change` event and drag-drop handler to the video ingestion function in `main.js`
- [ ] T010 [US1] Bind the created object URL to the `<video>` element `src` and call `video.load()` in `main.js`
- [ ] T011 [US1] Show video metadata (filename, duration, dimensions) once `video.loadedmetadata` fires
- [ ] T012 [US1] Trigger FR-016 error message when the browser cannot load the selected file as a video
- [ ] T013 [US1] Style the drag-drop zone with hover state and accepted/rejected visual feedback in `style.css`

**Checkpoint**: User Story 1 fully functional — video loads locally and plays back, no server requests

---

## Phase 4: User Story 2 — Set a Trim Range Using a Timeline Selector (Priority: P2)

**Goal**: User drags start/end handles on a thumbnail timeline to define the clip range; preview loops within the selection.

**Independent Test**: Load a video, drag handles, confirm timestamps update in real time, confirm preview loops only within the selected range.

### Implementation for User Story 2

- [ ] T014 [US2] Implement `renderTimeline()` in `main.js` — seek the video to evenly-spaced timestamps and draw thumbnail frames across the Canvas timeline strip using the `<canvas>` API
- [ ] T015 [US2] Implement start and end handle rendering on the timeline Canvas — draw draggable handle indicators at `startTime` and `endTime` positions
- [ ] T016 [US2] Add `mousedown`, `mousemove`, `mouseup` (and touch equivalents) event listeners on the timeline Canvas to capture handle drag gestures in `main.js`
- [ ] T017 [US2] On handle drag, translate canvas x-position to a video timestamp, update the trim range state (T007), and redraw handles
- [ ] T018 [US2] Display start time and end time as formatted numeric labels (e.g., `0:04.2 → 0:19.7`) that update in real time during dragging
- [ ] T019 [US2] Enforce minimum clip duration and handle collision (prevent start handle overtaking end handle) in the trim state module
- [ ] T020 [US2] Implement preview loop — on `video.timeupdate`, if playback position exceeds `endTime`, seek back to `startTime`
- [ ] T021 [US2] Trigger `renderTimeline()` once `video.loadedmetadata` fires after US1 video load
- [ ] T022 [US2] Style timeline canvas, handles, and time-label overlay in `style.css`

**Checkpoint**: User Stories 1 AND 2 independently functional — timeline visible, handles draggable, preview loops correctly

---

## Phase 5: User Story 3 — Export the Trimmed Clip in a Chosen Format (Priority: P3)

**Goal**: User selects GIF, WebP, or MP4, clicks Process, and downloads the output file — all in-browser.

**Independent Test**: Set a trim range, process each format in turn, download each result, verify valid output files and zero file-data network requests.

### Implementation for User Story 3

- [ ] T023 [US3] Implement format picker UI — radio buttons or segmented control for GIF / WebP / MP4 in `index.html` and wire selection state in `main.js`
- [ ] T024 [US3] Implement `processClip()` in `main.js` — validate that a video is loaded and a valid trim range is set before starting; show instructional message if not
- [ ] T025 [US3] Implement Web Worker wrapper for FFmpeg.wasm in `main.js` — send input file data and processing command to the worker, receive output data back
- [ ] T026 [US3] Implement MP4 stream-copy command path in the worker — use FFmpeg `-ss`/`-to` with `-c copy` for near-instant lossless trim
- [ ] T027 [US3] Implement GIF export command path in the worker — two-pass pipeline: `palettegen` filter then `paletteuse` filter for palette-optimised animated GIF
- [ ] T028 [US3] Implement animated WebP export command path in the worker — use FFmpeg WebP encoder with animation flags
- [ ] T029 [US3] Wire FFmpeg progress events from the worker to the progress bar in `main.js`; disable the Process button during active processing
- [ ] T030 [US3] On processing completion, wrap the output `Uint8Array` in a `Blob`, create an object URL, and surface a "Download" button with the correct filename and MIME type
- [ ] T031 [US3] Revoke the output object URL after download is triggered to free browser memory
- [ ] T032 [US3] Handle processing errors — surface a user-facing message and re-enable the Process button

**Checkpoint**: All user stories functional — full load → range → format → process → download workflow complete

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Quality, accessibility, and cross-browser consistency

- [ ] T033 [P] Test in Chrome, Firefox, and Safari — resolve any Canvas, video playback, or FFmpeg.wasm compatibility issues
- [ ] T034 [P] Add responsive CSS layout so the tool is usable on desktop and tablet viewports in `style.css`
- [ ] T035 Validate privacy guarantee: run browser DevTools Network audit during a full workflow session and confirm zero outbound file requests
- [ ] T036 [P] Add `<title>`, `<meta name="description">`, and relevant meta tags in `index.html` for GitHub Pages discoverability
- [ ] T037 [P] Add a "How to use" section to the page in `index.html`
- [ ] T038 Add a link to the tool from the project's main index page (if one exists)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — no story dependencies
- **User Story 2 (Phase 4)**: Depends on US1 (video load + metadata, T010–T011); timeline cannot render without a loaded video duration
- **User Story 3 (Phase 5)**: Depends on US1 (file ingestion, T005) and US2 (trim range state, T007, T017)
- **Polish (Phase N)**: Depends on all stories complete

### Parallel Opportunities

- T002, T003 (Phase 1) can run in parallel
- T005, T006, T007, T008 (Phase 2) can run in parallel after T004
- T033, T034, T036, T037 (Phase N) can all run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (local video load and preview)
4. **STOP and VALIDATE**: Confirm video plays locally with zero network requests
5. Demo / deploy as an initial release

### Incremental Delivery

1. Setup + Foundational → base scaffold ready
2. US1 complete → local video player (privacy-safe preview)
3. US2 complete → trim range UI with looping preview
4. US3 complete → full export pipeline (full feature)
5. Polish → cross-browser and UX refinements

---

## Notes

- [P] tasks = different files or concerns, no dependencies between them
- [Story] label maps each task to a specific user story for traceability
- Each user story should be independently completable and demonstrable
- Commit after each task or logical group
- Stop at each checkpoint to validate the story independently
- MP4 export should complete significantly faster than GIF/WebP — validate this assumption early in US3 development
