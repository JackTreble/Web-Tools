// tools/pdf-redactor/main.js
// Privacy-First PDF Redactor — all processing is local, no data leaves the browser.

(function () {
    'use strict';

    // ── Shared Vendor Globals ───────────────────────────────────────────────
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) {
        console.error('PDF.js failed to load. Check the local vendor script tag.');
        return;
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'vendor/pdfjs/pdf.worker.min.js';

    // ── Constants ────────────────────────────────────────────────────────────
    const ZOOM_STEPS     = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];
    const DEFAULT_ZOOM   = 4;   // index into ZOOM_STEPS → 1.5
    const EXPORT_SCALE   = 2.0; // high-res render for export
    const MIN_RECT_PX    = 4;   // minimum canvas-pixel dimension to commit a redaction

    // ── State ────────────────────────────────────────────────────────────────
    let pdfDoc     = null;
    let totalPages = 0;
    let curPage    = 1;
    let zoomIdx    = DEFAULT_ZOOM;
    let scale      = ZOOM_STEPS[zoomIdx];

    /**
     * redactions: Map<pageNum, Array<{x,y,w,h}>>
     * Coordinates stored in PDF page space at scale=1 so they survive zoom changes.
     */
    const redactions = new Map();

    // Drawing state
    let isDrawing  = false;
    let drawStartX = 0;
    let drawStartY = 0;
    let snapshot   = null; // ImageData snapshot for live-draw preview

    // ── DOM ──────────────────────────────────────────────────────────────────
    const pdfInput       = document.getElementById('pdfInput');
    const dropArea       = document.getElementById('dropArea');
    const errorMsg       = document.getElementById('errorMessage');
    const workspace      = document.getElementById('workspace');
    const prevBtn        = document.getElementById('prevBtn');
    const nextBtn        = document.getElementById('nextBtn');
    const pageIndicator  = document.getElementById('pageIndicator');
    const zoomInBtn      = document.getElementById('zoomInBtn');
    const zoomOutBtn     = document.getElementById('zoomOutBtn');
    const zoomLabel      = document.getElementById('zoomLabel');
    const clearPageBtn   = document.getElementById('clearPageBtn');
    const downloadBtn    = document.getElementById('downloadBtn');
    const statusBar      = document.getElementById('statusBar');
    const mainCanvas     = document.getElementById('mainCanvas');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText    = document.getElementById('loadingText');
    const ctx            = mainCanvas.getContext('2d', { willReadFrequently: true });

    // ── UI Helpers ───────────────────────────────────────────────────────────
    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.add('visible');
        setTimeout(() => errorMsg.classList.remove('visible'), 7000);
    }

    function setStatus(msg) {
        statusBar.textContent = msg;
    }

    function showLoading(msg) {
        loadingText.textContent = msg || 'Rendering…';
        loadingOverlay.classList.add('active');
    }

    function hideLoading() {
        loadingOverlay.classList.remove('active');
    }

    function updateNav() {
        pageIndicator.textContent = `Page ${curPage} of ${totalPages}`;
        prevBtn.disabled  = curPage <= 1;
        nextBtn.disabled  = curPage >= totalPages;
        zoomLabel.textContent  = `${Math.round(scale * 100)}%`;
        zoomInBtn.disabled  = zoomIdx >= ZOOM_STEPS.length - 1;
        zoomOutBtn.disabled = zoomIdx <= 0;
    }

    // ── Coordinate Conversion ────────────────────────────────────────────────
    /**
     * Convert a mouse/touch event to canvas pixel coordinates,
     * accounting for any CSS scaling of the canvas element.
     */
    function getCanvasPoint(e) {
        const rect = mainCanvas.getBoundingClientRect();
        const sx   = mainCanvas.width  / rect.width;
        const sy   = mainCanvas.height / rect.height;
        return {
            x: Math.max(0, Math.min(mainCanvas.width,  (e.clientX - rect.left) * sx)),
            y: Math.max(0, Math.min(mainCanvas.height, (e.clientY - rect.top)  * sy)),
        };
    }

    // Canvas pixels → PDF page coords (at scale=1)
    function canvasToPage(cx, cy) {
        return { x: cx / scale, y: cy / scale };
    }

    // ── PDF Loading ──────────────────────────────────────────────────────────
    async function loadPDF(file) {
        if (!file) return;
        if (file.type !== 'application/pdf') {
            showError('The selected file does not appear to be a valid PDF. Please choose a .pdf file.');
            return;
        }

        showLoading('Loading PDF…');
        setStatus('');

        try {
            const arrayBuffer = await file.arrayBuffer();
            pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

            totalPages = pdfDoc.numPages;
            curPage    = 1;
            redactions.clear();

            workspace.classList.add('visible');
            await renderPage(curPage);

            const plural = totalPages !== 1 ? 's' : '';
            setStatus(`PDF loaded — ${totalPages} page${plural}. Click and drag to draw black redaction boxes. Then click Download.`);

        } catch (err) {
            console.error('PDF load error:', err);
            hideLoading();
            showError(
                'Could not load this PDF. It may be password-protected or corrupted. ' +
                'Please try a different file.'
            );
        }
    }

    // ── Page Rendering ───────────────────────────────────────────────────────
    async function renderPage(pageNum) {
        if (!pdfDoc) return;

        showLoading(`Rendering page ${pageNum} of ${totalPages}…`);
        isDrawing = false;
        snapshot  = null;

        try {
            const page     = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            mainCanvas.width  = Math.round(viewport.width);
            mainCanvas.height = Math.round(viewport.height);

            await page.render({ canvasContext: ctx, viewport }).promise;

            // Overlay any committed redaction rectangles for this page
            overlayRedactions(pageNum);
            updateNav();

        } catch (err) {
            console.error('Render error:', err);
            setStatus('Error rendering page.');
        } finally {
            hideLoading();
        }
    }

    /** Draw committed redaction boxes on the canvas at the current scale. */
    function overlayRedactions(pageNum) {
        const rects = redactions.get(pageNum);
        if (!rects || rects.length === 0) return;

        ctx.fillStyle = '#000000';
        for (const r of rects) {
            ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
        }
    }

    // ── Drawing Interaction ──────────────────────────────────────────────────
    mainCanvas.addEventListener('mousedown', (e) => {
        if (!pdfDoc || e.button !== 0) return;
        const pt  = getCanvasPoint(e);
        isDrawing  = true;
        drawStartX = pt.x;
        drawStartY = pt.y;
        snapshot   = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
        e.preventDefault();
    });

    mainCanvas.addEventListener('mousemove', (e) => {
        if (!isDrawing || !snapshot) return;
        const pt = getCanvasPoint(e);

        ctx.putImageData(snapshot, 0, 0);

        const rx = Math.min(drawStartX, pt.x);
        const ry = Math.min(drawStartY, pt.y);
        const rw = Math.abs(pt.x - drawStartX);
        const rh = Math.abs(pt.y - drawStartY);

        ctx.fillStyle = '#000000';
        ctx.fillRect(rx, ry, rw, rh);
    });

    // Handle mouseup on the document to capture releases outside the canvas
    document.addEventListener('mouseup', (e) => {
        if (!isDrawing) return;
        commitRect(getCanvasPoint(e));
    });

    mainCanvas.addEventListener('mouseleave', () => {
        // Cancel in-progress draw when cursor leaves canvas
        if (isDrawing && snapshot) {
            ctx.putImageData(snapshot, 0, 0);
            isDrawing = false;
            snapshot  = null;
        }
    });

    function commitRect(pt) {
        isDrawing = false;

        const rx = Math.min(drawStartX, pt.x);
        const ry = Math.min(drawStartY, pt.y);
        const rw = Math.abs(pt.x - drawStartX);
        const rh = Math.abs(pt.y - drawStartY);

        // Discard zero-area or tiny accidental clicks
        if (rw < MIN_RECT_PX || rh < MIN_RECT_PX) {
            if (snapshot) ctx.putImageData(snapshot, 0, 0);
            snapshot = null;
            return;
        }

        // Convert from canvas pixels to PDF page coordinates (scale=1)
        const origin = canvasToPage(rx, ry);
        const rect = {
            x: origin.x,
            y: origin.y,
            w: rw / scale,
            h: rh / scale,
        };

        if (!redactions.has(curPage)) {
            redactions.set(curPage, []);
        }
        redactions.get(curPage).push(rect);
        snapshot = null;
    }

    // ── Touch Support ────────────────────────────────────────────────────────
    function touchToMouseEvent(type, touch) {
        mainCanvas.dispatchEvent(new MouseEvent(type, {
            clientX: touch.clientX,
            clientY: touch.clientY,
            button:  0,
            bubbles: true,
        }));
    }

    mainCanvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) touchToMouseEvent('mousedown', e.touches[0]);
        e.preventDefault();
    }, { passive: false });

    mainCanvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) touchToMouseEvent('mousemove', e.touches[0]);
        e.preventDefault();
    }, { passive: false });

    mainCanvas.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) touchToMouseEvent('mouseup', e.changedTouches[0]);
        e.preventDefault();
    }, { passive: false });

    // ── Navigation ───────────────────────────────────────────────────────────
    prevBtn.addEventListener('click', async () => {
        if (curPage > 1) { curPage--; await renderPage(curPage); }
    });

    nextBtn.addEventListener('click', async () => {
        if (curPage < totalPages) { curPage++; await renderPage(curPage); }
    });

    // Keyboard navigation
    document.addEventListener('keydown', async (e) => {
        if (!pdfDoc) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            if (curPage < totalPages) { curPage++; await renderPage(curPage); }
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            if (curPage > 1) { curPage--; await renderPage(curPage); }
        }
    });

    // ── Zoom ─────────────────────────────────────────────────────────────────
    zoomInBtn.addEventListener('click', async () => {
        if (zoomIdx < ZOOM_STEPS.length - 1) {
            zoomIdx++;
            scale = ZOOM_STEPS[zoomIdx];
            await renderPage(curPage);
        }
    });

    zoomOutBtn.addEventListener('click', async () => {
        if (zoomIdx > 0) {
            zoomIdx--;
            scale = ZOOM_STEPS[zoomIdx];
            await renderPage(curPage);
        }
    });

    // ── Clear Page ───────────────────────────────────────────────────────────
    clearPageBtn.addEventListener('click', async () => {
        if (!pdfDoc) return;
        redactions.delete(curPage);
        await renderPage(curPage);
        setStatus(`Redactions cleared for page ${curPage}.`);
    });

    // ── File Input ───────────────────────────────────────────────────────────
    pdfInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) loadPDF(file);
        e.target.value = ''; // allow re-selecting the same file
    });

    dropArea.addEventListener('dragover',  (e) => { e.preventDefault(); dropArea.classList.add('drag-over'); });
    dropArea.addEventListener('dragleave', ()  => { dropArea.classList.remove('drag-over'); });
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) loadPDF(file);
    });

    // ── Export Redacted PDF ──────────────────────────────────────────────────
    downloadBtn.addEventListener('click', async () => {
        if (!pdfDoc) return;

        if (redactions.size === 0) {
            const proceed = confirm(
                'No redactions have been drawn.\n\n' +
                'Exporting will produce a fully rasterized PDF — all text becomes ' +
                'image data and will no longer be selectable or searchable.\n\n' +
                'Continue anyway?'
            );
            if (!proceed) return;
        }

        downloadBtn.disabled  = true;
        clearPageBtn.disabled = true;
        setStatus('Preparing export…');

        try {
            const { PDFDocument } = window.PDFLib;
            const outputDoc = await PDFDocument.create();

            for (let p = 1; p <= totalPages; p++) {
                setStatus(`Exporting page ${p} of ${totalPages}…`);

                const page      = await pdfDoc.getPage(p);
                const expVP     = page.getViewport({ scale: EXPORT_SCALE });
                const baseVP    = page.getViewport({ scale: 1 });

                // Render the PDF page to an offscreen canvas at export quality
                const offCanvas    = document.createElement('canvas');
                offCanvas.width    = Math.round(expVP.width);
                offCanvas.height   = Math.round(expVP.height);
                const offCtx       = offCanvas.getContext('2d', { willReadFrequently: true });

                await page.render({ canvasContext: offCtx, viewport: expVP }).promise;

                // Paint redaction boxes at the export scale
                const rects = redactions.get(p);
                if (rects && rects.length > 0) {
                    offCtx.fillStyle = '#000000';
                    for (const r of rects) {
                        offCtx.fillRect(
                            r.x * EXPORT_SCALE,
                            r.y * EXPORT_SCALE,
                            r.w * EXPORT_SCALE,
                            r.h * EXPORT_SCALE
                        );
                    }
                }

                // Convert to PNG bytes (lossless — preserves sharp text)
                const dataUrl  = offCanvas.toDataURL('image/png');
                const b64      = dataUrl.split(',')[1];
                const pngBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

                const pngImage = await outputDoc.embedPng(pngBytes);

                // Use the scale=1 viewport for the output PDF page dimensions (in points)
                const pw = baseVP.width;
                const ph = baseVP.height;

                const outPage = outputDoc.addPage([pw, ph]);
                outPage.drawImage(pngImage, { x: 0, y: 0, width: pw, height: ph });
            }

            setStatus('Generating download…');

            const pdfBytes = await outputDoc.save();
            const blob     = new Blob([pdfBytes], { type: 'application/pdf' });
            const url      = URL.createObjectURL(blob);

            const a    = document.createElement('a');
            a.href     = url;
            a.download = 'redacted.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Free memory after a short delay
            setTimeout(() => URL.revokeObjectURL(url), 15000);

            setStatus('Download complete! Your redacted PDF has been saved. No text is recoverable from blacked-out regions.');

        } catch (err) {
            console.error('Export error:', err);
            setStatus('An error occurred during export. Please try again.');
        } finally {
            downloadBtn.disabled  = false;
            clearPageBtn.disabled = false;
        }
    });

}());
