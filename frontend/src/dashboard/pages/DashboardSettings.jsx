import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { useDashboard } from "../DashboardLayout";
import { PROVIDERS } from "../state/dashboardStore";
import LocationPickerModal from "../components/LocationPickerModal";
import { DEFAULT_BACKGROUND_POOL } from "../DashboardLayout";

export default function DashboardSettings() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useDashboard();
  const [locOpen, setLocOpen] = useState(false);
  const [presets, setPresets] = useState([]);

  // Load full manifest for the background picker (safe read-only fetch).
  useEffect(() => {
    fetch("/header-presets/manifest.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no manifest"))))
      .then((m) => setPresets(Array.isArray(m.presets) ? m.presets.slice(0, 24) : []))
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

        <div className="ir-dash-row" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="ir-dash-row-label">Background Image</div>
            <div className="ir-dash-row-sub">Pick from your existing header presets</div>
          </div>
          <button
            className="ir-dash-btn ir-dash-btn--ghost"
            onClick={() => updateSettings({ background_preset: null })}
            data-testid="dash-settings-bg-reset"
          >
            Auto
          </button>
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
          {(presets.length ? presets : DEFAULT_BACKGROUND_POOL.map((f, i) => ({ id: String(i), file: f.replace("/header-presets/", "") }))).map((p) => {
            const url = `/header-presets/${p.file}`;
            const selected = settings.background_preset === url;
            return (
              <button
                key={p.id || p.file}
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
                }}
                data-testid={`dash-settings-bg-${p.id || p.file}`}
                aria-pressed={selected}
              >
                <img src={url} alt="preset" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
              </button>
            );
          })}
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
    </>
  );
}
