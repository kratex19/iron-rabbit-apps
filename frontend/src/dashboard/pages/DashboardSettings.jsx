import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Star, Palette, Sparkles, Search, X } from "lucide-react";
import { useDashboard } from "../DashboardLayout";
import { PROVIDERS } from "../state/dashboardStore";
import LocationPickerModal from "../components/LocationPickerModal";
import { DEFAULT_BACKGROUND_POOL } from "../DashboardLayout";
import BackgroundPicker from "../../components/BackgroundPicker";
import { bgObjToString, stringToBgObj } from "../../utils/bgValue";
import { getPresetTitle, getPresetAlt, getPresetSearchHay } from "../../utils/presetTitle";

export default function DashboardSettings() {
  const navigate = useNavigate();
  const { settings, updateSettings, toggleFavorite } = useDashboard();
  const [locOpen, setLocOpen] = useState(false);
  const [presets, setPresets] = useState([]);
  const [favOnly, setFavOnly] = useState(false);

  const favorites = Array.isArray(settings.favorites) ? settings.favorites : [];
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const [activeCat, setActiveCat] = useState("All");

  // Color / gradient / custom-gradient picker for the full-page dashboard background.
  const [bgPicker, setBgPicker] = useState({ open: false, tab: "color", focusCustom: false });

  // Free-text search across preset title / category / tags.
  const [bgQuery, setBgQuery] = useState("");

  // Compute category chips from the loaded presets (rebuilt fresh each
  // load so new categories from the manifest show up automatically).
  const categoryChips = useMemo(() => {
    if (!presets.length) return [];
    const counts = new Map();
    for (const p of presets) {
      if (!p.category) continue;
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    }
    return [
      { key: "All", count: presets.length },
      ...[...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([key, count]) => ({ key, count })),
    ];
  }, [presets]);

  // Load the shared Iron Rabbit header preset manifest so the Dashboard
  // and the Home Page pick from the same pool. Safe read-only fetch.
  useEffect(() => {
    fetch("/header-presets/manifest.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no manifest"))))
      .then((m) => setPresets(Array.isArray(m.presets) ? m.presets : []))
      .catch(() => setPresets([]));
  }, []);

  return (
    <>
      <div className="ir-dash-subhead">
        <button className="ir-dash-icon-btn" onClick={() => navigate("/dashboard")} aria-label="Back" data-testid="settings-back" style={{ background: "transparent", border: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <div className="ir-dash-subhead-title">Dashboard Settings</div>
      </div>

      <div className="ir-dash-card" data-testid="dash-settings-panel">
        {/* Weather */}
        <div className="ir-dash-label">Weather</div>
        <div className="ir-dash-row">
          <div>
            <div className="ir-dash-row-label">Location</div>
            <div className="ir-dash-row-sub">{settings.location?.display || "Not set"}</div>
          </div>
          <button className="ir-dash-btn ir-dash-btn--ghost" onClick={() => setLocOpen(true)} data-testid="dash-settings-change-location">
            <MapPin size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
            Change
          </button>
        </div>

        <div className="ir-dash-row">
          <div>
            <div className="ir-dash-row-label">Weather Provider</div>
            <div className="ir-dash-row-sub">Website that opens when you tap the weather icon</div>
          </div>
          <select
            className="ir-dash-select"
            value={settings.provider}
            onChange={(e) => updateSettings({ provider: e.target.value })}
            data-testid="dash-settings-provider"
          >
            {Object.entries(PROVIDERS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {settings.provider === "custom" && (
          <div className="ir-dash-row">
            <div className="ir-dash-row-label">Custom URL</div>
            <input
              type="url"
              className="ir-dash-input"
              value={settings.provider_custom_url}
              onChange={(e) => updateSettings({ provider_custom_url: e.target.value })}
              placeholder="https://..."
              style={{ minWidth: 200 }}
              data-testid="dash-settings-custom-url"
            />
          </div>
        )}

        <div className="ir-dash-row">
          <div>
            <div className="ir-dash-row-label">Units</div>
            <div className="ir-dash-row-sub">Temperature and wind speed</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["F", "C"].map((u) => (
              <button
                key={u}
                onClick={() => updateSettings({ units: u })}
                className="ir-dash-btn ir-dash-btn--ghost"
                style={{ background: settings.units === u ? "#fbbf24" : undefined, color: settings.units === u ? "#111827" : undefined }}
                data-testid={`dash-settings-units-${u}`}
              >
                °{u}
              </button>
            ))}
          </div>
        </div>

        {/* Appearance */}
        <div className="ir-dash-label" style={{ marginTop: 20 }}>Appearance</div>

        {/* Choose a color / Choose a gradient — the gradient picker's own
            custom-gradient builder sits at the bottom of the preset grid,
            matching the Home Page header flow exactly. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 6,
            marginBottom: 12,
            justifyContent: "flex-start",
          }}
          data-testid="dash-settings-bg-quick-actions"
        >
          <button
            className="ir-dash-btn ir-dash-btn--ghost"
            onClick={() => setBgPicker({ open: true, tab: "color", focusCustom: false })}
            data-testid="dash-settings-bg-choose-color"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Palette size={12} /> Choose a color
          </button>
          <button
            className="ir-dash-btn ir-dash-btn--ghost"
            onClick={() => setBgPicker({ open: true, tab: "gradient", focusCustom: false })}
            data-testid="dash-settings-bg-choose-gradient"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Sparkles size={12} /> Choose a gradient
          </button>
        </div>

        <div className="ir-dash-row" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="ir-dash-row-label">Background Image</div>
            <div className="ir-dash-row-sub">
              Tap ★ to favorite — swipe cycles favorites when any are starred
              {favorites.length ? ` · ${favorites.length} starred` : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="ir-dash-btn ir-dash-btn--ghost"
              onClick={() => setFavOnly((v) => !v)}
              data-testid="dash-settings-bg-fav-only"
              style={{ background: favOnly ? "#fbbf24" : undefined, color: favOnly ? "#111827" : undefined, display: "inline-flex", alignItems: "center", gap: 4 }}
              disabled={favorites.length === 0}
              title={favorites.length === 0 ? "No favorites yet" : (favOnly ? "Show all" : "Show favorites only")}
            >
              <Star size={12} fill={favOnly ? "#111827" : "none"} /> Favorites
            </button>
            <button
              className="ir-dash-btn ir-dash-btn--ghost"
              onClick={() => updateSettings({ background_preset: null })}
              data-testid="dash-settings-bg-reset"
            >
              Auto
            </button>
          </div>
        </div>

        {categoryChips.length > 1 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 10,
              padding: "6px 0",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              paddingBottom: 10,
            }}
            data-testid="dash-settings-bg-chips"
          >
            {categoryChips.map((c) => {
              const active = activeCat === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setActiveCat(c.key)}
                  data-testid={`dash-settings-bg-chip-${c.key.toLowerCase()}`}
                  aria-pressed={active}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    height: 26,
                    padding: "0 10px",
                    borderRadius: 999,
                    border: `1px solid ${active ? "#fbbf24" : "rgba(255,255,255,0.15)"}`,
                    background: active ? "#fbbf24" : "rgba(255,255,255,0.05)",
                    color: active ? "#111827" : "#e2e8f0",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {c.key}
                  <span style={{ fontSize: 10, opacity: active ? 0.6 : 0.55 }}>({c.count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Free-text search — filters by title, category, or tag */}
        <div style={{ position: "relative", marginTop: 10 }}>
          <Search
            size={13}
            style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }}
          />
          <input
            type="text"
            value={bgQuery}
            onChange={(e) => setBgQuery(e.target.value)}
            placeholder="Search backgrounds (e.g. sunset, everest, deer)"
            data-testid="dash-settings-bg-search"
            style={{
              width: "100%",
              height: 32,
              paddingLeft: 28,
              paddingRight: bgQuery ? 28 : 10,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.35)",
              color: "#e2e8f0",
              fontSize: 12,
              outline: "none",
            }}
          />
          {bgQuery && (
            <button
              type="button"
              onClick={() => setBgQuery("")}
              data-testid="dash-settings-bg-search-clear"
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: 0,
                color: "#94a3b8",
                cursor: "pointer",
                padding: 4,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 8,
            marginTop: 10,
            maxHeight: 300,
            overflowY: "auto",
            paddingRight: 4,
          }}
          data-testid="dash-settings-bg-grid"
        >
          {(() => {
            const source = presets.length
              ? presets
              : DEFAULT_BACKGROUND_POOL.map((f, i) => ({ id: String(i), file: f.replace("/header-presets/", "") }));
            // Star favorites first for easier browsing
            const withStar = source.map((p) => ({ ...p, _url: `/header-presets/${p.file}` }));
            withStar.sort((a, b) => (favSet.has(b._url) ? 1 : 0) - (favSet.has(a._url) ? 1 : 0));
            let visible = favOnly ? withStar.filter((p) => favSet.has(p._url)) : withStar;
            if (activeCat !== "All") visible = visible.filter((p) => p.category === activeCat);
            const q = bgQuery.trim().toLowerCase();
            if (q) visible = visible.filter((p) => getPresetSearchHay(p).includes(q));
            if (visible.length === 0) {
              return <div style={{ color: "#94a3b8", fontSize: 12, padding: 10 }}>
                {q ? `No presets match "${bgQuery}".`
                  : favOnly ? "No favorites yet — tap the ★ on any preset to add one."
                  : `No presets in ${activeCat}.`}
              </div>;
            }
            return visible.map((p) => {
              const url = p._url;
              const selected = settings.background_preset === url;
              const starred = favSet.has(url);
              const title = getPresetTitle(p);
              const alt = getPresetAlt(p);
              return (
                <div key={p.id || p.file} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => updateSettings({ background_preset: url })}
                    style={{
                      aspectRatio: "16 / 5",
                      border: `1px solid ${selected ? "#fbbf24" : "rgba(255,255,255,0.18)"}`,
                      outline: selected ? "2px solid #fbbf24" : "none",
                      outlineOffset: -2,
                      borderRadius: 8,
                      overflow: "hidden",
                      cursor: "pointer",
                      padding: 0,
                      background: "transparent",
                      width: "100%",
                      display: "block",
                    }}
                    data-testid={`dash-settings-bg-${p.id || p.file}`}
                    aria-pressed={selected}
                    aria-label={alt}
                    title={alt}
                  >
                    <img src={url} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                  </button>
                  <div
                    data-testid={`dash-settings-bg-title-${p.id || p.file}`}
                    title={title}
                    style={{
                      fontSize: 10,
                      lineHeight: "12px",
                      color: "#cbd5e1",
                      padding: "0 2px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {title}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(url); }}
                    aria-label={starred ? "Remove favorite" : "Add favorite"}
                    title={starred ? "Remove favorite" : "Add favorite"}
                    data-testid={`dash-settings-bg-fav-${p.id || p.file}`}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: "rgba(0,0,0,0.55)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: starred ? "#fbbf24" : "#e5e7eb",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <Star size={12} fill={starred ? "#fbbf24" : "none"} />
                  </button>
                </div>
              );
            });
          })()}
        </div>

        <div className="ir-dash-row" style={{ marginTop: 16 }}>
          <div>
            <div className="ir-dash-row-label">Background Dim</div>
            <div className="ir-dash-row-sub">Darken the background for readability</div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.background_dim ?? 0.35}
            onChange={(e) => updateSettings({ background_dim: Number(e.target.value) })}
            data-testid="dash-settings-dim"
            style={{ width: 160 }}
          />
        </div>

        <div style={{ marginTop: 20, fontSize: 11, color: "#94a3b8" }}>
          These settings are stored only for this dashboard and do not affect the Iron Rabbit app.
        </div>
      </div>

      <LocationPickerModal
        open={locOpen}
        onClose={() => setLocOpen(false)}
        onPick={(loc) => updateSettings({ location: loc, use_geolocation: false })}
      />

      {/* Full-page dashboard background — color or gradient (gradient tab
          includes the "make your own" builder underneath the preset grid). */}
      <BackgroundPicker
        isOpen={bgPicker.open}
        onClose={() => setBgPicker(p => ({ ...p, open: false }))}
        value={stringToBgObj(settings.background_preset)}
        onSelect={(bg) => updateSettings({ background_preset: bgObjToString(bg) })}
        isDark={true}
        initialTab={bgPicker.tab}
        allowedTabs={["color", "gradient"]}
        title={bgPicker.tab === "gradient" ? "Dashboard gradient" : "Dashboard color"}
        description={
          bgPicker.tab === "gradient"
            ? "Pick a preset gradient or build your own — shown across the full dashboard background."
            : "Pick a color — shown across the full dashboard background."
        }
      />
    </>
  );
}
