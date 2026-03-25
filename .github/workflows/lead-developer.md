---
name: "Lead Developer: Build"
description: "Automatically generates the web tool code once a spec is merged."
on:
  push:
    branches: [main]
    paths:
      - 'specs/**/tasks.md'

permissions:
  contents: read
  pull-requests: read
  issues: read

engine: claude

# The Coder needs to be able to propose the actual tool files
safe-outputs:
  create-pull-request:
    allowed-files: ["*.html", "scripts/**/*", "styles/**/*", "tools/**/*"]
  add-comment: {}

tools:
  github: {}
---

# Intelligence Squad: Lead Developer

## Goal
Convert the merged Spec-Kit into a working, single-page browser utility.

## Instructions
1. **Context Initialization**:
  - Read `.specify/memory/constitution.md` and `AGENTS.md`.
  - Identify the `.specify/[feature-slug]/` folder introduced by the merged PR that triggered this run.
  - Read `specs/[feature-slug]/spec.md` and `specs/[feature-slug]/tasks.md`.
  - Derive `feature-slug-no-number` from the folder name by removing any leading numeric prefix (for example, `001-print-tool` → `print-tool`).

2. **Code Generation**:
   - Based on the `tasks.md`, generate the necessary HTML, CSS, and Vanilla JavaScript.
  - **Requirement**: Create the page at the repository root as `/[feature-slug-no-number].html` so the tool has a simple URL.
  - **Requirement**: Place tool-specific scripts and assets under `/tools/[feature-slug-no-number]/`.
  - **Requirement**: Prefer shared, reusable assets in centralized `/styles/` and `/scripts/` folders when functionality or styling should be consistent across tools.
  - **Requirement**: Reuse existing shared CSS and JavaScript before creating new tool-specific files.
  - **Requirement**: Add a `<script type="application/ld+json">` block to the root HTML with structured data appropriate to the tool.
  - **Guidance**: The root HTML file may contain page-specific metadata, structured data, and light inline setup code when that keeps the tool simple, similar to existing root-page tools.
  - **Standard**: External CDNs are allowed for stable browser-side libraries when helpful. No NPM. No React. Use modern Browser APIs (ES Modules, CSS Grid/Flexbox).

3. **Validation**:
  - Double-check that the code does NOT attempt any runtime `fetch()` calls to external APIs for tool functionality, as per the Constitution.
  - CDN-hosted script or stylesheet includes are acceptable when they are static dependencies loaded by the page.
   - Ensure the UI is clean and functional for a "utility-first" tool.
  - Confirm the page includes valid `application/ld+json` structured data relevant to the tool.
  - Confirm the generated page path uses `feature-slug-no-number`, not the raw `.specs/` folder name if it includes a numeric prefix.
  - Confirm shared assets live in `/styles/` and `/scripts/` when appropriate, while tool-specific logic stays under `/tools/[feature-slug-no-number]/`.

4. **Submission**:
   - Use `create-pull-request` to submit the code.
  - **PR Title**: "[BUILD] - {{feature-slug-no-number}} Implementation"
  - **PR Body**: List the features implemented, note any shared assets or CDN dependencies used, and explain how to run it by opening `/[feature-slug-no-number].html`.

5. **Notification**:
   - Find the original issue related to this feature (referenced in the spec) and comment: 
     "The code is ready! 🚀 Review the implementation PR here: [pull-request-url]"