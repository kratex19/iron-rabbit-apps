/**
 * WallShareDialog — social card generator for the Contributor Wall.
 *
 * Renders a preview of the "I'm on the Iron Rabbit wall" card in the
 * user's chosen aspect ratio (1200×630 landscape or 1080×1080 square),
 * then lets them download the PNG or invoke the native share sheet.
 * Falls back to download if navigator.share isn't available.
 */

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X, Download, Share2, AtSign, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const FORMATS = [
  { key: "landscape", label: "Landscape · 1200×630", w: 1200, h: 630 },
  { key: "square",    label: "Square · 1080×1080",   w: 1080, h: 1080 },
];

// Palette presets — tuned to feel distinct at a glance and print well.
// The `bg` triplet is the diagonal linear gradient, `glow` is the radial
// backlight behind the nickname, `nick` is the nickname gradient.
const THEMES = [
  {
    key: "mint",     label: "Mint",     preview: "linear-gradient(135deg,#10b981,#0284c7)",
    bg: ["#0B1221", "#0F172A", "#1E3A2F"],
    glow: ["rgba(16, 185, 129, 0.28)", "rgba(2, 132, 199, 0.16)"],
    nick: ["#34d399", "#0ea5e9"],
    ribbon: "#10b981",
  },
  {
    key: "rose",     label: "Rose",     preview: "linear-gradient(135deg,#f472b6,#ef4444)",
    bg: ["#1F0A17", "#2A0F1E", "#3B1520"],
    glow: ["rgba(244, 114, 182, 0.32)", "rgba(239, 68, 68, 0.16)"],
    nick: ["#f9a8d4", "#fca5a5"],
    ribbon: "#f472b6",
  },
  {
    key: "midnight", label: "Midnight", preview: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    bg: ["#0A0B1F", "#0F0F2A", "#1E1B4B"],
    glow: ["rgba(99, 102, 241, 0.30)", "rgba(139, 92, 246, 0.18)"],
    nick: ["#a5b4fc", "#c4b5fd"],
    ribbon: "#818cf8",
  },
  {
    key: "sunset",   label: "Sunset",   preview: "linear-gradient(135deg,#fb923c,#ec4899)",
    bg: ["#1F0F0A", "#2B140F", "#3B1D1E"],
    glow: ["rgba(251, 146, 60, 0.32)", "rgba(236, 72, 153, 0.16)"],
    nick: ["#fdba74", "#f9a8d4"],
    ribbon: "#fb923c",
  },
];

const THEME_STORAGE_KEY = "irr.wall_share_theme";

