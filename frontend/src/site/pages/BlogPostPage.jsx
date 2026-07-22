import React from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import Layout, { usePageMeta } from "../components/Layout";
import { getPostBySlug, POSTS } from "../../data/posts";
import { ArrowLeft, ArrowRight, Calendar, User } from "lucide-react";

// Very small markdown-ish renderer: **bold** and paragraph breaks and [links](url)
function renderInline(text) {
  const parts = [];
  let i = 0;
  const push = (s) => { if (s) parts.push(s); };

  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0; let m;
  while ((m = linkRe.exec(text)) !== null) {
    push(text.slice(last, m.index));
    parts.push(<Link key={m.index} to={m[2]} className="post-link">{m[1]}</Link>);
    last = m.index + m[0].length;
    i++;
  }
  push(text.slice(last));

  // Convert **bold** in string parts
  return parts.flatMap((chunk, idx) => {
    if (typeof chunk !== "string") return [chunk];
    const bits = chunk.split(/(\*\*[^*]+\*\*)/g);
    return bits.map((b, j) => {
      if (b.startsWith("**") && b.endsWith("**")) return <strong key={`${idx}-${j}`}>{b.slice(2, -2)}</strong>;
      return b;
    });
  });
}

function renderBody(body) {
  return body.split("\n\n").map((para, i) => {
    if (para.startsWith("- ")) {
      const items = para.split("\n").map(l => l.replace(/^- /, ""));
      return <ul key={i} className="post-list">{items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>;
    }
    return <p key={i}>{renderInline(para)}</p>;
  });
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);
  usePageMeta({ title: post?.title || "Post", description: post?.excerpt || "" });

  if (!post) return <Navigate to="/blog" replace />;

  const sorted = [...POSTS].sort((a, b) => new Date(b.date) - new Date(a.date));
  const idx = sorted.findIndex(p => p.slug === post.slug);
  const nextPost = sorted[idx - 1];
  const prevPost = sorted[idx + 1];

  return (
    <Layout>
      <section className="post-hero" style={{ background: `linear-gradient(135deg, ${post.coverColor}, ${post.coverColor}DD)` }}>
        <div className="site-container">
          <Link to="/blog" className="post-back" data-testid="back-to-blog">
            <ArrowLeft className="w-4 h-4" /> Back to blog
          </Link>
          <div className="post-tags">
            {post.tags.map(t => <span key={t} className="post-tag">{t}</span>)}
          </div>
          <h1 className="post-title">{post.title}</h1>
          <div className="post-meta">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {post.author}</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="site-container">
          <article className="post-body" data-testid="post-body">
            {renderBody(post.body)}
          </article>
        </div>
      </section>

      <section className="section-alt">
        <div className="site-container">
          <div className="post-nav">
            {prevPost ? (
              <Link to={`/blog/${prevPost.slug}`} className="post-nav-card" data-testid="prev-post">
                <span className="post-nav-label"><ArrowLeft className="w-3 h-3" /> Older</span>
                <span className="post-nav-title">{prevPost.title}</span>
              </Link>
            ) : <div />}
            {nextPost ? (
              <Link to={`/blog/${nextPost.slug}`} className="post-nav-card post-nav-card-right" data-testid="next-post">
                <span className="post-nav-label">Newer <ArrowRight className="w-3 h-3" /></span>
                <span className="post-nav-title">{nextPost.title}</span>
              </Link>
            ) : <div />}
          </div>
        </div>
      </section>
    </Layout>
  );
}
