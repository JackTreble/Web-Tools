---
description: "Task list for Free QR Code Generator with Custom Styling implementation"
---

# Tasks: Free QR Code Generator with Custom Styling

**Input**: Design documents from `specs/004-qr-code-generator/`
**Prerequisites**: spec.md, plan.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in all task descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the static file structure and vendor the QR encoding library

- [ ] T001 Create `tools/qr-code-generator.html` from `tools/template.html` — set page title to "Free QR Code Generator — Custom Colors, No Watermark", add meta description, wire `<link>` tags for `../common.css` and `./qr-code-generator/style.css`, add `<script>` tag for `../vendor/qrcode/qrcode.min.js`, add `<script type="module">` for `./qr-code-generator/main.js`
- [ ] T002 [P] Create `tools/qr-code-generator/style.css` stub with tool-specific layout rules (preview panel, controls panel, warning banners)
- [ ] T003 [P] Create `tools/qr-code-generator/main.js` ES Module stub with a single `console.log('QR tool loaded')` to confirm wiring
- [ ] T004 Vendor the QR library: use npm to install `qrcode`, copy the UMD browser bundle to `tools/vendor/qrcode/qrcode.min.js`, update `tools/vendor/manifest.json` with the package name and version, commit the vendored file

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core state model and rendering engine that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Define the `state` object in `tools/qr-code-generator/main.js`: `{ payload, fgColor, bgColor, ecLevel, sizePx, mode }` with safe defaults (`fgColor: '#000000'`, `bgColor: '#ffffff'`, `ecLevel: 'M'`, `sizePx: 512`, `mode: 'plain'`)
- [ ] T006 [P] Implement `setState(patch)` in `main.js` — merges patch into state and schedules a debounced `renderQR()` call (100 ms debounce to prevent thrashing on keypress)
- [ ] T007 Implement `buildPayload(state)` in `main.js` — returns `state.payload` for plain mode; returns the correct formatted string for WiFi, vCard, and SMS modes (stubs for structured modes are sufficient in this phase)
- [ ] T008 Implement `renderQR(state)` in `main.js` — calls the vendored `QRCode` library with current payload and ecLevel; applies fg/bg colors to the canvas output; copies result to the visible `<canvas>` preview element; handles empty-payload state (show placeholder text)
- [ ] T009 [P] Implement `isLowContrast(fgHex, bgHex)` in `main.js` — computes relative luminance per WCAG 2.1 and returns `true` if contrast ratio is below 3:1
- [ ] T010 [P] Implement `isCapacityExceeded(state)` in `main.js` — after QR generation, checks whether the library reported an overflow or the payload length exceeds the practical limit for the chosen ecLevel; returns boolean

**Checkpoint**: Foundation ready — `renderQR()` can be called with any state object and produces a correct QR canvas output

---

## Phase 3: User Story 1 — Generate QR from URL/Text + Download (Priority: P1) 🎯 MVP

**Goal**: User types a URL or text → live QR preview appears → user downloads a watermark-free PNG or SVG

**Independent Test**: Type a URL into the input, confirm QR renders in < 200 ms, scan with mobile, click "Download PNG", open file — must match input URL and contain no watermark or attribution. Run DevTools Network tab: zero outbound requests throughout.

### Implementation for User Story 1

- [ ] T011 [US1] Add plain-text/URL `<textarea>` or `<input type="text">` to `tools/qr-code-generator.html` with id `qr-input` and placeholder text "Enter a URL or text"
- [ ] T012 [US1] Add `<canvas id="qr-preview">` element to `tools/qr-code-generator.html` for the live preview
- [ ] T013 [US1] Add "Download PNG" and "Download SVG" `<button>` elements to `tools/qr-code-generator.html`
- [ ] T014 [US1] Wire `input` event on `#qr-input` to `setState({ payload: e.target.value })` in `main.js` (triggers debounced `renderQR`)
- [ ] T015 [US1] Implement `downloadPNG()` in `main.js` — calls `canvas.toBlob('image/png')`, wraps in `URL.createObjectURL`, creates a temporary `<a>` element with `download="qr-code.png"`, triggers click, then calls `URL.revokeObjectURL` to free memory
- [ ] T016 [US1] Implement `downloadSVG()` in `main.js` — generates an SVG representation of the current QR matrix (either from library SVG output or by constructing SVG `<rect>` elements from the matrix); wraps in a `Blob('image/svg+xml')` and triggers download as `"qr-code.svg"`
- [ ] T017 [US1] Wire "Download PNG" and "Download SVG" button click handlers to `downloadPNG()` and `downloadSVG()` in `main.js`
- [ ] T018 [US1] Add empty-state placeholder — when `state.payload` is empty, display a grey placeholder message ("Enter text or a URL to generate your QR code") instead of a blank canvas

