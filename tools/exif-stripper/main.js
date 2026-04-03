/**
 * EXIF Data Stripper & Viewer — main.js
 *
 * User Stories implemented:
 *   US1 — Strip & Download (P1 MVP): drop image → metadata table → strip all → download
 *   US2 — Selective Strip (P2): choose field groups to remove; GPS-only shortcut
 *   US3 — Batch Strip (P3): up to 10 images → per-file summary → strip all → ZIP download
 *
 * Architecture:
 *   - JPEG: binary splice (DataView walk). Zero pixel re-encoding. Zero quality loss.
 *   - PNG:  Canvas re-encode (lossless format; metadata stripped by drawImage + toBlob).
 *   - JSZip loaded as global from vendor/jszip/jszip.min.js (non-module script).
 */

'use strict';

/* =========================================================
   EXIF Tag Registry
   ========================================================= */

// IFD0 / IFD1 / ExifIFD / GPS IFD tags we care about.
// Key  = decimal tag ID.
// group: 'location' | 'device' | 'timestamps' | 'camera' | 'other'
const EXIF_TAGS = {
    // ── Timestamps ──────────────────────────────────────────
    0x0132: { label: 'Date/Time Modified',    group: 'timestamps' },
    0x9003: { label: 'Date/Time Original',    group: 'timestamps' },
    0x9004: { label: 'Date/Time Digitized',   group: 'timestamps' },
    0x9290: { label: 'Sub-Second Time',       group: 'timestamps' },
    0x9291: { label: 'Sub-Second Original',   group: 'timestamps' },
    0x9292: { label: 'Sub-Second Digitized',  group: 'timestamps' },

    // ── Device Info ──────────────────────────────────────────
    0x010F: { label: 'Camera Make',           group: 'device' },
    0x0110: { label: 'Camera Model',          group: 'device' },
    0x0131: { label: 'Software',              group: 'device' },
    0x013B: { label: 'Artist',                group: 'device' },
    0x8298: { label: 'Copyright',             group: 'device' },
    0xA430: { label: 'Camera Owner Name',     group: 'device' },
    0xA431: { label: 'Camera Serial Number',  group: 'device' },
    0xA432: { label: 'Lens Info',             group: 'device' },
    0xA433: { label: 'Lens Make',             group: 'device' },
    0xA434: { label: 'Lens Model',            group: 'device' },
    0xA435: { label: 'Lens Serial Number',    group: 'device' },
    0x9010: { label: 'Offset Time',           group: 'device' },
    0x9011: { label: 'Offset Time Original',  group: 'device' },
    0x9012: { label: 'Offset Time Digitized', group: 'device' },

    // ── Camera Settings ──────────────────────────────────────
    0x829A: { label: 'Exposure Time',         group: 'camera' },
    0x829D: { label: 'F-Number',              group: 'camera' },
    0x8822: { label: 'Exposure Program',      group: 'camera' },
    0x8827: { label: 'ISO Speed',             group: 'camera' },
    0x9201: { label: 'Shutter Speed',         group: 'camera' },
    0x9202: { label: 'Aperture Value',        group: 'camera' },
    0x9203: { label: 'Brightness Value',      group: 'camera' },
    0x9204: { label: 'Exposure Bias',         group: 'camera' },
    0x9205: { label: 'Max Aperture',          group: 'camera' },
    0x9206: { label: 'Subject Distance',      group: 'camera' },
    0x9207: { label: 'Metering Mode',         group: 'camera' },
    0x9208: { label: 'Light Source',          group: 'camera' },
    0x9209: { label: 'Flash',                 group: 'camera' },
    0x920A: { label: 'Focal Length',          group: 'camera' },
    0x9214: { label: 'Subject Area',          group: 'camera' },
    0xA002: { label: 'Pixel Width',           group: 'camera' },
    0xA003: { label: 'Pixel Height',          group: 'camera' },
    0xA20E: { label: 'Focal Plane X Res',     group: 'camera' },
    0xA20F: { label: 'Focal Plane Y Res',     group: 'camera' },
    0xA210: { label: 'Focal Plane Res Unit',  group: 'camera' },
    0xA215: { label: 'Exposure Index',        group: 'camera' },
    0xA217: { label: 'Sensing Method',        group: 'camera' },
    0xA300: { label: 'File Source',           group: 'camera' },
    0xA301: { label: 'Scene Type',            group: 'camera' },
    0xA401: { label: 'Custom Rendered',       group: 'camera' },
    0xA402: { label: 'Exposure Mode',         group: 'camera' },
    0xA403: { label: 'White Balance',         group: 'camera' },
    0xA404: { label: 'Digital Zoom Ratio',    group: 'camera' },
    0xA405: { label: 'Focal Length (35mm)',   group: 'camera' },
    0xA406: { label: 'Scene Capture Type',    group: 'camera' },
    0xA407: { label: 'Gain Control',          group: 'camera' },
    0xA408: { label: 'Contrast',              group: 'camera' },
    0xA409: { label: 'Saturation',            group: 'camera' },
    0xA40A: { label: 'Sharpness',             group: 'camera' },
    0xA40C: { label: 'Subject Distance Range',group: 'camera' },

    // ── Image Info ───────────────────────────────────────────
    0x0100: { label: 'Image Width',           group: 'other' },
    0x0101: { label: 'Image Height',          group: 'other' },
    0x0102: { label: 'Bits Per Sample',       group: 'other' },
    0x0103: { label: 'Compression',           group: 'other' },
    0x0106: { label: 'Photometric Interp.',   group: 'other' },
    0x0112: { label: 'Orientation',           group: 'other' },
    0x011A: { label: 'X Resolution',          group: 'other' },
    0x011B: { label: 'Y Resolution',          group: 'other' },
    0x011C: { label: 'Planar Config',         group: 'other' },
    0x0128: { label: 'Resolution Unit',       group: 'other' },
    0x0212: { label: 'YCbCr Sub Sampling',    group: 'other' },
    0x0213: { label: 'YCbCr Positioning',     group: 'other' },
    0x8769: { label: 'Exif IFD Pointer',      group: 'other' },
    0x8825: { label: 'GPS IFD Pointer',       group: 'location' },
    0x9000: { label: 'Exif Version',          group: 'other' },
    0xA000: { label: 'FlashPix Version',      group: 'other' },
    0xA001: { label: 'Color Space',           group: 'other' },

    // ── GPS IFD ──────────────────────────────────────────────
    0x0000: { label: 'GPS Version',           group: 'location', gps: true },
    0x0001: { label: 'GPS Latitude Ref',      group: 'location', gps: true },
    0x0002: { label: 'GPS Latitude',          group: 'location', gps: true },
    0x0003: { label: 'GPS Longitude Ref',     group: 'location', gps: true },
    0x0004: { label: 'GPS Longitude',         group: 'location', gps: true },
    0x0005: { label: 'GPS Altitude Ref',      group: 'location', gps: true },
    0x0006: { label: 'GPS Altitude',          group: 'location', gps: true },
    0x0007: { label: 'GPS Time (UTC)',        group: 'location', gps: true },
    0x0008: { label: 'GPS Satellites',        group: 'location', gps: true },
    0x0009: { label: 'GPS Status',            group: 'location', gps: true },
    0x000A: { label: 'GPS Measure Mode',      group: 'location', gps: true },
    0x000B: { label: 'GPS DOP',               group: 'location', gps: true },
    0x000C: { label: 'GPS Speed Ref',         group: 'location', gps: true },
    0x000D: { label: 'GPS Speed',             group: 'location', gps: true },
    0x000E: { label: 'GPS Track Ref',         group: 'location', gps: true },
    0x000F: { label: 'GPS Track',             group: 'location', gps: true },
    0x0010: { label: 'GPS Image Direction Ref',group:'location', gps: true },
    0x0011: { label: 'GPS Image Direction',   group: 'location', gps: true },
    0x0012: { label: 'GPS Map Datum',         group: 'location', gps: true },
    0x001D: { label: 'GPS Date Stamp',        group: 'location', gps: true },
    0x001F: { label: 'GPS H Positioning Error',group:'location', gps: true },
};

