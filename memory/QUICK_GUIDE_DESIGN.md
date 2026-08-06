# Iron Rabbit — Quick Guide System

**Design Version:** 1.1 (Locked, Approved)
**Approved:** 2026-02-08
**Status:** DESIGN ONLY — DO NOT IMPLEMENT until Google Play release ships and this doc is explicitly unblocked.
**Owner:** Gary
**Sequencing:** Option A+ — parked for post-Play-launch. Becomes the first major v1.1 enhancement.

---

## ⛔ Boundary Rules for Future Agents

When implementation begins, start from this locked design without redesigning or expanding scope unless specifically requested by the user.

- Do NOT add features not listed here.
- Do NOT rename anything — the vocabulary is final.
- Do NOT refactor `FirstRunTour`, `QuickAccess`, or any existing modal to "share code" with the Quick Guide system. Explicit design decision — see §3.
- Do NOT begin any part of Phase 2+ (editorial content, KB, search, Knowledge Distribution, forums, AI) unless the user says so.
- Do NOT touch any application file until Google Play release is complete AND the user explicitly says "build Quick Guide Phase 1".

---

## 1. Objective

Create a universal, offline-first **Quick Guide** system that teaches new users how to use each screen of the application. Reusable across every current and future Iron Rabbit app. Foundation for the future Iron Rabbit Knowledge Platform.

**This is not a Help System. Not a Knowledge Base. Not Troubleshooting. Not Support.** It is a lightweight, friendly, discovery-based teaching layer.

---

## 2. Vocabulary (Locked)

| Concept | Name in code | Name in UI |
| --- | --- | --- |
| The system | Quick Guide | **Quick Guide** |
| The button icon | `QuickGuideButton` | `?` (familiar question mark) |
| The modal | `QuickGuideModal` | (title displayed as **"Quick Guide"**) |
| The settings section | `QuickGuideSettingsSection` | **"Quick Guides"** |
| The stored articles | `article` / `guide` | **Guide** |
| The individual sliding cards | `QuickGuideCard` | (no user-facing label — dots + swipe) |
| The reserved future website surface | Knowledge Distribution | **"Knowledge Distribution"** |

`?` remains the icon everywhere. When the user taps it, the modal opens with the title **"Quick Guide"**.

---

## 3. Overall Architecture

Content-driven overlay layer that mirrors the visual style of the existing FirstRunTour but is a completely independent module.

```
                    ┌──────────────────────────────────┐
                    │  QuickGuideProvider (context)     │
      Content ────► │   • settings adapter              │ ◄──── SettingsStore
      Bundle        │   • seen-IDs tracker              │
                    │   • triple-tap detector           │
                    │   • deep-link resolver (opt.)     │
                    │   • dormant analytics bus         │
                    │   • feedback recorder             │
                    └──────────┬───────────────────────┘
                               │
              ┌────────────────┼─────────────────────┐
              ▼                ▼                     ▼
     QuickGuideButton   QuickGuideModal      QuickGuideSettingsSection
     (? per screen)     (new component,      (6 rows in existing
                        NOT FirstRunTour)     SettingsModal)
```

**Non-negotiable design rules:**
1. `QuickGuideModal` is a **new file**. It does not import, wrap, or modify `FirstRunTour` or `QuickAccess`. It mirrors their visual language (same card size, animations, chevrons, dot indicators) but ships as independent code in `/frontend/src/quickguide/QuickGuideModal.jsx`.
2. `QuickGuideProvider` mounts once at the app root. All state lives in context — no prop drilling.
3. Content is bundled JSON. No runtime fetching in Phase 1.
4. Everything under `/frontend/src/quickguide/` — zero coupling to Grocery, Notes, Pantry, or any current domain.
5. Visual token constants live in `/quickguide/tokens.js`. FirstRunTour is not modified.

---

## 4. Component Diagram

