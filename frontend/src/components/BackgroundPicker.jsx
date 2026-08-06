import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BACKGROUND_COLORS, BACKGROUND_GRADIENTS } from "../data/noteIcons";
import { Upload, X, Palette, Sparkles, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGE_BYTES = 800_000; // ~800KB — keep IndexedDB happy

export default function BackgroundPicker({ isOpen, onClose, value, onSelect, isDark = true }) {
  const [tab, setTab] = useState("color");
  const fileInputRef = useRef(null);

  // Custom color state (initialized from existing value if it's a solid color)
  const initialHex = value?.type === "color" && /^#([0-9a-f]{6})$/i.test(value.value) ? value.value : "#8b5cf6";
  const [customHex, setCustomHex] = useState(initialHex);

  // Custom gradient state (2-stop linear)
  const initialGrad = parseGradient(value?.type === "gradient" ? value.value : null);
  const [gradFrom, setGradFrom] = useState(initialGrad.from);
  const [gradTo, setGradTo]     = useState(initialGrad.to);
  const [gradAngle, setGradAngle] = useState(initialGrad.angle);
  const customGradientCss = `linear-gradient(${gradAngle}deg, ${gradFrom} 0%, ${gradTo} 100%)`;

  const pick = (bg) => {
    onSelect(bg);
    onClose();
  };

  const applyCustomColor = () => {
    const hex = normalizeHex(customHex);
    if (!hex) {
      toast.error("Please enter a valid hex (e.g. #ff5a5f)");
      return;
    }
    pick({ type: "color", value: hex });
  };

  const applyCustomGradient = () => {
    pick({ type: "gradient", value: customGradientCss });
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES * 6) {
      toast.error("Image too large. Please pick something under ~5MB.");
      return;
    }
    // Downscale to keep IndexedDB payload small
    const dataUrl = await downscaleImage(file, 800);
    pick({ type: "image", value: dataUrl });
    e.target.value = "";
  };

  const clearBackground = () => {
    onSelect(null);
    onClose();
  };

  const tabBtnCls = (t) =>
    `flex-1 h-9 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
      tab === t
        ? isDark ? "bg-white/10 text-white" : "bg-gray-200 text-gray-900"
        : isDark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-800"
    }`;

  const previewBg = getBackgroundStyle(value);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-lg ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`}
        data-testid="background-picker-dialog"
      >
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>Tile background</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Choose a color, gradient, or upload an image. Shown behind the icon on tiles.
          </DialogDescription>
        </DialogHeader>

        {/* Preview */}
        <div
          className="h-24 rounded-xl border border-white/10"
          style={previewBg}
          data-testid="background-preview"
        />

        {/* Tabs */}
        <div className={`flex rounded-lg overflow-hidden border ${isDark ? "border-white/10" : "border-gray-200"}`}>
          <button className={tabBtnCls("color")} onClick={() => setTab("color")} data-testid="bg-tab-color">
            <Palette className="w-3.5 h-3.5" /> Color
          </button>
          <button className={tabBtnCls("gradient")} onClick={() => setTab("gradient")} data-testid="bg-tab-gradient">
            <Sparkles className="w-3.5 h-3.5" /> Gradient
          </button>
          <button className={tabBtnCls("image")} onClick={() => setTab("image")} data-testid="bg-tab-image">
            <ImageIcon className="w-3.5 h-3.5" /> Image
          </button>
        </div>

        {/* Panels */}
        <div className="min-h-[160px] max-h-[46vh] overflow-y-auto pr-1 -mr-1">
          {tab === "color" && (
            <div className="space-y-3">
              <div className="grid grid-cols-6 gap-2">
                {BACKGROUND_COLORS.map(c => {
                  const active = value?.type === "color" && value?.value === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => pick({ type: "color", value: c.value })}
                      className={`aspect-square rounded-lg border-2 transition ${active ? "border-white ring-2 ring-indigo-500" : "border-transparent hover:border-white/40"}`}
                      style={{ background: c.value }}
                      title={c.name}
                      data-testid={`bg-color-${c.name}`}
                    />
                  );
                })}
              </div>

              {/* Custom color builder */}
              <div className={`rounded-lg border p-3 ${isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}
                   data-testid="bg-color-custom">
                <div className={`text-[11px] uppercase tracking-wide mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Custom color
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative flex-shrink-0" title="Open color wheel">
                    <input
                      type="color"
                      value={customHex}
                      onChange={(e) => setCustomHex(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      data-testid="bg-custom-color-wheel"
                    />
                    <span
                      className="block w-10 h-10 rounded-lg border-2 border-white/30 shadow-inner"
                      style={{ background: customHex }}
                    />
                  </label>
                  <input
                    type="text"
                    value={customHex}
                    onChange={(e) => setCustomHex(e.target.value)}
                    maxLength={7}
                    placeholder="#RRGGBB"
                    className={`flex-1 h-10 px-2 rounded-md border text-sm font-mono uppercase ${
                      isDark ? "bg-black/20 border-white/10 text-white placeholder:text-slate-600" : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                    }`}
                    data-testid="bg-custom-color-hex"
                  />
                  <Button
                    onClick={applyCustomColor}
                    size="sm"
                    className="h-10 bg-indigo-500 hover:bg-indigo-600 text-white"
                    data-testid="bg-custom-color-apply"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}
          {tab === "gradient" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BACKGROUND_GRADIENTS.map(g => {
                  const active = value?.type === "gradient" && value?.value === g.value;
                  return (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => pick({ type: "gradient", value: g.value })}
                      className={`h-16 rounded-lg border-2 transition text-white text-xs font-medium flex items-end justify-start p-2 ${active ? "border-white ring-2 ring-indigo-500" : "border-transparent hover:border-white/40"}`}
                      style={{ background: g.value, textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}
                      data-testid={`bg-gradient-${g.name.replace(/\s+/g, "-")}`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>

              {/* Custom gradient builder */}
              <div className={`rounded-lg border p-3 ${isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}
                   data-testid="bg-gradient-custom">
                <div className={`text-[11px] uppercase tracking-wide mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Custom gradient
                </div>
                <div
                  className="h-14 rounded-md border border-white/10 mb-3"
                  style={{ background: customGradientCss }}
                  data-testid="bg-custom-gradient-preview"
                />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <ColorField label="From" value={gradFrom} onChange={setGradFrom} isDark={isDark} testid="grad-from" />
                  <ColorField label="To"   value={gradTo}   onChange={setGradTo}   isDark={isDark} testid="grad-to" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[11px] w-14 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Angle</span>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={5}
                    value={gradAngle}
                    onChange={(e) => setGradAngle(Number(e.target.value))}
                    className="flex-1 accent-indigo-500"
                    data-testid="bg-custom-gradient-angle"
                  />
                  <span className={`text-xs w-10 text-right font-mono ${isDark ? "text-slate-300" : "text-gray-700"}`}>{gradAngle}°</span>
                </div>
                <Button
                  onClick={applyCustomGradient}
                  size="sm"
                  className="w-full h-9 bg-indigo-500 hover:bg-indigo-600 text-white"
                  data-testid="bg-custom-gradient-apply"
                >
                  Apply gradient
                </Button>
              </div>
            </div>
          )}
          {tab === "image" && (
            <div className="flex flex-col items-center justify-center gap-3 py-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
                data-testid="bg-image-input"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-500 hover:bg-indigo-600 text-white"
                data-testid="bg-image-upload"
              >
                <Upload className="w-4 h-4 mr-2" /> Upload image
              </Button>
              <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                Auto-resized to keep storage light. JPG/PNG/WebP, up to ~5MB.
              </p>
              {value?.type === "image" && (
                <img src={value.value} alt="current" className="max-h-24 rounded border border-white/10" />
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={clearBackground}
            className={`flex-1 h-9 ${isDark ? "border-white/10 text-slate-300" : ""}`}
            data-testid="bg-clear"
          >
            <X className="w-4 h-4 mr-1" /> Default
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className={`flex-1 h-9 ${isDark ? "border-white/10 text-slate-300" : ""}`}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Convert a background object into a CSS background style
export function getBackgroundStyle(bg) {
  if (!bg) {
    return { background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" };
  }
  if (bg.type === "image") {
    return {
      backgroundImage: `url(${bg.value})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return { background: bg.value };
}

// Small color-with-hex field for the custom gradient builder
function ColorField({ label, value, onChange, isDark, testid }) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative w-8 h-8 flex-shrink-0" title={`Pick ${label} color`}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          data-testid={`${testid}-wheel`}
        />
        <span
          className="block w-8 h-8 rounded-md border-2 border-white/30 shadow-inner"
          style={{ background: value }}
        />
      </label>
      <div className="flex-1 min-w-0">
        <div className={`text-[10px] uppercase tracking-wide ${isDark ? "text-slate-500" : "text-gray-400"}`}>{label}</div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className={`w-full h-7 px-1.5 rounded border text-xs font-mono uppercase ${
            isDark ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"
          }`}
          data-testid={`${testid}-hex`}
        />
      </div>
    </div>
  );
}