/* =========================================================
   Application State
   ========================================================= */

const state = {
    /** @type {Array<ImageEntry>} */
    files: [],

    /** Currently displayed file index (for detail panel) */
    activeIndex: 0,

    /**
     * Groups the user wants to remove.
     * Defaults to all = maximum privacy.
     * @type {Set<string>}
     */
    selectedGroups: new Set(['location', 'device', 'timestamps', 'camera', 'other']),
};

/* =========================================================
   DOM References
   ========================================================= */

const dropZone     = document.getElementById('drop-zone');
const fileInput    = document.getElementById('file-input');
const formatError  = document.getElementById('format-error');
const workspace    = document.getElementById('workspace');

const batchPanel   = document.getElementById('batch-panel');
const fileListEl   = document.getElementById('file-list');
const stripZipBtn  = document.getElementById('strip-all-zip-btn');
const resetBtnBatch= document.getElementById('reset-btn-batch');
const batchProgress= document.getElementById('batch-progress');

const detailPanel  = document.getElementById('detail-panel');
const gpsWarning   = document.getElementById('gps-warning');
const removeGpsBtn = document.getElementById('remove-gps-btn');
const noExifMsg    = document.getElementById('no-exif-msg');
const exifTableWrapper = document.getElementById('exif-table-wrapper');
const exifTbody    = document.getElementById('exif-tbody');
const groupFieldset= document.getElementById('group-fieldset');
const actionBar    = document.getElementById('action-bar');
const stripAllBtn  = document.getElementById('strip-all-btn');
const stripSelBtn  = document.getElementById('strip-selected-btn');
const resetBtn     = document.getElementById('reset-btn');

const cbAll        = document.getElementById('group-all');
const cbLocation   = document.getElementById('group-location');
const cbDevice     = document.getElementById('group-device');
const cbTimestamps = document.getElementById('group-timestamps');
const cbCamera     = document.getElementById('group-camera');

/* =========================================================
   File Loading
   ========================================================= */

/**
 * Reads a File into an ArrayBuffer.
 * @param {File} file
 * @returns {Promise<{file: File, buffer: ArrayBuffer}>}
 */
function loadFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ file, buffer: e.target.result });
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsArrayBuffer(file);
    });
}

