# Feature Specification: Free Custom QR Code Generator

**Feature Branch**: `004-qr-code-generator`
**Created**: 2026-03-26
**Status**: Approved
**Input**: Issue #22 — [PROPOSAL] - QR Code Generator

---

## Problem Statement

Every user who needs a styled QR code — one with custom colors, rounded corners, or a branded look — hits a paywall. Basic black-and-white QR generation is free everywhere, but the moment users want to customize colors or download a high-resolution/SVG version, tools like QR Code Generator (.com) and QR Code Monkey push them to paid plans ($5–$15/month).

Non-technical users (event organizers, small business owners, teachers) are the primary audience being charged for what is trivially achievable in the browser.

**Competitor evidence:**

| Tool | Problem |
|------|---------|
| qr-code-generator.com | Color/style customization behind $5.40/month Pro plan |
| qrcodemonkey.com | High-res download and custom shapes behind $6.95/month |
| flowcode.com | Requires account for all tiers; dynamic QR from $10/month |
| QR Tiger | Watermark added to free downloads; customization behind paywall |
| Canva QR | Requires Canva account; part of broader subscription funnel |

**Search phrases users type**: `qr code generator free`, `custom qr code generator free no watermark`, `qr code generator no account`, `wifi qr code generator`, `colored qr code free`, `qr code svg download free`

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Generate QR from URL or Text (Priority: P1)

A user opens the tool, types a URL or short text, and immediately sees a QR code preview. They download it as a PNG with no watermark and no account required.

**Why this priority**: Core foundational capability — delivers immediate value. Real-time generation with zero friction is the key differentiator vs paid tools.

**Acceptance Scenarios**:

1. **Given** a user types a URL into the input field, **When** the input changes, **Then** a QR code is rendered in the preview within 200 ms and no network requests containing the input are made.
2. **Given** a QR code is displayed, **When** the user clicks "Download PNG", **Then** a PNG file is downloaded locally with no watermark.
3. **Given** a QR code is displayed, **When** the user clicks "Download SVG", **Then** an SVG file is downloaded locally with no watermark.
4. **Given** an empty input field, **When** the tool loads, **Then** no QR code is rendered and a helpful placeholder is shown.

---

### User Story 2 — Customize Appearance (Priority: P2)

A user adjusts the foreground and background colors of the QR code, changes the error correction level, and sets the output size before downloading.

**Why this priority**: Color customization is the primary paywall feature in competing tools. This story directly addresses the core gap.

**Acceptance Scenarios**:

1. **Given** a QR code is displayed, **When** the user changes the foreground color via the color picker, **Then** the QR preview updates immediately with the new color.
2. **Given** a QR code is displayed, **When** the user changes the background color, **Then** the preview updates immediately.
3. **Given** similar foreground and background colors are chosen, **When** the contrast ratio drops below a readable threshold, **Then** a visible unreadability warning is shown.
4. **Given** an output size slider is set, **When** the user downloads the PNG, **Then** the downloaded image uses the selected resolution.
5. **Given** a user selects an error correction level, **When** the QR is regenerated, **Then** the new error correction level is reflected in the output.

---

### User Story 3 — Structured Content Types (Priority: P3)

A user selects a "WiFi" template, fills in the SSID, password, and security type fields, and the tool auto-encodes the WiFi QR format. Similar flows for vCard contact and SMS.

**Why this priority**: Adds high-value non-technical use cases (café WiFi signs, business cards, event contact sharing) that are behind paywalls on most tools.

**Acceptance Scenarios**:

1. **Given** a user selects the WiFi content type, **When** they fill in SSID and password, **Then** the tool generates a valid WiFi QR string and updates the preview.
2. **Given** a user selects the vCard content type, **When** they enter name, phone, and email, **Then** a valid vCard QR is generated.
3. **Given** a user selects the SMS content type, **When** they enter phone number and message, **Then** a valid SMS QR is generated.
4. **Given** a structured template is active, **When** the user scans the generated QR with a mobile device, **Then** the device correctly triggers the expected action (WiFi join prompt, contact save, SMS draft).

---

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Real-time QR generation as user types (≤200 ms) | P1 |
| FR-002 | PNG download (no watermark) | P1 |
| FR-003 | SVG download (no watermark) | P1 |
| FR-004 | Foreground color picker (color swatch + hex input) | P2 |
| FR-005 | Background color picker (color swatch + hex input) | P2 |
| FR-006 | Error correction level selector (Low/Medium/Quartile/High) | P2 |
| FR-007 | Output size control (slider, 200–2000 px range) | P2 |
| FR-008 | Reset to defaults button (black-on-white, Medium EC, 512 px) | P2 |
| FR-009 | Unreadability warning for low-contrast color pairs | P2 |
| FR-010 | WiFi structured template (SSID, password, security type) | P3 |
| FR-011 | vCard structured template (name, phone, email) | P3 |
| FR-012 | SMS structured template (phone, message) | P3 |
| FR-013 | Input capacity warning when data exceeds QR limits | P2 |
| FR-014 | Works fully offline after initial page load | P1 |

---

## Non-Goals

- **Dynamic QR codes** (editable destination after creation) — requires backend storage.
- **Analytics / scan tracking** — requires a server.
- **Logo/image overlay** inside the QR code — out of scope for v1 (high complexity, marginal demand).
- **Bulk QR generation** — out of scope for v1.
- **QR code reading/scanning** — separate tool concern.

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| SC-001 | Zero bytes of user input transmitted to any server |
| SC-002 | QR code visible within 200 ms of typing starting |
| SC-003 | Downloaded files contain no watermark or attribution |
| SC-004 | Generated codes scan on iOS and Android in 9/10 test cases across URL, WiFi, vCard |
| SC-005 | Non-technical user generates and downloads styled QR in under 60 seconds |

---

## Technical Approach

| API / Capability | Role |
|-----------------|------|
| qrcodejs / qrcode (vendored, ~15 KB) | Core QR code generation — encodes payload into QR matrix |
| Canvas API | Render QR with custom colors; export to PNG Blob |
| SVG serialization | Export QR as SVG from the DOM element |
| Blob + URL.createObjectURL | Trigger local PNG/SVG download |

**File layout:**
- `tools/qr-code-generator.html` — main entry page
- `tools/qr-code-generator/main.js` — tool logic
- `tools/qr-code-generator/style.css` — tool-specific styles
- `tools/vendor/qrcode.min.js` — vendored QR library (if not already present)

**Complexity estimate**: 2/10 — QR encoding is handled by the vendored library. Main work is Canvas color rendering, structured template forms, and the SVG export path.

---

## Usability Controls

- **Live preview**: QR updates instantly as the user types — no submit button
- **Color pickers**: Foreground and background color, with a color swatch + hex input
- **Error correction selector**: Low / Medium / Quartile / High with plain-language descriptions
- **Output size slider**: Set PNG resolution (e.g., 200–2000 px) before download
- **Format download buttons**: "Download PNG" and "Download SVG"
- **Reset to Defaults**: Black-on-white, Medium error correction, 512 px
- **Structured templates**: WiFi (SSID, password, security type), vCard (name, phone, email), SMS (phone, message)
- **Unreadability warning**: Alert if foreground and background colors are too similar or input exceeds QR capacity
- **Works offline**: No network requests required after initial page load
