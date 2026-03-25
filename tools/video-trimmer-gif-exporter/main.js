/* tools/video-trimmer-gif-exporter/main.js */

// Capture script directory for resolving vendor asset paths
const _scriptBase = (function () {
    const src = document.currentScript && document.currentScript.src;
    return src ? new URL('.', src).href : (window.location.origin + '/tools/video-trimmer-gif-exporter/');
}());

// ── State ──────────────────────────────────────────────────────────────
const state = {
    file: null,
    objectURL: null,
    duration: 0,
    startTime: 0,
    endTime: 0,
    dragging: null,   // 'start' | 'end' | null
    outputURL: null,
    ffmpegReady: false,
    processing: false,
    thumbnails: [],   // ImageBitmap[]
};

// ── Element References ─────────────────────────────────────────────────
const dropArea          = document.getElementById('dropArea');
const fileInput         = document.getElementById('fileInput');
const errorMsg          = document.getElementById('errorMessage');
const workspace         = document.getElementById('workspace');
const videoEl           = document.getElementById('videoEl');
const videoMeta         = document.getElementById('videoMeta');
const timelineCanvas    = document.getElementById('timelineCanvas');
const trimStartLabel    = document.getElementById('trimStart');
const trimEndLabel      = document.getElementById('trimEnd');
const trimDuration      = document.getElementById('trimDuration');
const formatGIF         = document.getElementById('fmtGIF');
const formatWebP        = document.getElementById('fmtWebP');
const formatMP4         = document.getElementById('fmtMP4');
const fpsRange          = document.getElementById('fpsRange');
const fpsValue          = document.getElementById('fpsValue');
const scaleRange        = document.getElementById('scaleRange');
const scaleValue        = document.getElementById('scaleValue');
const gifSettings       = document.getElementById('gifSettings');
const processBtn        = document.getElementById('processBtn');
const progressFill      = document.getElementById('progressFill');
const progressLabel     = document.getElementById('progressLabel');
const downloadSection   = document.getElementById('downloadSection');
const downloadBtn       = document.getElementById('downloadBtn');
const downloadInfo      = document.getElementById('downloadInfo');
const engineBanner      = document.getElementById('engineBanner');
const engineProgressFill = document.getElementById('engineProgressFill');
const engineBannerLabel = document.getElementById('engineBannerLabel');

const ctx = timelineCanvas.getContext('2d');
const TIMELINE_HEIGHT = 72;
const HANDLE_W = 10;
const NUM_FRAMES = 12;

// ── FFmpeg ─────────────────────────────────────────────────────────────
let ffmpeg = null;

async function initFFmpeg() {
    try {
        if (typeof FFmpegWASM === 'undefined') {
            throw new Error('FFmpeg library did not load. Check your network connection.');
        }
        const { FFmpeg } = FFmpegWASM;
        ffmpeg = new FFmpeg();

        ffmpeg.on('progress', ({ progress }) => {
            const pct = Math.round(Math.min(progress * 100, 100));
            if (!progressFill.classList.contains('indeterminate')) {
                progressFill.style.width = pct + '%';
                progressLabel.textContent = `Processing… ${pct}%`;
            }
        });

        engineBanner.classList.remove('hidden');
        engineBannerLabel.textContent = '⏳ Loading video processing engine (one-time ~30 MB download)…';

        let sim = 0;
        const simInterval = setInterval(() => {
            sim = Math.min(sim + 1.5, 88);
            engineProgressFill.style.width = sim + '%';
        }, 200);

        await ffmpeg.load({
            coreURL: _scriptBase + 'vendor/ffmpeg-core.js',
            wasmURL: _scriptBase + 'vendor/ffmpeg-core.wasm',
        });

        clearInterval(simInterval);
        engineProgressFill.style.width = '100%';
        engineBannerLabel.textContent = '✅ Processing engine ready';
        setTimeout(() => engineBanner.classList.add('hidden'), 1800);

        state.ffmpegReady = true;
    } catch (err) {
        console.error('FFmpeg init failed:', err);
        if (engineBanner) {
            engineBannerLabel.textContent = '⚠️ Engine failed to load — try refreshing the page.';
        }
    }
}

// ── Error Helpers ──────────────────────────────────────────────────────
function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add('visible');
}

function clearError() {
    errorMsg.textContent = '';
    errorMsg.classList.remove('visible');
}