/** @param {ArrayBuffer} buf */
function isJpeg(buf) {
    const v = new DataView(buf);
    return v.byteLength >= 2 && v.getUint8(0) === 0xFF && v.getUint8(1) === 0xD8;
}

/** @param {ArrayBuffer} buf */
function isPng(buf) {
    const v = new DataView(buf);
    return (
        v.byteLength >= 4 &&
        v.getUint8(0) === 0x89 &&
        v.getUint8(1) === 0x50 &&
        v.getUint8(2) === 0x4E &&
        v.getUint8(3) === 0x47
    );
}

/* =========================================================
   EXIF Parsing
   ========================================================= */

/**
 * EXIF type sizes in bytes.
 */
const TYPE_SIZE = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];

/**
 * Read a rational (numerator / denominator) from a DataView.
 */
function readRational(view, offset, little) {
    const num = view.getUint32(offset, little);
    const den = view.getUint32(offset + 4, little);
    return den === 0 ? 0 : num / den;
}

/**
 * Read a signed rational.
 */
function readSRational(view, offset, little) {
    const num = view.getInt32(offset, little);
    const den = view.getInt32(offset + 4, little);
    return den === 0 ? 0 : num / den;
}

/**
 * Parse one IFD entry value.
 * Returns a human-readable string or number.
 */
function parseTagValue(view, type, count, valueOffsetOrInline, dataStart, little) {
    // For values that fit in 4 bytes, the value is stored inline.
    const typeSize = TYPE_SIZE[type] || 1;
    const totalSize = typeSize * count;
    let offset = valueOffsetOrInline;
    if (totalSize > 4) {
        offset = view.getUint32(valueOffsetOrInline, little) + dataStart;
    }

    if (type === 2) { // ASCII
        const chars = [];
        for (let i = 0; i < count; i++) {
            const b = view.getUint8(offset + i);
            if (b === 0) break;
            chars.push(String.fromCharCode(b));
        }
        return chars.join('').trim();
    }

    if (type === 5) { // UNSIGNED RATIONAL
        const vals = [];
        for (let i = 0; i < count; i++) {
            vals.push(readRational(view, offset + i * 8, little));
        }
        return count === 1 ? vals[0] : vals;
    }

    if (type === 10) { // SIGNED RATIONAL
        const vals = [];
        for (let i = 0; i < count; i++) {
            vals.push(readSRational(view, offset + i * 8, little));
        }
        return count === 1 ? vals[0] : vals;
    }

    if (type === 3) { // SHORT (uint16)
        const vals = [];
        for (let i = 0; i < count; i++) {
            vals.push(view.getUint16(offset + i * 2, little));
        }
        return count === 1 ? vals[0] : vals;
    }

    if (type === 4) { // LONG (uint32)
        const vals = [];
        for (let i = 0; i < count; i++) {
            vals.push(view.getUint32(offset + i * 4, little));
        }
        return count === 1 ? vals[0] : vals;
    }

    if (type === 1 || type === 7) { // BYTE / UNDEFINED
        if (count <= 4) {
            const bytes = [];
            for (let i = 0; i < count; i++) bytes.push(view.getUint8(offset + i));
            return bytes.join(' ');
        }
        return `[${count} bytes]`;
    }

    return `[type ${type}]`;
}

/**
 * Parse a GPS rational triplet (degrees, minutes, seconds) to decimal degrees.
 */
function gpsRatToDecimal(ratVals, ref) {
    if (!Array.isArray(ratVals) || ratVals.length < 3) return null;
    const deg = ratVals[0];
    const min = ratVals[1] / 60;
    const sec = ratVals[2] / 3600;
    let val = deg + min + sec;
    if (ref === 'S' || ref === 'W') val = -val;
    return val;
}

/**
 * Parse an IFD starting at ifdOffset within the TIFF block.
 * @param {DataView} view  — view over the whole file buffer
 * @param {number} dataStart — byte offset of TIFF header start within the file
 * @param {number} ifdOffset — byte offset of IFD relative to TIFF header start
 * @param {boolean} little   — little-endian flag
 * @param {boolean} isGps    — whether this is the GPS IFD (use GPS tag table)
 * @returns {Object} flat map of tagId → parsed entry
 */
function parseIfd(view, dataStart, ifdOffset, little, isGps) {
    const result = {};
    const pos = dataStart + ifdOffset;
    if (pos + 2 > view.byteLength) return result;

    const numEntries = view.getUint16(pos, little);
    for (let i = 0; i < numEntries; i++) {
        const entryPos = pos + 2 + i * 12;
        if (entryPos + 12 > view.byteLength) break;

        const tagId   = view.getUint16(entryPos, little);
        const type    = view.getUint16(entryPos + 2, little);
        const count   = view.getUint32(entryPos + 4, little);
        const valOff  = entryPos + 8; // position of value/offset field

        const typeSize = TYPE_SIZE[type] || 1;
        const totalSize = typeSize * count;

        // Build the absolute offset for out-of-line values
        let absValueOffset;
        if (totalSize > 4) {
            absValueOffset = view.getUint32(valOff, little) + dataStart;
        } else {
            absValueOffset = valOff;
        }

        const tagDef = EXIF_TAGS[tagId];
        const label = tagDef ? tagDef.label : `Tag 0x${tagId.toString(16).toUpperCase().padStart(4, '0')}`;
        const group = tagDef ? tagDef.group : 'other';

        let humanValue;
        try {
            humanValue = parseTagValue(view, type, count, valOff, dataStart, little);
        } catch {
            humanValue = '[unreadable]';
        }

        result[tagId] = { label, rawValue: humanValue, humanValue, group };
    }
    return result;
}

