import React, { useState, useEffect, useRef } from "react";
import { Paperclip, X, Image as ImageIcon, FileText, Download } from "lucide-react";
import StorageService from "../storage/storageService";
import { toast } from "sonner";

// Formats bytes as human-readable string
const fmtSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Renders and manages attachments for a single note.
// Fully offline — blobs are stored via StorageService (IndexedDB).
export default function Attachments({ attachments = [], onChange, isDark, compact = false }) {
  const [urls, setUrls] = useState({}); // id → object URL
  const [uploading, setUploading] = useState(false);
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

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const newRefs = [];
      for (const file of files) {
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
        disabled={uploading}
        className="attachment-add"
        data-testid="attachment-add-btn"
      >
        <Paperclip className="w-4 h-4" />
        {uploading ? 'Uploading…' : (attachments.length > 0 ? 'Add more' : 'Attach files')}
      </button>
    </div>
  );
}
