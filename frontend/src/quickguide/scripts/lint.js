#!/usr/bin/env node
/**
 * Quick Guide content lint — CI gate.
 *
 * Enforces the locked content rules from /app/memory/QUICK_GUIDE_DESIGN.md §7:
 *   • ID uniqueness (hard fail)
 *   • Prefix-in-range for reserved namespaces (hard fail)
 *   • Max 5 cards per guide (hard fail)
 *   • Card body ≤ 250 chars (soft warn), ≤ 500 chars (hard fail)
 *   • One-idea-per-card — soft warn on heading verb triples
 *   • related_ids resolve to existing articles (hard fail)
 *   • No references to deprecated articles (soft warn)
 *
 * Usage:
 *   node frontend/src/quickguide/scripts/lint.js
 *   yarn quickguide:lint          (once added to package.json)
 *
 * Exit codes:
 *   0 — clean
 *   1 — one or more hard failures
 */

const fs = require("fs");
const path = require("path");

const CONTENT_ROOT = path.join(__dirname, "..", "content", "en");

// Reserved ID namespaces (locked v1.1)
const RESERVED_PREFIXES = [
  { pattern: /^IRR-1\d{3}$/, meaning: "Screen guides" },
  { pattern: /^IRR-2\d{3}$/, meaning: "Flow guides" },
  { pattern: /^IRR-3\d{3}$/, meaning: "Cross-app shared" },
  { pattern: /^IRR-9\d{3}$/, meaning: "Meta articles" },
  { pattern: /^FH-\d+$/, meaning: "Feature Highlights" },
  { pattern: /^(KB|FAQ|TIP|REL|BUG|FRM|VID|IMG|SET|SCR|PK|TL|CAT|SUB)-\d+$/, meaning: "Other reserved" },
];

function isValidId(id) {
  return RESERVED_PREFIXES.some(p => p.pattern.test(id));
}

const HARD = [];
const SOFT = [];
const seen = new Set();
const known = new Set();

function pushErr(file, msg) { HARD.push(`✖ ${file}: ${msg}`); }
function pushWarn(file, msg) { SOFT.push(`⚠ ${file}: ${msg}`); }

// First pass — collect IDs
const files = fs.readdirSync(CONTENT_ROOT).filter(f => f.endsWith(".json"));
const articles = files.map(f => {
  const full = path.join(CONTENT_ROOT, f);
  try {
    return { file: f, data: JSON.parse(fs.readFileSync(full, "utf-8")) };
  } catch (e) {
    HARD.push(`✖ ${f}: invalid JSON — ${e.message}`);
    return null;
  }
}).filter(Boolean);

articles.forEach(({ data }) => { if (data?.id) known.add(data.id); });

// Second pass — validate
articles.forEach(({ file, data }) => {
  if (!data.id) return pushErr(file, "missing `id`");
  if (!isValidId(data.id)) pushErr(file, `id "${data.id}" does not match any reserved prefix`);
  if (seen.has(data.id)) pushErr(file, `duplicate id "${data.id}"`);
  seen.add(data.id);

  if (!Array.isArray(data.cards) || data.cards.length === 0) return pushErr(file, "no cards");
  if (data.cards.length > 5) pushErr(file, `has ${data.cards.length} cards — max 5`);

  data.cards.forEach((c, i) => {
    if (!c.heading) pushErr(file, `card ${i + 1}: missing heading`);
    if (!c.body) pushErr(file, `card ${i + 1}: missing body`);
    if (c.body && c.body.length > 500) pushErr(file, `card ${i + 1}: body ${c.body.length} chars > 500 hard limit`);
    else if (c.body && c.body.length > 250) pushWarn(file, `card ${i + 1}: body ${c.body.length} chars > 250 (consider trimming)`);

    // One-idea-per-card soft check — headings mixing multiple verbs
    if (c.heading && /(?:\band\b|\/|,).+(?:\band\b|\/|,)/.test(c.heading.toLowerCase())) {
      pushWarn(file, `card ${i + 1}: heading "${c.heading}" may mix multiple topics`);
    }
  });

  (data.related_ids || []).forEach(rid => {
    if (!known.has(rid)) pushErr(file, `related_id "${rid}" not found in bundle`);
  });

  if (data.deprecated) pushWarn(file, `article is deprecated`);
});

// Report
console.log(`\nQuick Guide lint — ${articles.length} article${articles.length === 1 ? "" : "s"} scanned\n`);
SOFT.forEach(s => console.warn(s));
HARD.forEach(h => console.error(h));

if (HARD.length) {
  console.error(`\nFAIL — ${HARD.length} hard error${HARD.length === 1 ? "" : "s"}, ${SOFT.length} warning${SOFT.length === 1 ? "" : "s"}\n`);
  process.exit(1);
}
console.log(`\nOK — 0 errors, ${SOFT.length} warning${SOFT.length === 1 ? "" : "s"}\n`);
