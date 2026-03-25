# web-tools Initiative: Business Brief

## 1. Vision & Mission
To eliminate the "Subscription Tax" on simple digital utilities. We build high-quality, open-source, **100% client-side** web tools that serve as free alternatives to paid SaaS products.

## 2. Core Operating Principles
* **Privacy First:** User data never leaves the browser. No databases, no sign-ups, no tracking.
* **Zero-Cloud Footprint:** Tools must be hosted via GitHub Pages and require no backend/server-side logic.
* **80/20 Value:** Focus on the "Simple Case." We aim for 80% of the utility of a paid tool with 20% of the complexity.
* **Modern Web Standards:** Use ES Modules (ESM) and native Browser APIs (Canvas, File System, Web Crypto).
* **Searchable by Default:** Tools should be easy to find via search, with names and page copy aligned to real user queries on `tools.treble.dev`.

## 3. Research Focus (The "Market Gaps")
Identify tools currently behind paywalls, cluttered with ads, or requiring unnecessary accounts. Examples include:
* **Document Processing:** PDF merging/splitting/recoloring, Markdown to PDF, CSV to JSON.
* **Media Utilities:** Client-side image compression, SVG optimizers, EXIF data strippers.
* **Developer Tools:** Base64 encoders, JWT decoders, Cron expression generators.

## 4. Execution Framework (The Squad Loop)
1.  **Intelligence:** Identify a "Market Gap" and verify technical feasibility via Browser APIs.
	- Check existing `/specs/**` and both open and closed GitHub issues before treating an idea as new.
	- Run a short, bounded discovery pass first; do not let research sprawl.
	- Prefer a small set of high-confidence opportunities over a long list of weak ones.
2.  **Product:** Convert a gap into a formal `spec.md` using the **Spec-Kit** template.
3.  **Engineering:** Implement the code in a clean `index.html`, `style.css`, and `main.js` structure.
4.  **Board (Human):** Final sign-off on PRs before deployment to `tools.treble.dev`.

## 5. Decision Heuristics for Agents
1.  Does this advance our focus on free browser-based alternatives?
2.  Can this be achieved without a server? (If no, reject).
3.  Is there a simpler approach that delivers the core value?
4.  Does this duplicate an existing spec, open issue, or closed issue?
5.  Does the likely UX need basic user controls such as undo, color choice, preview, or quality settings?
6.  Is the tool easy to describe in plain language that matches how users would search for it?
