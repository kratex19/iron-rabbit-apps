import React from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer" data-testid="site-footer">
      <div className="site-container">
        <div className="footer-grid">
          <div>
            <div className="brand mb-3">
              <span className="brand-mark">IR</span>
              <span className="brand-text">
                <span className="brand-name">Iron Rabbit Apps</span>
                <span className="brand-tld">otropis.com</span>
              </span>
            </div>
            <p className="footer-tagline">
              Small, focused apps that respect your privacy. Built with care.
            </p>
          </div>

          <div>
            <h4 className="footer-heading">Company</h4>
            <ul className="footer-list">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/apps">Apps</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Support</h4>
            <ul className="footer-list">
              <li><Link to="/support">Help Center</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li>
                <a href="mailto:support@otropis.com" className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> support@otropis.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {year} Iron Rabbit Apps. All rights reserved.</span>
          <span className="footer-domain">www.otropis.com</span>
        </div>
      </div>
    </footer>
  );
}
