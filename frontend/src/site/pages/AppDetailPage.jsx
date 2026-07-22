import React from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import Layout, { usePageMeta } from "../components/Layout";
import ScreenshotGallery from "../components/ScreenshotGallery";
import { getAppBySlug } from "../../data/apps";
import { ArrowRight, Play, Apple, ExternalLink, ChevronDown } from "lucide-react";

export default function AppDetailPage() {
  const { slug } = useParams();
  const app = getAppBySlug(slug);

  usePageMeta({
    title: app?.name || "App",
    description: app?.shortDescription || "",
  });

  if (!app) return <Navigate to="/apps" replace />;

  return (
    <Layout>
      {/* App Hero */}
      <section className="app-hero" style={{ background: `linear-gradient(135deg, ${app.color}, ${app.accent})` }} data-testid="app-hero">
        <div className="site-container">
          <div className="app-hero-inner">
            <div className="app-hero-icon">
              {app.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
            </div>
            <div>
              <div className="app-hero-eyebrow">v{app.version} · Released {new Date(app.releaseDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              <h1 className="app-hero-title">{app.name}</h1>
              <p className="app-hero-tagline">{app.tagline}</p>
              <div className="app-hero-actions">
                {app.webAppUrl && (
                  <a href={app.webAppUrl} className="btn btn-white" data-testid="app-launch-btn">
                    Open web app <ArrowRight className="w-4 h-4" />
                  </a>
                )}
                {app.playStoreUrl ? (
                  <a href={app.playStoreUrl} className="btn btn-outline-white" target="_blank" rel="noopener noreferrer">
                    <Play className="w-4 h-4" /> Google Play
                  </a>
                ) : (
                  <span className="btn btn-disabled"><Play className="w-4 h-4" /> Google Play · Soon</span>
                )}
                {app.appStoreUrl ? (
                  <a href={app.appStoreUrl} className="btn btn-outline-white" target="_blank" rel="noopener noreferrer">
                    <Apple className="w-4 h-4" /> App Store
                  </a>
                ) : (
                  <span className="btn btn-disabled"><Apple className="w-4 h-4" /> App Store · Soon</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots Gallery */}
      {app.screenshots?.length > 0 && (
        <section className="section">
          <div className="site-container">
            <h2 className="section-title">Screenshots</h2>
            <ScreenshotGallery screenshots={app.screenshots} accent={app.color} />
          </div>
        </section>
      )}

      {/* Description */}
      <section className="section-alt">
        <div className="site-container">
          <div className="prose-block">
            <h2>About this app</h2>
            {app.longDescription.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <div className="site-container">
          <h2 className="section-title">Features</h2>
          <div className="features-grid" data-testid="app-features">
            {app.features.map((f, i) => (
              <div key={i} className="feature-item">
                <div className="feature-num" style={{ color: app.color }}>{String(i + 1).padStart(2, '0')}</div>
                <h4>{f.title}</h4>
                <p>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      {app.faqs?.length > 0 && (
        <section className="section-alt">
          <div className="site-container">
            <h2 className="section-title">Frequently asked</h2>
            <div className="faq-list" data-testid="app-faqs">
              {app.faqs.map((faq, i) => (
                <details key={i} className="faq-item">
                  <summary>
                    <span>{faq.q}</span>
                    <ChevronDown className="faq-chevron w-4 h-4" />
                  </summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Version History */}
      {app.versionHistory?.length > 0 && (
        <section className="section">
          <div className="site-container">
            <h2 className="section-title">Version history</h2>
            <div className="version-list">
              {app.versionHistory.map((v, i) => (
                <div key={i} className="version-item">
                  <div className="version-tag">v{v.version}</div>
                  <div className="version-body">
                    <div className="version-date">{new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <p>{v.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Legal Links */}
      <section className="section-alt">
        <div className="site-container">
          <div className="legal-links">
            <Link to={app.supportUrl}>Support <ExternalLink className="w-3.5 h-3.5" /></Link>
            <Link to={app.privacyUrl}>Privacy Policy <ExternalLink className="w-3.5 h-3.5" /></Link>
            <Link to={app.termsUrl}>Terms of Service <ExternalLink className="w-3.5 h-3.5" /></Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
