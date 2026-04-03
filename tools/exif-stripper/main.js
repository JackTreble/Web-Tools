/**
 * EXIF Stripper — tools/exif-stripper/main.js
 * 100% client-side: zero external requests, zero uploads.
 *
 * Supports:
 *   US1 — Strip all EXIF from a single JPEG or PNG and download
 *   US2 — Strip selected metadata groups (Location, Device, Timestamps, Camera)
 *   US3 — Batch strip up to 10 images and download as a ZIP archive
 */

// ─────────────────────────────────────────────────────────────────────────────
// EXIF Tag Registry
// Covers ~80 of the most common EXIF tags across IFD0, ExifIFD, and GPS IFD.
// group: 'location' | 'device' | 'timestamps' | 'camera' | null (internal pointer)
// ─────────────────────────────────────────────────────────────────────────────

const EXIF_TAGS = {
  // IFD0 — Main Image
  0x010E: { label: 'Image Description', group: 'device' },
  0x010F: { label: 'Camera Make', group: 'device' },
  0x0110: { label: 'Camera Model', group: 'device' },
  0x0112: { label: 'Orientation', group: 'camera' },
  0x011A: { label: 'X Resolution', group: 'camera' },
  0x011B: { label: 'Y Resolution', group: 'camera' },
  0x0128: { label: 'Resolution Unit', group: 'camera' },
  0x0131: { label: 'Software', group: 'device' },
  0x0132: { label: 'Date/Time Modified', group: 'timestamps' },
  0x013B: { label: 'Artist', group: 'device' },
  0x013E: { label: 'White Point', group: 'camera' },
  0x013F: { label: 'Primary Chromaticities', group: 'camera' },
  0x0213: { label: 'YCbCr Positioning', group: 'camera' },
  0x8298: { label: 'Copyright', group: 'device' },
  0x8769: { label: 'Exif IFD Pointer', group: null },   // sub-IFD pointer
  0x8825: { label: 'GPS IFD Pointer', group: null },    // sub-IFD pointer

  // Exif IFD
  0x829A: { label: 'Exposure Time', group: 'camera' },
  0x829D: { label: 'F-Number', group: 'camera' },
  0x8822: { label: 'Exposure Program', group: 'camera' },
  0x8824: { label: 'Spectral Sensitivity', group: 'camera' },
  0x8827: { label: 'ISO Speed', group: 'camera' },
  0x9000: { label: 'Exif Version', group: 'camera' },
  0x9003: { label: 'Date/Time Original', group: 'timestamps' },
  0x9004: { label: 'Date/Time Digitized', group: 'timestamps' },
  0x9010: { label: 'UTC Offset Time', group: 'timestamps' },
  0x9011: { label: 'UTC Offset Original', group: 'timestamps' },
  0x9012: { label: 'UTC Offset Digitized', group: 'timestamps' },
  0x9101: { label: 'Components Configuration', group: 'camera' },
  0x9102: { label: 'Compressed Bits Per Pixel', group: 'camera' },
  0x9201: { label: 'Shutter Speed', group: 'camera' },
  0x9202: { label: 'Aperture Value', group: 'camera' },
  0x9203: { label: 'Brightness Value', group: 'camera' },
  0x9204: { label: 'Exposure Bias', group: 'camera' },
  0x9205: { label: 'Max Aperture Value', group: 'camera' },
  0x9206: { label: 'Subject Distance', group: 'camera' },
  0x9207: { label: 'Metering Mode', group: 'camera' },
  0x9208: { label: 'Light Source', group: 'camera' },
  0x9209: { label: 'Flash', group: 'camera' },
  0x920A: { label: 'Focal Length', group: 'camera' },
  0x9214: { label: 'Subject Area', group: 'camera' },
  0x927C: { label: 'Maker Note', group: 'device' },
  0x9286: { label: 'User Comment', group: 'device' },
  0x9290: { label: 'Sub-Second Time', group: 'timestamps' },
  0x9291: { label: 'Sub-Second Time Original', group: 'timestamps' },
  0x9292: { label: 'Sub-Second Time Digitized', group: 'timestamps' },
  0xA000: { label: 'FlashPix Version', group: 'camera' },
  0xA001: { label: 'Color Space', group: 'camera' },
  0xA002: { label: 'Pixel X Dimension', group: 'camera' },
  0xA003: { label: 'Pixel Y Dimension', group: 'camera' },
  0xA004: { label: 'Related Sound File', group: 'device' },
  0xA005: { label: 'Interoperability IFD', group: null },
  0xA20E: { label: 'Focal Plane X Resolution', group: 'camera' },
  0xA20F: { label: 'Focal Plane Y Resolution', group: 'camera' },
  0xA210: { label: 'Focal Plane Resolution Unit', group: 'camera' },
  0xA215: { label: 'Exposure Index', group: 'camera' },
  0xA217: { label: 'Sensing Method', group: 'camera' },
  0xA300: { label: 'File Source', group: 'device' },
  0xA301: { label: 'Scene Type', group: 'camera' },
  0xA401: { label: 'Custom Rendered', group: 'camera' },
  0xA402: { label: 'Exposure Mode', group: 'camera' },
  0xA403: { label: 'White Balance', group: 'camera' },
  0xA404: { label: 'Digital Zoom Ratio', group: 'camera' },
  0xA405: { label: 'Focal Length (35mm)', group: 'camera' },
  0xA406: { label: 'Scene Capture Type', group: 'camera' },
  0xA407: { label: 'Gain Control', group: 'camera' },
  0xA408: { label: 'Contrast', group: 'camera' },
  0xA409: { label: 'Saturation', group: 'camera' },
  0xA40A: { label: 'Sharpness', group: 'camera' },
  0xA40C: { label: 'Subject Distance Range', group: 'camera' },
  0xA420: { label: 'Image Unique ID', group: 'device' },
  0xA430: { label: 'Camera Owner Name', group: 'device' },
  0xA431: { label: 'Body Serial Number', group: 'device' },
  0xA432: { label: 'Lens Specification', group: 'device' },
  0xA433: { label: 'Lens Make', group: 'device' },
  0xA434: { label: 'Lens Model', group: 'device' },
  0xA435: { label: 'Lens Serial Number', group: 'device' },

  // GPS IFD — all tagged as 'location'
  0x0000: { label: 'GPS Version ID', group: 'location' },
  0x0001: { label: 'GPS Latitude Ref', group: 'location' },
  0x0002: { label: 'GPS Latitude', group: 'location' },
  0x0003: { label: 'GPS Longitude Ref', group: 'location' },
  0x0004: { label: 'GPS Longitude', group: 'location' },
  0x0005: { label: 'GPS Altitude Ref', group: 'location' },
  0x0006: { label: 'GPS Altitude', group: 'location' },
  0x0007: { label: 'GPS Time (UTC)', group: 'location' },
  0x0008: { label: 'GPS Satellites', group: 'location' },
  0x0009: { label: 'GPS Status', group: 'location' },
  0x000A: { label: 'GPS Measure Mode', group: 'location' },
  0x000B: { label: 'GPS DOP', group: 'location' },
  0x000C: { label: 'GPS Speed Ref', group: 'location' },
  0x000D: { label: 'GPS Speed', group: 'location' },
  0x000E: { label: 'GPS Track Ref', group: 'location' },
  0x000F: { label: 'GPS Track', group: 'location' },
  0x0010: { label: 'GPS Image Direction Ref', group: 'location' },
  0x0011: { label: 'GPS Image Direction', group: 'location' },
  0x0012: { label: 'GPS Map Datum', group: 'location' },
  0x0013: { label: 'GPS Dest Latitude Ref', group: 'location' },
  0x0014: { label: 'GPS Dest Latitude', group: 'location' },
  0x0015: { label: 'GPS Dest Longitude Ref', group: 'location' },
  0x0016: { label: 'GPS Dest Longitude', group: 'location' },
  0x0017: { label: 'GPS Dest Bearing Ref', group: 'location' },
  0x0018: { label: 'GPS Dest Bearing', group: 'location' },
  0x0019: { label: 'GPS Dest Distance Ref', group: 'location' },
  0x001A: { label: 'GPS Dest Distance', group: 'location' },
  0x001B: { label: 'GPS Processing Method', group: 'location' },
  0x001C: { label: 'GPS Area Information', group: 'location' },
  0x001D: { label: 'GPS Date Stamp', group: 'location' },
  0x001E: { label: 'GPS Differential', group: 'location' },
  0x001F: { label: 'GPS H Positioning Error', group: 'location' },
};

