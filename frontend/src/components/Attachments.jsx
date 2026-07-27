import React, { useState, useEffect, useRef } from "react";
import { Paperclip, X, Image as ImageIcon, FileText, Download, ScanText, Loader2 } from "lucide-react";
import StorageService from "../storage/storageService";
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
  const fileInputRef = useRef(null);

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

  const handleUpload = async (e) => {    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const cap = StorageService.MAX_ATTACHMENTS_PER_NOTE ?? 10;
    const remaining = Math.max(0, cap - (attachments?.length || 0));
    if (remaining === 0) {
      toast.error(`Max ${cap} files per note. Remove one to add another.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.warning(`Only ${remaining} of ${files.length} added — ${cap}-file cap reached.`);
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
        toast.success(`Attached ${newRefs.length} file${newRefs.length === 1 ? '' : 's'}`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (att) => {
    try {
      await StorageService.deleteAttachment(att.id);
      onChange((attachments || []).filter(a => a.id !== att.id));
    } catch (err) {
      toast.error('Failed to remove attachment');
    }
  };

  const isImage = (type) => type?.startsWith('image/');

  return (
    <div className={`attachments ${isDark ? 'dark' : ''} ${compact ? 'compact' : ''}`} data-testid="attachments">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        multiple
        onChange={handleUpload}
        className="hidden"
        data-testid="attachment-input"
      />

      {attachments.length > 0 && (
        <div className="attachments-grid" data-testid="attachments-grid">
          {attachments.map(att => (
            <div key={att.id} className="attachment-item" data-testid={`attachment-${att.id}`}>
              {isImage(att.type) ? (
                urls[att.id] ? (
                  <a href={urls[att.id]} target="_blank" rel="noopener noreferrer" className="attachment-preview">
                    <img src={urls[att.id]} alt={att.name} loading="lazy" />
                  </a>
                ) : (
                  <div className="attachment-preview attachment-loading"><ImageIcon className="w-6 h-6 opacity-40" /></div>
                )
              ) : (
                <a href={urls[att.id] || '#'} download={att.name} target="_blank" rel="noopener noreferrer" className="attachment-preview attachment-doc">
                  <FileText className="w-8 h-8" />
                  <Download className="w-3 h-3 attachment-download-hint" />
                </a>
              )}
              <div className="attachment-meta">
                <span className="attachment-name" title={att.name}>{att.name}</span>
                <span className="attachment-size">{fmtSize(att.size)}</span>
              </div>
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

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || (attachments?.length || 0) >= (StorageService.MAX_ATTACHMENTS_PER_NOTE ?? 10)}
        className="attachment-add"
        data-testid="attachment-add-btn"
      >
        <Paperclip className="w-4 h-4" />
        {uploading
          ? 'Uploading…'
          : (attachments?.length || 0) >= (StorageService.MAX_ATTACHMENTS_PER_NOTE ?? 10)
            ? `Max ${StorageService.MAX_ATTACHMENTS_PER_NOTE ?? 10} reached`
            : `${attachments.length > 0 ? 'Add more' : 'Attach photos'} · ${attachments?.length || 0}/${StorageService.MAX_ATTACHMENTS_PER_NOTE ?? 10}`}
      </button>
    </div>
  );
}
