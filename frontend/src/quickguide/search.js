/**
 * Quick Guide search — shared ranking helper used by:
 *   • Settings → Quick Guides search bar
 *   • Quick Guide modal in-place search
 *
 * Weights (highest first):
 *   title × 5   — the most direct signal
 *   id    × 4   — power users searching "IRR-1400"
 *   summary × 3 — one-liner description
 *   keywords × 2, synonyms × 2 — curated match terms
 *   card body × 1 — deep match for anything the guide teaches
 */

export function scoreArticle(article, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return 0;
  const hay = {
    title: (article.title || "").toLowerCase(),
    id: (article.id || "").toLowerCase(),
    summary: (article.summary || "").toLowerCase(),
    keywords: (article.keywords || []).join(" ").toLowerCase(),
    synonyms: (article.synonyms || []).join(" ").toLowerCase(),
    cards: (article.cards || []).map(c => `${c.heading || ""} ${c.body || ""}`).join(" ").toLowerCase(),
  };
  let score = 0;
  if (hay.title.includes(q)) score += 5;
  if (hay.id.includes(q)) score += 4;
  if (hay.summary.includes(q)) score += 3;
  if (hay.keywords.includes(q)) score += 2;
  if (hay.synonyms.includes(q)) score += 2;
  if (hay.cards.includes(q)) score += 1;
  return score;
}

export function searchArticles(articles, query, limit = 8, { excludeId } = {}) {
  if (!query || !query.trim()) return [];
  return (articles || [])
    .filter(a => (excludeId ? a.id !== excludeId : true))
    .map(a => ({ article: a, score: scoreArticle(a, query) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
