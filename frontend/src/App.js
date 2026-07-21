import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Toaster } from "sonner";
import "./site/site.css";

import HomePage from "./site/pages/HomePage";
import AppsPage from "./site/pages/AppsPage";
import AppDetailPage from "./site/pages/AppDetailPage";
import AboutPage from "./site/pages/AboutPage";
import SupportPage from "./site/pages/SupportPage";
import PrivacyPage from "./site/pages/PrivacyPage";
import TermsPage from "./site/pages/TermsPage";
import ContactPage from "./site/pages/ContactPage";
import NotesApp from "./NotesApp";

function NotFound() {
  return (
    <div style={{ padding: "6rem 2rem", textAlign: "center", background: "#FAF7F2", minHeight: "100vh", fontFamily: "'Manrope', sans-serif" }}>
      <h1 style={{ fontSize: "3rem", fontWeight: 800, color: "#1C1917", marginBottom: "1rem" }}>404</h1>
      <p style={{ color: "#57534E", marginBottom: "2rem" }}>Page not found.</p>
      <Link to="/" style={{ color: "#B34A2C", fontWeight: 600, textDecoration: "none" }}>← Back home</Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Company Website */}
        <Route path="/" element={<HomePage />} />
        <Route path="/apps" element={<AppsPage />} />
        <Route path="/apps/:slug" element={<AppDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Notes App (embedded) */}
        <Route path="/apps/iron-rabbit-notes/launch" element={<NotesApp />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
