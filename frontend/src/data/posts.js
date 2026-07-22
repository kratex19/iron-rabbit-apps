// data/posts.js
// Single source of truth for blog / news posts.
// Add a new post here and it appears automatically in listing + own detail page.

export const POSTS = [
  {
    slug: "hello-iron-rabbit",
    title: "Hello, Iron Rabbit Apps",
    excerpt: "Why we started a tiny software studio focused on offline-first, privacy-respecting apps — and what to expect from our first releases.",
    author: "Iron Rabbit Team",
    date: "2026-03-01",
    tags: ["Announcements", "About"],
    coverColor: "#B34A2C",
    body: `We're kicking off Iron Rabbit Apps to build something different: small, focused tools that don't require an account, don't collect your data, and keep working when you're offline.

Every app we ship follows the same rules:

**1. Your data lives on your device.**
No cloud database. No server that sees your content. Just local storage that you fully control.

**2. Nothing syncs unless you explicitly ask.**
Cloud sync will be an optional paid upgrade — never a requirement for the app to function.

**3. Free means free.**
No ads. No dark patterns. No timers pushing you to a subscription for basic features.

Our first release is **Iron Rabbit Notes** — a notes-and-reminders app with a built-in calculator, alarms, categories, and one-tap backup. It runs entirely in your browser (native apps are on the way) and costs nothing to keep running because we don't operate any infrastructure for it.

More apps are coming. Thanks for stopping by — we're excited to build with you.`,
  },
  {
    slug: "why-offline-first",
    title: "Why we build offline-first",
    excerpt: "The trade-off most apps make silently — and why we refuse to make it.",
    author: "Iron Rabbit Team",
    date: "2026-03-05",
    tags: ["Engineering", "Philosophy"],
    coverColor: "#C97A56",
    body: `Most productivity apps today make an unspoken deal with you: "give us your data, and we'll make our lives easier."

Servers cost money. So the app collects your notes, stores them centrally, and monetizes access — through ads, subscriptions, or (worst case) selling metadata. Even the "free" ones need a way to eventually charge you, because their server bill grows every day.

Offline-first flips that equation. When the app runs entirely on your device:

- The developer's costs approach zero, so the app can genuinely stay free
- Your data can't be leaked from a server that doesn't have it
- The app works on airplanes, in basements, and on unreliable connections
- You can back up and move your data anywhere you want

The catch is that offline-first is harder to build. There's no server to enforce structure or resolve conflicts. Every device needs to be self-sufficient. And when we do add cloud sync later, it has to be optional and additive.

We think that trade-off is worth it. Every Iron Rabbit app will start life offline-first, and stay that way.`,
  },
  {
    slug: "notes-1-0-launch",
    title: "Iron Rabbit Notes 1.0 is here",
    excerpt: "Our first app is out — offline notes, reminders, calculator, and backup in one small package.",
    author: "Iron Rabbit Team",
    date: "2026-03-10",
    tags: ["Releases", "Iron Rabbit Notes"],
    coverColor: "#7C3F26",
    body: `Iron Rabbit Notes 1.0 is now available as a web app, with native Android and iOS versions coming shortly.

What you get in 1.0:

- **Local notes** — created, edited, and stored entirely on your device
- **Alarms & reminders** — with custom sounds and haptic feedback, triggered by your device (not our server)
- **Categories & subcategories** — organize however works for you
- **Full-text search** — instant, no indexing service required
- **Built-in calculator** — because tracking hours worked in a note is a pain without it
- **Backup & restore** — export everything to one file, import it later on any device
- **PDF export** — share or archive your notes as a clean PDF
- **Dark & light themes**

There's no signup. Just open the app and start.

Try it now at [/apps/iron-rabbit-notes](/apps/iron-rabbit-notes).`,
  },
];

export const getPostBySlug = (slug) => POSTS.find(p => p.slug === slug);
