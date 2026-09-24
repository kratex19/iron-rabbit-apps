// Featured Image — reusable presentation + edit control.
//
// A note may carry an optional `featured_image = { attachment_id }` pointer.
// The actual blob lives in the existing StorageService filesStore (same
// system that backs regular attachments), so backup/restore/offline
// persistence come for free. Blob lifecycle is handled here so callers
// don't have to think about orphans.
//
// Two variants:
//   • variant="hero"  — full-width banner shown inside FullScreenNote.
//                       Empty state renders a subtle "Add Featured Image"
//                       chip. When set, shows the image with hover controls.
//   • variant="chip"  — compact editor row shown inside NoteModal above
//                       "Photos & files". Always renders labelled buttons.
//
// The component NEVER mutates the note document directly — it calls
// onChange(newFeaturedImage) with either { attachment_id } or null and
// lets the host component persist that via saveNote / onSaveInline.

import React, { useState, useEffect, useRef } from "react";
import { Image as ImageIcon, Upload, Trash2, Loader2, Sparkle } from "lucide-react";
import StorageService from "../storage/storageService";
import { downscaleImage } from "../components/BackgroundPicker";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

const MAX_SIDE = 1200; // hero display area — bigger than ordinary attachments

export default function FeaturedImageBanner({
  featuredImage = null,           // { attachment_id } | null
  onChange,                       // (nextFeaturedImage | null) => void
  isDark = false,
  variant = "hero",               // "hero" | "chip"
  disabled = false,               // set true for new-notes-without-id if needed
}) {
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [starPulse, setStarPulse] = useState(false);
  const fileInputRef = useRef(null);
  const attachmentId = featuredImage?.attachment_id || null;

  // Resolve the featured image blob → object URL. Revoke on unmount / change.
  useEffect(() => {
    let cancelled = false;
    let revokeUrl = null;
    (async () => {
      if (!attachmentId) { setUrl(null); return; }
      const u = await StorageService.getAttachmentUrl(attachmentId);
      if (cancelled) { if (u) URL.revokeObjectURL(u); return; }
      revokeUrl = u;
      setUrl(u);
    })();
    return () => {
      cancelled = true;
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [attachmentId]);

  const openPicker = () => {
    if (disabled || busy) return;
    fileInputRef.current?.click();
  };

  const pulseStar = () => {
    setStarPulse(true);
    setTimeout(() => setStarPulse(false), 550);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so the same file can be re-picked
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      toast.error("Featured Image must be a picture (JPG / PNG / WebP)");
      return;
    }
    setBusy(true);
    try {
      // Downscale to keep IndexedDB footprint reasonable — hero has more room.
      const dataUrl = await downscaleImage(file, MAX_SIDE);
      const blob = await (await fetch(dataUrl)).blob();
      const compressed = new File([blob], file.name || "featured.jpg", { type: blob.type || "image/jpeg" });
      const meta = await StorageService.saveAttachment(compressed);
      // If the note already had a Featured Image, delete the previous blob
      // so replacement never leaves an orphan in filesStore.
      const oldId = attachmentId;
      onChange({ attachment_id: meta.id });
      if (oldId && oldId !== meta.id) {
        try { await StorageService.deleteAttachment(oldId); } catch { /* best-effort */ }
      }
      toast.success("Featured Image updated");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't set Featured Image");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!attachmentId || busy) return;
    setBusy(true);
    try {
      const oldId = attachmentId;
      onChange(null);
      try { await StorageService.deleteAttachment(oldId); } catch { /* best-effort */ }
      toast.success("Featured Image removed");
    } finally {
      setBusy(false);
    }
  };

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleFile}
      data-testid={`featured-image-file-input-${variant}`}
    />
  );

  // ------------------------------- STAR (header) --------------------------
  // Gold/orange ✳️ button matching the other header icons. Sits to the LEFT
  // of the existing header icon group. When no image exists, a tap opens
  // the picker directly (Add). When an image exists, the tap opens a small
  // menu with Change / Remove / Cancel. Every tap runs a brief scale + glow
  // pulse — a natural acknowledgment; no permanent size change, no header
  // layout shift.
  if (variant === "star") {
    const gold = isDark
      ? "text-yellow-500 hover:text-yellow-400 hover:bg-white/5"
      : "text-yellow-600 hover:text-yellow-500 hover:bg-yellow-50";
    const btnBase = "inline-flex items-center justify-center h-9 w-9 rounded-md transition-all duration-300 disabled:opacity-50";
    const pulseStyle = starPulse
      ? { transform: "scale(1.28)", filter: `drop-shadow(0 0 10px ${isDark ? "rgba(234,179,8,0.9)" : "rgba(217,119,6,0.85)"})` }
      : {};

    // No image → single button that opens picker directly.
    if (!attachmentId) {
      return (
        <>
          <button
            type="button"
            onClick={() => { pulseStar(); openPicker(); }}
            disabled={disabled || busy}
            className={`${btnBase} ${gold}`}
            style={pulseStyle}
            data-testid="featured-image-star-btn"
            aria-label="Add Featured Image"
            title="Featured Image"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkle className="w-4 h-4" strokeWidth={2.25} />}
          </button>
          {hiddenInput}
        </>
      );
    }
    // Image exists → menu with Change / Remove.
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={pulseStar}
              disabled={busy}
              className={`${btnBase} ${gold}`}
              style={pulseStyle}
              data-testid="featured-image-star-btn"
              aria-label="Featured Image options"
              title="Featured Image — Change or Remove"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkle className="w-4 h-4" strokeWidth={2.25} />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={isDark ? "bg-slate-900 border-white/10 text-slate-100" : ""}>
            <DropdownMenuItem onClick={openPicker} data-testid="featured-image-star-change">
              <Upload className="w-4 h-4 mr-2" /> Change Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRemove} data-testid="featured-image-star-remove" className={isDark ? "text-red-300 focus:text-red-200" : "text-red-600 focus:text-red-700"}>
              <Trash2 className="w-4 h-4 mr-2" /> Remove Image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {hiddenInput}
      </>
    );
  }

  // ------------------------------- HERO --------------------------------
  if (variant === "hero") {
    // Phase 3A: the ✳️ header star is the SOLE Featured Image control.
    // The hero variant becomes pure presentation — no Add chip when empty,
    // no Change/Remove hover controls when set. When no image exists we
    // render nothing so the writing area gets its full room back.
    if (!attachmentId) return null;

    // Smoked-glass container consistent with the Iron Rabbit visual
    // language. ~95 % of the available Expanded Text View width, centered.
    // Image fills that container at its natural aspect ratio — no crop,
    // no stretch, no forced height.
    const glass = isDark
      ? "bg-white/10 border-white/15 backdrop-blur-md"
      : "bg-white/60 border-gray-300/70 backdrop-blur-md";

    return (
      <div
        className={`relative w-[95%] mx-auto rounded-2xl overflow-hidden border ${glass}`}
        data-testid="featured-image-hero"
      >
        {url ? (
          <img
            src={url}
            alt="Featured"
            className="block w-full h-auto max-h-[70vh] object-contain"
            data-testid="featured-image-hero-img"
          />
        ) : (
          <div className="w-full h-32 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin opacity-60" />
          </div>
        )}
      </div>
    );
  }

  // ------------------------------- CHIP --------------------------------
  // Compact editor row for NoteModal. Sits above "Photos & files".
  return (
    <div className={`border-t pt-3 ${isDark ? "border-white/10" : "border-gray-200"}`} data-testid="featured-image-chip-row">
      <label className={`text-xs mb-2 flex items-center gap-1.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
        <ImageIcon className="w-3.5 h-3.5" /> Featured Image
        <span className={`text-[10px] ${isDark ? "text-slate-600" : "text-gray-400"}`}>
          · optional · one per note · shown at the top of the open note
        </span>
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        {attachmentId && url && (
          <img
            src={url}
            alt="Featured"
            className="w-14 h-14 rounded-lg object-cover border border-gray-300"
            data-testid="featured-image-chip-thumb"
          />
        )}
        {!attachmentId && (
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled || busy}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              isDark ? "bg-white/10 border-white/20 text-slate-100 hover:bg-white/15" : "bg-white border-gray-300 text-gray-800 hover:bg-gray-50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""} flex items-center gap-1.5`}
            data-testid="featured-image-add-chip"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />} Add
          </button>
        )}
        {attachmentId && (
          <>
            <button
              type="button"
              onClick={openPicker}
              disabled={busy}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isDark ? "bg-white/10 border-white/20 text-slate-100 hover:bg-white/15" : "bg-white border-gray-300 text-gray-800 hover:bg-gray-50"
              } flex items-center gap-1.5`}
              data-testid="featured-image-change-chip"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isDark ? "bg-red-500/15 border-red-400/30 text-red-200 hover:bg-red-500/25" : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              } flex items-center gap-1.5`}
              data-testid="featured-image-remove-chip"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </>
        )}
      </div>
      {hiddenInput}
    </div>
  );
}
