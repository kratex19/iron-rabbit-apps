import React, { useState, useEffect, useRef } from "react";
import { Paperclip, X, Image as ImageIcon, FileText, Download, ScanText, Loader2, Camera, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import StorageService from "../storage/storageService";
import { checkStorageQuota } from "../storage/storageWarnings";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Convert a Blob to pure-base64 (no data: prefix)
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => {
      const s = String(fr.result || "");
      const comma = s.indexOf(",");
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    fr.readAsDataURL(blob);
  });
}

// Formats bytes as human-readable string
const fmtSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Renders and manages attachments for a single note.
// Fully offline — blobs are stored via StorageService (IndexedDB).
export default function Attachments({ attachments = [], onChange, isDark, compact = false, onExtractText = null }) {
  const [urls, setUrls] = useState({}); // id → object URL
  const [uploading, setUploading] = useState(false);
  const [ocrBusyId, setOcrBusyId] = useState(null);
  const [lightboxIdx, setLightboxIdx] = useState(null); // index in imageAttachments
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const isImage = (type) => type?.startsWith("image/");
  const imageAttachments = attachments.filter(a => isImage(a.type));

  // Resolve object URLs for each attachment
  useEffect(() => {
    let cancelled = false;
    const toRevoke = [];
    (async () => {
      const map = {};
      for (const att of attachments) {
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
      toRevoke.forEach(u => URL.revokeObjectURL(u));
    };
  }, [attachments]);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightboxIdx(null);
      else if (e.key === "ArrowRight") setLightboxIdx(i => Math.min(imageAttachments.length - 1, (i ?? 0) + 1));
      else if (e.key === "ArrowLeft") setLightboxIdx(i => Math.max(0, (i ?? 0) - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, imageAttachments.length]);

  const handleExtractText = async (att) => {
    if (!onExtractText) return;
    setOcrBusyId(att.id);
    try {
      const blob = await StorageService.getAttachmentBlob(att.id);
      if (!blob) throw new Error("Attachment missing");
      const b64 = await blobToBase64(blob);
      const res = await fetch(`${BACKEND_URL}/api/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: b64, mime_type: att.type }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const text = (data.extracted_text || "").trim();
      if (!text) {
        toast.info("No text found in this image.");
        return;
      }
      onExtractText(text, att);
      toast.success(`Extracted ${text.length.toLocaleString()} chars`);
    } catch (err) {
      toast.error(`OCR failed: ${err.message}`);
    } finally {
      setOcrBusyId(null);
    }
  };

  const performUpload = async (files) => {
    if (files.length === 0) return;
    const imgCap = StorageService.MAX_IMAGES_PER_NOTE ?? 10;
    const fileCap = StorageService.MAX_FILES_PER_NOTE ?? 10;
    const currentImages = (attachments || []).filter(a => isImage(a.type)).length;
    const currentFiles  = (attachments || []).filter(a => !isImage(a.type)).length;

    // Split incoming batch by type so each cap is enforced independently
    const imgFiles = files.filter(f => (f.type || "").startsWith("image/"));
    const otherFiles = files.filter(f => !((f.type || "").startsWith("image/")));

    const imgRemaining = Math.max(0, imgCap - currentImages);
    const fileRemaining = Math.max(0, fileCap - currentFiles);

    const acceptedImgs = imgFiles.slice(0, imgRemaining);
    const acceptedFiles = otherFiles.slice(0, fileRemaining);

    if (imgFiles.length > acceptedImgs.length) {
      toast.warning(`Only ${acceptedImgs.length} of ${imgFiles.length} images added — ${imgCap}-image cap reached.`);
    }
    if (otherFiles.length > acceptedFiles.length) {
      toast.warning(`Only ${acceptedFiles.length} of ${otherFiles.length} files added — ${fileCap}-file cap reached.`);
    }
    const toUpload = [...acceptedImgs, ...acceptedFiles];
    if (toUpload.length === 0) {
      toast.error(`Attachment limit reached (${imgCap} images / ${fileCap} files per note).`);
      return;
    }
    setUploading(true);
    try {
      const newRefs = [];
      for (const file of toUpload) {
        try {
          const ref = await StorageService.saveAttachment(file);
          newRefs.push(ref);
        } catch (err) {
          toast.error(err.message || `Failed to upload ${file.name}`);
        }
      }
      if (newRefs.length > 0) {
        onChange([...(attachments || []), ...newRefs]);
        toast.success(`Attached ${newRefs.length} file${newRefs.length === 1 ? "" : "s"}`);
        // Nudge the storage warning check — surfaces a toast once the
        // user crosses 80% of their device quota. Deduped per session.
        checkStorageQuota().catch(() => {});
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = async (e) => {
    const files = Array.from(e.target.files || []);
    await performUpload(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleRemove = async (att) => {
    try {
      await StorageService.deleteAttachment(att.id);
      onChange((attachments || []).filter(a => a.id !== att.id));
    } catch (err) {
      toast.error("Failed to remove attachment");
    }
  };

  const openLightbox = (att) => {
    const idx = imageAttachments.findIndex(a => a.id === att.id);
    if (idx >= 0) setLightboxIdx(idx);
  };

  const currentLightboxAtt = lightboxIdx !== null ? imageAttachments[lightboxIdx] : null;
  const imgCap = StorageService.MAX_IMAGES_PER_NOTE ?? 10;
  const fileCap = StorageService.MAX_FILES_PER_NOTE ?? 10;
  const cap = imgCap + fileCap;
  const currentImages = (attachments || []).filter(a => isImage(a.type)).length;
  const currentFiles  = (attachments || []).filter(a => !isImage(a.type)).length;
  const atCap = currentImages >= imgCap && currentFiles >= fileCap;

  return (
    <div className={`attachments ${isDark ? "dark" : ""} ${compact ? "compact" : ""}`} data-testid="attachments">
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        multiple
        onChange={handleFileInput}
        className="hidden"
        data-testid="attachment-input"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInput}
        className="hidden"
        data-testid="attachment-camera-input"
      />

      {/* 2-column thumbnail grid */}
      {attachments.length > 0 && (
        <div className="attachments-grid attachments-grid-2col" data-testid="attachments-grid">
          {attachments.map(att => (
            <div key={att.id} className="attachment-item" data-testid={`attachment-${att.id}`}>
              {isImage(att.type) ? (
                urls[att.id] ? (
                  <button
                    type="button"
                    onClick={() => openLightbox(att)}
                    className="attachment-preview"
                    aria-label={`Open ${att.name}`}
                    data-testid={`attachment-open-${att.id}`}
                  >
                    <img src={urls[att.id]} alt={att.name} loading="lazy" />
                  </button>
                ) : (
                  <div className="attachment-preview attachment-loading"><ImageIcon className="w-6 h-6 opacity-40" /></div>
                )
              ) : (
                <a href={urls[att.id] || "#"} download={att.name} target="_blank" rel="noopener noreferrer" className="attachment-preview attachment-doc">
                  <FileText className="w-8 h-8" />
                  <Download className="w-3 h-3 attachment-download-hint" />
                </a>
              )}
              <div className="attachment-meta">
                <span className="attachment-name" title={att.name}>{att.name}</span>
                <span className="attachment-size">{fmtSize(att.size)}</span>
              </div>
              {att.sourceUrl && (
                <a
                  href={att.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="attachment-source"
                  aria-label={`Open source: ${att.sourceUrl}`}
                  title={`Source: ${att.sourceUrl}`}
                  data-testid={`attachment-source-${att.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {onExtractText && isImage(att.type) && (
                <button
                  type="button"
                  onClick={() => handleExtractText(att)}
                  disabled={ocrBusyId === att.id}
                  className="attachment-ocr"
                  aria-label={`Extract text from ${att.name}`}
                  title="Extract text from this image"
                  data-testid={`attachment-ocr-${att.id}`}
                >
                  {ocrBusyId === att.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <ScanText className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemove(att)}
                className="attachment-remove"
                aria-label={`Remove ${att.name}`}
                data-testid={`attachment-remove-${att.id}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons — Take photo + Attach files, side by side */}
      <div className="attachment-actions">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading || atCap}
          className="attachment-add attachment-camera"
          data-testid="attachment-camera-btn"
          aria-label="Take a photo"
        >
          <Camera className="w-4 h-4" />
          <span>{uploading ? "Uploading…" : "Take photo"}</span>
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || atCap}
          className="attachment-add"
          data-testid="attachment-add-btn"
          aria-label="Attach files from device"
        >
          <Paperclip className="w-4 h-4" />
          <span>
            {uploading
              ? "Uploading…"
              : atCap
                ? `Max reached · ${currentImages}/${imgCap} img · ${currentFiles}/${fileCap} files`
                : `Attach · ${currentImages}/${imgCap} img · ${currentFiles}/${fileCap} files`}
          </span>
        </button>
      </div>

      {/* Dark lightbox modal */}
      {currentLightboxAtt && urls[currentLightboxAtt.id] && (
        <div
          className="attachment-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={currentLightboxAtt.name}
          onClick={() => setLightboxIdx(null)}
          data-testid="attachment-lightbox"
        >
          <button
            type="button"
            className="attachment-lightbox-close"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
            aria-label="Close preview"
            data-testid="attachment-lightbox-close"
          >
            <X className="w-6 h-6" />
          </button>

          {imageAttachments.length > 1 && lightboxIdx > 0 && (
            <button
              type="button"
              className="attachment-lightbox-nav attachment-lightbox-prev"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => Math.max(0, (i ?? 0) - 1)); }}
              aria-label="Previous image"
              data-testid="attachment-lightbox-prev"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}
          {imageAttachments.length > 1 && lightboxIdx < imageAttachments.length - 1 && (
            <button
              type="button"
              className="attachment-lightbox-nav attachment-lightbox-next"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => Math.min(imageAttachments.length - 1, (i ?? 0) + 1)); }}
              aria-label="Next image"
              data-testid="attachment-lightbox-next"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}

          <img
            src={urls[currentLightboxAtt.id]}
            alt={currentLightboxAtt.name}
            className="attachment-lightbox-image"
            onClick={(e) => e.stopPropagation()}
            data-testid="attachment-lightbox-image"
          />

          <div className="attachment-lightbox-meta" onClick={(e) => e.stopPropagation()}>
            <div className="attachment-lightbox-name">{currentLightboxAtt.name}</div>
            <div className="attachment-lightbox-info">
              {fmtSize(currentLightboxAtt.size)}
              {imageAttachments.length > 1 && (
                <span> · {lightboxIdx + 1} of {imageAttachments.length}</span>
              )}
            </div>
            {currentLightboxAtt.sourceUrl && (
              <a
                href={currentLightboxAtt.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="attachment-lightbox-source"
                data-testid="attachment-lightbox-source"
              >
                <ExternalLink className="w-4 h-4" />
                Open source
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
