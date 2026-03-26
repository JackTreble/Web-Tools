# Feature Specification: Free QR Code Generator with Custom Styling

**Feature Branch**: `004-qr-code-generator`
**Created**: 2026-03-26
**Status**: Draft
**Input**: Issue #22 — [PROPOSAL] - QR Code Generator (https://github.com/JackTreble/Web-Tools/issues/22)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Generate a QR Code from URL or Text (Priority: P1)

A user opens the tool in their browser, types or pastes a URL or text string into an input field, and instantly sees a QR code rendered in the browser — no submit button required. The QR updates live as the user types. The user can then download the result as a PNG or SVG file with no watermark, no account, and no server contact.

**Why this priority**: Core foundational capability — without QR generation nothing else is possible. Delivers the primary use case for the majority of users who just need a basic, clean, downloadable QR code without a paywall.

**Independent Test**: Can be fully tested by typing a URL, confirming a QR code appears within 200 ms, scanning the code on a mobile device, and downloading the PNG — the downloaded file must scan correctly, contain no watermark, and match the typed input.

**Acceptance Scenarios**:

1. **Given** the tool is open and the input field is empty, **When** the user types a URL, **Then** a QR code is rendered within 200 ms and the code encodes the typed URL correctly.
2. **Given** a QR code is displayed, **When** the user clicks "Download PNG," **Then** a PNG file is downloaded to their device with no watermark or branding.
3. **Given** a QR code is displayed, **When** the user clicks "Download SVG," **Then** an SVG file is downloaded to their device with no watermark or branding.
4. **Given** the tool is open, **When** the user clears the input field, **Then** the QR preview is cleared or replaced with a placeholder.
5. **Given** the user is offline after initial page load, **When** they generate and download a QR code, **Then** the tool works fully without any network requests.

---

### User Story 2 — Customize QR Appearance (Priority: P2)

After generating a QR code from a URL or text, the user wants to adjust its visual style to match their brand or context. They can pick foreground and background colors using color pickers, choose an error correction level, set the output resolution for PNG download, and see all changes reflected in the live preview immediately. A "Reset to Defaults" button restores the standard black-on-white appearance.

**Why this priority**: Customization is the primary paywall in competing tools. Delivering this for free is the core differentiator and the main reason non-technical users choose this tool over free alternatives.

**Independent Test**: Can be tested independently of structured templates by setting foreground to red, background to yellow, downloading a PNG, and confirming the downloaded file reflects those colors. Reset to Defaults must restore black-on-white.

**Acceptance Scenarios**:

1. **Given** a QR code is displayed, **When** the user changes the foreground color, **Then** the QR code preview updates immediately to use the new foreground color.
2. **Given** a QR code is displayed, **When** the user changes the background color, **Then** the QR code preview updates immediately to use the new background color.
3. **Given** both foreground and background colors are set, **When** the downloaded PNG is inspected, **Then** it uses exactly the chosen colors with no added watermark layer.
4. **Given** foreground and background colors are too similar (low contrast), **When** the user sets such a combination, **Then** a visible warning is shown ("Low contrast — QR code may not scan reliably") without blocking the user.
5. **Given** the user has changed styling settings, **When** they click "Reset to Defaults," **Then** foreground returns to black, background returns to white, error correction returns to Medium, and size returns to 512 px.
6. **Given** the user selects a higher error correction level, **When** the QR regenerates, **Then** the live preview updates to reflect the denser pattern and the encoded data is still correct.

---

### User Story 3 — Structured Content Types: WiFi, vCard, SMS (Priority: P3)

Beyond plain text and URLs, a user wants to create QR codes that trigger specific actions when scanned — joining a WiFi network, saving a contact, or opening a pre-composed SMS. The tool provides labeled template forms for each type (WiFi: SSID, password, security; vCard: name, phone, email; SMS: phone number, message body). The user fills in the fields and the tool assembles the correct format string automatically, then generates the QR code.

**Why this priority**: Structured content types address high-value real-world use cases (café WiFi signs, event networking, business cards) where the paywall is highest and the encoding logic is non-obvious to non-technical users.

**Independent Test**: Can be tested by filling in a WiFi template with a known SSID and password, downloading the QR, and scanning with an iOS or Android device — the device must offer to join the specified network.

**Acceptance Scenarios**:

