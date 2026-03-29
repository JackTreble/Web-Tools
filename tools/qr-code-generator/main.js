// tools/qr-code-generator/main.js
// Free QR Code Generator — 100% client-side, no data leaves the browser.

const QRCode = window.QRCodeLib;

if (!QRCode) {
    console.error('QR Code library failed to load. Check the vendor script tag.');
}

// ── State ─────────────────────────────────────────────────────────────────
const state = {
    payload: '',
    fgColor: '#000000',
    bgColor: '#ffffff',
    ecLevel: 'M',
    sizePx: 512,
    mode: 'plain',
    // structured template fields
    wifiSsid: '',
    wifiPassword: '',
    wifiSecurity: 'WPA',
    vcardName: '',
    vcardPhone: '',
    vcardEmail: '',
    smsPhone: '',
    smsMessage: '',
};

// ── DOM References ────────────────────────────────────────────────────────
const qrInput         = document.getElementById('qr-input');
const qrCanvas        = document.getElementById('qr-preview');
const previewPlaceholder = document.getElementById('preview-placeholder');
const downloadPngBtn  = document.getElementById('download-png-btn');
const downloadSvgBtn  = document.getElementById('download-svg-btn');
const fgColorPicker   = document.getElementById('fg-color');
const fgHexInput      = document.getElementById('fg-hex');
const bgColorPicker   = document.getElementById('bg-color');
const bgHexInput      = document.getElementById('bg-hex');
const ecLevelSelect   = document.getElementById('ec-level');
const sizeSlider      = document.getElementById('size-slider');
const sizeDisplay     = document.getElementById('size-display');
const resetBtn        = document.getElementById('reset-btn');
const contrastWarning = document.getElementById('contrast-warning');
const capacityWarning = document.getElementById('capacity-warning');
const modeBtns        = document.querySelectorAll('.mode-btn');
const wifiSsidInput   = document.getElementById('wifi-ssid');
const wifiPasswordInput = document.getElementById('wifi-password');
const wifiSecuritySelect = document.getElementById('wifi-security');
const vcardNameInput  = document.getElementById('vcard-name');
const vcardPhoneInput = document.getElementById('vcard-phone');
const vcardEmailInput = document.getElementById('vcard-email');
const smsPhoneInput   = document.getElementById('sms-phone');
const smsMessageInput = document.getElementById('sms-message');

// ── Debounce ──────────────────────────────────────────────────────────────
let renderTimer = null;

function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderQR, 100);
}

// ── State Update ──────────────────────────────────────────────────────────
function setState(patch) {
    Object.assign(state, patch);
    scheduleRender();
}

