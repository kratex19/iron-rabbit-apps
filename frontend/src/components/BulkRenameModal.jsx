import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, Pencil, RotateCcw, CheckCheck } from "lucide-react";
import {
  getPresetTitle,
  getPresetDefaultTitle,
  loadTitleOverrides,
  saveTitleOverride,
  clearTitleOverride,
  subscribeTitleOverrides,
} from "../utils/presetTitle";

/**
 * Bulk rename editor — lets the user rename every preset in one sitting.
 * Renders a scrollable list of preset rows: thumbnail + inline input.
 * Saves happen on blur (Tab/Enter) or when the modal closes, so users
 * can chain-edit without clicking Save on every row.
 */
export default function BulkRenameModal({ open, onClose, presets }) {
  const [overrides, setOverrides] = useState(() => loadTitleOverrides());
  const [drafts, setDrafts] = useState({});   // id → current input value
  const [query, setQuery] = useState("");
  const initializedRef = useRef(false);

  // Re-hydrate drafts from the current display titles every time the modal opens.
  useEffect(() => {
    if (open) {
      const m = loadTitleOverrides();
      setOverrides(m);
      const d = {};
      for (const p of presets || []) {
        d[p.id] = getPresetTitle(p, m);
      }
      setDrafts(d);
      initializedRef.current = true;
    } else {
      initializedRef.current = false;
    }
  }, [open, presets]);

  // If a rename happens outside the modal (e.g. via single-preset rename),
  // sync the overrides map so this list re-renders correctly.
  useEffect(() => {
    if (!open) return;
    return subscribeTitleOverrides(setOverrides);
  }, [open]);

  const visible = useMemo(() => {
    if (!presets) return [];
    const q = query.trim().toLowerCase();
    if (!q) return presets;
    return presets.filter((p) => {
      const t = (drafts[p.id] || getPresetTitle(p, overrides) || "").toLowerCase();
      if (t.includes(q)) return true;
      if (String(p.id).includes(q)) return true;
      if ((p.category || "").toLowerCase().includes(q)) return true;
      if (Array.isArray(p.tags) && p.tags.some((tag) => String(tag).toLowerCase().includes(q))) return true;
      return false;
    });
  }, [presets, query, drafts, overrides]);

  const commit = (p) => {
    const val = (drafts[p.id] || "").trim();
    const def = getPresetDefaultTitle(p);
    if (!val || val === def) {
      clearTitleOverride(p.id);
    } else {
      saveTitleOverride(p.id, val);
    }
  };

  const commitAllAndClose = () => {
    for (const p of presets || []) {
      const val = (drafts[p.id] || "").trim();
      const def = getPresetDefaultTitle(p);
      const currentSaved = overrides[String(p.id)];
      if ((!val || val === def) && currentSaved) {
        clearTitleOverride(p.id);
      } else if (val && val !== def && val !== currentSaved) {
        saveTitleOverride(p.id, val);
      }
    }
    onClose();
  };

  const resetRow = (p) => {
    clearTitleOverride(p.id);
    setDrafts((prev) => ({ ...prev, [p.id]: getPresetDefaultTitle(p) }));
  };

  if (!open) return null;

  const overrideCount = Object.keys(overrides).length;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      data-testid="bulk-rename-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 560, maxHeight: "85vh",
          background: "#0B1221", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, color: "#e2e8f0",
          display: "flex", flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
          <Pencil size={14} style={{ color: "#fbbf24" }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Rename All Presets</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {presets?.length || 0} presets · {overrideCount} custom {overrideCount === 1 ? "name" : "names"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="bulk-rename-close"
            style={{
              marginLeft: "auto", background: "transparent", border: 0,
              color: "#94a3b8", cursor: "pointer", padding: 6, borderRadius: 6,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 26, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, category or id"
            data-testid="bulk-rename-search"
            style={{
              width: "100%", height: 32, paddingLeft: 26, paddingRight: 10,
              background: "rgba(0,0,0,0.35)", color: "#f1f5f9", fontSize: 12,
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, outline: "none",
            }}
          />
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: 8 }} data-testid="bulk-rename-list">
          {visible.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
              No presets match &ldquo;{query}&rdquo;.
            </div>
          ) : (
            visible.map((p) => {
              const url = `/header-presets/${p.file}`;
              const def = getPresetDefaultTitle(p);
              const val = drafts[p.id] ?? getPresetTitle(p, overrides);
              const hasOverride = !!overrides[String(p.id)];
              return (
                <div
                  key={p.id}
                  data-testid={`bulk-rename-row-${p.id}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: 8, borderRadius: 8,
                    background: hasOverride ? "rgba(251, 191, 36, 0.06)" : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    style={{ width: 60, aspectRatio: "16 / 5", objectFit: "cover", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}
                  />
                  <div style={{ fontSize: 10, color: "#64748b", width: 30, fontFamily: "monospace" }}>
                    #{p.id}
                  </div>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    onBlur={() => commit(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
                      if (e.key === "Escape") { setDrafts((prev) => ({ ...prev, [p.id]: getPresetTitle(p, overrides) })); e.currentTarget.blur(); }
                    }}
                    placeholder={def}
                    maxLength={40}
                    data-testid={`bulk-rename-input-${p.id}`}
                    style={{
                      flex: 1, minWidth: 0, height: 30, padding: "0 8px",
                      background: "rgba(0,0,0,0.3)", color: "#f1f5f9",
                      border: `1px solid ${hasOverride ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: 6, fontSize: 12, outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => resetRow(p)}
                    disabled={!hasOverride}
                    aria-label="Reset to default name"
                    title={hasOverride ? "Reset to default name" : "No override to reset"}
                    data-testid={`bulk-rename-reset-${p.id}`}
                    style={{
                      background: "transparent", border: 0,
                      color: hasOverride ? "#94a3b8" : "rgba(148,163,184,0.3)",
                      cursor: hasOverride ? "pointer" : "default",
                      padding: 4, display: "inline-flex", alignItems: "center",
                    }}
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 10, color: "#64748b", flex: 1 }}>Changes save as you type. Enter or Tab commits a row.</div>
          <button
            type="button"
            onClick={commitAllAndClose}
            data-testid="bulk-rename-done"
            style={{
              height: 32, padding: "0 14px", fontSize: 12, fontWeight: 600,
              background: "#fbbf24", color: "#111827",
              border: 0, borderRadius: 8, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <CheckCheck size={14} /> Done
          </button>
        </div>
      </div>
    </div>
  );
}
