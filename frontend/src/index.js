import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import "@/i18n";
import App from "@/App";
import AppErrorBoundary from "@/AppErrorBoundary";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);

// Register Service Worker for PWA/offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);

        // Force an update check on every page load, not just when the
        // browser's own 24-hour timer says it's due. Combined with the
        // network-first HTML strategy in the SW, this means a fresh
        // deploy propagates within one reload — even if the PWA tab
        // has been sitting idle for hours.
        try { registration.update(); } catch { /* offline is fine */ }

        // When a new worker is found, ask it to skip waiting so it activates immediately.
        registration.addEventListener('updatefound', () => {
          const nw = registration.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              // A new SW is waiting — activate it now
              nw.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // Only check for updates on initial load and periodically, NOT on every visibility change
        // This prevents the app from reloading every time the user switches back to it
        // Update check happens:
        // 1. On page load (already done via registration.update() above)
        // 2. Every 2 hours while app is open (reduced from 30 min)
        setInterval(() => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => { /* offline is fine */ });
          }
        }, 2 * 60 * 60 * 1000); // Check every 2 hours instead of on every tab switch
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });

    // Auto-reload the page once the new SW takes control so users see the latest build.
    // Guarded with sessionStorage so a reload cycle (page load → controllerchange → reload
    // → new SW → controllerchange → reload …) can't loop indefinitely. If a reload has
    // already happened this session, don't reload again — user can refresh manually.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      try {
        if (sessionStorage.getItem('sw-reloaded') === '1') return;
        sessionStorage.setItem('sw-reloaded', '1');
      } catch { /* sessionStorage disabled — skip auto-reload rather than risk loop */
        return;
      }
      window.location.reload();
    });
  });
}