// Normalize a hex string to `#rrggbb`. Accepts `#rgb` shorthand and missing `#`.
function normalizeHex(input) {
  if (!input) return null;
  let s = String(input).trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.split("").map(c => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;
  return "#" + s.toLowerCase();
}

// Parse a "linear-gradient(<angle>deg, <c1> 0%, <c2> 100%)" string back into parts.
// Returns { from, to, angle } with reasonable defaults on failure.
function parseGradient(css) {
  const fallback = { from: "#8b5cf6", to: "#06b6d4", angle: 135 };
  if (!css || typeof css !== "string") return fallback;
  const m = css.match(/linear-gradient\(\s*(-?\d+)deg\s*,\s*(#[0-9a-f]{3,6})[^,]*,\s*(#[0-9a-f]{3,6})/i);
  if (!m) return fallback;
  const from = normalizeHex(m[2]) || fallback.from;
  const to = normalizeHex(m[3]) || fallback.to;
  const angle = Math.max(0, Math.min(360, parseInt(m[1], 10)));
  return { from, to, angle };
}

// Downscale image to a given max dimension and return dataURL (jpeg)
async function downscaleImage(file, maxSide = 800) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
    };
    reader.onerror = () => reject(reader.error);
    img.onload = () => {
      const { width, height } = img;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Unable to load image"));
    reader.readAsDataURL(file);
  });
}
