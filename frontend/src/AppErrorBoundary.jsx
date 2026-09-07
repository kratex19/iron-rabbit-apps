import React from "react";

/**
 * AppErrorBoundary — top-level safety net.
 *
 * If any child component throws during render / lifecycle, this
 * boundary catches the error and shows a friendly recovery screen
 * instead of the OS-level "black tar" blank canvas you'd otherwise
 * get from a bare `<html><body></body></html>`.
 *
 * The recovery panel lets the user:
 *   • copy the error text (for support / bug reports),
 *   • hard-reload the app (unregisters the SW too so a fresh build
 *     is fetched),
 *   • clear ONLY the alarm ledger + session flags (safe reset),
 *   • or nuclear-clear all site data (last resort — wipes notes).
 *
 * Errors are also persisted to `localStorage.ir_last_crash` so we can
 * inspect them the next time the app boots (or after a support ticket).
 */
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    try {
      const payload = {
        message: String(error?.message || error),
        stack: String(error?.stack || "").slice(0, 4000),
        componentStack: String(info?.componentStack || "").slice(0, 4000),
        when: new Date().toISOString(),
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
        url: typeof location !== "undefined" ? location.href : "",
      };
      localStorage.setItem("ir_last_crash", JSON.stringify(payload));
    } catch { /* localStorage may be full or blocked */ }
  }

  handleReload = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch { /* ignore */ }
    location.reload();
  };

  handleSafeReset = () => {
    try {
      // Wipe just the app's meta flags. Notes in IndexedDB are UNTOUCHED.
      const keep = new Set(); // nothing to keep — all IR_-prefixed keys are meta
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("ir_") || k.startsWith("IR_")) {
          if (!keep.has(k)) localStorage.removeItem(k);
        }
      });
      sessionStorage.clear();
    } catch { /* ignore */ }
    location.reload();
  };

  handleCopy = async () => {
    const { error, info } = this.state;
    const txt = [
      `Iron Rabbit crash report — ${new Date().toISOString()}`,
      "",
      `Message: ${error?.message || error}`,
      "",
      "Stack:",
      String(error?.stack || "").slice(0, 4000),
      "",
      "Component stack:",
      String(info?.componentStack || "").slice(0, 4000),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      alert("Crash report copied to clipboard.");
    } catch {
      // Fallback: dump into a prompt so the user can copy manually
      // eslint-disable-next-line no-alert
      window.prompt("Copy this crash report:", txt);
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #0B1221 0%, #0e1730 100%)",
          color: "#F1F5F9",
          padding: "24px 16px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
        data-testid="app-error-boundary"
      >
        <div style={{ maxWidth: 560, width: "100%" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🐰</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
            Iron Rabbit hit a snag
          </h1>
          <p style={{ fontSize: 14, color: "#94A3B8", margin: "0 0 20px", lineHeight: 1.5 }}>
            Something crashed while rendering the app. Your notes are safe — they live
            in your device's storage and were not touched. Pick a recovery option below:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <button
              type="button"
              onClick={this.handleReload}
              data-testid="app-error-reload"
              style={{
                background: "#6366F1", color: "#fff", border: "none",
                borderRadius: 8, padding: "12px 14px", fontSize: 14, fontWeight: 600,
                textAlign: "left", cursor: "pointer",
              }}
            >
              🔄  Reload (recommended) — fetches the latest bundle
            </button>
            <button
              type="button"
              onClick={this.handleSafeReset}
              data-testid="app-error-safe-reset"
              style={{
                background: "rgba(255,255,255,0.06)", color: "#F1F5F9",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                padding: "12px 14px", fontSize: 14, fontWeight: 500,
                textAlign: "left", cursor: "pointer",
              }}
            >
              🧹  Safe reset — clears app flags only, keeps your notes
            </button>
            <button
              type="button"
              onClick={this.handleCopy}
              data-testid="app-error-copy"
              style={{
                background: "rgba(255,255,255,0.06)", color: "#F1F5F9",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                padding: "12px 14px", fontSize: 14, fontWeight: 500,
                textAlign: "left", cursor: "pointer",
              }}
            >
              📋  Copy crash report to share with support
            </button>
          </div>

          <details style={{ fontSize: 12, color: "#94A3B8" }}>
            <summary style={{ cursor: "pointer", marginBottom: 8 }}>
              Show technical details
            </summary>
            <div style={{ background: "rgba(0,0,0,0.35)", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 260 }}>
              <div style={{ marginBottom: 8, color: "#FDA4AF" }}>
                {String(error?.message || error)}
              </div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', Menlo, monospace", fontSize: 11, color: "#CBD5E1" }}>
                {String(error?.stack || "").slice(0, 2000)}
              </pre>
            </div>
          </details>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