```
┌──────────────────────── App root ────────────────────────────────┐
│                                                                    │
│  <QuickGuideProvider content={bundle}>                             │
│                                                                    │
│     Per pilot screen (Home / Grocery Lists / Settings):            │
│     ─────────────────────────────────────                          │
│       <QuickGuideButton resourceId="IRR-1000" origin="home"/>      │
│                                                                    │
│     Inside existing SettingsModal:                                 │
│     ────────────────────────────                                   │
│       <QuickGuideSettingsSection/>  (6 rows, collapsible)          │
│                                                                    │
│     Portal (mounted once at root):                                 │
│     ───────────────────────                                        │
│       <QuickGuideModal>                                            │
│         ┌────────────────────────────────────────┐                 │
│         │ Quick Guide            [X]              │                │
│         │                                         │                │
│         │        ← Card N of 5 →                  │                │
│         │       [swipeable card body]             │                │
│         │       (optional screenshot slot)        │                │
│         │                                         │                │
│         │  • • • ● • •  (dots)                    │                │
│         │                                         │                │
│         │  Was this guide helpful?  👍  👎         │  (last card)   │
│         │                                         │                │
│         │  IRR-1000 📋       [More Help ▸]        │                │
│         │                    Coming Soon (disabled)│                │
│         └────────────────────────────────────────┘                 │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

---

## 5. Reusable Component Design

| Component | Est. LOC | Purpose |
| --- | --- | --- |
| `QuickGuideProvider` | ~100 | Context; settings, seen-IDs, triple-tap, dormant analytics bus, feedback recorder, optional deep-link resolver |
| `QuickGuideButton` | ~40 | `?` icon; triple-tap-when-disabled logic; testid `quickguide-btn-<id>` |
| `QuickGuideModal` | ~140 | Portal-mounted; swipe carousel; close-confirm; ID chip; reserved corner slot; feedback footer on last card |
| `QuickGuideCard` | ~55 | One card: heading + Markdown-lite body + optional icon + optional media slot |
| `ResourceIdChip` | ~30 | `text-[10px] font-mono opacity-40 hover:opacity-100` mono chip; Copy button appears on hover/tap. Subtle by default. |
| `CloseConfirmDialog` | ~35 | "Are you sure you want to close Quick Guide?" — Yes/No + hint "You can reopen…" |
| `MoreHelpButton` | ~25 | Visible **disabled** button in bottom-right: "More Help (Coming Soon)" with tooltip |
| `GuideFeedback` | ~50 | "Was this guide helpful?" 👍 / 👎 on last card. Local record only. Toast after tap: "Thanks — noted." |
| `QuickGuideSettingsSection` | ~110 | 6 rows: Enable / Disable / Auto-show / Reset Tour / Content Version / Knowledge Distribution Status (reserved) |
| `useQuickGuide(id)` | ~25 | Programmatic — `{ open, isSeen, markSeen, article }` |
| Content build script | ~60 | Compiles per-article JSON → indexed bundle at build time; runs lint |
| Content lint | ~80 | ID uniqueness, prefix-in-range, related_ids resolve, no oversized cards, one-idea-per-card soft check |

**Total Phase 1 code: ~750 LOC** across 12 focused files. Nothing over 140 lines.

**Public API surface** (what every screen author touches — one line, forever):

```jsx
<QuickGuideButton resourceId="IRR-1000" origin="home" />
```

Every future Iron Rabbit app uses the same API.

---

## 6. Storage Strategy

**No new IndexedDB stores in Phase 1.** Extends the existing `app_settings` object.

```jsonc
// app_settings.quickguide
{
  "schema_version": 1,
  "enabled": true,
  "auto_show": false,                    // LOCKED DEFAULT — discovery, not push
  "seen_ids": ["IRR-1000"],              // seeded with all current IDs on first Phase-1 boot
  "content_version": "1.0.0",
  "sync_status": "local-only",           // reserved (Knowledge Distribution)
  "last_sync_at": null,                  // reserved
  "diagnostics_enabled": false,          // reserved (dev overlay)
  "analytics_buffer": [],                // reserved (dormant, capped at 100)
  "feedback": {
    "helpful_ids": [],
    "not_helpful_ids": [],
    "last_reset": null
  }
}
```

**First-launch seed rule:** on the very first boot after Phase 1 ships, `seen_ids` is seeded with every current article ID so auto-show only fires for genuinely new articles in future updates.

**Reset Tour scope:** clears Quick Guide `seen_ids` only. Does NOT re-arm FirstRunTour or QuickAccess (they have their own guards). Confirm dialog: "This will show every Quick Guide again the next time you open a screen. Continue? Yes / No."

**Reserved (Phase 3+):** new localforage store `quickguide_kb` — same article shape, KB overrides bundle by ID.

---

## 7. Content Structure

### Article schema (LOCKED v1)

```jsonc
{
  "id": "IRR-1000",
  "schema_version": 1,
  "scope": "home",
  "title": "Your Home Screen",
  "summary": "One-line description for future search results.",
  "cards": [
    {
      "heading": "What this screen does",
      "body": "...",             // Markdown-lite, ≤250 chars soft, ≤500 hard
      "icon": "layout-dashboard",
      "media": null               // reserved: { type, src, alt }
    }
    // MAX 5 CARDS
  ],
  "related_ids": [],
  "keywords": [],
  "synonyms": [],
  "difficulty": "beginner",
  "app_version_min": "1.0.0",
  "applicable_module": "grocery",
  "deprecated": false,
  "created_at": "2026-02-08",
  "updated_at": "2026-02-08"
}
```

### Content constraints (build-time lint)

- **Max 5 cards per guide** (hard fail if exceeded)
- **Card body ≤ 250 chars soft warning, ≤ 500 chars hard fail**
- **One-idea-per-card** — soft lint flags cards whose heading mixes verb triples like "Create / Edit / Delete"
- **ID uniqueness** across the entire bundle (hard fail)
- **Prefix-in-range** for reserved namespaces (hard fail)
- **`related_ids` must resolve** to existing articles (hard fail)
- **No references to deprecated articles** (soft warning)

### Media slot (reserved from Day 1)

Every card carries an optional `media` field:

```jsonc
"media": {
  "type": "screenshot" | "illustration" | "animation",
  "src": "path/to/asset.png",
  "alt": "Descriptive alt text"
}
```

Phase 1 renderer treats unknown types as no-op. Empty in Phase 1 — field exists so no schema migration is needed when illustrations arrive.

### Bundle layout

```
/frontend/src/quickguide/content/
├── manifest.json          // { content_version, article_count, locales, id_ranges }
└── en/
    ├── IRR-1000.json      // Home
    ├── IRR-1100.json      // Grocery Lists
    ├── IRR-1200.json      // Settings
    └── IRR-9000.json      // "About Quick Guides" — meta article
