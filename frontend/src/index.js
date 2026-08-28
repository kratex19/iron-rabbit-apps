import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import "@/i18n";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register Service Worker for PWA/offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);

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

        // Belt-and-suspenders: whenever the user brings the tab back to focus,
        // ask the browser to re-check for a new service-worker.js. Combined with
        // skipWaiting() + clients.claim() inside the SW itself, this makes
        // fresh deploys propagate to real users within seconds of them
        // reopening the app — no need to fully close/reopen the tab manually.
        const checkForUpdate = () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => { /* offline is fine */ });
          }
        };
        document.addEventListener('visibilitychange', checkForUpdate);
        // Also poll every 30 min while the tab stays open, so long-lived PWA
        // sessions (a user with the app open all day) don't miss updates.
        setInterval(checkForUpdate, 30 * 60 * 1000);
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
