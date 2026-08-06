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
