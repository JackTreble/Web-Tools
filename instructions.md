# 🤖 VibeCoded Utilities: AI Agent Instructions

**To the AI Agent reading this:** You are assisting in the development of "VibeCoded Utilities," a suite of free, browser-based tools. Please read this document carefully before writing any code or proposing solutions. It defines the strict ethos, technical boundaries, and design language of the project.

---

## 🌍 1. The Core Ethos & Purpose
This project exists to fight back against planned obsolescence, dark patterns, forced subscriptions, and paywalled basic utilities (e.g., printers refusing to print without black ink, or PDF tools charging $10/month to merge files). 

**Every tool we build must strictly adhere to the following:**
* **100% Free Forever:** No premium tiers, no watermarks, no "pro" features.
* **Absolute Privacy:** Files must **never** leave the user's device. 
* **Zero Backend:** All processing must happen locally in the browser. Do not suggest or implement Node.js, Python backends, AWS, or databases.
* **Anti-Bloat:** Solve the user's exact problem as simply as possible. 
* **No Duplicate Tools:** Before proposing a new utility, check existing specs plus open and closed issue history so we do not reinvent work already explored.

---

## 🛠️ 2. Technical Architecture
We prioritize simplicity and accessibility over modern framework trends. 

* **The Stack:** Vanilla HTML5, CSS3, and JavaScript (ES6+). 
* **No Runtime Build Requirement:** Do not use Webpack, Vite, React, or Vue. The shipped tool must run instantly when opening the `.html` file in a browser.
* **Libraries via Local Vendor Copies:** If a complex task requires a library (like `pdf.js` or `jsPDF`), copy the browser-ready runtime files into the shared `/vendor/` directory and load them locally from the repo.
* **Dev-Only npm Is Allowed for Vendor Management:** npm may be used only as a development workflow to download, pin, and refresh third-party browser packages before copying the required runtime assets into `/vendor/`. `node_modules/` must never be a runtime requirement and must not be used directly by shipped pages.
* **Commit Vendored Assets:** Any third-party runtime asset used by a tool must be committed to the repository along with the package manifest/lockfile changes that produced it.
* **Tool Location Convention:** Place tool entry pages in `/tools/` using `/tools/tool-name.html`.
* **File Structure:** Whenever possible, keep tools as single-file applications (`/tools/tool-name.html` containing all CSS and JS). If a tool gets too large, separate into standard `style.css` and `script.js` files under `/tools/tool-name/`, but avoid complex folder trees.

---

## 🎨 3. Design Language & UI/UX
The UI must feel clean, modern, trustworthy, and native. 

### Usability Baseline
Whenever relevant to the tool, include:
- undo, reset, or clear actions
- user-selectable colors when color affects output
- quality, compression, or resolution controls when output fidelity can vary
- preview before export for destructive or hard-to-reverse transformations
- clear validation, understandable errors, and recovery paths
- safe defaults for non-technical users

### SEO & Discoverability
- Assume each tool will be published on `tools.treble.dev`.
- Use clear, literal naming that matches what a user would search for.
- Include a descriptive `<title>`, strong meta description, and meaningful headings.
- Make the page useful as a landing page: explain what the tool does, who it is for, and how to use it.

### CSS Variables (Use these consistently)
```css
:root {
    --primary: #004aad;         /* Trustworthy Deep Blue */
    --primary-hover: #003380;   /* Interaction state */
    --bg: #f8f9fc;              /* Soft background */
    --surface: #ffffff;         /* Card/Container background */
    --text: #333333;            /* Primary text */
    --text-light: #64748b;      /* Secondary text / descriptions */
    --border: #e2e8f0;          /* Subtle borders */
}