async function drawWallCard(canvas, contributor, format, theme) {
  const ctx = canvas.getContext("2d");
  canvas.width = format.w;
  canvas.height = format.h;
  // Background gradient (3-stop diagonal, drives the whole card's mood)
  const bg = ctx.createLinearGradient(0, 0, format.w, format.h);
  bg.addColorStop(0, theme.bg[0]);
  bg.addColorStop(0.6, theme.bg[1]);
  bg.addColorStop(1, theme.bg[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, format.w, format.h);

  // Radial glow behind the nickname
  const glow = ctx.createRadialGradient(format.w / 2, format.h * 0.42, 20, format.w / 2, format.h * 0.42, format.w * 0.55);
  glow.addColorStop(0, theme.glow[0]);
  glow.addColorStop(0.4, theme.glow[1]);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, format.w, format.h);

  const isSquare = format.key === "square";
  const padX = 80;
  const nickTop = isSquare ? format.h * 0.36 : format.h * 0.42;

  // Brand ribbon
  ctx.font = `700 ${isSquare ? 22 : 20}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = theme.ribbon;
  ctx.textAlign = "left";
  ctx.fillText("IRON RABBIT · COMMUNITY", padX, isSquare ? 92 : 78);

  // "I'm on the wall" small line
  ctx.font = `500 ${isSquare ? 26 : 24}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillStyle = "rgba(203, 213, 225, 0.85)";
  ctx.fillText("I'm on the Iron Rabbit wall", padX, isSquare ? 132 : 118);

  // Huge @nickname
  ctx.textAlign = "center";
  const nick = "@" + (contributor.nickname || "you");
  const nickSize = isSquare ? 140 : 132;
  let currSize = nickSize;
  ctx.font = `800 ${currSize}px -apple-system, sans-serif`;
  while (ctx.measureText(nick).width > format.w - padX * 2 && currSize > 60) {
    currSize -= 4;
    ctx.font = `800 ${currSize}px -apple-system, sans-serif`;
  }
  const gradient = ctx.createLinearGradient(0, nickTop - 60, 0, nickTop + 60);
  gradient.addColorStop(0, theme.nick[0]);
  gradient.addColorStop(1, theme.nick[1]);
  ctx.fillStyle = gradient;
  ctx.fillText(nick, format.w / 2, nickTop);

  // Tip count
  ctx.font = `600 ${isSquare ? 34 : 32}px -apple-system, sans-serif`;
  ctx.fillStyle = "#F1F5F9";
  const countText = `${contributor.tip_count || 0} ${(contributor.tip_count || 0) === 1 ? "tip promoted" : "tips promoted"}`;
  ctx.fillText(countText, format.w / 2, nickTop + (isSquare ? 90 : 72));

  if (contributor.latest_heading) {
    ctx.font = `italic 500 ${isSquare ? 28 : 24}px -apple-system, sans-serif`;
    ctx.fillStyle = "rgba(203, 213, 225, 0.85)";
    let text = `"${contributor.latest_heading}"`;
    while (ctx.measureText(text).width > format.w - padX * 2 && text.length > 20) {
      text = text.slice(0, -2) + '…"';
    }
    ctx.fillText(text, format.w / 2, nickTop + (isSquare ? 150 : 120));
  }

  // Footer tagline
  ctx.textAlign = "center";
  ctx.font = `500 ${isSquare ? 22 : 20}px -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
  ctx.fillText("ironrabbitapps.com · community-powered guide", format.w / 2, format.h - (isSquare ? 60 : 44));
}

function canvasToBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(b => resolve(b), "image/png", 0.95));
}

export default function WallShareDialog({ isOpen, contributor, onClose }) {
  const [format, setFormat] = useState(FORMATS[0]);
  const [theme, setTheme] = useState(() => {
    try {
      const key = localStorage.getItem(THEME_STORAGE_KEY);
      const found = THEMES.find(t => t.key === key);
      return found || THEMES[0];
    } catch (e) { return THEMES[0]; }
  });
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !contributor || !canvasRef.current) return;
    drawWallCard(canvasRef.current, contributor, format, theme);
  }, [isOpen, contributor, format, theme]);

  useEffect(() => {
    try { localStorage.setItem(THEME_STORAGE_KEY, theme.key); } catch (e) { /* quota */ }
  }, [theme]);

  if (!isOpen || !contributor) return null;

  const filename = `iron-rabbit-${contributor.nickname}-${format.key}.png`;

  const doDownload = async () => {
    setBusy(true);
    try {
      const blob = await canvasToBlob(canvasRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Downloaded — brag away!");
    } catch (e) {
      toast.error("Download failed");
    } finally { setBusy(false); }
  };

  const doShare = async () => {
    if (!navigator.share) { doDownload(); return; }
    setBusy(true);
    try {
      const blob = await canvasToBlob(canvasRef.current);
      const file = new File([blob], filename, { type: "image/png" });
      const caption = `I'm on the Iron Rabbit wall as @${contributor.nickname}! ${contributor.tip_count || 0} tips promoted so far.\nhttps://ironrabbitapps.com/contributors`;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
      } else {
        await navigator.share({ text: caption });
      }
    } catch (e) {
      if (e?.name !== "AbortError") toast.error("Share cancelled");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" data-testid="wall-share-dialog">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0F172A] border border-white/10 shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b border-white/10">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <div className="text-sm font-semibold text-white flex-1 flex items-center gap-1">
            Share <AtSign className="w-3 h-3 text-slate-500" /> {contributor.nickname}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {/* Theme picker — 4 mini swatches */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Palette</div>
            <div className="flex gap-2">
              {THEMES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`flex-1 h-11 rounded-md flex items-center justify-center text-[11px] font-medium transition-all relative overflow-hidden ${
                    theme.key === t.key ? "ring-2 ring-white ring-offset-2 ring-offset-[#0F172A]" : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ background: t.preview }}
                  data-testid={`wall-share-theme-${t.key}`}
                  title={t.label}
                >
                  <span className="text-white drop-shadow" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Format picker */}
          <div className="flex gap-2">
            {FORMATS.map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFormat(f)}
                className={`flex-1 h-9 rounded-md text-xs font-medium transition-colors ${
                  format.key === f.key
                    ? "bg-emerald-500 text-white"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
                data-testid={`wall-share-format-${f.key}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-white/10 bg-black/30 overflow-hidden flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto"
              style={{ maxHeight: 400 }}
              data-testid="wall-share-canvas"
            />
          </div>

          <div className="text-[11px] text-slate-500 text-center">
            Tip: Twitter/Bluesky/LinkedIn love the landscape format · Instagram/TikTok love square
          </div>
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-white/10">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-white/10 text-slate-300 hover:bg-white/5"
            disabled={busy}
          >
            Cancel
          </Button>
          <div className="flex-1" />
          <Button
            onClick={doDownload}
            disabled={busy}
            variant="outline"
            className="border-white/10 text-slate-300 hover:bg-white/5"
            data-testid="wall-share-download"
          >
            {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
            Download PNG
          </Button>
          <Button
            onClick={doShare}
            disabled={busy}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            data-testid="wall-share-share"
          >
            {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Share2 className="w-4 h-4 mr-1.5" />}
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
