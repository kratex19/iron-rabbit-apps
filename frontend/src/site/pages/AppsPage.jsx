import React from "react";
import Layout, { usePageMeta } from "../components/Layout";
import AppCard from "../components/AppCard";
import { APPS } from "../../data/apps";

export default function AppsPage() {
  usePageMeta({ title: "Apps", description: "All apps by Iron Rabbit Apps. Offline-first, privacy-friendly software." });

  return (
    <Layout>
      <section className="page-header">
        <div className="site-container">
          <h1 className="page-title">Apps</h1>
          <p className="page-lead">
            Every app is offline-first, privacy-respecting, and free to use. More releases coming soon.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="site-container">
          <div className="apps-grid" data-testid="apps-grid">
            {APPS.map(app => <AppCard key={app.slug} app={app} />)}
          </div>
          {APPS.length < 3 && (
            <div className="apps-placeholder" data-testid="apps-placeholder">
              <div className="placeholder-card">
                <div className="placeholder-icon">?</div>
                <h4>More coming soon</h4>
                <p>We're crafting the next release. Stay tuned.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