// ── File Ingestion ─────────────────────────────────────────────────────
function loadVideoFile(file) {
    if (!file) return;

    if (!file.type.startsWith('video/') && !isLikelyVideo(file.name)) {
        showError('That file doesn\'t appear to be a supported video format. Please select an MP4, WebM, MOV, or other video file.');
        dropArea.classList.add('rejected');
        setTimeout(() => dropArea.classList.remove('rejected'), 1500);
        return;
    }

    clearError();
    downloadSection.classList.remove('visible');
    progressFill.style.width = '0%';
    progressLabel.textContent = '';

    if (state.objectURL) URL.revokeObjectURL(state.objectURL);
    state.file = file;
    state.objectURL = URL.createObjectURL(file);
    videoEl.src = state.objectURL;
    videoEl.load();
}

function isLikelyVideo(name) {
    return /\.(mp4|webm|mov|mkv|avi|ogv|m4v|3gp|flv)$/i.test(name);
}

fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) loadVideoFile(fileInput.files[0]);
});

dropArea.addEventListener('dragover', e => {
    e.preventDefault();
    dropArea.classList.add('drag-over');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('drag-over');
});

dropArea.addEventListener('drop', e => {
    e.preventDefault();
    dropArea.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) loadVideoFile(e.dataTransfer.files[0]);
});

dropArea.addEventListener('click', () => fileInput.click());

// ── Video Metadata ─────────────────────────────────────────────────────
videoEl.addEventListener('loadedmetadata', () => {
    state.duration = videoEl.duration;
    state.startTime = 0;
    state.endTime = state.duration;

    videoMeta.textContent =
        `${state.file.name}  ·  ${videoEl.videoWidth}×${videoEl.videoHeight}  ·  ${formatTime(state.duration)}`;

    workspace.classList.add('visible');
    updateTrimLabels();
    renderTimeline();
});

videoEl.addEventListener('error', () => {
    showError('The browser could not load this video. The format may not be supported, or the file may be corrupted.');
});

// Loop preview within the trim range
videoEl.addEventListener('timeupdate', () => {
    if (state.duration > 0 && videoEl.currentTime >= state.endTime) {
        videoEl.currentTime = state.startTime;
    }
});

// ── Timeline Rendering ─────────────────────────────────────────────────
async function renderTimeline() {
    await new Promise(r => requestAnimationFrame(r));

    const cssW = timelineCanvas.parentElement.clientWidth || 800;
    const dpr = window.devicePixelRatio || 1;

    timelineCanvas.width  = Math.round(cssW * dpr);
    timelineCanvas.height = Math.round(TIMELINE_HEIGHT * dpr);
    timelineCanvas.style.width  = cssW + 'px';
    timelineCanvas.style.height = TIMELINE_HEIGHT + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Capture thumbnail frames
    state.thumbnails = [];
    const off = document.createElement('canvas');
    off.width  = Math.round(cssW / NUM_FRAMES);
    off.height = TIMELINE_HEIGHT;
    const offCtx = off.getContext('2d');

    for (let i = 0; i < NUM_FRAMES; i++) {
        const t = (state.duration / (NUM_FRAMES - 1)) * i;
        await seekTo(Math.min(t, state.duration - 0.05));
        offCtx.drawImage(videoEl, 0, 0, off.width, off.height);
        try {
            state.thumbnails.push(await createImageBitmap(off));
        } catch {
            state.thumbnails.push(null);
        }
    }

    videoEl.currentTime = state.startTime;
    drawTimeline();
}

function seekTo(time) {
    return new Promise(resolve => {
        videoEl.currentTime = time;
        videoEl.addEventListener('seeked', resolve, { once: true });
    });
}

