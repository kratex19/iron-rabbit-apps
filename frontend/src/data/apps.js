// data/apps.js
// Single source of truth for all Iron Rabbit apps.
// Add a new app here and it automatically appears everywhere.

export const APPS = [
  {
    slug: "iron-rabbit-notes",
    name: "Iron Rabbit Notes",
    tagline: "Notes & reminders that never leave your device.",
    shortDescription: "A private, offline-first notes and reminders app with calendar, categories, and calculator built in. No account. No cloud. No compromises.",
    longDescription: `Iron Rabbit Notes is built for people who want their notes to be truly theirs.
    
Everything you write is stored on your device. There is no cloud database, no user account, and no server that ever sees your data. Your notes load instantly, work without internet, and cost nothing to keep running.

Whether you're tracking work hours with the built-in calculator, setting daily reminders for medications, or organizing weekly grocery lists, Iron Rabbit Notes stays out of your way and respects your privacy.`,
    icon: null, // Will render initials
    color: "#B34A2C", // Burnt sienna
    accent: "#C97A56",
    features: [
      { title: "100% Offline", description: "Every note stored on your device. Works with no internet, ever." },
      { title: "Local Reminders", description: "Native device notifications with custom sounds and haptic feedback." },
      { title: "Built-in Calculator", description: "Do math and paste the result straight into your note — perfect for hours worked." },
      { title: "Categories & Tags", description: "Organize with categories, subcategories, colors, and full-text search." },
      { title: "Full-screen View", description: "Tap any note to open it in a distraction-free 90% screen view." },
      { title: "Backup & Restore", description: "Export all your data to a single file. Restore anytime, anywhere." },
      { title: "Recurring Reminders", description: "Daily, weekly, or monthly repeats — set it once and forget it." },
      { title: "PDF Export", description: "Print or share every note in a clean PDF with one tap." },
    ],
    version: "1.0.0",
    releaseDate: "2026-03-01",
    playStoreUrl: null, // Coming soon
    appStoreUrl: null, // Coming soon
    webAppUrl: "/apps/iron-rabbit-notes/launch",
    supportUrl: "/support",
    privacyUrl: "/privacy",
    termsUrl: "/terms",
    faqs: [
      { q: "Where are my notes stored?", a: "Every note lives inside your device's local storage. Nothing is ever uploaded to a server." },
      { q: "Do I need an account?", a: "No. Iron Rabbit Notes has no login, no sign-up, and no user tracking." },
      { q: "How much does it cost?", a: "The free version has no ads and no time limit. Optional cloud sync will be offered as a paid upgrade in the future." },
      { q: "How do I move my notes to a new device?", a: "Use Backup in Settings to export a file, then Restore that file on the new device." },
      { q: "Can I share notes with someone?", a: "Yes — each note has a Share button that lets you send it via email, SMS, or copy to clipboard." },
    ],
    versionHistory: [
      { version: "1.0.0", date: "2026-03-01", notes: "Initial release. Offline notes, reminders, categories, calculator, backup/restore, PDF export." },
    ],
  },
];

export const getAppBySlug = (slug) => APPS.find(a => a.slug === slug);