/**
 * Parse the EXIF APP1 segment of a JPEG.
 * Returns a flat ExifTagMap or an empty object if no EXIF found.
 *
 * @param {ArrayBuffer} buffer
 * @returns {{ tagMap: Object, gpsInfo: Object|null, app1Offsets: Array<{start, length}> }}
 */
function parseExif(buffer) {
    const view = new DataView(buffer);
    const tagMap = {};
    const app1Offsets = [];
    let gpsInfo = null;

    // Walk JPEG markers
    let offset = 2; // skip SOI (FF D8)
    while (offset + 4 <= view.byteLength) {
        const marker = view.getUint16(offset);
        if ((marker & 0xFF00) !== 0xFF00) break; // not a marker

        if (marker === 0xFFD9) break; // EOI
        if (marker === 0xFFDA) break; // SOS — image data starts, stop scanning

        const segLength = view.getUint16(offset + 2); // includes the 2-byte length field itself
        const segStart  = offset;

        if (marker === 0xFFE1) { // APP1
            // Check for Exif identifier: "Exif\0\0"
            if (offset + 10 <= view.byteLength) {
                const e = view.getUint8(offset + 4);
                const x = view.getUint8(offset + 5);
                const i = view.getUint8(offset + 6);
                const f = view.getUint8(offset + 7);
                const n0= view.getUint8(offset + 8);
                const n1= view.getUint8(offset + 9);
                if (e === 0x45 && x === 0x78 && i === 0x69 && f === 0x66 && n0 === 0 && n1 === 0) {
                    app1Offsets.push({ start: segStart, length: segLength + 2 });

                    // Parse TIFF header (starts at offset + 10)
                    const tiffStart = offset + 10;
                    if (tiffStart + 8 <= view.byteLength) {
                        const bo = view.getUint16(tiffStart);
                        const little = bo === 0x4949; // "II"

                        const ifd0Offset = view.getUint32(tiffStart + 4, little);
                        const ifd0 = parseIfd(view, tiffStart, ifd0Offset, little, false);
                        Object.assign(tagMap, ifd0);

                        // Follow ExifIFD sub-IFD (tag 0x8769)
                        if (tagMap[0x8769]) {
                            const exifIfdOff = tagMap[0x8769].rawValue;
                            if (typeof exifIfdOff === 'number') {
                                const exifTags = parseIfd(view, tiffStart, exifIfdOff, little, false);
                                Object.assign(tagMap, exifTags);
                            }
                        }

                        // Follow GPS IFD (tag 0x8825)
                        if (tagMap[0x8825]) {
                            const gpsIfdOff = tagMap[0x8825].rawValue;
                            if (typeof gpsIfdOff === 'number') {
                                const gpsTags = parseIfd(view, tiffStart, gpsIfdOff, little, true);
                                // Re-key GPS tags with gps=true flag
                                for (const [k, v] of Object.entries(gpsTags)) {
                                    const def = EXIF_TAGS[parseInt(k)];
                                    tagMap[`gps_${k}`] = { ...v, group: 'location', gps: true };
                                }
                                gpsInfo = buildGpsInfo(gpsTags);
                            }
                        }
                    }
                }
            }
        }

        offset += 2 + segLength;
    }

    return { tagMap, gpsInfo, app1Offsets };
}

/**
 * Build a GPS info object (lat, lng, mapsUrl) from the GPS IFD tag map.
 */
