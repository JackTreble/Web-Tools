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

---

## 🛠️ 2. Technical Architecture
We prioritize simplicity and accessibility over modern framework trends. 

* **The Stack:** Vanilla HTML5, CSS3, and JavaScript (ES6+). 
* **No Build Tools:** Do not use Webpack, Vite, React, Vue, or npm packages. The code must run instantly when opening the `.html` file in a browser.
* **Libraries via CDN:** If a complex task requires a library (like `pdf.js` or `jsPDF`), pull it exclusively via a trusted CDN (like cdnjs).
* **File Structure:** Whenever possible, keep tools as single-file applications (`tool-name.html` containing all CSS and JS). If a tool gets too large, separate into standard `style.css` and `script.js` files, but avoid complex folder trees.

---

## 🎨 3. Design Language & UI/UX
The UI must feel clean, modern, trustworthy, and native. 

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
