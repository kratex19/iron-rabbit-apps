import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// A lightweight, accessible screenshot gallery with thumbnails and a lightbox.
export default function ScreenshotGallery({ screenshots = [], accent }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (screenshots.length === 0) return null;

  const prev = (e) => { e?.stopPropagation(); setActive(i => (i - 1 + screenshots.length) % screenshots.length); };
  const next = (e) => { e?.stopPropagation(); setActive(i => (i + 1) % screenshots.length); };

  return (
    <div className="gallery" data-testid="screenshot-gallery">
      <div className="gallery-main" onClick={() => setLightbox(true)} role="button" aria-label="Open screenshot lightbox">
        <img src={screenshots[active].src} alt={screenshots[active].caption} loading="eager" />
        {screenshots.length > 1 && (
          <>
            <button className="gallery-nav gallery-nav-prev" onClick={prev} aria-label="Previous">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="gallery-nav gallery-nav-next" onClick={next} aria-label="Next">
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      <p className="gallery-caption">{screenshots[active].caption}</p>

      {screenshots.length > 1 && (
        <div className="gallery-thumbs" role="tablist">
          {screenshots.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`gallery-thumb ${i === active ? "active" : ""}`}
              style={i === active ? { borderColor: accent } : {}}
              aria-label={`Screenshot ${i + 1}`}
              aria-current={i === active}
              data-testid={`gallery-thumb-${i}`}
            >
              <img src={s.src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="gallery-lightbox" onClick={() => setLightbox(false)} role="dialog" aria-label="Enlarged screenshot">
          <img src={screenshots[active].src} alt={screenshots[active].caption} onClick={e => e.stopPropagation()} />
          <button className="gallery-close" onClick={() => setLightbox(false)} aria-label="Close">✕</button>
          {screenshots.length > 1 && (
            <>
              <button className="gallery-nav gallery-nav-prev light" onClick={prev} aria-label="Previous">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button className="gallery-nav gallery-nav-next light" onClick={next} aria-label="Next">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
