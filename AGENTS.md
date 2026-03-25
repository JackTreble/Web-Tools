# Agent Instructions

This file is the canonical source of project context and agent guidance for this repository.

## Project Mission

`web-tools` builds high-quality, open-source, **100% client-side** web tools that serve as free alternatives to paid SaaS products.

Primary domain: `tools.treble.dev`

## Core Operating Principles

- **Privacy First:** User data never leaves the browser. No databases, no sign-ups, no tracking.
- **Zero-Cloud Footprint:** Tools must be hosted via GitHub Pages and require no backend or server-side logic.
- **80/20 Value:** Focus on the simple case. Aim for 80% of the value with 20% of the complexity.
- **Modern Web Standards:** Prefer ES Modules and native Browser APIs such as Canvas, File System, and Web Crypto.
- **Searchable by Default:** Tools should be easy to find via search, with names and page copy aligned to real user queries.

## Research Focus

Look for browser-first tools currently behind paywalls, cluttered with ads, or requiring unnecessary accounts.

Examples:
- **Document Processing:** PDF merging, splitting, recoloring, Markdown to PDF, CSV to JSON
- **Media Utilities:** Client-side image compression, SVG optimization, EXIF stripping
- **Developer Tools:** Base64 encoders, JWT decoders, cron expression generators

## Execution Framework

1. **Intelligence**
   - Identify a market gap and verify feasibility with Browser APIs only.
   - Check existing `/specs/**` and both open and closed GitHub issues before treating an idea as new.
   - Run a short, bounded discovery pass first.
   - Prefer a small set of high-confidence opportunities over a long list of weak ones.
2. **Product**
   - Convert a validated gap into a formal `spec.md` using the Spec-Kit template.
3. **Engineering**
   - Implement the tool in a clean `index.html`, `style.css`, and `main.js` structure, or a simpler static structure when appropriate.
4. **Board (Human)**
   - Final sign-off before deployment to `tools.treble.dev`.

## Decision Heuristics

1. Does this advance the focus on free browser-based alternatives?
2. Can this be achieved without a server? If not, reject it.
3. Is there a simpler approach that delivers the core value?
4. Does this duplicate an existing spec, open issue, or closed issue?
5. Does the likely UX need basic user controls such as undo, color choice, preview, or quality settings?
6. Is the tool easy to describe in plain language that matches how users would search for it?

## Strategic Directives

### Mission

Create simple, local browser tools that provide free alternatives to paid tools.

### P0: First Value

All agent work should produce visible, useful output from the first run.

"Useful" means:
- intelligence produces sourced facts, not generic summaries
- research identifies specific competitors and opportunities
- product translates findings into concrete next steps
- outputs advance the project goals in an actionable way

### Decision Framework

1. Does this advance the research focus?
2. Is there a simpler approach for 80% of the value?
3. What is the opportunity cost?

### Constraints

- Produce output first, optimize later.
- Avoid over-investing in process.
- Every output should be something a human can use today.

## Technical Standards

- **Language:** HTML5, CSS3, modern JavaScript
- **Architecture:** ES Modules only. No bundling unless strictly necessary.
- **Dependencies:** Prefer vanilla solutions. If a library is needed, prefer browser-compatible delivery.
- **Styling:** Mobile-first design using standard CSS or lightweight browser-friendly approaches.

## Agent Workflow Rules

- **Spec-First:** No major code work before a `spec.md` exists for new features.
- **Duplicate Check:** Review `/specs/**` plus relevant open and closed GitHub issues before proposing a new tool.
- **Bounded Discovery:** Prefer short discovery passes and a few validated opportunities.
- **Issue Volume Control:** A single research pass should create no more than 3 proposal issues, and only for distinct, validated ideas.

## Usability Baseline

When relevant, tools should account for:
- edit, undo, reset, or clear actions
- preview before export
- color selection when color affects output
- quality, compression, or resolution settings when fidelity varies
- clear recovery from invalid input
- safe defaults for non-technical users

## SEO and Discoverability

Every tool published on `tools.treble.dev` should have:
- a descriptive `<title>`
- a useful meta description
- relevant meta tags
- meaningful headings
- a clear "How to use" section
- names and copy that reflect plain-language search intent

## Practical Guidance for Agents

- Prefer editing existing files over adding new structure.
- Keep processing inside the browser.
- Prefer vanilla HTML, CSS, and JavaScript.
- Avoid backend services, uploads, accounts, OCR services, or server-side PDF processing.
- If proposing a new tool, mention likely usability controls and likely search phrases.

## Repo Notes

Important project files include:
- `README.md` for human-facing project overview
- `instructions.md` for implementation style and UI guidance
- `/specs/**` for feature planning and prior work

If another agent-specific file exists, it should defer to this file for canonical project guidance.