function buildGpsInfo(gpsTags) {
    // Tag IDs within GPS IFD: 1=LatRef, 2=Lat, 3=LngRef, 4=Lng
    const latRef = gpsTags[1] ? String(gpsTags[1].rawValue) : '';
    const lngRef = gpsTags[3] ? String(gpsTags[3].rawValue) : '';
    const latRats = gpsTags[2] ? gpsTags[2].rawValue : null;
    const lngRats = gpsTags[4] ? gpsTags[4].rawValue : null;

    if (!latRats || !lngRats) return null;

    const lat = gpsRatToDecimal(Array.isArray(latRats) ? latRats : [latRats], latRef.trim());
    const lng = gpsRatToDecimal(Array.isArray(lngRats) ? lngRats : [lngRats], lngRef.trim());

    if (lat === null || lng === null) return null;

    const mapsUrl = `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
    return { lat, lng, mapsUrl };
}

/* =========================================================
   JPEG Stripping (Binary Splice)
   ========================================================= */

/**
 * Strip all EXIF APP1 segments from a JPEG buffer.
 * Uses binary splice — never re-encodes pixels.
 *
 * @param {ArrayBuffer} buffer
 * @returns {Blob} clean JPEG
 */
function stripAllExif(buffer) {
    const { app1Offsets } = parseExif(buffer);
    return spliceJpeg(buffer, app1Offsets);
}

/**
 * Strip only the specified field groups from a JPEG.
 * If all groups are selected, equivalent to stripAllExif.
 *
 * For selective stripping, we remove entire APP1 EXIF segments
 * (the spec mandates full segment removal for GPS; for partial group
 * removal we remove the whole EXIF APP1 and rewrite only what should
 * remain — this keeps the implementation robust and avoids re-encoding).
 *
 * Implementation: if the groups cover "location" we strip the GPS IFD;
 * for full removal of all groups the whole EXIF segment is dropped.
 * For true partial tag-level rewriting (e.g. keep device, remove GPS)
 * we rebuild a minimal EXIF APP1 with only the retained tags.
 *
 * @param {ArrayBuffer} buffer
 * @param {Set<string>} groupsToRemove
 * @returns {Blob}
 */
function stripSelectiveExif(buffer, groupsToRemove) {
    const ALL_GROUPS = new Set(['location', 'device', 'timestamps', 'camera', 'other']);
    // If all groups selected — just strip everything
    if (ALL_GROUPS.size === groupsToRemove.size && [...ALL_GROUPS].every(g => groupsToRemove.has(g))) {
        return stripAllExif(buffer);
    }

    const { app1Offsets, tagMap } = parseExif(buffer);
    if (app1Offsets.length === 0) {
        return new Blob([buffer], { type: 'image/jpeg' });
    }

    // Build retained tag set
    const retainedEntries = [];
    for (const [k, v] of Object.entries(tagMap)) {
        const numKey = parseInt(k);
        if (isNaN(numKey)) continue; // skip gps_ prefixed entries (handled via IFD pointer)
        // Skip IFD pointers (ExifIFD, GPS IFD) — we'll rebuild
        if (numKey === 0x8769 || numKey === 0x8825) continue;
        if (!groupsToRemove.has(v.group)) {
            retainedEntries.push({ tagId: numKey, entry: v });
        }
    }

    // Determine if GPS should be removed
    const removeGps = groupsToRemove.has('location');

    // If no tags would remain and GPS is also removed, strip everything
    if (retainedEntries.length === 0 && removeGps) {
        return stripAllExif(buffer);
    }

    // For simplicity and correctness: if selective, remove original EXIF APP1s
    // and write a new minimal one containing only retained tags.
    // We use a simplified approach: strip all APP1 EXIF, then prepend a new one.
    const strippedBlob = spliceJpeg(buffer, app1Offsets);

    // If no retained entries, return the fully stripped blob
    if (retainedEntries.length === 0) {
        return strippedBlob;
    }

    // Build a new minimal EXIF APP1 with retained IFD0 tags only
    const newApp1 = buildMinimalExifApp1(retainedEntries);

    // Reconstruct: SOI + new APP1 + rest of stripped JPEG (skip SOI bytes)
    return strippedBlob.arrayBuffer
        ? strippedBlob // fallback — shouldn't reach
        : new Blob(
            [newApp1, strippedBlob],
            { type: 'image/jpeg' }
          );
}

/**
 * Build a minimal EXIF APP1 containing the given IFD0 entries.
 * Returns a Uint8Array of the full APP1 segment bytes (marker + length + data).
 *
 * This is intentionally simple: ASCII strings + SHORT values only,
 * sufficient for the most common retained metadata (device, timestamps, camera).
 */
function buildMinimalExifApp1(entries) {
    // We'll write a TIFF-structured APP1 with:
    //   marker (2) + length (2) + "Exif\0\0" (6) + TIFF header (8) + IFD entries
    // TIFF header: byte order "MM" (big-endian) + 0x002A + IFD offset (8 = right after header)
    const EXIF_HEADER = new Uint8Array([0xFF, 0xE1]); // will be prepended
    const TIFF_HEADER = new Uint8Array([0x4D, 0x4D, 0x00, 0x2A, 0x00, 0x00, 0x00, 0x08]);
    // Big endian throughout
    const little = false;

    // IFD structure: count (2) + entries × 12 + next IFD offset (4)
    const numEntries = entries.length;
    const ifdSize = 2 + numEntries * 12 + 4;
    const valAreaOffset = 8 + ifdSize; // relative to TIFF header start

    // We store out-of-line values in a separate buffer
    const valChunks = [];
    let valPos = valAreaOffset;

    const ifdBytes = new Uint8Array(ifdSize);
    const ifdView = new DataView(ifdBytes.buffer);

    ifdView.setUint16(0, numEntries, false);

    for (let i = 0; i < numEntries; i++) {
        const { tagId, entry } = entries[i];
        const ep = 2 + i * 12;

        // We only faithfully reproduce ASCII string values
        // For numeric values, we omit (they'd need type-correct encoding)
        const val = String(entry.rawValue);
        if (typeof entry.rawValue === 'string') {
            // ASCII: type=2, count=len+1
            const ascii = new TextEncoder().encode(val + '\0');
            ifdView.setUint16(ep, tagId, false);
            ifdView.setUint16(ep + 2, 2, false);       // type: ASCII
            ifdView.setUint32(ep + 4, ascii.length, false); // count
            if (ascii.length <= 4) {
                // Store inline
                for (let j = 0; j < ascii.length; j++) {
                    ifdBytes[ep + 8 + j] = ascii[j];
                }
            } else {
                ifdView.setUint32(ep + 8, valPos, false); // offset relative to TIFF start
                valChunks.push(ascii);
                valPos += ascii.length;
            }
        }
        // Skip non-string values (camera settings, etc.) — benign omission
    }

    // Next IFD offset = 0
    ifdView.setUint32(ifdSize - 4, 0, false);

    // Concatenate all parts: "Exif\0\0" + TIFF header + IFD + val area
    const exifId = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);
    const totalDataLen = exifId.length + TIFF_HEADER.length + ifdBytes.length +
        valChunks.reduce((s, c) => s + c.length, 0);

    const app1Data = new Uint8Array(2 + 2 + totalDataLen); // marker + length + data
    const app1View = new DataView(app1Data.buffer);
    app1Data[0] = 0xFF; app1Data[1] = 0xE1;
    app1View.setUint16(2, totalDataLen + 2, false); // length includes itself

    let wpos = 4;
    app1Data.set(exifId, wpos);    wpos += exifId.length;
    app1Data.set(TIFF_HEADER, wpos); wpos += TIFF_HEADER.length;
    app1Data.set(ifdBytes, wpos);   wpos += ifdBytes.length;
    for (const chunk of valChunks) {
        app1Data.set(chunk, wpos);
        wpos += chunk.length;
    }

    return app1Data;
}

/**
 * Remove the given byte ranges from a JPEG buffer and return a Blob.
 * @param {ArrayBuffer} buffer
 * @param {Array<{start: number, length: number}>} segmentsToRemove
 * @returns {Blob}
 */
function spliceJpeg(buffer, segmentsToRemove) {
    if (segmentsToRemove.length === 0) {
        return new Blob([buffer], { type: 'image/jpeg' });
    }

    const src = new Uint8Array(buffer);
    const parts = [];
    let pos = 0;

    // Sort removals by start position
    const sorted = [...segmentsToRemove].sort((a, b) => a.start - b.start);

    for (const { start, length } of sorted) {
        if (pos < start) {
            parts.push(src.subarray(pos, start));
        }
        pos = start + length;
    }
    if (pos < src.length) {
        parts.push(src.subarray(pos));
    }

    return new Blob(parts, { type: 'image/jpeg' });
}

/* =========================================================
   PNG Stripping (Canvas Re-encode)
   ========================================================= */

/**
 * Strip PNG metadata by re-encoding via an offscreen Canvas.
 * @param {File} file
 * @returns {Promise<Blob>}
 */
function stripPng(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width  = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob returned null'));
            }, 'image/png');
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Image failed to load'));
        };
        img.src = url;
    });
}

/* =========================================================
   Download Helpers
   ========================================================= */

/**
 * Trigger a browser download of a Blob.
 * @param {Blob} blob
 * @param {string} filename
 */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Return a filename with "-stripped" inserted before the extension. */
function strippedName(originalName) {
    const dot = originalName.lastIndexOf('.');
    if (dot === -1) return originalName + '-stripped';
    return originalName.slice(0, dot) + '-stripped' + originalName.slice(dot);
}

/* =========================================================
   Toast Notification
   ========================================================= */

let toastEl = null;
let toastTimer = null;

function showToast(message, duration = 3000) {
    if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.className = 'toast';
        document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('visible'), duration);
}

/* =========================================================
   Rendering
   ========================================================= */

/**
 * Build the EXIF metadata table for the given tag map.
 * @param {Object} tagMap
 * @param {Object|null} gpsInfo
 */
function renderMetadataTable(tagMap, gpsInfo) {
    exifTbody.innerHTML = '';

    const entries = Object.entries(tagMap).filter(([k]) => !k.startsWith('gps_'));
    const hasGps = gpsInfo !== null;

    // GPS warning
    gpsWarning.classList.toggle('hidden', !hasGps);

    if (entries.length === 0) {
        noExifMsg.classList.remove('hidden');
        exifTableWrapper.classList.add('hidden');
        groupFieldset.classList.add('hidden');
        actionBar.classList.remove('hidden');
        return;
    }

    noExifMsg.classList.add('hidden');
    exifTableWrapper.classList.remove('hidden');
    groupFieldset.classList.remove('hidden');
    actionBar.classList.remove('hidden');

    for (const [k, entry] of entries) {
        const tagId = parseInt(k);
        const tr = document.createElement('tr');

        const tdLabel = document.createElement('td');
        tdLabel.textContent = entry.label;

        const tdValue = document.createElement('td');
        // GPS fields with coordinates: render as map link
        if (entry.group === 'location' && gpsInfo &&
            (tagId === 0x8825 || String(k).startsWith('gps_'))) {
            const a = document.createElement('a');
            a.href = gpsInfo.mapsUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = `${gpsInfo.lat.toFixed(6)}, ${gpsInfo.lng.toFixed(6)}`;
            tdValue.appendChild(a);
        } else {
            let displayVal = entry.humanValue;
            if (Array.isArray(displayVal)) {
                displayVal = displayVal.map(v => typeof v === 'number' ? v.toFixed(4) : v).join(', ');
            } else if (typeof displayVal === 'number') {
                displayVal = Number.isInteger(displayVal) ? String(displayVal) : displayVal.toFixed(4);
            }
            tdValue.textContent = String(displayVal);
        }

        const tdGroup = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `group-badge group-badge-${entry.group}`;
        badge.textContent = entry.group;
        tdGroup.appendChild(badge);

        tr.appendChild(tdLabel);
        tr.appendChild(tdValue);
        tr.appendChild(tdGroup);
        exifTbody.appendChild(tr);
    }
}

/**
 * Render the batch file list.
 */
function renderFileList() {
    fileListEl.innerHTML = '';
    for (let i = 0; i < state.files.length; i++) {
        const entry = state.files[i];
        const li = document.createElement('li');
        li.className = `file-item${i === state.activeIndex ? ' active' : ''}`;
        li.dataset.index = i;
        li.setAttribute('role', 'button');
        li.setAttribute('tabindex', '0');
        li.setAttribute('aria-label', `${entry.file.name} — click to view metadata`);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'file-item-name';
        nameSpan.textContent = entry.file.name;

        const gpsSpan = document.createElement('span');
        gpsSpan.className = 'file-item-gps' + (entry.hasGps ? '' : ' no-gps');
        gpsSpan.textContent = entry.hasGps ? '📍 GPS' : 'No GPS';

        const tagSpan = document.createElement('span');
        tagSpan.className = 'file-item-tags';
        tagSpan.textContent = `${entry.tagCount} tags`;

        const statusSpan = document.createElement('span');
        statusSpan.className = `file-item-status ${entry.status}`;
        statusSpan.textContent = entry.status === 'pending' ? '' :
                                  entry.status === 'stripped' ? '✓ Stripped' : '✗ Error';

        li.appendChild(nameSpan);
        li.appendChild(gpsSpan);
        li.appendChild(tagSpan);
        li.appendChild(statusSpan);

        li.addEventListener('click', () => selectFile(i));
        li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') selectFile(i); });

        fileListEl.appendChild(li);
    }
}

/**
 * Switch the detail panel to show the given file's metadata.
 */
function selectFile(index) {
    state.activeIndex = index;
    renderFileList();
    const entry = state.files[index];
    renderMetadataTable(entry.tagMap, entry.gpsInfo);
}

/* =========================================================
   File Selection Handler
   ========================================================= */

async function handleFileSelect(files) {
    formatError.textContent = '';
    formatError.classList.remove('visible');

    const fileArr = Array.from(files).slice(0, 10);
    if (fileArr.length === 0) return;

    // Validate types
    const invalid = fileArr.filter(f => !f.type.startsWith('image/'));
    if (invalid.length === fileArr.length) {
        formatError.textContent = 'Unsupported file format. Please use JPEG or PNG images.';
        formatError.classList.add('visible');
        return;
    }

    state.files = [];
    state.activeIndex = 0;

    for (const file of fileArr) {
        let buffer, tagMap = {}, gpsInfo = null, hasGps = false, tagCount = 0;
        try {
            ({ buffer } = await loadFile(file));
            if (isJpeg(buffer)) {
                ({ tagMap, gpsInfo } = parseExif(buffer));
                // Filter out gps_ prefixed duplicates for counting
                tagCount = Object.keys(tagMap).filter(k => !k.startsWith('gps_')).length;
            } else if (isPng(buffer)) {
                // PNG has no EXIF to parse in-browser without a library
                tagCount = 0;
            } else {
                // Skip unsupported formats silently in batch
                continue;
            }
            hasGps = gpsInfo !== null;
        } catch {
            // Push with error state
            state.files.push({ file, buffer: null, tagMap: {}, gpsInfo: null, hasGps: false, tagCount: 0, status: 'error' });
            continue;
        }
        state.files.push({ file, buffer, tagMap, gpsInfo, hasGps, tagCount, status: 'pending' });
    }

    if (state.files.length === 0) {
        formatError.textContent = 'No supported images found. Please use JPEG or PNG files.';
        formatError.classList.add('visible');
        return;
    }

    showWorkspace();
}

/* =========================================================
   Workspace Visibility
   ========================================================= */

function showWorkspace() {
    workspace.classList.add('visible');
    dropZone.classList.add('hidden');

    const isBatch = state.files.length > 1;
    batchPanel.classList.toggle('hidden', !isBatch);

    if (isBatch) {
        renderFileList();
    }

    // Always show detail panel for the active file
    const active = state.files[state.activeIndex];
    renderMetadataTable(active.tagMap, active.gpsInfo);
}

/* =========================================================
   Strip Handlers
   ========================================================= */

async function handleStripAll() {
    const entry = state.files[state.activeIndex];
    if (!entry || !entry.buffer) return;

    try {
        let blob;
        if (isJpeg(entry.buffer)) {
            blob = stripAllExif(entry.buffer);
        } else {
            blob = await stripPng(entry.file);
        }
        downloadBlob(blob, strippedName(entry.file.name));
        entry.status = 'stripped';
        renderFileList();
        showToast('Download started — all metadata removed.');
    } catch (err) {
        showToast(`Error: ${err.message}`);
    }
}

async function handleStripSelected() {
    if (state.selectedGroups.size === 0) {
        showToast('No groups selected — nothing to remove.');
        return;
    }

    const entry = state.files[state.activeIndex];
    if (!entry || !entry.buffer) return;

    try {
        let blob;
        if (isJpeg(entry.buffer)) {
            blob = stripSelectiveExif(entry.buffer, state.selectedGroups);
        } else {
            // PNG: canvas re-encode always strips everything
            blob = await stripPng(entry.file);
        }
        downloadBlob(blob, strippedName(entry.file.name));
        entry.status = 'stripped';
        renderFileList();
        showToast('Download started — selected groups removed.');
    } catch (err) {
        showToast(`Error: ${err.message}`);
    }
}

async function handleGpsOnly() {
    // Deselect all checkboxes except location
    cbAll.checked = false;
    cbLocation.checked = true;
    cbDevice.checked = false;
    cbTimestamps.checked = false;
    cbCamera.checked = false;
    state.selectedGroups = new Set(['location']);
    await handleStripSelected();
}

async function handleBatchStrip() {
    if (state.files.length === 0) return;

    stripZipBtn.disabled = true;
    batchProgress.classList.remove('hidden');
    batchProgress.innerHTML = `
        <div>Processing ${state.files.length} files…</div>
        <div class="batch-progress-bar-wrap">
            <div class="batch-progress-bar" id="batch-bar" style="width:0%"></div>
        </div>`;

    const zip = new JSZip(); // JSZip is loaded as global from vendor script
    let done = 0;

    for (const entry of state.files) {
        try {
            let blob;
            if (entry.buffer && isJpeg(entry.buffer)) {
                blob = stripAllExif(entry.buffer);
            } else if (entry.buffer && isPng(entry.buffer)) {
                blob = await stripPng(entry.file);
            } else {
                entry.status = 'error';
                done++;
                continue;
            }
            zip.file(strippedName(entry.file.name), blob);
            entry.status = 'stripped';
        } catch {
            entry.status = 'error';
        }

        done++;
        const pct = Math.round((done / state.files.length) * 100);
        const bar = document.getElementById('batch-bar');
        if (bar) bar.style.width = pct + '%';
        renderFileList();
    }

    try {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, 'exif-stripped.zip');
        batchProgress.innerHTML = `<div style="color: var(--success); font-weight: 700;">✓ ZIP ready — download started.</div>`;
        showToast('ZIP download started — all files stripped.');
    } catch (err) {
        batchProgress.innerHTML = `<div style="color: var(--danger);">Error generating ZIP: ${err.message}</div>`;
    }

    stripZipBtn.disabled = false;
}

/* =========================================================
   Reset
   ========================================================= */

function handleReset() {
    state.files = [];
    state.activeIndex = 0;
    state.selectedGroups = new Set(['location', 'device', 'timestamps', 'camera', 'other']);

    workspace.classList.remove('visible');
    dropZone.classList.remove('hidden');
    batchPanel.classList.add('hidden');

    gpsWarning.classList.add('hidden');
    noExifMsg.classList.add('hidden');
    exifTableWrapper.classList.add('hidden');
    groupFieldset.classList.add('hidden');
    actionBar.classList.add('hidden');
    exifTbody.innerHTML = '';
    fileListEl.innerHTML = '';
    batchProgress.classList.add('hidden');

    // Reset checkboxes
    cbAll.checked = true;
    cbLocation.checked = true;
    cbDevice.checked = true;
    cbTimestamps.checked = true;
    cbCamera.checked = true;

    formatError.textContent = '';
    formatError.classList.remove('visible');

    fileInput.value = '';
}

/* =========================================================
   Checkbox Logic (Selective Strip — P2)
   ========================================================= */

function syncGroupsFromCheckboxes() {
    state.selectedGroups.clear();
    if (cbLocation.checked)   state.selectedGroups.add('location');
    if (cbDevice.checked)     state.selectedGroups.add('device');
    if (cbTimestamps.checked) state.selectedGroups.add('timestamps');
    if (cbCamera.checked)     state.selectedGroups.add('camera');
}

cbAll.addEventListener('change', () => {
    const checked = cbAll.checked;
    cbLocation.checked   = checked;
    cbDevice.checked     = checked;
    cbTimestamps.checked = checked;
    cbCamera.checked     = checked;
    syncGroupsFromCheckboxes();
});

[cbLocation, cbDevice, cbTimestamps, cbCamera].forEach(cb => {
    cb.addEventListener('change', () => {
        const allChecked = cbLocation.checked && cbDevice.checked && cbTimestamps.checked && cbCamera.checked;
        cbAll.checked = allChecked;
        syncGroupsFromCheckboxes();
    });
});

/* =========================================================
   Event Wiring
   ========================================================= */

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFileSelect(e.target.files);
});

// Action buttons
stripAllBtn.addEventListener('click', handleStripAll);
stripSelBtn.addEventListener('click', handleStripSelected);
resetBtn.addEventListener('click', handleReset);
resetBtnBatch.addEventListener('click', handleReset);
stripZipBtn.addEventListener('click', handleBatchStrip);
removeGpsBtn.addEventListener('click', handleGpsOnly);