```

Compiled to one indexed blob at `yarn build` time. Individual JSON files stay in git for editor-friendliness.

### ID namespace (LOCKED)

| Prefix | Meaning | Range | Phase |
| --- | --- | --- | --- |
| `IRR-1xxx` | Screen guides | 1000–1999 | 1 |
| `IRR-2xxx` | Flow guides | 2000–2999 | 2 |
| `IRR-3xxx` | Cross-app shared | 3000–3999 | 2 |
| `IRR-9xxx` | Meta articles ("About Quick Guides") | 9000–9999 | 1 |
| `FH-####` | **Feature Highlights** (new) — "New in v2.4" style | any | 4 |
| `KB-####` | Knowledge Base article | any | 3 |
| `FAQ-####` | FAQ entry | any | 3 |
| `TIP-####` | Rabbit Tip | any | 4 |
| `REL-####` | Release Notes | any | 4 |
| `BUG-####` | Bug Report | any | 6 |
| `FRM-####` | Forum thread | any | 6 |
| `VID-####` | Video Tutorial | any | 5 |
| `IMG-####` | Illustration | any | 5 |
| `SET-####` | Settings-specific | any | 2 |
| `SCR-####` | Screen-level alias | any | reserved |
| `PK-####`  | Packs | any | reserved |
| `TL-####`  | Tiles | any | reserved |
| `CAT-####` / `SUB-####` | Category / Subcategory | any | reserved |

---

## 8. UI Details (LOCKED)

### Quick Guide Button
- Familiar `?` icon (Lucide `HelpCircle`).
- Placed in the header/toolbar area of the pilot screens.
- `data-testid="quickguide-btn-<resourceId>"`.
- Tapping when enabled → opens modal.
- Tapping when globally disabled → tracks tap count. 3 taps within 800ms → temporarily opens for that screen only (does NOT re-enable globally).

### Quick Guide Modal
- Portal-mounted at root, single instance.
- Title: **"Quick Guide"**.
- Horizontal swipe carousel matching FirstRunTour visual style (via shared tokens, NOT shared code).
- Chevron ← → controls + swipe gestures + keyboard ← → arrows.
- Dot indicators bottom-center.
- **Bottom-left**: `ResourceIdChip` — subtle mono ID with hover/tap-to-copy.
- **Bottom-right**: `MoreHelpButton` — visible but disabled, labelled "More Help (Coming Soon)" with tooltip.
- **On the last card only**: `GuideFeedback` — "Was this guide helpful?" 👍 / 👎.
- **[X] Close button** → CloseConfirmDialog: "Are you sure you want to close Quick Guide?" Yes / No. On Yes, show hint: "You can reopen Quick Guides anytime by tapping ? or enable automatic Quick Guides in Settings."

