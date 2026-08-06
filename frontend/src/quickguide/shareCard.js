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

const SIZE = 1080;
const MARGIN = 80;

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
export async function renderCardToBlob({ heading, body, resourceId, guideTitle, appName = "Iron Rabbit" }) {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");

  // Gradient background — brand indigo → fuchsia
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, "#4338ca");
  grad.addColorStop(1, "#a21caf");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

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
export async function shareCardAsImage({ heading, body, resourceId, guideTitle }) {
  const blob = await renderCardToBlob({ heading, body, resourceId, guideTitle });
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
