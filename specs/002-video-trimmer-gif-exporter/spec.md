# Feature Specification: Privacy-First Video Trimmer & GIF/WebP Exporter

**Feature Branch**: `002-video-trimmer-gif-exporter`
**Created**: 2026-03-25
**Status**: Draft
**Input**: Issue #7 — [PROPOSAL] - Video Trimmer & GIF/WebP Exporter (https://github.com/JackTreble/Web-Tools/issues/7)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Load and Preview a Video File Locally (Priority: P1)

A user opens the tool in their browser and loads a video file from their local disk — either by dragging and dropping it onto the tool or clicking to select it. The video is displayed in a browser-native player with play/pause controls. No file data is transmitted anywhere. The user can immediately see the video is loaded and can play it back before proceeding.

**Why this priority**: Core foundational capability — without local video loading nothing else is possible. Delivers immediate privacy assurance. Can be shipped alone as a zero-upload video preview tool.

**Independent Test**: Can be fully tested by loading a video file and confirming it plays back in the browser with no outbound network requests in the browser DevTools Network tab.

**Acceptance Scenarios**:

1. **Given** a user has a video file on their local filesystem, **When** they drag and drop it onto the tool, **Then** the video loads and is ready for playback with no outbound network requests.
2. **Given** a user has a video file on their local filesystem, **When** they click the file selector and choose the file, **Then** the video loads and is ready for playback.
3. **Given** a video is loaded, **When** the user clicks play, **Then** the video plays back smoothly with audio.
4. **Given** a user selects a file that is not a recognised video format, **When** the tool attempts to load it, **Then** a clear error message is displayed and no crash occurs.

---

### User Story 2 — Set a Trim Range Using a Timeline Selector (Priority: P2)

After loading a video, the user sees a timeline strip showing a visual thumbnail preview of the video. The user drags two handles on the timeline to define the start and end of the clip they want to keep. The tool shows the exact start time and end time as the handles are moved. A looping preview of the selected range plays in the video element so the user can confirm the cut before processing.

**Why this priority**: The core interaction for the tool's primary use case — selecting a clip from a longer recording. Cannot process without a defined range.

**Independent Test**: Can be tested independently of export by loading a video, setting start/end handles, and verifying the displayed timestamps update correctly and the preview plays only the selected range.

**Acceptance Scenarios**:

1. **Given** a video is loaded, **When** the timeline is displayed, **Then** thumbnail frames from the video are rendered across the timeline strip proportional to video duration.
2. **Given** the timeline is visible, **When** a user drags the start handle, **Then** the start time updates in real time and the preview reflects the new start point.
3. **Given** the timeline is visible, **When** a user drags the end handle, **Then** the end time updates in real time and the preview reflects the new end point.
4. **Given** both handles are set, **When** the user plays the preview, **Then** playback loops only within the selected trim range.
5. **Given** a user attempts to drag the start handle past the end handle (or vice versa), **When** the handles meet, **Then** the tool prevents an invalid range (minimum clip length of 0.1 seconds enforced).

---

### User Story 3 — Export the Trimmed Clip in a Chosen Format (Priority: P3)

After setting a trim range, the user selects an output format (GIF, WebP, or MP4) and clicks "Process." Processing runs entirely in the browser — no upload, no server. A progress bar shows how far along processing is. When complete, a "Download" button appears and the user saves the output file directly to their device.

**Why this priority**: The final delivery of the tool's value proposition — the actual file the user wants. Depends on US1 and US2 being complete.

**Independent Test**: Can be tested by setting a short trim range, selecting each output format in turn, processing, and downloading the result. Verify the output file is valid and no network requests containing file data are made.

**Acceptance Scenarios**:

1. **Given** a trim range is set and GIF is selected, **When** the user clicks "Process," **Then** an animated GIF is generated using palette-optimised encoding and made available for download.
2. **Given** a trim range is set and WebP is selected, **When** the user clicks "Process," **Then** an animated WebP file is generated and made available for download.
3. **Given** a trim range is set and MP4 is selected, **When** the user clicks "Process," **Then** a trimmed MP4 clip is generated using stream-copy (no re-encode) and made available for download.
4. **Given** processing is running, **When** the user observes the UI, **Then** a visible progress bar reflects processing progress and the "Process" button is disabled to prevent duplicate runs.
5. **Given** processing completes, **When** the user clicks "Download," **Then** the output file downloads directly to their device with no intermediate server involved.
6. **Given** a user attempts to process without setting a trim range or before a video is loaded, **When** they click "Process," **Then** a clear instructional message is shown and no processing starts.

---

### Edge Cases

