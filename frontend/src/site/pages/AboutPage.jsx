import React from "react";
import Layout, { usePageMeta } from "../components/Layout";

export default function AboutPage() {
  usePageMeta({ title: "About", description: "About Iron Rabbit Apps — a small studio building privacy-first software." });
  return (
    <Layout>
      <section className="page-header">
        <div className="site-container">
          <h1 className="page-title">About Iron Rabbit Apps</h1>
          <p className="page-lead">
            A one-person studio building small, honest software.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="site-container">
          <div className="prose-block">
            <h2>Our mission</h2>
            <p>
              We believe great software doesn't have to spy on you. Iron Rabbit Apps exists to prove
              that everyday tools — notes, reminders, calendars — can be genuinely useful without
              collecting your data, requiring an account, or nagging you for a subscription.
            </p>

            <h2>How we're different</h2>
            <p>
              Every app we release is <strong>offline-first</strong>. That means your notes, tasks,
              and settings live on your device. Not our server. Not the cloud. Yours.
            </p>
            <p>
              When we do offer cloud features later, they'll be optional add-ons — never a
              requirement for the app to work.
            </p>

            <h2>Coming soon</h2>
            <p>
              More apps are on the way. Follow along at <a href="/site/apps">our apps page</a> to see
              what we're releasing next.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
