import React from "react";
import Layout, { usePageMeta } from "../components/Layout";
import { Mail, LifeBuoy, MessageCircle, Wrench } from "lucide-react";

const FAQS = [
  { q: "How do I back up my notes?", a: "Open Settings inside any Iron Rabbit app, tap Export Backup, and save the .json file somewhere safe (email to yourself, cloud drive, USB, etc)." },
  { q: "How do I restore from a backup?", a: "Open Settings, tap Restore, choose your backup file. Any notes not already on this device will be added — nothing is overwritten." },
  { q: "My notes disappeared after clearing browser data — can I get them back?", a: "If you exported a backup, yes — just Restore it. Without a backup we cannot recover them because we never store your data on a server." },
  { q: "Do I need an account?", a: "No. There's no signup or login. Just open the app and start writing." },
  { q: "Which browsers/devices are supported?", a: "Any modern browser (Chrome, Safari, Firefox, Edge) on desktop or mobile. Native Android and iOS versions are on the way." },
  { q: "Is there a subscription?", a: "The core app is free forever. Optional cloud sync will be a one-time or low-cost add-on when it launches." },
];

export default function SupportPage() {
  usePageMeta({ title: "Support", description: "Get help with Iron Rabbit Apps. FAQ, troubleshooting, and email support." });
  return (
    <Layout>
      <section className="page-header">
        <div className="site-container">
          <h1 className="page-title">Support</h1>
          <p className="page-lead">Questions, bugs, or feature requests — we'd love to hear from you.</p>
        </div>
      </section>

      <section className="section">
        <div className="site-container">
          <div className="support-grid">
            <a href="mailto:support@ironrabbitapps.com" className="support-card" data-testid="support-email">
              <Mail className="support-icon" />
              <h3>Email support</h3>
              <p>support@ironrabbitapps.com — we reply within 2 business days.</p>
            </a>
            <div className="support-card">
              <LifeBuoy className="support-icon" />
              <h3>Troubleshooting</h3>
              <p>Try Backup + Reinstall + Restore. Most issues resolve within minutes.</p>
            </div>
            <div className="support-card">
              <Wrench className="support-icon" />
              <h3>Feature requests</h3>
              <p>We read every message. Send ideas to support@ironrabbitapps.com.</p>
            </div>
            <div className="support-card">
              <MessageCircle className="support-icon" />
              <h3>Update news</h3>
              <p>Follow the Apps page for release notes and new arrivals.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-alt">
        <div className="site-container">
          <h2 className="section-title">Frequently asked</h2>
          <div className="faq-list">
            {FAQS.map((faq, i) => (
              <details key={i} className="faq-item">
                <summary>
                  <span>{faq.q}</span>
                </summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