function drawTimeline() {
    const W = timelineCanvas.clientWidth  || 800;
    const H = TIMELINE_HEIGHT;

    ctx.clearRect(0, 0, W, H);

    // Draw thumbnail strip
    const thumbW = W / NUM_FRAMES;
    for (let i = 0; i < NUM_FRAMES; i++) {
        if (state.thumbnails[i]) {
            ctx.drawImage(state.thumbnails[i], i * thumbW, 0, thumbW, H);
        } else {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(i * thumbW, 0, thumbW, H);
        }
    }

    const startX = (state.startTime / state.duration) * W;
    const endX   = (state.endTime   / state.duration) * W;

    // Dim out-of-range regions
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(0, 0, startX, H);
    ctx.fillRect(endX, 0, W - endX, H);

    // Selection border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX + 1, 1, endX - startX - 2, H - 2);

    // Start handle (blue)
    ctx.fillStyle = '#004aad';
    ctx.fillRect(startX - HANDLE_W / 2, 0, HANDLE_W, H);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◀', startX, H / 2);

    // End handle (purple)
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(endX - HANDLE_W / 2, 0, HANDLE_W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('▶', endX, H / 2);
}

// ── Handle Drag ────────────────────────────────────────────────────────
function canvasX(e) {
    const r = timelineCanvas.getBoundingClientRect();
    return (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
}

function xToTime(x) {
    const W = timelineCanvas.clientWidth || 800;
    return Math.max(0, Math.min(state.duration, (x / W) * state.duration));
}

function hitHandle(x) {
    const W = timelineCanvas.clientWidth || 800;
    const sx = (state.startTime / state.duration) * W;
    const ex = (state.endTime   / state.duration) * W;
    const zone = HANDLE_W + 8;
    if (Math.abs(x - sx) <= zone) return 'start';
    if (Math.abs(x - ex) <= zone) return 'end';
    // Click in selection body moves whichever handle is closer
    if (x > sx && x < ex) return (x - sx < ex - x) ? 'start' : 'end';
    return null;
}

timelineCanvas.addEventListener('mousedown', e => {
    state.dragging = hitHandle(canvasX(e));
});
timelineCanvas.addEventListener('touchstart', e => {
    state.dragging = hitHandle(canvasX(e));
}, { passive: true });

window.addEventListener('mousemove', onMove);
window.addEventListener('touchmove', onMove, { passive: false });
window.addEventListener('mouseup',  () => { state.dragging = null; });
window.addEventListener('touchend', () => { state.dragging = null; });

function onMove(e) {
    if (!state.dragging || !state.duration) return;
    e.preventDefault();
    const t = xToTime(canvasX(e));
    const MIN = 0.1;

    if (state.dragging === 'start') {
        state.startTime = Math.min(t, state.endTime - MIN);
    } else {
        state.endTime = Math.max(t, state.startTime + MIN);
    }

    updateTrimLabels();
    drawTimeline();
    videoEl.currentTime = state.dragging === 'start' ? state.startTime : state.endTime;
}

// ── Trim Labels ────────────────────────────────────────────────────────
function formatTime(s) {
    const m   = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1).padStart(4, '0');
    return `${m}:${sec}`;
}

function updateTrimLabels() {
    trimStartLabel.textContent = formatTime(state.startTime);
    trimEndLabel.textContent   = formatTime(state.endTime);
    trimDuration.textContent   = `(${formatTime(state.endTime - state.startTime)})`;
}

// ── Format Picker ──────────────────────────────────────────────────────
function getFormat() {
    if (formatGIF.checked)  return 'gif';
    if (formatWebP.checked) return 'webp';
    return 'mp4';
}

[formatGIF, formatWebP, formatMP4].forEach(r => {
    r.addEventListener('change', () => {
        gifSettings.style.display = (getFormat() !== 'mp4') ? 'flex' : 'none';
    });
});

fpsRange.addEventListener('input',   () => { fpsValue.textContent = fpsRange.value + ' fps'; });
scaleRange.addEventListener('input', () => {
    scaleValue.textContent = scaleRange.value === '0' ? 'Original' : scaleRange.value + ' px';
});

// ── Process ────────────────────────────────────────────────────────────
processBtn.addEventListener('click', processClip);

async function processClip() {
    if (!state.file) {
        showError('Please load a video file first.');
        return;
    }
    if (state.endTime - state.startTime < 0.1) {
        showError('Trim range is too short. Set a start and end point at least 0.1 seconds apart.');
        return;
    }
    if (!state.ffmpegReady || !ffmpeg) {
        showError('The processing engine is still loading. Please wait a moment, then try again.');
        return;
    }

    clearError();
    state.processing = true;
    processBtn.disabled = true;
    downloadSection.classList.remove('visible');

    // Indeterminate bar while waiting for JS to start the wasm
    progressFill.classList.add('indeterminate');
    progressLabel.textContent = 'Reading file…';

    const format  = getFormat();
    const fps     = parseInt(fpsRange.value, 10);
    const scaleW  = parseInt(scaleRange.value, 10);
    const ss      = state.startTime.toFixed(3);
    const to      = state.endTime.toFixed(3);
    const ext     = format === 'webp' ? 'webp' : format;
    const srcExt  = (state.file.name.split('.').pop() || 'mp4').toLowerCase();
    const inName  = 'input.' + srcExt;
    const outName = 'output.' + ext;

    try {
        const buffer = await state.file.arrayBuffer();
        progressLabel.textContent = 'Writing to virtual filesystem…';
        await ffmpeg.writeFile(inName, new Uint8Array(buffer));

        progressFill.classList.remove('indeterminate');
        progressFill.style.width = '5%';

        if (format === 'mp4') {
            progressLabel.textContent = 'Trimming MP4 (stream copy)…';
            await ffmpeg.exec([
                '-ss', ss, '-to', to,
                '-i', inName,
                '-c', 'copy',
                '-y', outName
            ]);

        } else if (format === 'gif') {
            const vf = buildVF(fps, scaleW);

            progressLabel.textContent = 'Generating colour palette…';
            await ffmpeg.exec([
                '-ss', ss, '-to', to,
                '-i', inName,
                '-vf', `${vf},palettegen=stats_mode=diff`,
                '-y', 'palette.png'
            ]);

            progressFill.style.width = '45%';
            progressLabel.textContent = 'Encoding animated GIF…';
            await ffmpeg.exec([
                '-ss', ss, '-to', to,
                '-i', inName,
                '-i', 'palette.png',
                '-filter_complex', `${vf}[x];[x][1:v]paletteuse=dither=bayer`,
                '-y', outName
            ]);

        } else {
            // Animated WebP
            const vf = buildVF(fps, scaleW);
            progressLabel.textContent = 'Encoding animated WebP…';
            await ffmpeg.exec([
                '-ss', ss, '-to', to,
                '-i', inName,
                '-vf', vf,
                '-vcodec', 'libwebp',
                '-lossless', '0',
                '-compression_level', '4',
                '-q:v', '70',
                '-loop', '0',
                '-preset', 'picture',
                '-an',
                '-y', outName
            ]);
        }

        const data  = await ffmpeg.readFile(outName);
        const mime  = { gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4' }[format];
        const blob  = new Blob([data.buffer], { type: mime });

        if (state.outputURL) URL.revokeObjectURL(state.outputURL);
        state.outputURL = URL.createObjectURL(blob);

        const base = state.file.name.replace(/\.[^.]+$/, '');
        const filename = `${base}-trimmed.${ext}`;

        downloadBtn.href     = state.outputURL;
        downloadBtn.download = filename;
        downloadInfo.textContent =
            `${filename}  ·  ${formatBytes(blob.size)}`;

        progressFill.style.width = '100%';
        progressLabel.textContent = 'Done!';
        downloadSection.classList.add('visible');

    } catch (err) {
        console.error('Processing error:', err);
        showError('Processing failed: ' + (err.message || 'Unknown error. The video codec may not be supported.'));
        progressFill.classList.remove('indeterminate');
        progressFill.style.width = '0%';
        progressLabel.textContent = 'Failed.';
    } finally {
        // Clean up virtual FS
        for (const name of [inName, outName, 'palette.png']) {
            try { await ffmpeg.deleteFile(name); } catch { /* already absent */ }
        }
        state.processing = false;
        processBtn.disabled = false;
    }
}

function buildVF(fps, scaleW) {
    const parts = [`fps=${fps}`];
    if (scaleW > 0) parts.push(`scale=${scaleW}:-1:flags=lanczos`);
    return parts.join(',');
}

function formatBytes(n) {
    if (n < 1024)       return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
}

// Revoke output URL after download to free memory
downloadBtn.addEventListener('click', () => {
    setTimeout(() => {
        if (state.outputURL) {
            URL.revokeObjectURL(state.outputURL);
            state.outputURL = null;
        }
    }, 10_000);
});

// ── Redraw on resize ───────────────────────────────────────────────────
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (state.duration > 0 && state.thumbnails.length) drawTimeline();
    }, 200);
});

// ── Boot ───────────────────────────────────────────────────────────────
initFFmpeg();
