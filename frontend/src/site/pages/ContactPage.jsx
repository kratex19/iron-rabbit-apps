import React, { useState } from "react";
import Layout, { usePageMeta } from "../components/Layout";
import { Mail, Send, Check } from "lucide-react";
import { toast } from "sonner";

export default function ContactPage() {
  usePageMeta({ title: "Contact", description: "Get in touch with Iron Rabbit Apps." });
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Open email client with pre-filled content (no backend needed)
    const body = `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`;
    window.location.href = `mailto:support@otropis.com?subject=${encodeURIComponent(form.subject || 'Contact from otropis.com')}&body=${encodeURIComponent(body)}`;
    setSent(true);
    toast.success("Opening your email client...");
  };

  return (
    <Layout>
      <section className="page-header">
        <div className="site-container">
          <h1 className="page-title">Contact us</h1>
          <p className="page-lead">Questions, ideas, or bug reports — we read everything.</p>
        </div>
      </section>

      <section className="section">
        <div className="site-container">
          <div className="contact-grid">
            <div className="contact-info">
              <h3>Reach out</h3>
              <p>
                The fastest way to get help is by email. We reply within 2 business days.
              </p>
              <a href="mailto:support@otropis.com" className="contact-email" data-testid="contact-email">
                <Mail className="w-5 h-5" /> support@otropis.com
              </a>
              <div className="contact-address">
                <div className="contact-label">Domain</div>
                <div>www.otropis.com</div>
              </div>
              <div className="contact-address">
                <div className="contact-label">Brand</div>
                <div>Iron Rabbit Apps</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="contact-form" data-testid="contact-form">
              <div>
                <label>Your name</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="contact-name" />
              </div>
              <div>
                <label>Your email</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} data-testid="contact-email-input" />
              </div>
              <div>
                <label>Subject</label>
                <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} data-testid="contact-subject" />
              </div>
              <div>
                <label>Message</label>
                <textarea required rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} data-testid="contact-message" />
              </div>
              <button type="submit" className="btn btn-primary" data-testid="contact-submit">
                {sent ? <><Check className="w-4 h-4" /> Sent</> : <><Send className="w-4 h-4" /> Send message</>}
              </button>
              <p className="form-note">Submitting opens your email app pre-filled — nothing is sent to a server.</p>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
}