### Quick Guide Settings Section (collapsible, closed by default)
Six rows inside the existing SettingsModal, grouped under a **"Quick Guides"** heading:
1. **Enable Quick Guides** (toggle)
2. **Automatically show Quick Guides** (toggle, default OFF)
3. **Reset Quick Guide Tour** (button + confirm dialog)
4. **Content version** — read-only, shows `content_version` from manifest
5. **Knowledge Distribution status** — reserved, shows "Local only" in Phase 1
6. **Developer diagnostics** — reserved, hidden unless long-press

---

## 9. Feedback Capability (New in v1.1)

At the bottom of every guide's last card:

> **Was this guide helpful?** 👍 👎

- Records **locally** in `app_settings.quickguide.feedback`.
- No backend, no analytics, no network.
- Toast after tap: "Thanks — noted."
- If the same user re-taps: silently overwrite (last vote wins).
- Reserved: when Knowledge Distribution ships (Phase 5), this data becomes the editorial priority signal (which guides need improvement first).
- No visible aggregate to the user — this is a signal collector, not a review system.

---

## 10. "More Help (Coming Soon)"

- Visible **disabled** button in the modal's bottom-right slot.
- Cursor: `not-allowed`. Opacity: `0.5`.
- Tooltip on hover: "Advanced Help, tutorials, and community are coming in future updates."
- Reserves the layout position for whichever module lands first in Phase 3/6 (KB browser, AI Assistant, Bug Reports).

---

## 11. Future Expansion Strategy

Each future capability plugs into a **pre-designed** extension point.

| Future capability | Phase | Extension point |
| --- | --- | --- |
| Offline Knowledge Base | 3 | Provider resolver reads bundle + `quickguide_kb` store; KB overrides by ID |
| Search | 3 | Build-time full-text index over `title + summary + keywords + synonyms + cards[].body` |
| Deep-link URLs `?guide=IRR-1000` | 3 | `deepLinkResolver` in Provider already parses query on mount |
| Rabbit Tips | 4 | Same schema, `scope: "tip"`; scheduler in Provider |
| Release Notes | 4 | Same schema, `scope: "release_notes"`; opens on `app_version` bump |
| **Feature Highlights** | 4 | Same schema, `scope: "feature_highlight"`, prefix `FH-####`; auto-opens after version bump when a new highlight exists |
| Video tutorials | 5 | `card.media = { type: "video", src, poster }` — additive discriminator |
| **Knowledge Distribution** | 5 | Same JSON files feed multiple destinations: app, `ironrabbitapps.com/help/{id}` pages, PDFs, videos, AI, forum. Signed versioned bundle from `api/v1/manifest` |
| Bug Reports | 6 | The "More Help" corner becomes the "Report an issue" button |
| Forums | 6 | Deep-link via `related_ids: ["FRM-1234"]` |
| AI Assistant | 7 | RAG over the same bundled + KB articles |
| Analytics activation | 7 | Dormant event bus in Provider — `origin` prop captured from Phase 1 |
| Developer Diagnostics | 7 | Long-press ID chip |
| Cross-app extraction to `@ironrabbit/quickguide-kit` | 8 | Framework lives in isolated `/quickguide/` folder — extraction is mechanical |

---

## 12. Recommended Implementation Phases

| Phase | Scope | Sessions | ECU (rough) |
| --- | --- | --- | --- |
| **1 — Framework + 3-screen pilot** | Provider, Modal, Button, Card, Chip, Close-confirm, MoreHelpButton (disabled), GuideFeedback, Settings section, build script, lint, 4 English guides (IRR-1000 Home / IRR-1100 Grocery Lists / IRR-1200 Settings / IRR-9000 About Quick Guides), E2E via testing_agent_v3_fork | **~2.0** | **~170** |
| **1.5 — Screen expansion** | Wire remaining screens: Notes, Pantry, Kid Mode, Shopping Mode, Scanner, Calendar, Templates, Meal Plan, Backup (placeholder text only) | ~0.75 | ~60 |
| **2 — Editorial pass** | Real content across all guides; localise to Spanish + one RTL locale as proof | ~2 | ~200 |
| **3** | KB store + search index + deep-link URLs + `HelpSearchModal` | ~3 | ~300 |
| **4** | Rabbit Tips scheduler + Release Notes viewer + **Feature Highlights** | ~2 | ~200 |
| **5** | Knowledge Distribution (website / PDFs / videos / AI feed) + video card | ~4 | ~400 |
| **6** | Bug Reports + Forum deep-links | ~2 | ~200 |
| **7** | Analytics activation + AI search + Developer diagnostics | ~3 | ~300 |
| **8** | Extract `@ironrabbit/quickguide-kit` workspace package | ~1 | ~100 |

