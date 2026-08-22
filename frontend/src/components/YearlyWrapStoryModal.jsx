import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import restaurantsService from "../storage/restaurantsService";
import {
  CARD_W, CARD_H, roundRect, paintBackdrop, paintHeader, paintFooter, drawTrophy,
  downloadCanvasPng, shareCanvasPng,
} from "../utils/trophyCardCanvas";

/**
 * Yearly Wrap Story — Spotify-Wrapped-style multi-slide recap of the user's
 * Restaurants Galore year. Six slides at 1080×1920 rendered on a hidden
 * canvas, previewed in a swipeable UI with Download + Share per slide.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - year: number — the year to summarise (defaults to previous calendar year)
 */
export default function YearlyWrapStoryModal({ open, onClose, year }) {
  const wrapYear = year || (new Date().getFullYear() - 1);
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const canvasRef = useRef(null);

  // Aggregate the year's stats once per open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setIdx(0);
      setData(null);
      setBusy(true);
      try {
        const [orders, restaurants] = await Promise.all([
          restaurantsService.listOrders().catch(() => []),
          restaurantsService.listRestaurants({ includeArchived: false, includeHidden: true }).catch(() => []),
        ]);
        const yStart = new Date(wrapYear, 0, 1).getTime();
        const yEnd = new Date(wrapYear + 1, 0, 1).getTime();
        const yearOrders = (orders || []).filter((o) => {
          const t = new Date(o.date || o.created_at || 0).getTime();
          return t >= yStart && t < yEnd;
        });
        const totalSpend = yearOrders.reduce((a, o) => a + (Number(o.total) || 0), 0);
        const orderCount = yearOrders.length;
        const restNameById = new Map((restaurants || []).map((r) => [r.id, r.name]));
        const byRest = new Map();
        for (const o of yearOrders) {
          const id = o.restaurant_id || "unknown";
          const name = restNameById.get(id) || o.restaurant || "Unknown";
          const row = byRest.get(id) || { name, visits: 0, spend: 0 };
          row.visits += 1;
          row.spend += Number(o.total) || 0;
          byRest.set(id, row);
        }
        const topRestaurants = Array.from(byRest.values())
          .sort((a, b) => b.visits - a.visits)
          .slice(0, 3);

        // Longest streak within the year — Monday-anchored weekly windows.
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const weekKey = (t) => {
          const d = new Date(t);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
          return d.getTime();
        };
        const weeksHit = new Set(yearOrders.map((o) => weekKey(o.date || o.created_at || 0)));
        let longestStreak = 0;
        let cur = 0;
        // Iterate every week of the year in order.
        const firstMonday = weekKey(yStart);
        for (let w = firstMonday; w < yEnd; w += weekMs) {
          if (weeksHit.has(w)) {
            cur += 1;
            if (cur > longestStreak) longestStreak = cur;
          } else {
            cur = 0;
          }
        }

        // Freeze ledger — freezes used that year.
        let freezesUsed = 0;
        try {
          const raw = localStorage.getItem("iron_rabbit_rg_freeze_ledger_v1");
          const led = raw ? JSON.parse(raw) : {};
          freezesUsed = Object.keys(led).filter((k) => k.startsWith(`${wrapYear}-`) && led[k]).length;
        } catch { /* noop */ }

        // Trophy earned?
        let trophyEarned = false;
        try {
          const raw = localStorage.getItem("iron_rabbit_rg_freeze_trophies_v1");
          const store = raw ? JSON.parse(raw) : {};
          trophyEarned = !!store[String(wrapYear)];
        } catch { /* noop */ }

        if (!cancelled) {
          setData({
            year: wrapYear,
            orderCount,
            totalSpend,
            topRestaurants,
            longestStreak,
            freezesUsed,
            trophyEarned,
          });
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, wrapYear]);

  const slides = useMemo(() => {
    if (!data) return [];
    return [
      { key: "cover", title: "Your year in food" },
      { key: "spend", title: "Total spend" },
      { key: "top", title: "Top restaurants" },
      { key: "streak", title: "Longest streak" },
      { key: "freezes", title: "Freeze inventory" },
      { key: "closing", title: "Cheers 🥂" },
    ];
  }, [data]);

  // Repaint the canvas whenever the active slide changes.
  useEffect(() => {
    if (!open || !data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext("2d");
    paintSlide(ctx, slides[idx]?.key, data);
    canvas.toBlob((b) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (b) setPreviewUrl(URL.createObjectURL(b));
    }, "image/png", 0.95);
  }, [open, data, idx, slides]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const download = async () => {
    if (!canvasRef.current || !data) return;
    await downloadCanvasPng(canvasRef.current, `iron-rabbit-wrap-${data.year}-${slides[idx].key}.png`);
    toast.success("Slide downloaded");
  };
  const share = async () => {
    if (!canvasRef.current || !data) return;
    await shareCanvasPng(
      canvasRef.current,
      `iron-rabbit-wrap-${data.year}-${slides[idx].key}.png`,
      `Iron Rabbit — ${data.year} Year Wrap`,
      `My ${data.year} in food, on Iron Rabbit.`
    );
  };
  const downloadAll = async () => {
    if (!canvasRef.current || !data) return;
    toast("Rendering all slides…", { duration: 1500 });
    for (let i = 0; i < slides.length; i++) {
      setIdx(i);
      // wait for repaint
      await new Promise((r) => setTimeout(r, 350));
      await downloadCanvasPng(canvasRef.current, `iron-rabbit-wrap-${data.year}-${slides[i].key}.png`);
    }
    toast.success("All slides downloaded");
  };

  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(slides.length - 1, i + 1));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0B1221] border-white/10" data-testid="yearly-wrap-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-200">
            🎁 Your {wrapYear} Wrap
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            A Spotify-Wrapped-style recap of your Restaurants Galore year. Swipe through the slides, then download or share.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col items-center gap-3">
          <div className="relative w-full max-w-[280px]">
            <div
              className="w-full rounded-xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center"
              style={{ aspectRatio: "9 / 16" }}
              data-testid="yearly-wrap-preview"
            >
              {(busy || !previewUrl) && (
                <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
              )}
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt={`Wrap slide ${idx + 1} of ${slides.length}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              )}
            </div>
            {slides.length > 1 && (
              <>
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={prev}
                    aria-label="Previous slide"
                    data-testid="yearly-wrap-prev"
                    className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                {idx < slides.length - 1 && (
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Next slide"
                    data-testid="yearly-wrap-next"
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mt-1">
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                data-testid={`yearly-wrap-dot-${i}`}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-amber-400" : "w-1.5 bg-white/25"}`}
              />
            ))}
          </div>

          <div className="flex gap-2 w-full">
            <Button
              type="button"
              onClick={download}
              disabled={!previewUrl}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              data-testid="yearly-wrap-download"
            >
              <Download className="w-4 h-4 mr-1.5" /> Slide
            </Button>
            <Button
              type="button"
              onClick={share}
              disabled={!previewUrl}
              variant="outline"
              className="flex-1 border-white/15 text-white hover:bg-white/5"
              data-testid="yearly-wrap-share"
            >
              <Share2 className="w-4 h-4 mr-1.5" /> Share
            </Button>
          </div>
          <Button
            type="button"
            onClick={downloadAll}
            disabled={!previewUrl}
            variant="ghost"
            className="w-full text-amber-200 hover:bg-amber-500/10"
            data-testid="yearly-wrap-download-all"
          >
            Download all {slides.length} slides
          </Button>
        </div>

        <canvas ref={canvasRef} className="hidden" data-testid="yearly-wrap-canvas" />
      </DialogContent>
    </Dialog>
  );
}

