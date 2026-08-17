// dHash (difference hash) — a compact 64-bit perceptual fingerprint
// used to detect near-identical photos regardless of small edits,
// resizes, or compression artifacts. Pure-JS, works offline, ~1ms per
// image on a modern phone.
//
// Algorithm:
//   1. Decode blob → offscreen canvas at 9×8 grayscale
//   2. For each row: bit = 1 if left pixel > right pixel, else 0
//   3. Concatenate → 64 bits, returned as an 16-char hex string
//
// Hamming distance ≤ 8 (out of 64 bits) typically means "very similar".

const CANVAS_W = 9;
const CANVAS_H = 8;

async function blobToBitmap(blob) {
  if ("createImageBitmap" in window) {
    return await createImageBitmap(blob);
  }
  // Fallback: HTMLImageElement
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

export async function dHashFromBlob(blob) {
  try {
    const bmp = await blobToBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0, CANVAS_W, CANVAS_H);
    const { data } = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);

    // Convert to grayscale (luma)
    const gray = new Uint8Array(CANVAS_W * CANVAS_H);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
    }

    // Compute 64 bits (8 rows × 8 comparisons)
    let hex = "";
    for (let y = 0; y < CANVAS_H; y++) {
      let byte = 0;
      for (let x = 0; x < CANVAS_H; x++) { // 8 comparisons per row
        const left  = gray[y * CANVAS_W + x];
        const right = gray[y * CANVAS_W + x + 1];
        if (left > right) byte |= 1 << (7 - x);
      }
      hex += byte.toString(16).padStart(2, "0");
    }
    if (bmp.close) bmp.close();
    return hex;
  } catch {
    return null;
  }
}

// Hamming distance between two 16-char hex hashes (64 bits).
export function hammingDistance(hexA, hexB) {
  if (!hexA || !hexB || hexA.length !== hexB.length) return 64;
  let d = 0;
  for (let i = 0; i < hexA.length; i += 2) {
    const a = parseInt(hexA.substr(i, 2), 16);
    const b = parseInt(hexB.substr(i, 2), 16);
    let xor = a ^ b;
    // Count set bits (Brian Kernighan)
    while (xor) { xor &= xor - 1; d++; }
  }
  return d;
}

/**
 * Group a list of { id, hash } entries by visual similarity using a
 * union-find over Hamming-distance edges. Threshold is expressed in
 * bits (out of 64) — a value of 8 catches most near-duplicates while
 * avoiding false positives on unrelated photos.
 *
 * Returns an array of arrays; each inner array contains ≥ 2 ids that
 * are visually similar. Singleton items are excluded.
 */
export function groupSimilar(entries, threshold = 8) {
  const items = entries.filter(e => e.hash);
  const parent = items.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (hammingDistance(items[i].hash, items[j].hash) <= threshold) {
        union(i, j);
      }
    }
  }

  const groups = new Map();
  for (let i = 0; i < items.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(items[i].id);
  }

  return [...groups.values()].filter(g => g.length >= 2);
}
