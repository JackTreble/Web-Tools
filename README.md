# web-tools

Small, local-first browser utilities published at https://tools.treble.dev.

## Goals

- 100% client-side tools
- no accounts, tracking, or uploads
- simple static files that run on GitHub Pages
- useful pages that are easy to find via search

## Current tools

- [tools/print-without-black.html](tools/print-without-black.html) — convert PDF blacks to printable color when a black cartridge is empty
- [tools/pdf-redactor.html](tools/pdf-redactor.html) — permanently redact PDF regions in the browser
- [tools/video-trimmer-gif-exporter.html](tools/video-trimmer-gif-exporter.html) — trim local videos and export GIF/WebP/MP4 clips

## Project structure

- [tools/index.html](tools/index.html) — landing page for the tool collection
- [tools/print-without-black.html](tools/print-without-black.html) — print-without-black tool entry page
- [tools/pdf-redactor.html](tools/pdf-redactor.html) — PDF redaction tool entry page
- [tools/video-trimmer-gif-exporter.html](tools/video-trimmer-gif-exporter.html) — video trimmer tool entry page
- [tools/pdf-redactor/main.js](tools/pdf-redactor/main.js) — PDF redactor logic
- [tools/pdf-redactor/style.css](tools/pdf-redactor/style.css) — PDF redactor styles
- [specs](specs) — feature notes and planning docs that are still useful to keep in-repo

## Working on the site

There is no build step. Open files in `/tools/*.html` directly in a browser or serve the folder as a static site.

Third-party browser libraries are loaded from committed files in [vendor](vendor), not external CDNs.

### Managing shared vendor assets

- Keep runtime dependencies in [vendor](vendor) so tools remain portable and reusable across workflows.
- Use npm only as a development-time dependency management workflow.
- After updating dependency versions, run the vendor sync workflow and commit the resulting changes in [package.json](package.json), [package-lock.json](package-lock.json), and [vendor](vendor).

When adding tools:

- keep processing in the browser
- prefer vanilla HTML, CSS, and JavaScript
- load third-party runtime assets from the shared `/vendor/` directory
- use descriptive titles, meta descriptions, and clear how-to content
- include practical controls such as undo, reset, preview, color selection, or quality settings when relevant