// ---- Slide painters ---------------------------------------------------

function paintSlide(ctx, key, d) {
  paintBackdrop(ctx);
  paintHeader(ctx, `IRON RABBIT · ${d.year} WRAP`);
  paintFooter(ctx);

  if (key === "cover") return paintCover(ctx, d);
  if (key === "spend") return paintSpend(ctx, d);
  if (key === "top") return paintTop(ctx, d);
  if (key === "streak") return paintStreak(ctx, d);
  if (key === "freezes") return paintFreezes(ctx, d);
  if (key === "closing") return paintClosing(ctx, d);
}

function bigYear(ctx, y, yPct = 0.42, size = 260) {
  const yg = ctx.createLinearGradient(0, CARD_H * yPct - 80, 0, CARD_H * yPct + 80);
  yg.addColorStop(0, "#fef3c7");
  yg.addColorStop(0.5, "#fbbf24");
  yg.addColorStop(1, "#b45309");
  ctx.fillStyle = yg;
  ctx.font = `900 ${size}px 'Georgia', 'Times New Roman', serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(y), CARD_W / 2, CARD_H * yPct);
}

function label(ctx, text, y, opts = {}) {
  const { size = 42, color = "rgba(254, 243, 199, 0.85)", weight = 500 } = opts;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, CARD_W / 2, y);
}

function divider(ctx, yPct = 0.66) {
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CARD_W * 0.2, CARD_H * yPct);
  ctx.lineTo(CARD_W * 0.8, CARD_H * yPct);
  ctx.stroke();
}

function paintCover(ctx, d) {
  drawTrophy(ctx, CARD_W / 2, CARD_H * 0.30, 220);
  bigYear(ctx, d.year, 0.52, 280);
  divider(ctx, 0.66);
  label(ctx, "YOUR YEAR IN FOOD", CARD_H * 0.72, { size: 74, weight: 800, color: "#fef3c7" });
  label(ctx, "A recap of what you tracked", CARD_H * 0.78, { size: 40 });
}

function paintSpend(ctx, d) {
  const spend = `$${d.totalSpend.toFixed(0)}`;
  label(ctx, "YOU SPENT", CARD_H * 0.30, { size: 52, weight: 800, color: "#fef3c7" });
  bigYear(ctx, spend, 0.46, 200);
  divider(ctx, 0.60);
  label(ctx, `across ${d.orderCount} order${d.orderCount === 1 ? "" : "s"}`, CARD_H * 0.68, { size: 44 });
  label(ctx, d.orderCount > 0 ? `avg $${(d.totalSpend / d.orderCount).toFixed(2)} per order` : " ", CARD_H * 0.74, { size: 36 });
}

function paintTop(ctx, d) {
  label(ctx, "TOP RESTAURANTS", CARD_H * 0.24, { size: 60, weight: 800, color: "#fef3c7" });
  divider(ctx, 0.30);
  const top = d.topRestaurants;
  if (!top || top.length === 0) {
    label(ctx, "No restaurants logged this year", CARD_H * 0.5, { size: 44 });
    return;
  }
  const rowY = [0.42, 0.56, 0.70];
  const medals = ["🥇", "🥈", "🥉"];
  for (let i = 0; i < 3; i++) {
    const r = top[i];
    if (!r) continue;
    // Card
    const cardW = 840, cardH = 170, cardX = (CARD_W - cardW) / 2, cardY = CARD_H * rowY[i] - cardH / 2;
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    roundRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fill();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.35)";
    ctx.lineWidth = 2;
    roundRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.stroke();

    // Medal
    ctx.fillStyle = "#fef3c7";
    ctx.font = "900 88px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(medals[i], cardX + 32, cardY + cardH / 2);

    // Name (truncate visually via measure)
    ctx.fillStyle = "#fbbf24";
    ctx.font = "800 46px system-ui, sans-serif";
    const maxW = cardW - 180;
    let name = r.name || "Unknown";
    if (ctx.measureText(name).width > maxW) {
      while (name.length > 3 && ctx.measureText(name + "…").width > maxW) name = name.slice(0, -1);
      name = name + "…";
    }
    ctx.fillText(name, cardX + 148, cardY + cardH / 2 - 18);

    ctx.fillStyle = "rgba(254, 243, 199, 0.7)";
    ctx.font = "500 32px system-ui, sans-serif";
    ctx.fillText(`${r.visits} visit${r.visits === 1 ? "" : "s"} · $${r.spend.toFixed(0)}`, cardX + 148, cardY + cardH / 2 + 28);
  }
}

function paintStreak(ctx, d) {
  label(ctx, "LONGEST STREAK", CARD_H * 0.28, { size: 60, weight: 800, color: "#fef3c7" });
  bigYear(ctx, d.longestStreak, 0.48, 300);
  label(ctx, d.longestStreak === 1 ? "week logged in a row" : "weeks logged in a row", CARD_H * 0.64, { size: 44 });
  divider(ctx, 0.72);
  const msg = d.longestStreak >= 26
    ? "Over half a year of consistency. Elite."
    : d.longestStreak >= 12
      ? "A whole quarter locked in — nice groove."
      : d.longestStreak >= 4
        ? "Building the habit — keep it going."
        : "Room to grow next year. Log one order a week.";
  label(ctx, msg, CARD_H * 0.80, { size: 34 });
}

function paintFreezes(ctx, d) {
  label(ctx, "FREEZE INVENTORY", CARD_H * 0.28, { size: 60, weight: 800, color: "#fef3c7" });
  bigYear(ctx, d.freezesUsed, 0.48, 300);
  label(ctx, d.freezesUsed === 1 ? "freeze auto-consumed" : "freezes auto-consumed", CARD_H * 0.64, { size: 44 });
  divider(ctx, 0.72);
  const msg = d.freezesUsed === 0
    ? "Zero freezes used — a legendary year. 🏆"
    : d.freezesUsed <= 3
      ? `Only ${d.freezesUsed} tiny slip${d.freezesUsed === 1 ? "" : "s"} — brilliant year.`
      : `${d.freezesUsed} months got auto-saved — the streak lived.`;
  label(ctx, msg, CARD_H * 0.80, { size: 34 });
}

function paintClosing(ctx, d) {
  if (d.trophyEarned) drawTrophy(ctx, CARD_W / 2, CARD_H * 0.30, 220);
  label(ctx, d.trophyEarned ? "TROPHY EARNED" : "SEE YOU NEXT YEAR", CARD_H * 0.5, { size: 64, weight: 800, color: "#fef3c7" });
  divider(ctx, 0.58);
  label(ctx, d.trophyEarned
    ? `A perfect ${d.year} — no freezes used.`
    : `Here's to more meals in ${d.year + 1}.`, CARD_H * 0.66, { size: 42 });
  label(ctx, "Made offline with Iron Rabbit", CARD_H * 0.74, { size: 32 });
}