// TIFF type byte sizes (indexed by type ID 0–12)
const TYPE_SIZES = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

const state = {
  files: [],         // Array<ImageEntry>
  mode: 'single',   // 'single' | 'batch'
  selectedGroups: new Set(['location', 'device', 'timestamps', 'camera']),
};

// ─────────────────────────────────────────────────────────────────────────────
// Core Utilities
// ─────────────────────────────────────────────────────────────────────────────

function loadFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve({ file, buffer: e.target.result });
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function isJpeg(buffer) {
  const v = new Uint8Array(buffer, 0, 2);
  return v[0] === 0xFF && v[1] === 0xD8;
}

function isPng(buffer) {
  const v = new Uint8Array(buffer, 0, 4);
  return v[0] === 0x89 && v[1] === 0x50 && v[2] === 0x4E && v[3] === 0x47;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXIF Parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a TIFF entry value as a human-readable string.
 */
function formatTagValue(view, type, count, valueFieldOffset, le, tiffStart) {
  const typeSize = TYPE_SIZES[type] || 1;
  const totalBytes = typeSize * count;

  let off;
  if (totalBytes <= 4) {
    off = valueFieldOffset;
  } else {
    const rel = le
      ? view.getUint32(valueFieldOffset, true)
      : view.getUint32(valueFieldOffset, false);
    off = tiffStart + rel;
  }

  if (type === 2) { // ASCII
    let s = '';
    for (let i = 0; i < count - 1; i++) {
      const ch = view.getUint8(off + i);
      if (ch === 0) break;
      s += String.fromCharCode(ch);
    }
    return s.trim() || '(empty)';
  }

  if (type === 5 || type === 10) { // RATIONAL / SRATIONAL
    const parts = [];
    for (let i = 0; i < Math.min(count, 4); i++) {
      const base = off + i * 8;
      const num = type === 5 ? view.getUint32(base, le) : view.getInt32(base, le);
      const den = type === 5 ? view.getUint32(base + 4, le) : view.getInt32(base + 4, le);
      if (den === 0) {
        parts.push('0');
      } else if (count === 1 && num % den === 0) {
        parts.push(String(num / den));
      } else {
        parts.push(`${num}/${den}`);
      }
    }
    return parts.join(', ');
  }

  if (type === 3) { // SHORT
    const vals = [];
    for (let i = 0; i < Math.min(count, 8); i++) {
      vals.push(view.getUint16(off + i * 2, le));
    }
    return vals.join(', ');
  }

  if (type === 4) { // LONG
    const vals = [];
    for (let i = 0; i < Math.min(count, 4); i++) {
      vals.push(view.getUint32(off + i * 4, le));
    }
    return vals.join(', ');
  }

  if (type === 7) { // UNDEFINED
    if (count <= 8) {
      const bytes = [];
      for (let i = 0; i < count; i++) {
        bytes.push(view.getUint8(off + i).toString(16).padStart(2, '0'));
      }
      return bytes.join(' ');
    }
    return `${count} bytes`;
  }

  if (type === 1) return String(view.getUint8(off));
  if (type === 6) return String(view.getInt8(off));
  if (type === 8) return String(view.getInt16(off, le));
  if (type === 9) return String(view.getInt32(off, le));

  return '(unknown)';
}

/**
 * Read all entries from a TIFF IFD at the given absolute offset.
 * Returns array of { tagId, type, count, humanValue, valueFieldOffset }.
 */
function readIfdEntries(view, ifdAbsOffset, le, tiffStart) {
  const count = le
    ? view.getUint16(ifdAbsOffset, true)
    : view.getUint16(ifdAbsOffset, false);

  const entries = [];
  for (let i = 0; i < count; i++) {
    const entryOff = ifdAbsOffset + 2 + i * 12;
    const tagId = le ? view.getUint16(entryOff, true) : view.getUint16(entryOff, false);
    const type = le ? view.getUint16(entryOff + 2, true) : view.getUint16(entryOff + 2, false);
    const cnt = le ? view.getUint32(entryOff + 4, true) : view.getUint32(entryOff + 4, false);
    const vfo = entryOff + 8;

    let humanValue = '';
    try {
      humanValue = formatTagValue(view, type, cnt, vfo, le, tiffStart);
    } catch (_) {
      humanValue = '(read error)';
    }

    entries.push({ tagId, type, count: cnt, humanValue, valueFieldOffset: vfo });
  }
  return entries;
}

/**
 * Parse EXIF metadata from a JPEG ArrayBuffer.
 * Returns { exifMap, hasGps, gpsData, tiffStart, le } or null.
 */
function parseExif(buffer) {
  const view = new DataView(buffer);
  const len = view.byteLength;

  if (len < 2 || view.getUint16(0) !== 0xFFD8) return null;

  let offset = 2;
  while (offset + 3 < len) {
    if (view.getUint8(offset) !== 0xFF) break;

    const marker = view.getUint16(offset);

    // Markers with no length field
    if (marker === 0xFFD9) break; // EOI
    if (marker >= 0xFFD0 && marker <= 0xFFD8) { offset += 2; continue; }

    if (offset + 4 > len) break;
    const segLen = view.getUint16(offset + 2);

    if (marker === 0xFFE1 && segLen >= 8) {
      const dataStart = offset + 4;
      // Check "Exif\0\0"
      if (dataStart + 6 <= len &&
          view.getUint8(dataStart)     === 0x45 &&
          view.getUint8(dataStart + 1) === 0x78 &&
          view.getUint8(dataStart + 2) === 0x69 &&
          view.getUint8(dataStart + 3) === 0x66 &&
          view.getUint8(dataStart + 4) === 0x00 &&
          view.getUint8(dataStart + 5) === 0x00) {

        const tiffStart = dataStart + 6;
        const bom = view.getUint16(tiffStart);
        const le = bom === 0x4949; // "II" = little-endian

        const magic = le ? view.getUint16(tiffStart + 2, true) : view.getUint16(tiffStart + 2, false);
        if (magic !== 42) return null;

        const ifd0Rel = le
          ? view.getUint32(tiffStart + 4, true)
          : view.getUint32(tiffStart + 4, false);
        const ifd0Abs = tiffStart + ifd0Rel;

        const ifd0Entries = readIfdEntries(view, ifd0Abs, le, tiffStart);

        const exifMap = {};
        let exifIfdAbs = null;
        let gpsIfdAbs = null;

        for (const e of ifd0Entries) {
          if (e.tagId === 0x8769) {
            const rel = le
              ? view.getUint32(e.valueFieldOffset, true)
              : view.getUint32(e.valueFieldOffset, false);
            exifIfdAbs = tiffStart + rel;
          } else if (e.tagId === 0x8825) {
            const rel = le
              ? view.getUint32(e.valueFieldOffset, true)
              : view.getUint32(e.valueFieldOffset, false);
            gpsIfdAbs = tiffStart + rel;
          } else {
            const info = EXIF_TAGS[e.tagId];
            if (info) {
              exifMap[e.tagId] = { label: info.label, humanValue: e.humanValue, group: info.group };
            }
          }
        }

        if (exifIfdAbs !== null) {
          for (const e of readIfdEntries(view, exifIfdAbs, le, tiffStart)) {
            const info = EXIF_TAGS[e.tagId];
            if (info) {
              exifMap[e.tagId] = { label: info.label, humanValue: e.humanValue, group: info.group };
            }
          }
        }

        const gpsRaw = {};
        if (gpsIfdAbs !== null) {
          for (const e of readIfdEntries(view, gpsIfdAbs, le, tiffStart)) {
            const info = EXIF_TAGS[e.tagId];
            if (info) {
              exifMap[e.tagId] = { label: info.label, humanValue: e.humanValue, group: 'location' };
              gpsRaw[e.tagId] = e;
            }
          }
        }

        const gpsData = gpsIfdAbs !== null
          ? computeGpsDecimal(gpsRaw, view, le, tiffStart)
          : null;

        return { exifMap, hasGps: gpsIfdAbs !== null, gpsData, tiffStart, le };
      }
    }

    offset += 2 + segLen;
  }

  return null;
}

/**
 * Convert GPS rational values to decimal and build a Google Maps URL.
 */
function computeGpsDecimal(gpsRaw, view, le, tiffStart) {
  function rationalToDeg(entry) {
    const totalBytes = 8 * entry.count;
    let off;
    if (totalBytes <= 4) {
      off = entry.valueFieldOffset;
    } else {
      const rel = le
        ? view.getUint32(entry.valueFieldOffset, true)
        : view.getUint32(entry.valueFieldOffset, false);
      off = tiffStart + rel;
    }
    const vals = [];
    for (let i = 0; i < Math.min(entry.count, 3); i++) {
      const base = off + i * 8;
      const num = le ? view.getUint32(base, true) : view.getUint32(base, false);
      const den = le ? view.getUint32(base + 4, true) : view.getUint32(base + 4, false);
      vals.push(den === 0 ? 0 : num / den);
    }
    return vals[0] + (vals[1] || 0) / 60 + (vals[2] || 0) / 3600;
  }

  const latEntry = gpsRaw[0x0002];
  const lngEntry = gpsRaw[0x0004];
  if (!latEntry || !lngEntry) return null;

  const lat = rationalToDeg(latEntry);
  const lng = rationalToDeg(lngEntry);

  const latRef = (gpsRaw[0x0001]?.humanValue || 'N').trim().charAt(0);
  const lngRef = (gpsRaw[0x0003]?.humanValue || 'E').trim().charAt(0);

  const latDec = latRef === 'S' ? -lat : lat;
  const lngDec = lngRef === 'W' ? -lng : lng;

  return {
    lat: latDec,
    lng: lngDec,
    mapsUrl: `https://maps.google.com/?q=${latDec.toFixed(6)},${lngDec.toFixed(6)}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// JPEG Strippers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Binary splice: remove all APP1 segments containing "Exif\0\0" from a JPEG.
 * Returns Blob (image/jpeg). Lossless — no pixel re-encoding.
 */
function stripAllExif(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunks = [];
  let offset = 0;

  // Copy SOI
  chunks.push(bytes.slice(0, 2));
  offset = 2;

  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xFF) break;

    const marker = (bytes[offset] << 8) | bytes[offset + 1];

    if (marker === 0xFFD9) { // EOI
      chunks.push(bytes.slice(offset, offset + 2));
      break;
    }

    if (marker >= 0xFFD0 && marker <= 0xFFD8) { // RST / SOI
      chunks.push(bytes.slice(offset, offset + 2));
      offset += 2;
      continue;
    }

    if (offset + 4 > bytes.length) break;
    const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const totalSegLen = 2 + segLen;

    // Skip EXIF APP1 segments
    if (marker === 0xFFE1 && segLen >= 8 &&
        bytes[offset + 4] === 0x45 && bytes[offset + 5] === 0x78 &&
        bytes[offset + 6] === 0x69 && bytes[offset + 7] === 0x66 &&
        bytes[offset + 8] === 0x00 && bytes[offset + 9] === 0x00) {
      offset += totalSegLen;
      continue;
    }

    chunks.push(bytes.slice(offset, offset + totalSegLen));
    offset += totalSegLen;
  }

  // Stitch chunks
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }

  return new Blob([out], { type: 'image/jpeg' });
}

/**
 * Strip PNG metadata by Canvas re-encode (canvas export drops all metadata chunks).
 * Returns Promise<Blob> (image/png). Lossless in visual quality.
 */
function stripPng(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas export failed'));
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Selective Strip (JPEG) — rebuild IFD without unwanted tag groups
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Copy value bytes for a TIFF entry from the source DataView.
 */
function readEntryValueBytes(view, type, count, valueFieldOffset, le, tiffStart) {
  const typeSize = TYPE_SIZES[type] || 1;
  const totalBytes = typeSize * count;

  let off;
  if (totalBytes <= 4) {
    off = valueFieldOffset;
  } else {
    const rel = le
      ? view.getUint32(valueFieldOffset, true)
      : view.getUint32(valueFieldOffset, false);
    off = tiffStart + rel;
  }

  // Guard against reading out of bounds
  if (off + totalBytes > view.byteLength) {
    return new Uint8Array(totalBytes); // return zeros on error
  }

  const result = new Uint8Array(totalBytes);
  for (let i = 0; i < totalBytes; i++) result[i] = view.getUint8(off + i);
  return result;
}

/**
 * Rebuild a TIFF binary from the given (filtered) IFD entry arrays.
 * Each entry = { tagId, type, count, valueBytes: Uint8Array }.
 * Returns Uint8Array.
 */
function buildTiff(ifd0Entries, exifEntries, gpsEntries, le) {
  const hasExif = exifEntries.length > 0;
  const hasGps = gpsEntries.length > 0;

  function setU16(arr, off, v) {
    if (le) { arr[off] = v & 0xFF; arr[off + 1] = (v >> 8) & 0xFF; }
    else    { arr[off] = (v >> 8) & 0xFF; arr[off + 1] = v & 0xFF; }
  }
  function setU32(arr, off, v) {
    v = v >>> 0;
    if (le) {
      arr[off]     =  v        & 0xFF;
      arr[off + 1] = (v >>  8) & 0xFF;
      arr[off + 2] = (v >> 16) & 0xFF;
      arr[off + 3] = (v >> 24) & 0xFF;
    } else {
      arr[off]     = (v >> 24) & 0xFF;
      arr[off + 1] = (v >> 16) & 0xFF;
      arr[off + 2] = (v >>  8) & 0xFF;
      arr[off + 3] =  v        & 0xFF;
    }
  }

  function ifdBlockSize(entries) {
    let size = 2 + entries.length * 12 + 4; // count(2) + entries + next-ptr(4)
    for (const e of entries) {
      const tb = (TYPE_SIZES[e.type] || 1) * e.count;
      if (tb > 4) size += tb;
    }
    return size;
  }

  const TIFF_HEADER = 8;
  const ifd0Start  = TIFF_HEADER;
  const ifd0Size   = ifdBlockSize(ifd0Entries);
  const exifStart  = ifd0Start + ifd0Size;
  const exifSize   = hasExif ? ifdBlockSize(exifEntries) : 0;
  const gpsStart   = exifStart + exifSize;
  const gpsSize    = hasGps ? ifdBlockSize(gpsEntries) : 0;
  const totalSize  = gpsStart + gpsSize;

  const tiff = new Uint8Array(totalSize);

  // TIFF header
  tiff[0] = le ? 0x49 : 0x4D;
  tiff[1] = le ? 0x49 : 0x4D;
  setU16(tiff, 2, 42);
  setU32(tiff, 4, ifd0Start);

  // Patch ExifIFD / GPS IFD pointer values in ifd0Entries
  const patchedIfd0 = ifd0Entries.map(e => {
    if (e.tagId === 0x8769 && hasExif) {
      const v = new Uint8Array(4); setU32(v, 0, exifStart); return { ...e, valueBytes: v };
    }
    if (e.tagId === 0x8825 && hasGps) {
      const v = new Uint8Array(4); setU32(v, 0, gpsStart); return { ...e, valueBytes: v };
    }
    return e;
  });

  function writeIfd(entries, startOff) {
    setU16(tiff, startOff, entries.length);
    let dataOff = startOff + 2 + entries.length * 12 + 4;

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const eOff = startOff + 2 + i * 12;
      const tb = (TYPE_SIZES[e.type] || 1) * e.count;

      setU16(tiff, eOff,     e.tagId);
      setU16(tiff, eOff + 2, e.type);
      setU32(tiff, eOff + 4, e.count);

      if (tb <= 4) {
        for (let j = 0; j < tb; j++) tiff[eOff + 8 + j] = e.valueBytes[j] || 0;
      } else {
        setU32(tiff, eOff + 8, dataOff);
        for (let j = 0; j < tb && j < e.valueBytes.length; j++) tiff[dataOff + j] = e.valueBytes[j];
        dataOff += tb;
      }
    }

    setU32(tiff, startOff + 2 + entries.length * 12, 0); // next IFD pointer = 0
  }

  writeIfd(patchedIfd0, ifd0Start);
  if (hasExif) writeIfd(exifEntries, exifStart);
  if (hasGps)  writeIfd(gpsEntries,  gpsStart);

  return tiff;
}

/**
 * Selective EXIF strip for JPEG.
 * Parses IFD0 / ExifIFD / GPS IFD with raw value bytes, filters, rebuilds.
 * Falls back to stripAllExif when all groups are selected.
 * Returns Blob (image/jpeg).
 */
function stripSelectiveExif(buffer, groupsToRemove) {
  if (groupsToRemove.size === 0) {
    return new Blob([buffer], { type: 'image/jpeg' });
  }

  const allGroups = ['location', 'device', 'timestamps', 'camera'];
  if (allGroups.every(g => groupsToRemove.has(g))) {
    return stripAllExif(buffer);
  }

  const bytes = new Uint8Array(buffer);
  const view  = new DataView(buffer);

  // Locate EXIF APP1
  let app1Off = -1;
  let off = 2;
  while (off + 3 < bytes.length) {
    if (bytes[off] !== 0xFF) break;
    const marker = (bytes[off] << 8) | bytes[off + 1];
    if (marker === 0xFFD9) break;
    if (marker >= 0xFFD0 && marker <= 0xFFD8) { off += 2; continue; }
    const segLen = view.getUint16(off + 2);
    if (marker === 0xFFE1 && segLen >= 8 &&
        bytes[off + 4] === 0x45 && bytes[off + 5] === 0x78 &&
        bytes[off + 6] === 0x69 && bytes[off + 7] === 0x66 &&
        bytes[off + 8] === 0x00 && bytes[off + 9] === 0x00) {
      app1Off = off;
      break;
    }
    off += 2 + segLen;
  }

  if (app1Off === -1) return new Blob([buffer], { type: 'image/jpeg' });

  const app1SegLen = view.getUint16(app1Off + 2);
  const tiffStart  = app1Off + 4 + 6; // marker(2) + len(2) + "Exif\0\0"(6)
  const bom = view.getUint16(tiffStart);
  const le  = bom === 0x4949;

  const ifd0Rel = le
    ? view.getUint32(tiffStart + 4, true)
    : view.getUint32(tiffStart + 4, false);
  const ifd0Abs = tiffStart + ifd0Rel;

  // Read IFD0
  const ifd0Count = le
    ? view.getUint16(ifd0Abs, true)
    : view.getUint16(ifd0Abs, false);

  const ifd0Raw = [];
  let exifIfdRel = -1, gpsIfdRel = -1;

  for (let i = 0; i < ifd0Count; i++) {
    const eOff  = ifd0Abs + 2 + i * 12;
    const tagId = le ? view.getUint16(eOff,     true) : view.getUint16(eOff,     false);
    const type  = le ? view.getUint16(eOff + 2, true) : view.getUint16(eOff + 2, false);
    const count = le ? view.getUint32(eOff + 4, true) : view.getUint32(eOff + 4, false);
    const vfo   = eOff + 8;

    if (tagId === 0x8769) {
      exifIfdRel = le ? view.getUint32(vfo, true) : view.getUint32(vfo, false);
    } else if (tagId === 0x8825) {
      gpsIfdRel  = le ? view.getUint32(vfo, true) : view.getUint32(vfo, false);
    }

    ifd0Raw.push({ tagId, type, count, valueBytes: readEntryValueBytes(view, type, count, vfo, le, tiffStart) });
  }

  // Read ExifIFD
  let exifRaw = [];
  if (exifIfdRel !== -1) {
    const exifAbs   = tiffStart + exifIfdRel;
    const exifCount = le ? view.getUint16(exifAbs, true) : view.getUint16(exifAbs, false);
    for (let i = 0; i < exifCount; i++) {
      const eOff  = exifAbs + 2 + i * 12;
      const tagId = le ? view.getUint16(eOff,     true) : view.getUint16(eOff,     false);
      const type  = le ? view.getUint16(eOff + 2, true) : view.getUint16(eOff + 2, false);
      const count = le ? view.getUint32(eOff + 4, true) : view.getUint32(eOff + 4, false);
      const vfo   = eOff + 8;
      exifRaw.push({ tagId, type, count, valueBytes: readEntryValueBytes(view, type, count, vfo, le, tiffStart) });
    }
  }

  // Read GPS IFD
  let gpsRaw = [];
  if (gpsIfdRel !== -1) {
    const gpsAbs   = tiffStart + gpsIfdRel;
    const gpsCount = le ? view.getUint16(gpsAbs, true) : view.getUint16(gpsAbs, false);
    for (let i = 0; i < gpsCount; i++) {
      const eOff  = gpsAbs + 2 + i * 12;
      const tagId = le ? view.getUint16(eOff,     true) : view.getUint16(eOff,     false);
      const type  = le ? view.getUint16(eOff + 2, true) : view.getUint16(eOff + 2, false);
      const count = le ? view.getUint32(eOff + 4, true) : view.getUint32(eOff + 4, false);
      const vfo   = eOff + 8;
      gpsRaw.push({ tagId, type, count, valueBytes: readEntryValueBytes(view, type, count, vfo, le, tiffStart) });
    }
  }

  // Filter entries
  const shouldRemove = tagId => {
    const info = EXIF_TAGS[tagId];
    return info && info.group !== null && groupsToRemove.has(info.group);
  };

  let filteredIfd0 = ifd0Raw.filter(e => {
    if (e.tagId === 0x8769) return exifRaw.length > 0;
    if (e.tagId === 0x8825) return !groupsToRemove.has('location') && gpsRaw.length > 0;
    return !shouldRemove(e.tagId);
  });

  const filteredExif = exifRaw.filter(e => !shouldRemove(e.tagId));
  const filteredGps  = groupsToRemove.has('location') ? [] : gpsRaw.filter(e => !shouldRemove(e.tagId));

  if (filteredExif.length === 0) filteredIfd0 = filteredIfd0.filter(e => e.tagId !== 0x8769);
  if (filteredGps.length  === 0) filteredIfd0 = filteredIfd0.filter(e => e.tagId !== 0x8825);

  // Rebuild TIFF
  const newTiff = buildTiff(filteredIfd0, filteredExif, filteredGps, le);

  // Rebuild APP1: marker(2) + len(2) + "Exif\0\0"(6) + TIFF
  const app1DataLen = 2 + 6 + newTiff.length; // len field includes itself
  const newApp1 = new Uint8Array(2 + app1DataLen);
  newApp1[0] = 0xFF; newApp1[1] = 0xE1;
  newApp1[2] = (app1DataLen >> 8) & 0xFF;
  newApp1[3] =  app1DataLen       & 0xFF;
  newApp1[4] = 0x45; newApp1[5] = 0x78; newApp1[6] = 0x69; // "Exi"
  newApp1[7] = 0x66; newApp1[8] = 0x00; newApp1[9] = 0x00; // "f\0\0"
  newApp1.set(newTiff, 10);

  // Stitch JPEG: [before app1] + [new app1] + [after original app1]
  const app1TotalLen = 2 + app1SegLen;
  const before = bytes.slice(0, app1Off);
  const after  = bytes.slice(app1Off + app1TotalLen);

  const out = new Uint8Array(before.length + newApp1.length + after.length);
  out.set(before, 0);
  out.set(newApp1, before.length);
  out.set(after, before.length + newApp1.length);

  return new Blob([out], { type: 'image/jpeg' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Download Utility
// ─────────────────────────────────────────────────────────────────────────────

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function strippedFilename(original, suffix = 'no-exif') {
  const dot = original.lastIndexOf('.');
  if (dot === -1) return `${original}-${suffix}`;
  return `${original.slice(0, dot)}-${suffix}${original.slice(dot)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM References
// ─────────────────────────────────────────────────────────────────────────────

const dropZone        = document.getElementById('drop-zone');
const fileInput       = document.getElementById('file-input');
const formatError     = document.getElementById('format-error');
const workspace       = document.getElementById('workspace');
const batchFiles      = document.getElementById('batch-files');
const fileList        = document.getElementById('file-list');
const gpsWarning      = document.getElementById('gps-warning');
const gpsMapLink      = document.getElementById('gps-map-link');
const removeGpsBtn    = document.getElementById('remove-gps-btn');
const metadataSection = document.getElementById('metadata-section');
const noExifMsg       = document.getElementById('no-exif-msg');
const exifTable       = document.getElementById('exif-table');
const exifTableBody   = document.getElementById('exif-tbody');
const groupSection    = document.getElementById('group-section');
const groupAll        = document.getElementById('group-all');
const groupLocation   = document.getElementById('group-location');
const groupDevice     = document.getElementById('group-device');
const groupTimestamps = document.getElementById('group-timestamps');
const groupCamera     = document.getElementById('group-camera');
const stripAllBtn     = document.getElementById('strip-all-btn');
const stripSelectedBtn = document.getElementById('strip-selected-btn');
const stripZipBtn     = document.getElementById('strip-all-zip-btn');
const resetBtn        = document.getElementById('reset-btn');
const batchProgress   = document.getElementById('batch-progress');
const batchProgressTxt = document.getElementById('batch-progress-text');

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

function renderMetadataTable(parsed) {
  exifTableBody.innerHTML = '';

  if (!parsed || Object.keys(parsed.exifMap).length === 0) {
    noExifMsg.hidden = false;
    exifTable.hidden = true;
    gpsWarning.hidden = true;
    return;
  }

  noExifMsg.hidden = true;
  exifTable.hidden = false;

  // Sort: location first, then by label
  const sorted = Object.entries(parsed.exifMap).sort(([, a], [, b]) => {
    if (a.group === 'location' && b.group !== 'location') return -1;
    if (b.group === 'location' && a.group !== 'location') return  1;
    return a.label.localeCompare(b.label);
  });

  for (const [tagIdStr, tag] of sorted) {
    const tr = document.createElement('tr');

    const tdLabel = document.createElement('td');
    tdLabel.textContent = tag.label;
    tr.appendChild(tdLabel);

    const tdValue = document.createElement('td');
    const tagId   = Number(tagIdStr);
    if (tag.group === 'location' && (tagId === 0x0002 || tagId === 0x0004) &&
        parsed.gpsData?.mapsUrl) {
      const a = document.createElement('a');
      a.href = parsed.gpsData.mapsUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = tag.humanValue;
      tdValue.appendChild(a);
    } else {
      tdValue.textContent = tag.humanValue;
    }
    tr.appendChild(tdValue);

    const tdGroup = document.createElement('td');
    const badge   = document.createElement('span');
    badge.className = `group-badge group-${tag.group || 'other'}`;
    badge.textContent = tag.group || 'other';
    tdGroup.appendChild(badge);
    tr.appendChild(tdGroup);

    exifTableBody.appendChild(tr);
  }

  // GPS warning
  const hasGps = sorted.some(([, t]) => t.group === 'location');
  gpsWarning.hidden = !hasGps;
  if (hasGps && parsed.gpsData) {
    gpsMapLink.href = parsed.gpsData.mapsUrl;
    gpsMapLink.textContent = `${parsed.gpsData.lat.toFixed(6)}, ${parsed.gpsData.lng.toFixed(6)}`;
  }
}

function renderFileList() {
  fileList.innerHTML = '';

  state.files.forEach((entry, idx) => {
    const li = document.createElement('li');
    li.className = `file-item${entry.status === 'error' ? ' status-error' : ''}`;
    li.dataset.index = idx;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'file-name';
    nameSpan.textContent = entry.file.name;
    li.appendChild(nameSpan);

    if (entry.hasGps) {
      const gBadge = document.createElement('span');
      gBadge.className = 'gps-badge';
      gBadge.textContent = '📍 GPS';
      li.appendChild(gBadge);
    }

    const countSpan = document.createElement('span');
    countSpan.className = 'tag-count';
    countSpan.textContent = entry.tagCount > 0 ? `${entry.tagCount} tags` : 'No EXIF';
    li.appendChild(countSpan);

    if (entry.status === 'stripped') {
      const st = document.createElement('span');
      st.className = 'file-status';
      st.textContent = '✓';
      li.appendChild(st);
    } else if (entry.status === 'error') {
      const st = document.createElement('span');
      st.className = 'file-status';
      st.style.color = 'var(--danger)';
      st.textContent = '✗';
      li.appendChild(st);
    }

    li.addEventListener('click', () => {
      document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
      li.classList.add('active');
      if (entry.parsed) {
        renderMetadataTable(entry.parsed);
      } else {
        noExifMsg.hidden = false;
        exifTable.hidden = true;
        gpsWarning.hidden = true;
        noExifMsg.textContent = entry.file.type === 'image/png'
          ? 'PNG file — metadata will be stripped via re-encode on download.'
          : 'No EXIF metadata detected in this file.';
      }
    });

    fileList.appendChild(li);
  });
}

function updateUI() {
  const count = state.files.length;

  if (count === 0) {
    workspace.hidden = true;
    dropZone.classList.remove('has-file');
    return;
  }

  workspace.hidden = false;
  dropZone.classList.add('has-file');

  batchFiles.hidden = count <= 1;
  groupSection.hidden = false;
  metadataSection.hidden = false;

  // Show relevant action buttons
  stripAllBtn.hidden      = count !== 1;
  stripSelectedBtn.hidden = count !== 1;
  stripZipBtn.hidden      = count <= 1;

  if (count > 1) renderFileList();
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleFileSelect(filesList) {
  formatError.hidden = true;
  noExifMsg.hidden   = true;
  exifTable.hidden   = true;
  gpsWarning.hidden  = true;
  exifTableBody.innerHTML = '';

  const files = Array.from(filesList).slice(0, 10);
  if (files.length === 0) return;

  state.files = [];
  state.mode  = files.length === 1 ? 'single' : 'batch';

  for (const file of files) {
    const entry = { file, buffer: null, parsed: null, hasGps: false, tagCount: 0, status: 'pending' };

    try {
      const { buffer } = await loadFile(file);
      entry.buffer = buffer;

      if (isJpeg(buffer)) {
        const parsed = parseExif(buffer);
        entry.parsed   = parsed;
        entry.hasGps   = parsed?.hasGps ?? false;
        entry.tagCount = parsed ? Object.keys(parsed.exifMap).length : 0;
      } else if (isPng(buffer)) {
        // PNG: no EXIF parse; stripping via Canvas
      } else {
        entry.status = 'error';
        if (files.length === 1) {
          formatError.hidden = false;
          formatError.textContent = `"${file.name}" is not a supported format. Please use JPEG or PNG.`;
        }
      }
    } catch (_) {
      entry.status = 'error';
    }

    state.files.push(entry);
  }

  updateUI();

  if (state.mode === 'single') {
    const entry = state.files[0];
    if (entry?.buffer) {
      if (isJpeg(entry.buffer) && entry.parsed) {
        renderMetadataTable(entry.parsed);
      } else if (isPng(entry.buffer)) {
        noExifMsg.hidden = false;
        exifTable.hidden = true;
        gpsWarning.hidden = true;
        noExifMsg.textContent = 'PNG file loaded. Hidden metadata will be removed when you download.';
      }
    }
  } else {
    // Batch: click first file to show its metadata
    const firstLi = fileList.querySelector('.file-item');
    if (firstLi) firstLi.click();
  }
}

async function handleStripAll() {
  const entry = state.files[0];
  if (!entry?.buffer) return;

  stripAllBtn.disabled = true;
  stripAllBtn.textContent = 'Stripping…';

  try {
    let blob;
    if (isJpeg(entry.buffer)) blob = stripAllExif(entry.buffer);
    else                       blob = await stripPng(entry.file);
    downloadBlob(blob, strippedFilename(entry.file.name));
  } finally {
    stripAllBtn.disabled = false;
    stripAllBtn.textContent = 'Strip All & Download';
  }
}

async function handleStripSelected() {
  const entry = state.files[0];
  if (!entry?.buffer) return;

  if (state.selectedGroups.size === 0) {
    showToast('Select at least one group to strip.');
    return;
  }

  stripSelectedBtn.disabled = true;
  stripSelectedBtn.textContent = 'Stripping…';

  try {
    let blob;
    if (isJpeg(entry.buffer)) {
      blob = stripSelectiveExif(entry.buffer, state.selectedGroups);
    } else {
      blob = await stripPng(entry.file); // PNG always strips everything
    }
    downloadBlob(blob, strippedFilename(entry.file.name, 'stripped'));
  } finally {
    stripSelectedBtn.disabled = false;
    stripSelectedBtn.textContent = 'Strip Selected & Download';
  }
}

async function handleBatchStrip() {
  if (state.files.length === 0) return;

  stripZipBtn.disabled = true;
  batchProgress.hidden = false;

  const zip = new JSZip(); // eslint-disable-line no-undef

  for (let i = 0; i < state.files.length; i++) {
    const entry = state.files[i];
    batchProgressTxt.textContent = `Processing ${i + 1} / ${state.files.length}: ${entry.file.name}…`;

    if (entry.status === 'error' || !entry.buffer) continue;

    try {
      let blob;
      if      (isJpeg(entry.buffer)) blob = stripAllExif(entry.buffer);
      else if (isPng(entry.buffer))  blob = await stripPng(entry.file);
      else continue;

      zip.file(entry.file.name, blob);
      state.files[i].status = 'stripped';
    } catch (_) {
      state.files[i].status = 'error';
    }

    renderFileList();
  }

  batchProgressTxt.textContent = 'Creating ZIP archive…';

  try {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, 'exif-stripped.zip');
  } catch (e) {
    console.error('ZIP generation failed:', e);
    showToast('ZIP creation failed. Try downloading files individually.');
  }

  batchProgress.hidden = true;
  stripZipBtn.disabled = false;
}

function handleReset() {
  state.files = [];
  state.mode  = 'single';
  fileInput.value = '';
  workspace.hidden = true;
  dropZone.classList.remove('has-file');
  formatError.hidden = true;
  exifTableBody.innerHTML = '';
  fileList.innerHTML = '';
  batchProgress.hidden = true;
  gpsWarning.hidden = true;
  noExifMsg.hidden = true;
  exifTable.hidden = true;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ─────────────────────────────────────────────────────────────────────────────
// Group Checkbox Logic
// ─────────────────────────────────────────────────────────────────────────────

function syncGroupState() {
  state.selectedGroups.clear();
  if (groupLocation.checked)  state.selectedGroups.add('location');
  if (groupDevice.checked)    state.selectedGroups.add('device');
  if (groupTimestamps.checked) state.selectedGroups.add('timestamps');
  if (groupCamera.checked)    state.selectedGroups.add('camera');

  const allChecked = state.selectedGroups.size === 4;
  groupAll.checked = allChecked;
  groupAll.indeterminate = !allChecked && state.selectedGroups.size > 0;
}

groupAll.addEventListener('change', () => {
  const checked = groupAll.checked;
  groupLocation.checked  = checked;
  groupDevice.checked    = checked;
  groupTimestamps.checked = checked;
  groupCamera.checked    = checked;
  if (checked) state.selectedGroups = new Set(['location', 'device', 'timestamps', 'camera']);
  else         state.selectedGroups.clear();
});

[groupLocation, groupDevice, groupTimestamps, groupCamera].forEach(cb => {
  cb.addEventListener('change', syncGroupState);
});

// ─────────────────────────────────────────────────────────────────────────────
// Event Wiring
// ─────────────────────────────────────────────────────────────────────────────

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFileSelect(e.dataTransfer.files);
});
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) handleFileSelect(fileInput.files);
});

stripAllBtn.addEventListener('click', handleStripAll);
stripSelectedBtn.addEventListener('click', handleStripSelected);
stripZipBtn.addEventListener('click', handleBatchStrip);
resetBtn.addEventListener('click', handleReset);

removeGpsBtn.addEventListener('click', () => {
  state.selectedGroups = new Set(['location']);
  groupAll.checked = false;
  groupAll.indeterminate = true;
  groupLocation.checked  = true;
  groupDevice.checked    = false;
  groupTimestamps.checked = false;
  groupCamera.checked    = false;
  handleStripSelected();
});