// ── Payload Builder ───────────────────────────────────────────────────────
function escapeWifiField(str) {
    // Escape special chars: ; , \ " per WiFi QR spec
    return str.replace(/([;,\\"])/g, '\\$1');
}

function buildPayload() {
    switch (state.mode) {
        case 'wifi': {
            const ssid = escapeWifiField(state.wifiSsid);
            const pwd  = escapeWifiField(state.wifiPassword);
            const sec  = state.wifiSecurity;
            if (!ssid) return '';
            return `WIFI:T:${sec};S:${ssid};P:${pwd};;`;
        }
        case 'vcard': {
            const name  = state.vcardName.trim();
            const phone = state.vcardPhone.trim();
            const email = state.vcardEmail.trim();
            if (!name && !phone && !email) return '';
            const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
            if (name)  lines.push(`FN:${name}`);
            if (phone) lines.push(`TEL:${phone}`);
            if (email) lines.push(`EMAIL:${email}`);
            lines.push('END:VCARD');
            return lines.join('\n');
        }
        case 'sms': {
            const phone   = state.smsPhone.trim();
            const message = state.smsMessage.trim();
            if (!phone) return '';
            return message ? `smsto:${phone}:${message}` : `smsto:${phone}`;
        }
        default:
            return state.payload;
    }
}

// ── Contrast Check (WCAG 2.1 relative luminance) ──────────────────────────
function hexToLinear(hex) {
    const c = parseInt(hex, 16) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hexColor) {
    const h = hexColor.replace('#', '');
    const r = hexToLinear(h.substring(0, 2));
    const g = hexToLinear(h.substring(2, 4));
    const b = hexToLinear(h.substring(4, 6));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isLowContrast(fgHex, bgHex) {
    const l1 = relativeLuminance(fgHex);
    const l2 = relativeLuminance(bgHex);
    const lighter = Math.max(l1, l2);
    const darker  = Math.min(l1, l2);
    const ratio   = (lighter + 0.05) / (darker + 0.05);
    return ratio < 3;
}

// ── Render ────────────────────────────────────────────────────────────────
let lastRenderedSVG = null;

function renderQR() {
    const payload = buildPayload();
    lastRenderedSVG = null;

    if (!payload) {
        // Empty state: show placeholder
        qrCanvas.classList.remove('visible');
        previewPlaceholder.style.display = '';
        downloadPngBtn.disabled = true;
        downloadSvgBtn.disabled = true;
        contrastWarning.classList.add('hidden');
        capacityWarning.classList.add('hidden');
        return;
    }

    const opts = {
        errorCorrectionLevel: state.ecLevel,
        width: state.sizePx,
        margin: 2,
        color: {
            dark: state.fgColor,
            light: state.bgColor,
        },
    };

    QRCode.toCanvas(qrCanvas, payload, opts, (err) => {
        if (err) {
            // Likely capacity exceeded
            capacityWarning.classList.remove('hidden');
            qrCanvas.classList.remove('visible');
            previewPlaceholder.style.display = '';
            downloadPngBtn.disabled = true;
            downloadSvgBtn.disabled = true;
            return;
        }

        capacityWarning.classList.add('hidden');
        qrCanvas.classList.add('visible');
        previewPlaceholder.style.display = 'none';
        downloadPngBtn.disabled = false;
        downloadSvgBtn.disabled = false;

        // Contrast check
        if (isLowContrast(state.fgColor, state.bgColor)) {
            contrastWarning.classList.remove('hidden');
        } else {
            contrastWarning.classList.add('hidden');
        }

        // Pre-generate SVG string for download
        QRCode.toString(payload, { ...opts, type: 'svg' }, (svgErr, svgStr) => {
            if (!svgErr) lastRenderedSVG = svgStr;
        });
    });
}

// ── PNG Download ──────────────────────────────────────────────────────────
function downloadPNG() {
    qrCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = 'qr-code.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }, 'image/png');
}

// ── SVG Download ──────────────────────────────────────────────────────────
function downloadSVG() {
    if (!lastRenderedSVG) return;

    // Ensure the SVG has a proper xmlns attribute for standalone files
    let svg = lastRenderedSVG;
    if (!svg.includes('xmlns=')) {
        svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    }

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'qr-code.svg';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ── Color Sync Helpers ────────────────────────────────────────────────────
function isValidHex(value) {
    return /^#[0-9a-fA-F]{6}$/.test(value);
}

// ── Event Wiring ──────────────────────────────────────────────────────────

// Plain text input
qrInput.addEventListener('input', (e) => {
    setState({ payload: e.target.value });
});

// Download buttons
downloadPngBtn.addEventListener('click', downloadPNG);
downloadSvgBtn.addEventListener('click', downloadSVG);

// Foreground color picker ↔ hex input
fgColorPicker.addEventListener('input', (e) => {
    const v = e.target.value;
    fgHexInput.value = v;
    setState({ fgColor: v });
});

fgHexInput.addEventListener('input', (e) => {
    const v = e.target.value.trim();
    if (isValidHex(v)) {
        fgColorPicker.value = v;
        setState({ fgColor: v });
    }
});

fgHexInput.addEventListener('blur', (e) => {
    if (!isValidHex(e.target.value.trim())) {
        fgHexInput.value = state.fgColor;
    }
});

// Background color picker ↔ hex input
bgColorPicker.addEventListener('input', (e) => {
    const v = e.target.value;
    bgHexInput.value = v;
    setState({ bgColor: v });
});

bgHexInput.addEventListener('input', (e) => {
    const v = e.target.value.trim();
    if (isValidHex(v)) {
        bgColorPicker.value = v;
        setState({ bgColor: v });
    }
});

bgHexInput.addEventListener('blur', (e) => {
    if (!isValidHex(e.target.value.trim())) {
        bgHexInput.value = state.bgColor;
    }
});

// Error correction
ecLevelSelect.addEventListener('change', (e) => {
    setState({ ecLevel: e.target.value });
});

// Size slider
sizeSlider.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    sizeDisplay.textContent = `${v} px`;
    sizeSlider.setAttribute('aria-valuetext', `${v} pixels`);
    setState({ sizePx: v });
});

// Reset
resetBtn.addEventListener('click', () => {
    const defaults = { fgColor: '#000000', bgColor: '#ffffff', ecLevel: 'M', sizePx: 512 };
    Object.assign(state, defaults);
    fgColorPicker.value = defaults.fgColor;
    fgHexInput.value    = defaults.fgColor;
    bgColorPicker.value = defaults.bgColor;
    bgHexInput.value    = defaults.bgColor;
    ecLevelSelect.value = defaults.ecLevel;
    sizeSlider.value    = defaults.sizePx;
    sizeDisplay.textContent = `${defaults.sizePx} px`;
    sizeSlider.setAttribute('aria-valuetext', `${defaults.sizePx} pixels`);
    scheduleRender();
});

// Mode switcher
modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;

        modeBtns.forEach((b) => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        // Show/hide panels
        document.querySelectorAll('.input-panel').forEach((p) => p.classList.add('hidden'));
        document.getElementById(`panel-${mode}`).classList.remove('hidden');

        setState({ mode });
    });
});

// WiFi template fields
wifiSsidInput.addEventListener('input', (e) => setState({ wifiSsid: e.target.value }));
wifiPasswordInput.addEventListener('input', (e) => setState({ wifiPassword: e.target.value }));
wifiSecuritySelect.addEventListener('change', (e) => setState({ wifiSecurity: e.target.value }));

// vCard template fields
vcardNameInput.addEventListener('input', (e) => setState({ vcardName: e.target.value }));
vcardPhoneInput.addEventListener('input', (e) => setState({ vcardPhone: e.target.value }));
vcardEmailInput.addEventListener('input', (e) => setState({ vcardEmail: e.target.value }));

// SMS template fields
smsPhoneInput.addEventListener('input', (e) => setState({ smsPhone: e.target.value }));
smsMessageInput.addEventListener('input', (e) => setState({ smsMessage: e.target.value }));
