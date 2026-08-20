import React, { useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import StorageService from "../storage/storageService";
import PhotoLightbox from "./PhotoLightbox";

/**
 * Compact 3×3 photo mosaic for the collapsed Photo Journal / Menu Snapshot
 * Gallery tile. Only image attachments are shown. Rendered as a strip so it
 * sits neatly under the collapsed row without ballooning the tile height.
 * Tapping a cell opens a full-screen Instagram-style lightbox with swipe +
 * double-tap zoom.
 *
 * Props:
 *  - attachments: full note.attachments array
 *  - isDark
 */
const isImage = (t) => (t || "").startsWith("image/");

export default function PhotoMosaic({ attachments = [], isDark = true }) {
  const allImages = (attachments || []).filter((a) => isImage(a.type));
  const images = allImages.slice(0, 9);
  const [urls, setUrls] = useState({});
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [slideshowStart, setSlideshowStart] = useState(false);

  // Long-press → slideshow (works on both touch and mouse).
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);
  const LONG_PRESS_MS = 550;
  const startPress = (i) => {
    longPressFired.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setSlideshowStart(true);
      setLightboxIdx(i);
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const handleTap = (i) => {
    if (longPressFired.current) { longPressFired.current = false; return; }
    setSlideshowStart(false);
    setLightboxIdx(i);
  };

  useEffect(() => {
    let cancelled = false;
    const toRevoke = [];
    (async () => {
      const map = {};
      for (const att of images) {
        const url = await StorageService.getAttachmentUrl(att.id);
        if (url) {
          map[att.id] = url;
          toRevoke.push(url);
        }
      }
      if (!cancelled) setUrls(map);
    })();
    return () => {
      cancelled = true;
      toRevoke.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments]);

  if (images.length === 0) {
    return (
      <div
        className={`mt-1 mx-3 mb-2 rounded-md flex items-center justify-center gap-1.5 py-3 border border-dashed text-[11px] ${
          isDark ? "border-white/10 text-slate-400" : "border-gray-300 text-gray-500"
        }`}
        data-testid="photo-mosaic-empty"
      >
        <ImageIcon className="w-3.5 h-3.5" />
        No photos yet — expand + tap 📎 to attach
      </div>
    );
  }

  const extra = allImages.length - images.length;

  return (
    <>
      <div
        className="grid grid-cols-3 gap-1 px-3 pb-2"
        data-testid="photo-mosaic"
        aria-label={`Photo Journal · ${images.length + extra} photos`}
      >
        {images.map((att, i) => {
          const isLast = i === images.length - 1 && extra > 0;
          return (
            <button
              key={att.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); handleTap(i); }}
              onTouchStart={(e) => { e.stopPropagation(); startPress(i); }}
              onTouchEnd={cancelPress}
              onTouchMove={cancelPress}
              onTouchCancel={cancelPress}
              onMouseDown={(e) => { e.stopPropagation(); startPress(i); }}
              onMouseUp={cancelPress}
              onMouseLeave={cancelPress}
              onContextMenu={(e) => e.preventDefault()}
              className={`relative aspect-square rounded-md overflow-hidden ${isDark ? "bg-black/40" : "bg-gray-100"} cursor-pointer border-0 p-0 select-none`}
              data-testid={`photo-mosaic-cell-${i}`}
              aria-label={`Open photo ${i + 1} — long-press for slideshow`}
              title="Tap to view · Long-press for slideshow"
            >
              {urls[att.id] ? (
                <img
                  src={urls[att.id]}
                  alt={att.name || "Attachment"}
                  className="w-full h-full object-cover pointer-events-none"
                  loading="lazy"
                  draggable={false}
                />
              ) : null}
              {isLast && (
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center text-white text-xs font-semibold">
                  +{extra}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <PhotoLightbox
        open={lightboxIdx !== null}
        images={allImages}
        initialIndex={lightboxIdx ?? 0}
        startInSlideshow={slideshowStart}
        onClose={() => { setLightboxIdx(null); setSlideshowStart(false); }}
      />
    </>
  );
}
