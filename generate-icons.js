#!/usr/bin/env node
// Generates PNG icons for the extension without any dependencies.
// Uses raw PNG encoding (uncompressed DEFLATE stored blocks).

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function createIcon(size) {
  const pixels = Buffer.alloc(size * size * 4); // RGBA

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= r) {
        // Inside circle - purple background
        // Anti-alias the edge
        const alpha = Math.min(1, r - dist + 0.5);
        pixels[idx] = 68;     // R
        pixels[idx + 1] = 68; // G
        pixels[idx + 2] = 170; // B
        pixels[idx + 3] = Math.round(alpha * 255); // A
      } else {
        pixels[idx + 3] = 0; // transparent
      }
    }
  }

  // Draw "?" character using a simple bitmap approach
  drawQuestionMark(pixels, size);

  return encodePNG(pixels, size, size);
}

function drawQuestionMark(pixels, size) {
  // Define "?" glyph as relative coordinates (0-1 range)
  // Simple vector-ish question mark
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const scale = s * 0.28;

  // Top arc of "?"
  for (let angle = -30; angle <= 180; angle += 2) {
    const rad = (angle * Math.PI) / 180;
    const ax = cx + Math.cos(rad) * scale * 0.55;
    const ay = cy - scale * 0.45 + Math.sin(rad) * scale * 0.45;
    fillCircle(pixels, s, ax, ay, Math.max(1, s * 0.075), 255, 255, 255, 255);
  }

  // Stem going down
  const stemLen = scale * 0.35;
  for (let t = 0; t <= 1; t += 0.05) {
    const sy = cy - scale * 0.0 + t * stemLen;
    fillCircle(pixels, s, cx, sy, Math.max(1, s * 0.075), 255, 255, 255, 255);
  }

  // Dot
  const dotY = cy + scale * 0.75;
  fillCircle(pixels, s, cx, dotY, Math.max(1, s * 0.09), 255, 255, 255, 255);
}

function fillCircle(pixels, size, cx, cy, radius, r, g, b, a) {
  const r2 = radius * radius;
  const minX = Math.max(0, Math.floor(cx - radius - 1));
  const maxX = Math.min(size - 1, Math.ceil(cx + radius + 1));
  const minY = Math.max(0, Math.floor(cy - radius - 1));
  const maxY = Math.min(size - 1, Math.ceil(cy + radius + 1));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) {
        const idx = (y * size + x) * 4;
        const alpha = Math.min(1, radius - Math.sqrt(d2) + 0.5);
        const srcA = a * alpha / 255;
        // Alpha composite over existing pixel
        const dstA = pixels[idx + 3] / 255;
        const outA = srcA + dstA * (1 - srcA);
        if (outA > 0) {
          pixels[idx] = Math.round((r * srcA + pixels[idx] * dstA * (1 - srcA)) / outA);
          pixels[idx + 1] = Math.round((g * srcA + pixels[idx + 1] * dstA * (1 - srcA)) / outA);
          pixels[idx + 2] = Math.round((b * srcA + pixels[idx + 2] * dstA * (1 - srcA)) / outA);
          pixels[idx + 3] = Math.round(outA * 255);
        }
      }
    }
  }
}

function encodePNG(pixels, width, height) {
  // Build raw image data with filter byte (0 = None) per row
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter: None
    pixels.copy(row, 1, y * width * 4, (y + 1) * width * 4);
    rawRows.push(row);
  }
  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);

  // PNG structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, "ascii");
    const crcData = Buffer.concat([typeB, data]);
    const crc = crc32(crcData);
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeB, data, crcB]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const chunks = [
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ];

  return Buffer.concat(chunks);
}

// CRC32 for PNG
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate all sizes
const iconsDir = path.join(__dirname, "icons");
[16, 48, 128].forEach((size) => {
  const png = createIcon(size);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Created ${outPath} (${png.length} bytes)`);
});
