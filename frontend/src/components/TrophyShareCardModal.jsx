import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  CARD_W, CARD_H, roundRect, paintBackdrop, paintHeader, paintFooter, drawTrophy,
  downloadCanvasPng, shareCanvasPng,
} from "../utils/trophyCardCanvas";

/**
 * Trophy Share Card — turns a Freeze Streak Trophy into a downloadable
 * 1080×1920 (IG-story) PNG. Renders the card on a hidden <canvas> the
 * first time the modal opens, then previews the resized data URL on-screen.
 */
export default function TrophyShareCardModal({ open, onClose, year }) {
  const canvasRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !year) return;
    setBusy(true);
    setPreviewUrl(null);

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext("2d");

    paintBackdrop(ctx);
    paintHeader(ctx);
    drawTrophy(ctx, CARD_W / 2, CARD_H * 0.32, 220);

    // Year — huge, bold, gold
    const yearGrad = ctx.createLinearGradient(0, CARD_H * 0.5, 0, CARD_H * 0.62);
    yearGrad.addColorStop(0, "#fef3c7");
    yearGrad.addColorStop(0.5, "#fbbf24");
    yearGrad.addColorStop(1, "#b45309");
    ctx.fillStyle = yearGrad;
    ctx.font = "900 260px 'Georgia', 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(year), CARD_W / 2, CARD_H * 0.56);

    // Divider
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CARD_W * 0.2, CARD_H * 0.66);
    ctx.lineTo(CARD_W * 0.8, CARD_H * 0.66);
    ctx.stroke();

    ctx.fillStyle = "#fef3c7";
    ctx.font = "800 74px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("FREEZE STREAK TROPHY", CARD_W / 2, CARD_H * 0.72);

    ctx.fillStyle = "rgba(254, 243, 199, 0.85)";
    ctx.font = "400 40px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText("A full calendar year with zero freezes used.", CARD_W / 2, CARD_H * 0.78);

    // Stats badge
    const badgeY = CARD_H * 0.86;
    const badgeW = 640;
    const badgeH = 120;
    const badgeX = (CARD_W - badgeW) / 2;
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 24);
    ctx.fill();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
    ctx.lineWidth = 2;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 24);
    ctx.stroke();

    ctx.fillStyle = "#fbbf24";
    ctx.font = "800 60px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText("52 CLEAN WEEKS", CARD_W / 2, badgeY + badgeH / 2 - 6);
    ctx.fillStyle = "rgba(254, 243, 199, 0.7)";
    ctx.font = "500 26px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText("Consistency legend", CARD_W / 2, badgeY + badgeH - 24);

    paintFooter(ctx);

    canvas.toBlob(
      (b) => {
        if (b) setPreviewUrl(URL.createObjectURL(b));
        setBusy(false);
      },
      "image/png",
      0.95
    );
  }, [open, year]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const download = async () => {
    if (!canvasRef.current) return;
    await downloadCanvasPng(canvasRef.current, `iron-rabbit-trophy-${year}.png`);
    toast.success("Trophy card downloaded");
  };

  const share = async () => {
    if (!canvasRef.current) return;
    await shareCanvasPng(
      canvasRef.current,
      `iron-rabbit-trophy-${year}.png`,
      `Iron Rabbit — ${year} Freeze Streak Trophy`,
      `I finished ${year} with zero freezes used on Iron Rabbit. 🏆`
    );
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
              onClick={download}
              disabled={!previewUrl}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              data-testid="trophy-share-download"
            >
              <Download className="w-4 h-4 mr-1.5" /> Download
            </Button>
            <Button
              type="button"
              onClick={share}
              disabled={!previewUrl}
              variant="outline"
              className="flex-1 border-white/15 text-white hover:bg-white/5"
              data-testid="trophy-share-share"
            >
              <Share2 className="w-4 h-4 mr-1.5" /> Share
            </Button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" data-testid="trophy-share-card-canvas" />
      </DialogContent>
    </Dialog>
  );
}
