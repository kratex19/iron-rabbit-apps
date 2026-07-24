import React from "react";
import { Link } from "react-router-dom";
import Layout, { usePageMeta } from "../components/Layout";
import { POSTS } from "../../data/posts";
import { ArrowRight, Calendar, User } from "lucide-react";

export default function BlogPage() {
  usePageMeta({ title: "Blog", description: "News, releases, and thinking from Iron Rabbit Apps." });
  const sorted = [...POSTS].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <Layout>
      <section className="page-header">
        <div className="site-container">
          <h1 className="page-title">Blog & News</h1>
          <p className="page-lead">Release notes, engineering posts, and the occasional opinion.</p>
        </div>
      </section>

      <section className="section">
        <div className="site-container">
          <div className="blog-grid" data-testid="blog-grid">
            {sorted.map(post => (
              <Link key={post.slug} to={`/site/blog/${post.slug}`} className="blog-card" data-testid={`blog-card-${post.slug}`}>
                <div className="blog-card-cover" style={{ background: `linear-gradient(135deg, ${post.coverColor}, ${post.coverColor}CC)` }}>
                  <div className="blog-card-cover-title">{post.title}</div>
                </div>
                <div className="blog-card-body">
                  <div className="blog-card-meta">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {post.author}</span>
                  </div>
                  <h3 className="blog-card-title">{post.title}</h3>
                  <p className="blog-card-excerpt">{post.excerpt}</p>
                  <div className="blog-card-tags">
                    {post.tags.map(t => <span key={t} className="blog-tag">{t}</span>)}
                  </div>
                  <span className="blog-card-read">Read post <ArrowRight className="w-4 h-4" /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
