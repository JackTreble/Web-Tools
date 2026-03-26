---
name: "Lead Developer: Build"
description: "Implements approved spec tasks into working tool code using Speckit implementation workflow."
on:
  push:
    branches: [main]
    paths:
      - 'specs/**/spec.md'
      - 'specs/**/plan.md'
      - 'specs/**/tasks.md'
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: read
  issues: read

engine: claude

# The Coder needs to be able to propose the actual tool files
safe-outputs:
  create-pull-request:
    allowed-files: ["specs/**/*", "tools/*", "tools/**/*", "README.md", "package.json", "package-lock.json"]
  add-comment: {}

tools:
  github: {}
---

# Intelligence Squad: Lead Developer

## Goal
Convert approved planning artifacts into a working, single-page browser utility by running `/speckit.implement`, then open an implementation PR for human review.

Portfolio focus reminder: implement features that serve broad non-technical user tasks and clear paid-tool replacement value. Avoid expanding scope toward low-level developer-only utilities unless explicitly required by the approved spec and justified by mainstream demand evidence.

## Instructions
1. **Context Initialization**:
  - Read `AGENTS.md`.
  - Identify the `specs/[feature-slug]/` folder introduced or updated by the merged planning PR that triggered this run.
  - Read `specs/[feature-slug]/spec.md` and `specs/[feature-slug]/tasks.md`.
  - Derive `feature-slug-no-number` from the folder name by removing any leading numeric prefix (for example, `001-print-tool` → `print-tool`).

2. **Implementation via `/speckit.implement`**:
  - Invoke `/speckit.implement` using `specs/[feature-slug]/spec.md` and `specs/[feature-slug]/tasks.md` as the source of truth.
  - Implement only the approved scope represented in those planning files.
  - Generate the necessary HTML, CSS, and Vanilla JavaScript.
  - **Requirement**: Create the tool page at `/tools/[feature-slug-no-number].html`.
  - **Requirement**: Place tool-specific scripts and assets under `/tools/[feature-slug-no-number]/`.
  - **Requirement**: Reuse existing shared CSS and JavaScript before creating new tool-specific files.
  - **Requirement**: Add a `<script type="application/ld+json">` block to the HTML with structured data appropriate to the tool.
  - **Guidance**: The HTML file may contain page-specific metadata, structured data, and light inline setup code when that keeps the tool simple, similar to existing tools.
  - **Standard**: Runtime third-party browser assets must be committed under shared `/tools/vendor/` paths. Dev-only npm usage is allowed to download or refresh those assets, but shipped pages must not depend on CDNs or `node_modules/`. No React. Use modern Browser APIs (ES Modules, CSS Grid/Flexbox).

3. **Validation**:
  - Double-check that the code does NOT attempt any runtime `fetch()` calls to external APIs for tool functionality.
   - Ensure the UI is clean and functional for a "utility-first" tool.
  - Confirm the page includes valid `application/ld+json` structured data relevant to the tool.
  - Confirm the generated page path uses `feature-slug-no-number` at `/tools/[feature-slug-no-number].html`, not the raw `specs/` folder name if it includes a numeric prefix.
  - Confirm tool-specific logic stays under `/tools/[feature-slug-no-number]/`.

4. **Submission**:
   - Use `create-pull-request` to submit the code.
  - **PR Title**: "[BUILD] - {{feature-slug-no-number}} Implementation"
  - **PR Body**: List the features implemented, note any shared assets or vendored dependencies used, and explain how to run it by opening `/tools/[feature-slug-no-number].html`.
  - Include a single explicit GitHub closing reference to the original feature issue (for example: `Closes #<issue-number>`), so the issue closes only when this implementation PR is merged.

5. **Notification**:
   - Find the original issue related to this feature (referenced in the spec) and comment: 
     "The code is ready! 🚀 Review the implementation PR here: [pull-request-url]"

## Notes
- This workflow is intentionally PR-based (not direct merge to `main`) so humans can validate generated implementation changes before release.