1. **Given** the user selects the "WiFi" template, **When** they fill in SSID, password, and security type, **Then** the tool generates a QR code encoding the correct `WIFI:T:WPA;S:...;P:...;;` format string.
2. **Given** the user selects the "vCard" template, **When** they fill in name, phone, and email, **Then** the tool generates a QR code encoding a valid vCard 3.0 string.
3. **Given** the user selects the "SMS" template, **When** they fill in a phone number and message, **Then** the tool generates a QR code encoding an `smsto:` URI.
4. **Given** a structured template is active and the input exceeds QR capacity for the chosen error correction level, **When** the capacity is exceeded, **Then** a clear warning is shown ("Input too long for current settings — reduce content or lower error correction level").
5. **Given** a structured template QR is generated, **When** the user scans it on iOS or Android, **Then** the expected action is triggered (network join, contact save, or SMS composition) in at least 9 of 10 test cases.

---

### Edge Cases

- What happens when the user enters text that exceeds the maximum QR code data capacity?
- What happens when foreground and background colors are identical (zero-contrast)?
- What happens if the user's browser does not support the Canvas API?
- What happens when the user enters a very long URL (> 500 characters)?
- What happens when the WiFi password contains special characters that need escaping in the QR format string?
- What happens when the SVG export path is not supported in older browsers?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool MUST generate a QR code within 200 ms of any change to the input field or settings.
- **FR-002**: The tool MUST support plain text and URLs as QR content in the default mode.
- **FR-003**: The tool MUST provide a "Download PNG" action that downloads a raster image of the QR code with no watermark.
- **FR-004**: The tool MUST provide a "Download SVG" action that downloads a vector image of the QR code with no watermark.
- **FR-005**: Users MUST be able to set the foreground color of the QR code using a color picker with hex input.
- **FR-006**: Users MUST be able to set the background color of the QR code using a color picker with hex input.
- **FR-007**: Users MUST be able to select an error correction level: Low, Medium, Quartile, or High.
- **FR-008**: Users MUST be able to set the PNG output size in pixels (range: 200–2000 px) via a slider or number input.
- **FR-009**: The tool MUST provide a "Reset to Defaults" action restoring black foreground, white background, Medium error correction, and 512 px size.
- **FR-010**: The tool MUST display a low-contrast warning when the foreground and background colors are too similar to reliably scan.
- **FR-011**: The tool MUST display a capacity warning when the input data exceeds the QR code capacity for the selected error correction level.
- **FR-012**: The tool MUST provide a "WiFi" structured template with fields for SSID, password, and security type (WPA/WEP/None).
- **FR-013**: The tool MUST provide a "vCard" structured template with fields for name, phone number, and email address.
- **FR-014**: The tool MUST provide an "SMS" structured template with fields for phone number and message body.
- **FR-015**: Zero bytes of user input MUST be transmitted to any server during any operation.
- **FR-016**: The tool MUST function offline after the initial page load.

### Key Entities

- **QR Payload**: The encoded content — either a raw text/URL string or a formatted string assembled from a structured template (WiFi, vCard, SMS). Drives QR generation.
- **QR Style Config**: The current visual settings — foreground color, background color, error correction level, and PNG output size. Applied at render time via Canvas.
- **QR Output**: The rendered QR code image. Exists in two forms: a Canvas element (for live preview and PNG export) and an SVG DOM element (for SVG export).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero bytes of user input are transmitted to any external server during any session operation.
- **SC-002**: QR code is visible within 200 ms of the user beginning to type in the input field.
- **SC-003**: Downloaded PNG and SVG files contain no watermark, attribution, or branding from this tool.
- **SC-004**: Generated QR codes scan successfully on iOS and Android in at least 9 out of 10 test cases across URL, WiFi, vCard, and SMS content types.
- **SC-005**: A non-technical user can generate and download a styled QR code in under 60 seconds without prior instruction.
- **SC-006**: The tool functions correctly in the latest two major versions of Chrome, Firefox, and Safari without installation of any plugin or extension.

---

## Assumptions

- Users have modern browsers with Canvas API, Blob API, and File API support (Chrome 90+, Firefox 88+, Safari 15+).
- The QR encoding library (`qrcode` or equivalent) is small (~15 KB) and will be vendored under `/tools/vendor/qrcode/`.
- The tool ships as `tools/qr-code-generator.html` + `tools/qr-code-generator/main.js` + `tools/qr-code-generator/style.css` hosted as a static GitHub Pages site.
- SVG export is implemented by serialising the QR library's DOM output (if SVG mode is supported) or by programmatic SVG construction from the QR matrix.
- PNG export is implemented via Canvas API: paint the QR matrix with the chosen colors onto an offscreen canvas, then export via `canvas.toBlob()` and `URL.createObjectURL`.
- Logo/image embedding in the QR center is explicitly out of scope for this version.
- Dynamic QR codes (server-side redirect tracking) are explicitly out of scope — all codes are static.
- Batch QR generation is explicitly out of scope for this version.
