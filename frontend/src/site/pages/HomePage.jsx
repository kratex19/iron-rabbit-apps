import React from "react";
import { Link } from "react-router-dom";
import Layout, { usePageMeta } from "../components/Layout";
import AppCard from "../components/AppCard";
import { APPS } from "../../data/apps";
import { ArrowRight, Shield, Zap, Heart, Sparkles } from "lucide-react";

export default function HomePage() {
  usePageMeta({
    title: "Home",
    description: "Iron Rabbit Apps builds small, focused mobile and web apps that respect your privacy. Offline-first, no accounts, no ads.",
  });

  const featuredApp = APPS[0];

  return (
    <Layout>
      {/* Hero */}
      <section className="hero" data-testid="home-hero">
        <div className="site-container">
          <div className="hero-inner">
            <div className="hero-eyebrow">Iron Rabbit Apps · Est. 2026</div>
            <h1 className="hero-title">
              Small apps.<br />
              <span className="hero-accent">Big respect for your privacy.</span>
            </h1>
            <p className="hero-lead">
              We build offline-first tools that live on your device — not on a server.
              No accounts, no ads, no data collection. Just software that works.
            </p>
            <div className="hero-actions">
              <Link to="/site/apps" className="btn btn-primary" data-testid="hero-cta-apps">
                Browse apps <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/site/about" className="btn btn-ghost" data-testid="hero-cta-about">
                Our story
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="section-alt">
        <div className="site-container">
          <div className="values-grid">
            <div className="value-card">
              <Shield className="value-icon" />
              <h3>Privacy by default</h3>
              <p>Every app is built offline-first. Your data lives on your device, never on ours.</p>
            </div>
            <div className="value-card">
              <Zap className="value-icon" />
              <h3>Fast &amp; light</h3>
              <p>Launches instantly, sips battery, and works even when you have no signal.</p>
            </div>
            <div className="value-card">
              <Heart className="value-icon" />
              <h3>Honest pricing</h3>
              <p>Free forever core. Optional paid upgrades — never subscriptions for basics.</p>
            </div>
            <div className="value-card">
              <Sparkles className="value-icon" />
              <h3>Focused design</h3>
              <p>Every screen has one job. No bloat, no dark patterns, no upsells.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured App */}
      <section className="section">
        <div className="site-container">
          <div className="section-head">
            <h2>Featured app</h2>
            <Link to="/site/apps" className="section-link">See all apps <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="featured-app-wrap">
            <AppCard app={featuredApp} featured />
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="section-alt">
        <div className="site-container">
          <div className="split">
            <div>
              <h2 className="split-title">Why choose Iron Rabbit?</h2>
              <p className="split-lead">
                Most apps treat your data like a product. We treat it like your property.
              </p>
              <ul className="check-list">
                <li>Every app works completely offline</li>
                <li>Nothing syncs unless you explicitly ask</li>
                <li>You own an exportable file of all your data</li>
                <li>Zero tracking, zero analytics on your content</li>
                <li>Built to run without our servers — so we can't hold your data hostage</li>
              </ul>
            </div>
            <div className="testimonial-placeholder">
              <div className="quote-mark">"</div>
              <p className="quote-body">
                We're just getting started — customer testimonials will appear here as users
                begin sharing their experience with our apps.
              </p>
              <span className="quote-author">— Coming soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-band">
        <div className="site-container cta-band-inner">
          <div>
            <h2>Try our first release</h2>
            <p>Iron Rabbit Notes is ready to use in your browser right now — no install required.</p>
          </div>
          <Link to={`/site/apps/${featuredApp.slug}`} className="btn btn-primary" data-testid="cta-notes">
            Open Iron Rabbit Notes <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </Layout>
  );
}
