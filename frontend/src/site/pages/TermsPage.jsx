import React from "react";
import Layout, { usePageMeta } from "../components/Layout";

export default function TermsPage() {
  usePageMeta({ title: "Terms of Service", description: "Terms of service for Iron Rabbit Apps." });
  return (
    <Layout>
      <section className="page-header">
        <div className="site-container">
          <h1 className="page-title">Terms of Service</h1>
          <p className="page-lead">Last updated: March 2026</p>
        </div>
      </section>

      <section className="section">
        <div className="site-container">
          <div className="prose-block prose-legal">
            <h2>Acceptance of terms</h2>
            <p>
              By using any Iron Rabbit Apps software, you agree to these terms. If you do not agree,
              simply do not use the software.
            </p>

            <h2>License</h2>
            <p>
              Iron Rabbit Apps grants you a personal, non-exclusive license to use our software for
              your own purposes. You may not resell, sublicense, or redistribute the software.
            </p>

            <h2>Your data</h2>
            <p>
              You retain all rights to any content you create using our apps. We do not claim any
              ownership over your notes, reminders, or files.
            </p>

            <h2>No warranty</h2>
            <p>
              Our apps are provided "as is" without warranty of any kind. We are not liable for any
              data loss, and strongly recommend using the built-in Backup feature regularly.
            </p>

            <h2>Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, Iron Rabbit Apps is not liable for any indirect,
              incidental, or consequential damages arising from use of our software.
            </p>

            <h2>Changes to the service</h2>
            <p>
              We may update, add, or remove features at any time. Because your data lives on your
              device, updates cannot cause remote data loss — but we still recommend regular backups.
            </p>

            <h2>Governing law</h2>
            <p>These terms are governed by the laws of the jurisdiction in which Iron Rabbit Apps operates.</p>

            <h2>Contact</h2>
            <p>Questions about these terms? Email <a href="mailto:support@otropis.com">support@otropis.com</a>.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
