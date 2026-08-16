import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Car } from "lucide-react";

// Traffic page — placeholder for V1. Explicit per user instruction:
// "Not sure at all on traffic. If you can't find a way then leave it out."
export default function Traffic() {
  const navigate = useNavigate();
  return (
    <>
      <div className="ir-dash-subhead">
        <button className="ir-dash-icon-btn" onClick={() => navigate("/dashboard")} aria-label="Back" data-testid="traffic-back" style={{ background: "transparent", border: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <div className="ir-dash-subhead-title">Traffic</div>
      </div>

      <div className="ir-dash-card" data-testid="traffic-panel" style={{ textAlign: "center", padding: 32 }}>
        <Car size={48} className="ir-dash-inline-icon" style={{ margin: "0 auto 12px" }} />
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Traffic Not Configured</div>
        <div style={{ color: "#cbd5e1", fontSize: 13, maxWidth: 380, margin: "0 auto" }}>
          Live traffic requires a paid provider (Google Maps, TomTom, etc.). This dashboard is offline‑first,
          so traffic is intentionally left out for the initial launch. A provider can be enabled here in a
          future update.
        </div>
      </div>
    </>
  );
}
