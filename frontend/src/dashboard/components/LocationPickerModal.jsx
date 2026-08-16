import React, { useEffect, useState } from "react";
import { X, Search, LocateFixed, Loader2 } from "lucide-react";
import { searchLocations, getBrowserPosition, reverseGeocode } from "../utils/geocode";

// Simple modal to pick a location by search or use current position.
export default function LocationPickerModal({ open, onClose, onPick }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!open) { setQ(""); setResults([]); setErr(null); }
  }, [open]);

  useEffect(() => {
    if (!open || !q || q.length < 2) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await searchLocations(q);
        if (!cancelled) setResults(list);
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open]);

  const useCurrent = async () => {
    setBusy(true); setErr(null);
    try {
      const pos = await getBrowserPosition();
      const loc = await reverseGeocode(pos.latitude, pos.longitude);
      onPick(loc);
      onClose();
    } catch (e) {
      setErr(e.message || "Location permission denied");
    } finally { setBusy(false); }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      data-testid="dash-location-modal"
    >
      <div onClick={(e) => e.stopPropagation()} className="ir-dash-card" style={{ width: "min(520px, 100%)", padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Change Weather Location</div>
          <button className="ir-dash-icon-btn" onClick={onClose} aria-label="Close" data-testid="dash-location-close" style={{ background: "transparent", border: 0, color: "#cbd5e1", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            className="ir-dash-input"
            placeholder="Search city (e.g. Pagosa Springs)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            style={{ width: "100%", paddingLeft: 34 }}
            data-testid="dash-location-search-input"
          />
        </div>

        <button
          type="button"
          onClick={useCurrent}
          disabled={busy}
          className="ir-dash-btn ir-dash-btn--ghost"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, width: "100%", marginTop: 10, justifyContent: "center" }}
          data-testid="dash-location-use-current"
        >
          {busy ? <Loader2 className="animate-spin" size={16} /> : <LocateFixed size={16} />} Use Current Location
        </button>

        {err && <div style={{ marginTop: 10, color: "#fca5a5", fontSize: 13 }}>{err}</div>}

        <div style={{ marginTop: 12, maxHeight: 300, overflowY: "auto" }} data-testid="dash-location-results">
          {loading && <div style={{ color: "#94a3b8", fontSize: 13, padding: 8 }}>Searching…</div>}
          {!loading && results.map((r) => (
            <button
              key={`${r.name}-${r.latitude}-${r.longitude}`}
              type="button"
              onClick={() => { onPick(r); onClose(); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 10,
                background: "transparent",
                border: "1px solid transparent",
                color: "#f4f6f9",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              data-testid={`dash-location-result-${r.latitude.toFixed(2)}-${r.longitude.toFixed(2)}`}
            >
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {[r.admin1, r.country].filter(Boolean).join(", ")}
              </div>
            </button>
          ))}
          {!loading && q.length >= 2 && results.length === 0 && (
            <div style={{ color: "#94a3b8", fontSize: 13, padding: 8 }}>No matches.</div>
          )}
        </div>
      </div>
    </div>
  );
}
