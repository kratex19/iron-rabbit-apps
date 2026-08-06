/**
 * Quick Guide card → shareable PNG.
 *
 * Renders a custom card to a 1080×1080 canvas (Instagram-friendly) with a
 * gradient background, Iron Rabbit brand mark, heading + body, then either:
 *   • Calls navigator.share() with the resulting Blob (mobile / installed PWA), OR
 *   • Falls back to a download of the PNG (desktop browsers)
 *
 * Kept dependency-free — pure Canvas API.
 */

import QRCode from "qrcode";

const SIZE = 1080;
const MARGIN = 80;
// Compact "iron-rabbit tip" payload the QR carries. Kept intentionally tiny —
// heading (max 60) + body (max 400) + resource id keeps QR density readable
// even by cheap camera scanners.
//
// The payload is DUAL-FORMAT: a human-readable block first (so a generic
// phone-camera scanner shows something intelligible), followed by a
// machine-readable marker `[IRTIP1:<url-safe-b64-json>]` that the in-app
// scanner detects to reconstruct the card fields exactly (heading/body/
// resource id/guide title).
const IRTIP_MARKER_RE = /\[IRTIP1:([A-Za-z0-9\-_]+=*)\]/;

function _b64UrlEncode(str) {
  // btoa handles latin-1 only — encode UTF-8 first so unicode headings survive.
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function _b64UrlDecode(s) {
  let b64 = String(s).replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeTipPayload({ heading, body, resourceId, guideTitle }) {
  const parts = [];
  if (guideTitle) parts.push(`Iron Rabbit · ${guideTitle}`);
  if (heading) parts.push(heading);
  if (body) parts.push(body);
  if (resourceId) parts.push(`(${resourceId})`);
  const human = parts.join("\n\n");
  // Encode the same fields into the marker so an app-side scan can
  // reconstruct them without regex-guessing the human block.
  const marker = "[IRTIP1:" + _b64UrlEncode(JSON.stringify({
    h: heading || "",
    b: body || "",
    r: resourceId || "",
    g: guideTitle || "",
  })) + "]";
  return human ? `${human}\n\n${marker}` : marker;
}

/**
 * Detect an Iron Rabbit tip QR payload. Returns the decoded fields when
 * the machine marker is present, otherwise null (caller should fall back
 * to their existing barcode handling).
 */
export function decodeTipPayload(raw) {
  if (!raw || typeof raw !== "string") return null;
  const m = raw.match(IRTIP_MARKER_RE);
  if (!m) return null;
  try {
    const obj = JSON.parse(_b64UrlDecode(m[1]));
    return {
      heading: String(obj.h || "").slice(0, 120),
      body: String(obj.b || "").slice(0, 800),
      resourceId: String(obj.r || "").slice(0, 20),
      guideTitle: String(obj.g || "").slice(0, 120),
    };
  } catch (e) {
    console.warn("[shareCard] failed to decode IRTIP payload:", e);
    return null;
  }
}

// Word-wrap `text` to fit inside `maxWidth`, returning an array of lines.
function wrapLines(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    const trial = current ? `${current} ${w}` : w;
    if (ctx.measureText(trial).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Draw the card image to an off-screen canvas and return a Blob. */
export async function renderCardToBlob({ heading, body, resourceId, guideTitle, theme, appName = "Iron Rabbit" }) {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");

  // Background: user-chosen theme (solid or 2-stop gradient) or the default brand gradient.
  if (theme && theme.value) {
    if (theme.type === "color") {
      ctx.fillStyle = theme.value;
      ctx.fillRect(0, 0, SIZE, SIZE);
    } else {
      // Parse "linear-gradient(<angle>deg, <c1> 0%, <c2> 100%)" back to a canvas gradient.
      const m = String(theme.value).match(/linear-gradient\(\s*(-?\d+)deg\s*,\s*(#[0-9a-f]{3,6})[^,]*,\s*(#[0-9a-f]{3,6})/i);
      if (m) {
        const angle = ((parseInt(m[1], 10) % 360) + 360) % 360;
        const rad = (angle - 90) * Math.PI / 180;
        const cx = SIZE / 2, cy = SIZE / 2;
        const half = SIZE / 2;
        const x1 = cx - Math.cos(rad) * half, y1 = cy - Math.sin(rad) * half;
        const x2 = cx + Math.cos(rad) * half, y2 = cy + Math.sin(rad) * half;
        const g = ctx.createLinearGradient(x1, y1, x2, y2);
        g.addColorStop(0, m[2]); g.addColorStop(1, m[3]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, SIZE, SIZE);
      } else {
        ctx.fillStyle = "#4338ca";
        ctx.fillRect(0, 0, SIZE, SIZE);
      }
    }
  } else {
    // Default brand indigo → fuchsia
    const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    grad.addColorStop(0, "#4338ca");
    grad.addColorStop(1, "#a21caf");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // Subtle grain — tiny random dots
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 200; i++) {
    ctx.fillRect(Math.random() * SIZE, Math.random() * SIZE, 2, 2);
  }
  ctx.globalAlpha = 1;

  // Header row — app name + guide title
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "600 26px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(appName.toUpperCase() + " · QUICK GUIDE", MARGIN, MARGIN);
  if (guideTitle) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "500 22px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(guideTitle, MARGIN, MARGIN + 40);
  }

  // Heading (big)
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 60px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  const headingLines = wrapLines(ctx, heading || "My tip", SIZE - MARGIN * 2);
  let y = 240;
  for (const line of headingLines.slice(0, 3)) {
    ctx.fillText(line, MARGIN, y);
    y += 74;
  }

  // Body
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "500 34px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  y += 30;
  const bodyLines = wrapLines(ctx, body || "", SIZE - MARGIN * 2);
  for (const line of bodyLines.slice(0, 10)) {
    ctx.fillText(line, MARGIN, y);
    y += 46;
  }

  // Footer — resource ID + "shared from"
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 22px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText(`${resourceId || ""}`, MARGIN, SIZE - MARGIN - 22);
  ctx.textAlign = "right";
  ctx.fillText("ironrabbitapps.com", SIZE - MARGIN, SIZE - MARGIN - 22);
  ctx.textAlign = "left";

  return new Promise(resolve => canvas.toBlob(resolve, "image/png", 0.92));
}

/**
 * Share the rendered card, preferring native share where available.
 * Returns a description of what happened for toast copy.
 */
export async function shareCardAsImage({ heading, body, resourceId, guideTitle, theme }) {
  const blob = await renderCardToBlob({ heading, body, resourceId, guideTitle, theme });
  if (!blob) throw new Error("Failed to render card image");

  const filename = `iron-rabbit-${(resourceId || "guide").toLowerCase()}-tip.png`;
  const file = new File([blob], filename, { type: "image/png" });

  // Prefer native share (mobile / PWA)
  if (navigator.share && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: heading || "Iron Rabbit tip",
        text: body || "",
      });
      return { kind: "shared" };
    } catch (err) {
      if (err && err.name === "AbortError") return { kind: "cancelled" };
      // Fall through to download
    }
  }

  // Fallback — trigger a download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { kind: "downloaded", filename };
}

/**
 * Render a QR-code card: the tip's payload as a QR embedded in a themed frame
 * so the whole thing is one recognisable brand card. Same payload semantics as
 * the plain text card — anyone can scan with any phone camera. Fully offline.
 */
export async function renderQrCardToBlob({ heading, body, resourceId, guideTitle, theme }) {
  const payload = encodeTipPayload({ heading, body, resourceId, guideTitle });

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");

  // Background — same rules as renderCardToBlob so themed cards match their PNG twin.
  if (theme && theme.value) {
    if (theme.type === "color") {
      ctx.fillStyle = theme.value;
      ctx.fillRect(0, 0, SIZE, SIZE);
    } else {
      const m = String(theme.value).match(/linear-gradient\(\s*(-?\d+)deg\s*,\s*(#[0-9a-f]{3,6})[^,]*,\s*(#[0-9a-f]{3,6})/i);
      if (m) {
        const angle = ((parseInt(m[1], 10) % 360) + 360) % 360;
        const rad = (angle - 90) * Math.PI / 180;
        const cx = SIZE / 2, cy = SIZE / 2;
        const half = SIZE / 2;
        const x1 = cx - Math.cos(rad) * half, y1 = cy - Math.sin(rad) * half;
        const x2 = cx + Math.cos(rad) * half, y2 = cy + Math.sin(rad) * half;
        const g = ctx.createLinearGradient(x1, y1, x2, y2);
        g.addColorStop(0, m[2]); g.addColorStop(1, m[3]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, SIZE, SIZE);
      } else {
        ctx.fillStyle = "#4338ca";
        ctx.fillRect(0, 0, SIZE, SIZE);
      }
    }
  } else {
    const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    grad.addColorStop(0, "#4338ca");
    grad.addColorStop(1, "#a21caf");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // Header
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "700 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("IRON RABBIT · SCAN ME", MARGIN, MARGIN);

  // Card title (heading only — body lives inside the QR)
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 56px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  const titleLines = wrapLines(ctx, heading || "My tip", SIZE - MARGIN * 2);
  let y = 160;
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, MARGIN, y);
    y += 64;
  }

  // QR block — draw onto a temp canvas, then paste centered on a white plate
  const qrSize = 720;
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: qrSize,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  const qrImg = new Image();
  await new Promise((res, rej) => { qrImg.onload = res; qrImg.onerror = rej; qrImg.src = qrDataUrl; });

  const plate = qrSize + 40;
  const plateX = (SIZE - plate) / 2;
  const plateY = SIZE - plate - MARGIN - 60;
  // White plate with rounded corners for scan-friendliness on any background.
  ctx.fillStyle = "#ffffff";
  const r = 24;
  ctx.beginPath();
  ctx.moveTo(plateX + r, plateY);
  ctx.arcTo(plateX + plate, plateY, plateX + plate, plateY + plate, r);
  ctx.arcTo(plateX + plate, plateY + plate, plateX, plateY + plate, r);
  ctx.arcTo(plateX, plateY + plate, plateX, plateY, r);
  ctx.arcTo(plateX, plateY, plateX + plate, plateY, r);
  ctx.closePath();
  ctx.fill();
  ctx.drawImage(qrImg, (SIZE - qrSize) / 2, plateY + 20, qrSize, qrSize);

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "500 22px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${resourceId || ""} · Scan with any camera app`, SIZE / 2, SIZE - MARGIN - 22);
  ctx.textAlign = "left";

  return new Promise(resolve => canvas.toBlob(resolve, "image/png", 0.92));
}

/** Share the QR card image, preferring native share. */
export async function shareCardAsQr({ heading, body, resourceId, guideTitle, theme }) {
  const blob = await renderQrCardToBlob({ heading, body, resourceId, guideTitle, theme });
  if (!blob) throw new Error("Failed to render QR card");

  const filename = `iron-rabbit-${(resourceId || "guide").toLowerCase()}-qr.png`;
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.share && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: heading || "Iron Rabbit tip", text: "Scan to read the tip." });
      return { kind: "shared" };
    } catch (err) {
      if (err && err.name === "AbortError") return { kind: "cancelled" };
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { kind: "downloaded", filename };
}
