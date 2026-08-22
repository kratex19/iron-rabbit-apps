// Shared canvas helpers for IG-story-style trophy + yearly wrap slides.
// Everything is deterministic and pure — no React, no side effects.
// Dimensions are always 1080×1920 (9:16) so slides feel native to social.
export const CARD_W = 1080;
export const CARD_H = 1920;

// Rounded-rect path builder — call ctx.fill()/stroke() after.
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Paints the shared gold→stone gradient background + grain + radial highlight.
export function paintBackdrop(ctx, W = CARD_W, H = CARD_H) {
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#78350f");
  bgGrad.addColorStop(0.55, "#b45309");
  bgGrad.addColorStop(1, "#1c1917");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const rad = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.75);
  rad.addColorStop(0, "rgba(253, 224, 71, 0.28)");
  rad.addColorStop(1, "rgba(253, 224, 71, 0)");
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = "#000";
  for (let i = 0; i < 2000; i++) {
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  ctx.restore();
}

// Top brand strip — same on every slide.
export function paintHeader(ctx, subtitle = "IRON RABBIT · RESTAURANTS GALORE") {
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "600 32px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(subtitle, CARD_W / 2, 120);
}

// Footer brand mark — same on every slide.
export function paintFooter(ctx, hint = "ironrabbitapps.com") {
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.font = "500 28px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(hint, CARD_W / 2, CARD_H - 90);
}

// Draws a stylised gold trophy (cup + handles + base) centred at (cx, cy).
// `size` is the total height in pixels.
export function drawTrophy(ctx, cx, cy, size) {
  const cupW = size * 0.9;
  const cupH = size * 0.75;
  const top = cy - size / 2;
  const goldGrad = ctx.createLinearGradient(cx, top, cx, top + cupH);
  goldGrad.addColorStop(0, "#fde68a");
  goldGrad.addColorStop(0.4, "#f59e0b");
  goldGrad.addColorStop(1, "#78350f");

  ctx.fillStyle = goldGrad;
  ctx.beginPath();
  ctx.moveTo(cx - cupW / 2, top);
  ctx.lineTo(cx + cupW / 2, top);
  ctx.lineTo(cx + cupW / 2 - size * 0.06, top + cupH * 0.75);
  ctx.quadraticCurveTo(cx, top + cupH * 1.1, cx - cupW / 2 + size * 0.06, top + cupH * 0.75);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = size * 0.08;
  ctx.beginPath();
  ctx.ellipse(cx - cupW / 2 - size * 0.05, top + cupH * 0.28, size * 0.13, size * 0.18, 0, Math.PI * 0.15, Math.PI * 1.85, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + cupW / 2 + size * 0.05, top + cupH * 0.28, size * 0.13, size * 0.18, 0, Math.PI * 1.15, Math.PI * 0.85, true);
  ctx.stroke();

  const stemW = size * 0.14;
  const stemH = size * 0.14;
  ctx.fillStyle = goldGrad;
  ctx.fillRect(cx - stemW / 2, top + cupH * 1.02, stemW, stemH);

  const baseW = size * 0.55;
  const baseH = size * 0.13;
  ctx.beginPath();
  ctx.moveTo(cx - baseW / 2, top + cupH + stemH);
  ctx.lineTo(cx + baseW / 2, top + cupH + stemH);
  ctx.lineTo(cx + baseW * 0.65, top + cupH + stemH + baseH);
  ctx.lineTo(cx - baseW * 0.65, top + cupH + stemH + baseH);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `800 ${size * 0.28}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★", cx, top + cupH * 0.42);
}

// A compact stat block with a big number + label. Returns nothing.
export function paintStat(ctx, cx, cy, big, small) {
  const yg = ctx.createLinearGradient(0, cy - 80, 0, cy + 80);
  yg.addColorStop(0, "#fef3c7");
  yg.addColorStop(0.5, "#fbbf24");
  yg.addColorStop(1, "#b45309");
  ctx.fillStyle = yg;
  ctx.font = "900 200px 'Georgia', 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(big), cx, cy);

  ctx.fillStyle = "rgba(254, 243, 199, 0.85)";
  ctx.font = "500 36px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(String(small), cx, cy + 140);
}

// Trigger a PNG download for a canvas.
export function downloadCanvasPng(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return resolve(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        resolve(true);
      },
      "image/png",
      0.95
    );
  });
}

// Web Share API helper — falls back to download when unsupported.
export async function shareCanvasPng(canvas, filename, title, text) {
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return resolve(false);
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title, text });
        } catch { /* user dismissed */ }
      } else {
        await downloadCanvasPng(canvas, filename);
      }
      resolve(true);
    }, "image/png", 0.95);
  });
}
