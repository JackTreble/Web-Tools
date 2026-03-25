# web-tools

Small, local-first browser utilities published at https://tools.treble.dev.

## Goals

- 100% client-side tools
- no accounts, tracking, or uploads
- simple static files that run on GitHub Pages
- useful pages that are easy to find via search

## Current tools

- [print-without-black.html](print-without-black.html) — convert PDF blacks to printable color when a black cartridge is empty
- [pdf-redactor.html](pdf-redactor.html) — permanently redact PDF regions in the browser

## Project structure

- [index.html](index.html) — landing page for the tool collection
- [print-without-black.html](print-without-black.html) — standalone tool
- [pdf-redactor.html](pdf-redactor.html) — PDF redaction tool entry page
- [tools/pdf-redactor/main.js](tools/pdf-redactor/main.js) — PDF redactor logic
- [tools/pdf-redactor/style.css](tools/pdf-redactor/style.css) — PDF redactor styles
- [specs](specs) — feature notes and planning docs that are still useful to keep in-repo

## Working on the site

There is no build step. Open the HTML files directly in a browser or serve the folder as a static site.

When adding tools:

- keep processing in the browser
- prefer vanilla HTML, CSS, and JavaScript
- use descriptive titles, meta descriptions, and clear how-to content
- include practical controls such as undo, reset, preview, color selection, or quality settings when relevant
