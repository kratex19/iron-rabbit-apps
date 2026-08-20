import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Trophy Share Card — turns a Freeze Streak Trophy into a downloadable
 * 1080×1920 (IG-story) PNG. Renders the card on a hidden <canvas> the
 * first time the modal opens, then previews the resized data URL on-screen.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - year: number (the trophy year, e.g. 2025)
 */
export default function TrophyShareCardModal({ open, onClose, year }) {
  const canvasRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [blob, setBlob] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !year) return;
    setBusy(true);
    setPreviewUrl(null);
    setBlob(null);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Background — deep amber gradient with a subtle vignette
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#78350f"); // amber-900
    bgGrad.addColorStop(0.55, "#b45309"); // amber-700
    bgGrad.addColorStop(1, "#1c1917"); // stone-900
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle radial highlight behind trophy
    const rad = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.75);
    rad.addColorStop(0, "rgba(253, 224, 71, 0.35)");
    rad.addColorStop(1, "rgba(253, 224, 71, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, W, H);

    // Grain / noise texture — sparse dots for a paper-print feel
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#000";
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();

    // Top brand strip
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = "600 32px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("IRON RABBIT · RESTAURANTS GALORE", W / 2, 120);

    // Trophy icon — gold cup drawn with vector paths, centered.
    drawTrophy(ctx, W / 2, H * 0.32, 220);

    // Year — huge, bold, gold
    const yearGrad = ctx.createLinearGradient(0, H * 0.5, 0, H * 0.62);
    yearGrad.addColorStop(0, "#fef3c7");
    yearGrad.addColorStop(0.5, "#fbbf24");
    yearGrad.addColorStop(1, "#b45309");
    ctx.fillStyle = yearGrad;
    ctx.font = "900 260px 'Georgia', 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(year), W / 2, H * 0.56);

    // Divider — thin gold line
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W * 0.2, H * 0.66);
    ctx.lineTo(W * 0.8, H * 0.66);
    ctx.stroke();

    // Title
    ctx.fillStyle = "#fef3c7";
    ctx.font = "800 74px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("FREEZE STREAK TROPHY", W / 2, H * 0.72);

    // Subtitle
    ctx.fillStyle = "rgba(254, 243, 199, 0.85)";
    ctx.font = "400 40px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("A full calendar year with zero freezes used.", W / 2, H * 0.78);

    // Stats badge — 52 weeks logged
    const badgeY = H * 0.86;
    const badgeW = 640;
    const badgeH = 120;
    const badgeX = (W - badgeW) / 2;
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 24);
    ctx.fill();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
    ctx.lineWidth = 2;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 24);
    ctx.stroke();

    ctx.fillStyle = "#fbbf24";
    ctx.font = "800 60px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("52 CLEAN WEEKS", W / 2, badgeY + badgeH / 2 - 6);
    ctx.fillStyle = "rgba(254, 243, 199, 0.7)";
    ctx.font = "500 26px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText("Consistency legend", W / 2, badgeY + badgeH - 24);

    // Footer brand mark
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.font = "500 28px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ironrabbitapps.com", W / 2, H - 90);

    canvas.toBlob(
      (b) => {
        if (b) {
          setBlob(b);
          const url = URL.createObjectURL(b);
          setPreviewUrl(url);
        }
        setBusy(false);
      },
      "image/png",
      0.95
    );

    return () => {
      // Preview URL cleaned up when previewUrl changes or modal closes
    };
  }, [open, year]);

  // Revoke preview URL on unmount / close
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const downloadCard = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iron-rabbit-trophy-${year}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast.success("Trophy card downloaded");
  };

  const shareCard = async () => {
    if (!blob) return;
    const file = new File([blob], `iron-rabbit-trophy-${year}.png`, { type: "image/png" });
    // navigator.canShare check keeps us safe on desktop browsers
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Iron Rabbit — ${year} Freeze Streak Trophy`,
          text: `I finished ${year} with zero freezes used on Iron Rabbit. 🏆`,
        });
      } catch (e) {
        // User dismissed share sheet — silent
      }
    } else {
      // Fallback: download when native share isn't available
      downloadCard();
      toast("Share not supported here — card downloaded instead.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0B1221] border-white/10" data-testid="trophy-share-card-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-200">
            🏆 Share your {year} trophy
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            A ready-to-post 1080×1920 IG-story card. Download it or share directly.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col items-center gap-3">
          <div
            className="w-full max-w-[280px] rounded-xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center"
            style={{ aspectRatio: "9 / 16" }}
            data-testid="trophy-share-card-preview"
          >
            {busy && !previewUrl && (
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            )}
            {previewUrl && (
              <img
                src={previewUrl}
                alt={`Freeze Streak Trophy ${year}`}
                className="w-full h-full object-cover"
                draggable={false}
              />
            )}
          </div>

          <div className="flex gap-2 w-full">
            <Button
              type="button"
              onClick={downloadCard}
              disabled={!blob}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              data-testid="trophy-share-download"
            >
              <Download className="w-4 h-4 mr-1.5" /> Download
            </Button>
            <Button
              type="button"
              onClick={shareCard}
              disabled={!blob}
              variant="outline"
              className="flex-1 border-white/15 text-white hover:bg-white/5"
              data-testid="trophy-share-share"
            >
              <Share2 className="w-4 h-4 mr-1.5" /> Share
            </Button>
          </div>
        </div>

        {/* Hidden canvas — the real 1080×1920 draw target */}
        <canvas ref={canvasRef} className="hidden" data-testid="trophy-share-card-canvas" />
      </DialogContent>
    </Dialog>
  );
}

// --- helpers ---------------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draws a stylised gold trophy (cup + handles + base) centred at (cx, cy).
// `size` is the total height in pixels.
function drawTrophy(ctx, cx, cy, size) {
  const cupW = size * 0.9;
  const cupH = size * 0.75;
  const top = cy - size / 2;
  const goldGrad = ctx.createLinearGradient(cx, top, cx, top + cupH);
  goldGrad.addColorStop(0, "#fde68a");
  goldGrad.addColorStop(0.4, "#f59e0b");
  goldGrad.addColorStop(1, "#78350f");

  // Cup body — rounded U shape
  ctx.fillStyle = goldGrad;
  ctx.beginPath();
  ctx.moveTo(cx - cupW / 2, top);
  ctx.lineTo(cx + cupW / 2, top);
  ctx.lineTo(cx + cupW / 2 - size * 0.06, top + cupH * 0.75);
  ctx.quadraticCurveTo(cx, top + cupH * 1.1, cx - cupW / 2 + size * 0.06, top + cupH * 0.75);
  ctx.closePath();
  ctx.fill();

  // Handles — left + right ellipses cut inside for handle look
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = size * 0.08;
  ctx.beginPath();
  ctx.ellipse(cx - cupW / 2 - size * 0.05, top + cupH * 0.28, size * 0.13, size * 0.18, 0, Math.PI * 0.15, Math.PI * 1.85, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + cupW / 2 + size * 0.05, top + cupH * 0.28, size * 0.13, size * 0.18, 0, Math.PI * 1.15, Math.PI * 0.85, true);
  ctx.stroke();

  // Stem
  const stemW = size * 0.14;
  const stemH = size * 0.14;
  ctx.fillStyle = goldGrad;
  ctx.fillRect(cx - stemW / 2, top + cupH * 1.02, stemW, stemH);

  // Base — trapezoid
  const baseW = size * 0.55;
  const baseH = size * 0.13;
  ctx.beginPath();
  ctx.moveTo(cx - baseW / 2, top + cupH + stemH);
  ctx.lineTo(cx + baseW / 2, top + cupH + stemH);
  ctx.lineTo(cx + baseW * 0.65, top + cupH + stemH + baseH);
  ctx.lineTo(cx - baseW * 0.65, top + cupH + stemH + baseH);
  ctx.closePath();
  ctx.fill();

  // "★" on cup face
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `800 ${size * 0.28}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★", cx, top + cupH * 0.42);
}