---

## 13. Risks & Mitigations (locked)

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Auto-show flood on first Phase-1 boot | High | Seed `seen_ids` with every current article ID on first boot |
| Triple-tap false positives | Medium | 3 taps on same button within 800ms; window resets on any tap outside |
| Visual drift between QuickGuideModal and FirstRunTour | Medium | Shared `/quickguide/tokens.js` constants file for card size / spacing / fade timing |
| RTL rendering (ar/he/fa/ur) | Medium | Modal reads `document.dir` and flips chevrons + swipe direction |
| Settings modal scroll depth | Low | 6 new rows grouped under collapsible "Quick Guides" heading, closed by default |
| Content bundle bloat across 25 locales | Medium | English only in Phase 1; per-locale lazy-load in Phase 2 |
| ID collision as catalog grows | Medium | Build-time lint (uniqueness + prefix-in-range) blocks CI on conflict |
| Framework churn breaking future apps | High | Framework semver'd inside `/quickguide/package.json` from day one |
| Accessibility (screen readers, focus trap, keyboard nav) | Medium | Reuse shadcn Dialog + AlertDialog. Explicit ARIA labels on chevrons |
| User confusion between QuickGuideModal and FirstRunTour | Low | Distinct testids, distinct titles, Quick Guides never auto-open |
| Refactor temptation during implementation | Medium | Rule §3.1: QuickGuideModal does NOT import, wrap, or modify FirstRunTour/QuickAccess. Enforced by code-review checklist |
| Guide bloat over time (long cards, too many cards) | Medium | Content lint hard-fails oversized cards and >5-card guides |

---

## 14. Locked v1.1 Approval Answers

| Q | Decision |
| --- | --- |
| Pilot screens | Home + Grocery Lists + Settings + meta article IRR-9000 |
| Refactor FirstRunTour / QuickAccess in Phase 1 | **No.** New independent files. Shared visual tokens only. |
| ID namespace | Approved with `FH-` prefix added for Feature Highlights |
| Default `auto_show` | **False** — discovery, not push |
| Deep-link URLs in Phase 1 | **Defer to Phase 3** (spec was "optional Phase 1" — user chose defer implicitly by scope shrink) |
| Reset Tour scope | Clears Quick Guide `seen_ids` only. Does NOT re-arm FirstRunTour/QuickAccess |
| 10 improvements from earlier design | All accepted |
| 10 user-requested changes | All accepted, folded into this doc |
| Vocabulary | "Quick Guide" everywhere; icon stays `?` |
| Website label | "Knowledge Distribution" (not "Website Sync") |
| Feedback footer | 👍 / 👎 on last card, local record only |
| "More Help" corner | Visible disabled button, "Coming Soon" label |
| Card limits | Max 5 cards, ≤250 chars body soft, ≤500 hard, one-idea-per-card |
| Media slot | Reserved from Day 1 for screenshot / illustration / animation |
| Resource ID chip | Small, subtle, `text-[10px] opacity-40` mono |

---

## 15. When Implementation Begins

Before writing code, the implementing agent should:

1. Confirm the user has said "build Quick Guide Phase 1" (or equivalent).
2. Re-read this document top to bottom. Do not deviate.
3. Re-read `/app/memory/QUICK_GUIDE_AUTHORING.md` for content voice/tone rules.
4. Start with the Provider and storage adapter (smallest, highest-leverage).
5. Ship Phase 1 as a single testable increment, verified by `testing_agent_v3_fork`.
6. Do not begin Phase 1.5 (screen expansion beyond the 3-screen pilot) until user has reacted to the pilot.

---

*End of locked design. No further modifications without explicit user approval.*
