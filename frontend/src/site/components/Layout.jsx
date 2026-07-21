import React, { useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";

// SEO helper: manages page title and meta tags
export function usePageMeta({ title, description }) {
  useEffect(() => {
    if (title) document.title = `${title} · Iron Rabbit Apps`;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [title, description]);
}

export default function Layout({ children }) {
  return (
    <div className="site-root" data-testid="site-root">
      <Header />
      <main className="site-main">{children}</main>
      <Footer />
    </div>
  );
}