**Checkpoint**: User Story 1 fully functional — QR generates live from input, PNG and SVG download correctly with no watermark, tool works offline

---

## Phase 4: User Story 2 — Customize QR Appearance (Priority: P2)

**Goal**: User sets fg/bg colors, error correction level, and output size; all changes reflect instantly in the live preview; Reset to Defaults restores standard appearance

**Independent Test**: Set foreground to `#ff0000`, download PNG, confirm the PNG has red QR modules. Set bg to `#0000ff`, confirm blue background in downloaded PNG. Click Reset — confirm black-on-white 512 px is restored.

### Implementation for User Story 2

- [ ] T019 [US2] Add foreground color control to `tools/qr-code-generator.html`: an `<input type="color" id="fg-color">` and a paired `<input type="text" id="fg-hex">` hex input, synced bidirectionally
- [ ] T020 [US2] Add background color control to `tools/qr-code-generator.html`: `<input type="color" id="bg-color">` and `<input type="text" id="bg-hex">` hex input, synced bidirectionally
- [ ] T021 [US2] Add error correction `<select id="ec-level">` to `tools/qr-code-generator.html` with options: Low (L), Medium (M) [default], Quartile (Q), High (H) — each with plain-language label in the option text
- [ ] T022 [US2] Add output size control to `tools/qr-code-generator.html`: `<input type="range" id="size-slider" min="200" max="2000" step="50">` with a numeric readout `<span id="size-display">` showing the current value in px
- [ ] T023 [US2] Add "Reset to Defaults" `<button id="reset-btn">` to `tools/qr-code-generator.html`
- [ ] T024 [US2] Add low-contrast warning `<div id="contrast-warning">` (hidden by default) to `tools/qr-code-generator.html`
- [ ] T025 [US2] Wire fg/bg color inputs to `setState({ fgColor })` / `setState({ bgColor })` in `main.js`; sync the `type="color"` and `type="text"` inputs bidirectionally on each change
- [ ] T026 [US2] Wire `#ec-level` change to `setState({ ecLevel })` in `main.js`
- [ ] T027 [US2] Wire `#size-slider` input to `setState({ sizePx })` in `main.js` and update `#size-display` text
- [ ] T028 [US2] Wire `#reset-btn` click to reset state to defaults and update all control elements to reflect the reset values in `main.js`
- [ ] T029 [US2] After each `renderQR()` call, check `isLowContrast()` and toggle the visibility of `#contrast-warning` in `main.js`

**Checkpoint**: User Stories 1 AND 2 independently functional — all styling controls affect live preview, downloads respect chosen colors, Reset works

---

## Phase 5: User Story 3 — Structured Content Types: WiFi, vCard, SMS (Priority: P3)

**Goal**: User switches to a structured template, fills in labeled fields, and the tool assembles the correct QR format string automatically

**Independent Test**: Select WiFi mode, enter SSID "TestNet", password "abc123", security "WPA", download QR, scan on iOS — device must offer to join "TestNet". Repeat for vCard and SMS.

### Implementation for User Story 3