- What happens when the user loads a video format not supported by the browser's native video element (e.g., MKV on some browsers)?
- What happens if the selected trim range is extremely short (< 1 second) for GIF/WebP export?
- What happens if the FFmpeg processing engine has not yet finished loading when the user clicks "Process"?
- What happens if the user closes or navigates away mid-processing?
- What happens if the output file would exceed typical browser memory limits (e.g., a 10-minute 4K clip exported as GIF)?
- What happens when the user loads a very large video file (> 500 MB)?
- What happens if the user's browser does not support the required processing APIs?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool MUST load video files from the user's local filesystem without transmitting any file data to a remote server.
- **FR-002**: The tool MUST support loading video files via drag-and-drop and via a file picker dialog.
- **FR-003**: The tool MUST display a native browser video player with play/pause controls for the loaded file.
- **FR-004**: The tool MUST render a visual timeline strip with thumbnail frames derived from the loaded video.
- **FR-005**: Users MUST be able to set a trim start and end point by dragging handles on the timeline.
- **FR-006**: The tool MUST display the current start time and end time as numeric values that update in real time while handles are dragged.
- **FR-007**: The video preview MUST loop playback within the selected trim range so the user can review their selection.
- **FR-008**: Users MUST be able to select an output format from: GIF, animated WebP, or MP4.
- **FR-009**: The tool MUST process the trim and export operation entirely within the browser with no server involvement.
- **FR-010**: GIF export MUST use a palette-optimised encoding pipeline for maximum visual quality.
- **FR-011**: MP4 export MUST use stream-copy trimming (no re-encode) to preserve quality and minimise processing time.
- **FR-012**: The tool MUST display a progress bar during processing that reflects actual progress toward completion.
- **FR-013**: The "Process" button MUST be disabled while processing is running to prevent duplicate jobs.
- **FR-014**: On processing completion, the tool MUST present a download action that saves the output file directly to the user's device.
- **FR-015**: The tool MUST show a progress indicator during the initial loading of the processing engine, since it requires a sizeable one-time download that the browser then caches.
- **FR-016**: The tool MUST display a clear error message when a selected file cannot be loaded or is not a supported format.
- **FR-017**: The tool MUST prevent invalid trim ranges (end must be after start; minimum duration enforced).

### Key Entities

- **Video File**: The source file selected from the user's local filesystem. Loaded into browser memory only; never transmitted. Has a duration, dimensions, and format.
- **Trim Range**: A user-defined start time and end time pair within the loaded video's duration. Represented as seconds with sub-second precision. Enforces a minimum duration.
- **Output Format**: The user's selected export target — GIF, WebP, or MP4. Determines the encoding pipeline applied during processing.
- **Processed Output**: The result of the trim and encode operation. A binary file (GIF, WebP, or MP4) held in browser memory until downloaded.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero bytes of video file content are transmitted to any external server during any operation — load, trim, process, or download.
- **SC-002**: Users can complete the full workflow (load → set range → select format → process → download) for a 30-second screen recording in under 2 minutes without prior training.
- **SC-003**: The processing engine is ready to use within 30 seconds on a standard broadband connection on first visit; subsequent visits start instantly due to browser caching.
- **SC-004**: MP4 stream-copy trim completes in under 5 seconds for clips up to 10 minutes.
- **SC-005**: The tool functions correctly in the latest two major versions of Chrome, Firefox, and Safari without installation of any plugin or extension.
- **SC-006**: Timeline thumbnail frames are rendered and visible within 3 seconds of a video file being loaded for files up to 100 MB.
- **SC-007**: The output GIF or WebP file is visually recognisable as the selected clip with no significant artefacts or colour degradation relative to the source.

---

## Assumptions

- Users have modern browsers with File API, Canvas API, and video element support (Chrome 90+, Firefox 88+, Safari 15+).
- The processing engine is loaded from committed local files in the shared `/vendor/ffmpeg/` directory. npm may be used only as a dev-time workflow to pin and refresh those vendored assets.
- Single-threaded processing mode is used to avoid the need for cross-origin isolation headers, ensuring compatibility with GitHub Pages hosting without custom server configuration.
- Processing is run off the main thread via a Web Worker to keep the UI responsive during long operations.
- Audio is preserved in MP4 output but is not present in GIF or WebP output (these formats do not support audio).
- The tool targets clips up to approximately 2 minutes for GIF/WebP export and up to 10 minutes for MP4 stream-copy. Behaviour with longer clips is best-effort.
- The tool ships as a single `index.html` + `main.js` + `style.css` structure hosted as a static GitHub Pages site.
- Filters, audio stripping, speed control, and batch processing are explicitly out of scope for this version.
