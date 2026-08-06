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
import BlogPage from "./site/pages/BlogPage";
import BlogPostPage from "./site/pages/BlogPostPage";
import NotesApp from "./NotesApp";
import CommunityDashboard from "./admin/CommunityDashboard";

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
      <Toaster position="bottom-right" />
      <Routes>
        {/* Notes App — default landing */}
        <Route path="/" element={<NotesApp />} />
        {/* Legacy alias so existing links keep working */}
        <Route path="/apps/iron-rabbit-notes/launch" element={<NotesApp />} />

        {/* Community Dashboard — admin-only, gated by ADMIN_TOKEN */}
        <Route path="/admin/community" element={<CommunityDashboard />} />

        {/* Company Website — nested under /site (will move to ironrabbitapps.com) */}
        <Route path="/site" element={<HomePage />} />
        <Route path="/site/apps" element={<AppsPage />} />
        <Route path="/site/apps/:slug" element={<AppDetailPage />} />
        <Route path="/site/about" element={<AboutPage />} />
        <Route path="/site/support" element={<SupportPage />} />
        <Route path="/site/privacy" element={<PrivacyPage />} />
        <Route path="/site/terms" element={<TermsPage />} />
        <Route path="/site/contact" element={<ContactPage />} />
        <Route path="/site/blog" element={<BlogPage />} />
        <Route path="/site/blog/:slug" element={<BlogPostPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
