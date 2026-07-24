import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { to: "/site", label: "Home" },
  { to: "/site/apps", label: "Apps" },
  { to: "/site/blog", label: "Blog" },
  { to: "/site/about", label: "About" },
  { to: "/site/support", label: "Support" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="site-header" data-testid="site-header">
      <div className="site-container flex items-center justify-between h-16">
        <Link to="/site" className="brand" data-testid="brand-link" onClick={() => setOpen(false)}>
          <span className="brand-mark">IR</span>
          <span className="brand-text">
            <span className="brand-name">Iron Rabbit Apps</span>
            <span className="brand-tld">ironrabbitapps.com</span>
          </span>
        </Link>

        <nav className="site-nav hidden md:flex" aria-label="Main">
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${location.pathname === link.to ? "active" : ""}`}
              data-testid={`nav-${link.label.toLowerCase()}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          className="menu-btn md:hidden"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
          data-testid="mobile-menu-toggle"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="mobile-nav md:hidden" data-testid="mobile-nav">
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`mobile-nav-link ${location.pathname === link.to ? "active" : ""}`}
              onClick={() => setOpen(false)}
              data-testid={`mobile-nav-${link.label.toLowerCase()}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
