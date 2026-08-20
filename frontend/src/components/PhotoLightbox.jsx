import React, { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Play, Pause } from "lucide-react";
import StorageService from "../storage/storageService";

/**
 * Instagram-style full-screen lightbox for a set of image attachments.
 * - Prev / next arrows + swipe (touch + drag)
 * - Double-tap toggles 1× ↔ 2.5× zoom (centered on the tap)
 * - Zoom in/out buttons + Download
 * - ESC / ← / → / space keyboard nav (space toggles slideshow)
 * - Optional auto-advancing SLIDESHOW mode (great for wall-mounted tablets):
 *     pass `startInSlideshow` when opening, or tap the ▶ button
 *
 * Props:
 *  - open: boolean
 *  - images: [{ id, name, type }] — image attachments only
 *  - initialIndex: which image to open first
 *  - onClose: () => void
 *  - startInSlideshow: boolean (default false)
 */
export default function PhotoLightbox({ open, images = [], initialIndex = 0, onClose, startInSlideshow = false }) {
  const [idx, setIdx] = useState(initialIndex);
  const [urls, setUrls] = useState({});
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [slideshow, setSlideshow] = useState(false);
  const touchStart = useRef(null);
  const lastTapAt = useRef(0);
  const slideshowTimerRef = useRef(null);

  // Reset index + zoom + slideshow flag when the lightbox is (re-)opened
  useEffect(() => {
    if (open) {
      setIdx(initialIndex);
      setZoom(1);
      setOrigin({ x: 50, y: 50 });
      setSlideshow(!!startInSlideshow);
    } else {
      setSlideshow(false);
    }
  }, [open, initialIndex, startInSlideshow]);

  // Load blob URLs for all image attachments (once)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const toRevoke = [];
    (async () => {
      const map = {};
      for (const att of images) {
        const url = await StorageService.getAttachmentUrl(att.id);
        if (url) { map[att.id] = url; toRevoke.push(url); }
      }
      if (!cancelled) setUrls(map);
    })();
    return () => {
      cancelled = true;
      toRevoke.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [open, images]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      else if (e.key === "ArrowRight") setIdx((i) => Math.min(images.length - 1, i + 1));
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === " " || e.code === "Space") { e.preventDefault(); setSlideshow((s) => !s); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length, onClose]);

  // Slideshow auto-advance — every 3.5s, wrapping around at the end.
  useEffect(() => {
    if (!open || !slideshow || images.length < 2) {
      if (slideshowTimerRef.current) { clearInterval(slideshowTimerRef.current); slideshowTimerRef.current = null; }
      return;
    }
    slideshowTimerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % images.length);
      setZoom(1);
    }, 3500);
    return () => { if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current); };
  }, [open, slideshow, images.length]);

  if (!open || images.length === 0) return null;
  const current = images[idx];
  const currentUrl = current ? urls[current.id] : null;

  const goPrev = () => { setIdx((i) => Math.max(0, i - 1)); setZoom(1); };
  const goNext = () => { setIdx((i) => Math.min(images.length - 1, i + 1)); setZoom(1); };

  // Touch: swipe left/right when zoom === 1; ignore when zoomed to allow panning
  const onTouchStart = (e) => {
    if (zoom !== 1) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, at: Date.now() };
  };
  const onTouchEnd = (e) => {
    const start = touchStart.current;
    touchStart.current = null;
    // Double-tap detection
    const now = Date.now();
    if (now - lastTapAt.current < 350 && start && zoom === 1) {
      // Compute origin as percentage relative to the img rect
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((start.x - rect.left) / rect.width) * 100;
      const y = ((start.y - rect.top) / rect.height) * 100;
      setOrigin({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
      setZoom(2.5);
      lastTapAt.current = 0;
      return;
    }
    if (zoom > 1 && now - lastTapAt.current < 350) {
      setZoom(1);
      lastTapAt.current = 0;
      return;
    }
    lastTapAt.current = now;

    if (zoom !== 1 || !start) return;
    const dx = (e.changedTouches[0]?.clientX ?? start.x) - start.x;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goNext(); else goPrev();
    }
  };

  const download = async () => {
    if (!currentUrl) return;
    const a = document.createElement("a");
    a.href = currentUrl;
    a.download = current.name || `photo-${idx + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/95 flex flex-col"
      data-testid="photo-lightbox"
      role="dialog"
      aria-modal="true"
    >
      {/* Top bar */}
      <div className="flex items-center gap-2 p-3 text-white">
        <div className="text-sm font-medium truncate">{current?.name || `Photo ${idx + 1}`}</div>
        <div className="text-xs text-white/60 ml-2">{idx + 1} / {images.length}</div>
        {slideshow && <div className="text-[10px] text-amber-300 ml-1 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />Slideshow</div>}
        <div className="flex-1" />
        {images.length > 1 && (
          <button onClick={() => setSlideshow((s) => !s)} aria-label={slideshow ? "Pause slideshow" : "Play slideshow"}
                  className="p-2 rounded-md hover:bg-white/10" data-testid="photo-lightbox-slideshow-toggle">
            {slideshow ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        )}
        <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(2)))} aria-label="Zoom out"
                className="p-2 rounded-md hover:bg-white/10" data-testid="photo-lightbox-zoom-out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.5).toFixed(2)))} aria-label="Zoom in"
                className="p-2 rounded-md hover:bg-white/10" data-testid="photo-lightbox-zoom-in">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={download} aria-label="Download"
                className="p-2 rounded-md hover:bg-white/10" data-testid="photo-lightbox-download">
          <Download className="w-4 h-4" />
        </button>
        <button onClick={onClose} aria-label="Close"
                className="p-2 rounded-md hover:bg-white/10" data-testid="photo-lightbox-close">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 relative overflow-hidden">
        {currentUrl && (
          <img
            src={currentUrl}
            alt={current?.name || ""}
            className="absolute inset-0 w-full h-full object-contain select-none"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: `${origin.x}% ${origin.y}%`,
              transition: "transform 180ms ease-out",
              touchAction: zoom === 1 ? "pan-y" : "none",
            }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onDoubleClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (zoom === 1) {
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setOrigin({ x, y });
                setZoom(2.5);
              } else {
                setZoom(1);
              }
            }}
            draggable={false}
            data-testid="photo-lightbox-image"
          />
        )}
        {/* Prev / next chevrons */}
        {idx > 0 && (
          <button
            onClick={goPrev}
            aria-label="Previous"
            data-testid="photo-lightbox-prev"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {idx < images.length - 1 && (
          <button
            onClick={goNext}
            aria-label="Next"
            data-testid="photo-lightbox-next"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-1 overflow-x-auto p-2 bg-black/60" data-testid="photo-lightbox-strip">
          {images.map((att, i) => (
            <button
              key={att.id}
              onClick={() => { setIdx(i); setZoom(1); }}
              className={`w-14 h-14 rounded-md overflow-hidden flex-shrink-0 border-2 transition-colors ${i === idx ? "border-amber-400" : "border-transparent"}`}
              aria-label={`Photo ${i + 1}`}
              data-testid={`photo-lightbox-thumb-${i}`}
            >
              {urls[att.id] ? (
                <img src={urls[att.id]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/10" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
