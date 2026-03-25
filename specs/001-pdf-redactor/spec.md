# Feature Specification: Privacy-First PDF Redactor

**Feature Branch**: `001-pdf-redactor`
**Created**: 2026-03-24
**Status**: Draft
**Input**: Issue #2 — [PROPOSAL] Privacy-First PDF Redactor (https://github.com/JackTreble/Web-Tools/issues/2)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Load and View a PDF Locally (Priority: P1)

A user opens the tool in their browser and selects a sensitive PDF from their local disk (e.g., a contract, medical record, or financial statement). The tool renders the document page-by-page entirely within the browser, with no file upload to any server. The user can navigate between pages.

**Why this priority**: Core foundational capability — without local rendering, nothing else is possible. Delivers immediate privacy assurance to users who are concerned about server uploads.

**Independent Test**: Can be fully tested by loading a multi-page PDF and confirming each page renders correctly with no outbound network requests leaving the browser.

**Acceptance Scenarios**:

1. **Given** a user has a PDF file on their local filesystem, **When** they open the tool and select the file, **Then** the first page is rendered visually in the browser and no outbound network requests containing file data are made.
2. **Given** a multi-page PDF is loaded, **When** the user navigates between pages, **Then** each page renders correctly and per-page state is maintained independently.
3. **Given** a user selects a file that is not a valid PDF, **When** the tool attempts to load it, **Then** a clear error message is displayed and no crash occurs.

---

### User Story 2 — Draw and Preview Redaction Rectangles (Priority: P2)

A user views a rendered PDF page and draws rectangular redaction boxes over sensitive text or images. The tool displays a live solid black-box preview over the selected regions. The user can add multiple redaction boxes per page, across multiple pages, and their selections are preserved as they navigate.

**Why this priority**: The core interaction mechanism — the tool's primary differentiator over alternatives that use only visual overlays.

**Independent Test**: Can be tested by loading a PDF, drawing redaction boxes on page 1, navigating to page 2, returning to page 1, and confirming boxes remain. Boxes should appear as solid black overlays aligned with the content.

**Acceptance Scenarios**:

1. **Given** a PDF page is rendered, **When** the user clicks and drags over a region, **Then** a solid black rectangle is drawn over that region as a live preview.
2. **Given** redaction boxes have been drawn on a page, **When** the user navigates to another page and returns, **Then** the previously drawn boxes are still displayed correctly.
3. **Given** a user draws a box at a particular zoom level, **When** the zoom level changes, **Then** the redaction box remains proportionally correct relative to the page content.
4. **Given** a page has redaction boxes, **When** the user wants to remove them, **Then** a clear or undo action removes the boxes from that page.

---

### User Story 3 — Export a Truly Redacted PDF (Priority: P3)

After marking all sensitive regions across all relevant pages, the user clicks "Download Redacted PDF." The tool generates and downloads a new PDF file where the redacted pages contain only pixel/image data — no recoverable text, metadata, or hidden layers. The file downloads directly to the user's device.

**Why this priority**: The final delivery of the tool's core promise — true, irreversible redaction that protects users from fake-redaction failures common in competing tools.

**Independent Test**: Can be tested by redacting a known text phrase, downloading the PDF, and attempting to copy-paste or search for the phrase in a PDF viewer — no text should be recoverable.

**Acceptance Scenarios**:

1. **Given** redaction boxes have been applied across one or more pages, **When** the user clicks "Download Redacted PDF," **Then** a PDF file is downloaded to their device.
2. **Given** the downloaded PDF is opened in a PDF viewer, **When** a user attempts to select and copy text from a redacted region, **Then** no text is selectable or copy-pasteable — the region contains only image data.
3. **Given** the downloaded PDF is inspected structurally, **When** reviewing its internal data, **Then** pages that had redactions contain no text stream data — only rasterized image content.
4. **Given** pages with no redactions exist alongside redacted pages, **When** the user downloads the redacted PDF, **Then** unredacted pages are also preserved correctly in the output.

---

### Edge Cases

- What happens when a user loads a password-protected (encrypted) PDF?
- What happens when the PDF has a very high page count (50+ pages) — does the UI remain responsive?
- What happens if the user tries to download before any redactions have been drawn?
- What happens if a user draws an extremely small or zero-area rectangle?
- How does the tool handle PDFs whose pages contain only embedded images (no text layer at all)?
- What happens if available browser memory is insufficient to render all pages simultaneously?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool MUST load PDF files from the user's local filesystem without transmitting any file data to a remote server.
- **FR-002**: The tool MUST render each page of the loaded PDF as a visual representation in the browser.
- **FR-003**: Users MUST be able to draw rectangular redaction regions over any area of any rendered page.
- **FR-004**: Redaction rectangles MUST be visually displayed as solid black overlays during the editing session.
- **FR-005**: Redaction rectangle selections MUST persist per page as the user navigates between pages.
- **FR-006**: Redaction rectangles MUST remain correctly positioned relative to page content when the zoom level changes.
- **FR-007**: The tool MUST export a new PDF file where redacted regions contain only rasterized pixel data with no underlying text or metadata.
- **FR-008**: The exported PDF MUST be downloadable directly to the user's device without any server involvement.
- **FR-009**: The tool MUST support multi-page PDFs and allow redactions on any combination of pages.
- **FR-010**: Unredacted pages MUST be preserved in the exported PDF output.
- **FR-011**: The tool MUST display a clear error message when the selected file is not a valid PDF.
- **FR-012**: Users MUST be able to clear or undo redaction selections on a given page before exporting.

### Key Entities

- **PDF Document**: The source file selected from the user's local filesystem. Has one or more pages. Never leaves the browser.
- **Page Canvas**: The rendered visual representation of a single PDF page. Acts as the interactive drawing surface for redactions.
- **Redaction Rectangle**: A user-defined rectangular region on a specific page, identified by its coordinates relative to the page dimensions. Maintained in memory per page throughout the session.
- **Redacted PDF**: The output document generated at export time. Composed of flattened raster images (one per page). Contains no text data structures.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can load a PDF and view the first page within 3 seconds for documents up to 10MB on a standard broadband connection.
- **SC-002**: Zero bytes of PDF file content are transmitted to any external server during any operation — load, edit, or export.
- **SC-003**: The exported PDF contains no selectable or copy-paste-accessible text in regions that were marked for redaction, verified by a select-all test in a standard PDF viewer.
- **SC-004**: Redaction boxes remain correctly positioned after zoom changes — content alignment is preserved visually with no perceptible drift.
- **SC-005**: Users can complete the full workflow (load → mark regions → export) for a 10-page document in under 5 minutes without prior training or documentation.
- **SC-006**: The tool functions correctly in the latest two major versions of Chrome, Firefox, and Safari without installation of any plugin or browser extension.

---

## Assumptions

- Users have modern browsers with Canvas API and File API support (Chrome 90+, Firefox 88+, Safari 15+).
- Password-protected (encrypted) PDFs are out of scope for the initial version.
- The tool ships as a single `index.html` + `main.js` with no build step, hosted as a static GitHub Pages site.
- All third-party libraries are loaded from committed local files in the shared `/vendor/` directory. npm may be used only as a dev-time workflow to pin and refresh those vendored assets.
- Web Workers for background rendering are optional enhancements — the tool must be functional without them, though a loading indicator may be shown for large documents.
- The tool targets the primary use case of documents up to ~50 pages and ~20MB. Behaviour with extremely large files is best-effort.
