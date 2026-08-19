import React, { useEffect, useRef, useState } from "react";
import { Pencil, RotateCcw } from "lucide-react";
import { saveTitleOverride, clearTitleOverride } from "../utils/presetTitle";

/**
 * Compact rename modal for a header preset. Shows the thumbnail, an input
 * pre-filled with the current visible title, Save / Cancel / Reset buttons.
 * Renames persist to localStorage under `iron_rabbit_preset_title_overrides_v1`
 * and broadcast a custom event so any mounted picker refreshes in place.
 *
 * Props:
 *   - open: boolean
 *   - onClose: () => void
 *   - preset: manifest entry ({ id, file, category, tags, title? })
 *   - currentTitle: what's currently displayed (used as default input value)
 *   - defaultTitle: the *auto-derived* fallback (Category · Tag) — shown as
 *     placeholder + used to detect whether the user has an override to reset.
 */
export default function PresetRenameModal({ open, onClose, preset, currentTitle, defaultTitle }) {
  const [value, setValue] = useState(currentTitle || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValue(currentTitle || "");
      // Focus the input on next tick so mobile keyboards pop up cleanly
      setTimeout(() => inputRef.current?.select?.(), 60);
    }
  }, [open, currentTitle]);

  if (!open || !preset) return null;

  const hasOverride = currentTitle && defaultTitle && currentTitle !== defaultTitle;
  const url = `/header-presets/${preset.file}`;

  const commit = () => {
    const trimmed = value.trim();
    // Treat "same as default" as no override so we don't bloat storage.
    if (!trimmed || trimmed === defaultTitle) {
      clearTitleOverride(preset.id);
    } else {
      saveTitleOverride(preset.id, trimmed);
    }
    onClose();
  };

  const reset = () => {
    clearTitleOverride(preset.id);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      data-testid="preset-rename-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 380,
          background: "#0B1221", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: 16, color: "#e2e8f0",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Pencil size={14} style={{ color: "#fbbf24" }} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>Rename preset</div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#64748b" }}>#{preset.id}</div>
        </div>

        <img
          src={url}
          alt={currentTitle || `Preset ${preset.id}`}
          style={{ width: "100%", aspectRatio: "16 / 5", objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", marginBottom: 12 }}
        />

        <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, color: "#94a3b8", display: "block", marginBottom: 4 }}>
          Custom name
        </label>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { e.preventDefault(); onClose(); }
          }}
          placeholder={defaultTitle || "e.g. Autumn Ridge"}
          maxLength={40}
          data-testid="preset-rename-input"
          style={{
            width: "100%", height: 36, padding: "0 10px", fontSize: 13,
            background: "rgba(0,0,0,0.35)", color: "#f1f5f9",
            border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, outline: "none",
          }}
        />
        <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>
          Saved locally on this device. Leave blank to restore the default.
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {hasOverride && (
            <button
              type="button"
              onClick={reset}
              data-testid="preset-rename-reset"
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                height: 32, padding: "0 10px", fontSize: 12,
                background: "transparent", color: "#94a3b8",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            data-testid="preset-rename-cancel"
            style={{
              height: 32, padding: "0 12px", fontSize: 12,
              background: "transparent", color: "#e2e8f0",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            data-testid="preset-rename-save"
            style={{
              height: 32, padding: "0 14px", fontSize: 12, fontWeight: 600,
              background: "#fbbf24", color: "#111827",
              border: 0, borderRadius: 8, cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