- [ ] T030 [US3] Add mode switcher to `tools/qr-code-generator.html`: tab buttons or `<select id="mode-switcher">` with options Plain / WiFi / vCard / SMS; default to Plain
- [ ] T031 [US3] Add WiFi template form to `tools/qr-code-generator.html` (hidden by default): `<input id="wifi-ssid">` (SSID), `<input id="wifi-password">` (password), `<select id="wifi-security">` (WPA / WEP / None)
- [ ] T032 [US3] Add vCard template form to `tools/qr-code-generator.html` (hidden by default): `<input id="vcard-name">`, `<input id="vcard-phone">`, `<input id="vcard-email">`
- [ ] T033 [US3] Add SMS template form to `tools/qr-code-generator.html` (hidden by default): `<input id="sms-phone">`, `<textarea id="sms-message">`
- [ ] T034 [US3] Add capacity overflow warning `<div id="capacity-warning">` (hidden by default) to `tools/qr-code-generator.html`
- [ ] T035 [US3] Implement WiFi payload builder in `buildPayload()` in `main.js`: escape special characters (`;`, `,`, `\`, `"`) in SSID and password fields and assemble `WIFI:T:{sec};S:{ssid};P:{pwd};;`
- [ ] T036 [US3] Implement vCard payload builder in `buildPayload()` in `main.js`: assemble vCard 3.0 format string (`BEGIN:VCARD\nVERSION:3.0\nFN:{name}\nTEL:{phone}\nEMAIL:{email}\nEND:VCARD`)
- [ ] T037 [US3] Implement SMS payload builder in `buildPayload()` in `main.js`: assemble `smsto:{phone}:{message}`
- [ ] T038 [US3] Wire mode switcher change to `setState({ mode })` in `main.js`; show/hide the appropriate form panel and hide the plain text input when a structured mode is active
- [ ] T039 [US3] Wire all structured template input fields to call `setState({})` on `input` events in `main.js` so QR updates live as the user fills in fields
- [ ] T040 [US3] After each `renderQR()` call, check `isCapacityExceeded()` and toggle the visibility of `#capacity-warning` in `main.js`

**Checkpoint**: All three user stories independently functional — plain, WiFi, vCard, and SMS QR codes all generate and download correctly

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: UX refinements, accessibility, SEO, and cross-browser validation

- [ ] T041 [P] Add "How to use" section to `tools/qr-code-generator.html` with plain-language steps and keyword-rich copy aligned to search intent ("free QR code generator", "custom QR code no watermark", "wifi QR code generator")
- [ ] T042 [P] Add mobile-responsive layout to `tools/qr-code-generator/style.css` — two-column desktop, single-column mobile; controls stack below preview on narrow viewports
- [ ] T043 [P] Add ARIA labels to all form controls and descriptive `for`/`id` pairings on labels in `tools/qr-code-generator.html`
- [ ] T044 Validate privacy: open DevTools Network tab, run a full session (type URL → customize colors → download PNG → download SVG → use WiFi template → download), confirm zero outbound requests containing user data
- [ ] T045 [P] Cross-browser test: verify QR generation, color rendering, PNG download, SVG download, and all structured templates work in Chrome, Firefox, and Safari latest two versions
- [ ] T046 Add a link to the QR tool from the project's main index page (if one exists)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — no story dependencies
- **User Story 2 (Phase 4)**: Depends on US1 (uses the same canvas and state system)
- **User Story 3 (Phase 5)**: Depends on Foundational (`buildPayload` and `renderQR`); can be worked on in parallel with US2 after Phase 2
- **Polish (Phase N)**: Depends on all desired user stories being complete

### Parallel Opportunities

- T002, T003 (Phase 1) can run in parallel after T001
- T004 (vendor setup) can run in parallel with T002, T003
- T006, T009, T010 (Phase 2) can run in parallel after T005 is defined
- T030–T034 (Phase 5 HTML markup) can run in parallel with T019–T024 (Phase 4 HTML markup) since they are in the same file but non-conflicting sections
- T041, T042, T043, T045 (Phase N) can all run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (scaffold + vendor library)
2. Complete Phase 2: Foundational (state + renderQR)
3. Complete Phase 3: User Story 1 (text input → live QR → PNG/SVG download)
4. **STOP and VALIDATE**: Scan the QR on mobile, confirm PNG downloads without watermark, run DevTools Network audit
5. Deploy/demo as initial release — already more useful than most free tools

### Incremental Delivery

1. Setup + Foundational → scaffold ready, QR renders
2. US1 → live generation + download (MVP shipped)
3. US2 → custom colors, error correction, size slider, reset
4. US3 → WiFi, vCard, SMS structured templates
5. Polish → mobile layout, SEO, accessibility, cross-browser

---

## Notes

- [P] tasks = different files or non-conflicting sections, no sequential dependencies
- [Story] label maps each task to a specific user story for traceability
- The QR vendor library must be committed to the repo; do not reference a CDN
- PNG export must use `canvas.toBlob()` + `URL.revokeObjectURL()` to avoid memory leaks
- SVG export must produce a standalone SVG file (with `xmlns` attribute) that opens correctly when downloaded and double-clicked
- WiFi SSID and password must escape the characters `;`, `,`, `\`, `"` with a backslash per the WiFi QR spec
- Stop at each phase checkpoint to validate before moving on
