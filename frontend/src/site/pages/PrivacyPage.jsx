import React from "react";
import Layout, { usePageMeta } from "../components/Layout";

export default function PrivacyPage() {
  usePageMeta({ title: "Privacy Policy", description: "Iron Rabbit Apps privacy policy — we do not collect your data." });
  return (
    <Layout>
      <section className="page-header">
        <div className="site-container">
          <h1 className="page-title">Privacy Policy</h1>
          <p className="page-lead">Last updated: March 2026</p>
        </div>
      </section>

      <section className="section">
        <div className="site-container">
          <div className="prose-block prose-legal">
            <h2>Summary</h2>
            <p>
              Iron Rabbit Apps does not collect, store, sell, or share your personal data. Our apps
              are designed to run entirely on your device.
            </p>

            <h2>Data we collect</h2>
            <p><strong>None.</strong> Our apps do not include user accounts, analytics on your notes,
            or any telemetry that identifies you. All content you create (notes, reminders, settings,
            attachments) is stored locally in your device's browser storage or filesystem.</p>

            <h2>Local device storage</h2>
            <p>
              Our apps use your device's IndexedDB / localStorage to save your data. This data never
              leaves your device unless you explicitly export a backup file yourself.
            </p>

            <h2>Third parties</h2>
            <p>We do not share data with third parties because we do not have your data to share.</p>

            <h2>Backups you create</h2>
            <p>
              When you export a backup, the resulting file is under your control. Where you store it
              (email, cloud drive, USB) is governed by that service's own privacy policy.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about this policy? Email us at <a href="mailto:support@ironrabbitapps.com">support@ironrabbitapps.com</a>.
            </p>

            <h2>Changes</h2>
            <p>
              If this policy ever changes, we'll update the "Last updated" date above and post a
              notice on the app page. We will never retroactively start collecting data without notice.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
