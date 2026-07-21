import React from "react";
import { Link } from "react-router-dom";
import { APPS } from "../../data/apps";
import { ChevronRight, Smartphone, Apple, Play } from "lucide-react";

export default function AppCard({ app, featured = false }) {
  return (
    <div className={`app-card ${featured ? "app-card-featured" : ""}`} data-testid={`app-card-${app.slug}`}>
      <div className="app-card-header" style={{ background: `linear-gradient(135deg, ${app.color}, ${app.accent})` }}>
        <div className="app-card-icon">
          {app.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
        </div>
        <div className="app-card-badge">v{app.version}</div>
      </div>
      <div className="app-card-body">
        <h3 className="app-card-title">{app.name}</h3>
        <p className="app-card-tagline">{app.tagline}</p>
        <p className="app-card-desc">{app.shortDescription}</p>
        <div className="app-card-stores">
          {app.playStoreUrl ? (
            <a href={app.playStoreUrl} className="store-btn" target="_blank" rel="noopener noreferrer">
              <Play className="w-4 h-4" /> Google Play
            </a>
          ) : (
            <span className="store-btn store-btn-soon"><Play className="w-4 h-4" /> Google Play · Soon</span>
          )}
          {app.appStoreUrl ? (
            <a href={app.appStoreUrl} className="store-btn" target="_blank" rel="noopener noreferrer">
              <Apple className="w-4 h-4" /> App Store
            </a>
          ) : (
            <span className="store-btn store-btn-soon"><Apple className="w-4 h-4" /> App Store · Soon</span>
          )}
        </div>
        <Link to={`/apps/${app.slug}`} className="app-card-cta" data-testid={`app-details-${app.slug}`}>
          Learn more <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
