# Iron Rabbit — Quick Guide Content Authoring Guide

**Companion to:** `/app/memory/QUICK_GUIDE_DESIGN.md` (Design v1.1, locked)
**Purpose:** Ensures every Quick Guide written across every current and future Iron Rabbit app has the same tone, quality, and clarity.
**Audience:** Anyone writing guide content — you, a future teammate, an editor, an agent.

---

## Golden Rules

> **A Quick Guide teaches. It does not document, troubleshoot, or explain internals.**

If a card can't be understood by a 12-year-old who has never used the app, rewrite it. If a screen needs deep explanation, that is for the future Knowledge Base — not for Quick Guides.

---

## 1. Structure Rules

### 1.1 One topic per card
Each card teaches **exactly one idea.**

❌ **Don't:**
> "Creating, editing, and deleting packs."

✅ **Do (three separate cards):**
> Card 1 — Creating a Pack
> Card 2 — Editing a Pack
> Card 3 — Deleting a Pack

The build-time lint will flag cards whose headings mix multiple verbs.

### 1.2 Maximum 5 cards per guide
Hard limit. If you need more, either:
- Split into two smaller guides, or
- Send the extra content to the future Knowledge Base (Phase 3+).

### 1.3 Card length: 3–5 short sentences
- Soft limit: **250 characters** per card body (build lint warns)
- Hard limit: **500 characters** (build lint fails)
- If you're writing paragraphs, you're writing a Knowledge Base article, not a Quick Guide.

### 1.4 Every card has a heading
Format: `Verb + Noun` when possible.
- "Adding a chore"
- "Setting a reminder"
- "Sharing a list"

### 1.5 The last card is not a summary
Never end with "In summary…". End on:
- A practical tip, or
- A pointer to a related feature ("Next: try Kid Mode"), or
- A common mistake to avoid.

---

## 2. Voice & Tone

### 2.1 Friendly, never condescending
Iron Rabbit users include parents, kids, seniors, and busy professionals. Assume intelligence, not expertise.

❌ "Simply click the button. It's easy!"
✅ "Tap **New Chore** to add one to today's list."

### 2.2 Active voice, present tense
❌ "The item will be saved when the button is tapped by the user."
✅ "Tap **Save** to keep your changes."

### 2.3 Direct, action-oriented verbs
Prefer: **Tap · Select · Save · Add · Edit · Choose · Type · Slide · Drag · Open · Close**

Avoid: "utilize", "leverage", "facilitate", "invoke", "execute".

### 2.4 Second person, singular
Address the user as "you". Never "the user" or "one" or "we".

❌ "Users can create a new list from the home screen."
✅ "You can create a new list from Home."

### 2.5 No jargon
Never assume the reader knows what these mean:
- "endpoint", "API", "sync", "cache", "hash", "encrypted at rest"

If a technical term is essential, define it in-line with plain language.

❌ "Your data is stored in IndexedDB with a SHA-256 hashed PIN."
✅ "Your notes live on your phone. Your PIN is scrambled before it's saved, so nobody can read it."

### 2.6 No exclamation marks in body copy
Reserved for genuine celebration ("Great job!" in Kid Mode). Not for teaching.

❌ "This is a really cool feature!"
✅ "This helps you find items faster."

### 2.7 No emojis in body copy
The card icon is the visual accent. Emojis in the text feel dated and clutter screen readers. Exceptions:
- The 👍 / 👎 buttons in the feedback footer (system, not content).
- Kid Mode content may use a single celebration emoji.

---

## 3. Content Patterns

### 3.1 The standard 5-card structure

Use this as the default skeleton unless you have a strong reason not to.

| Card | Heading example | Purpose |
| --- | --- | --- |
| 1 | **What this screen does** | Frame the screen in one sentence. Why does this exist? |
| 2 | **Creating your first item** | The single most common first action. |
| 3 | **Editing items** | The single most common follow-up action. |
| 4 | **Tips** | One or two power-user shortcuts. |
| 5 | **Common mistakes** | The one thing beginners get wrong. |

### 3.2 Alternative structures
Use if the standard doesn't fit:

- **Setting-heavy screen** → What / Basics / Advanced / Reset / Related
- **Discovery screen** (e.g. Packs browser) → What / Browsing / Adding / Removing / Tip
- **Wizard screen** (e.g. Meal Planner) → What / Step 1 / Step 2 / Step 3 / Result

### 3.3 The "Tip" card formula
Introduce with **"Tip:"** in bold. Keep it to one idea.

✅ "**Tip:** Long-press any chore to duplicate it."
✅ "**Tip:** Swipe a chore left to reveal quick actions."

### 3.4 The "Common mistakes" card formula
State the mistake, then the fix.

✅ "It's easy to forget to tap Save. Look for the green Save button at the top-right — your changes stay only after you tap it."

---

## 4. Naming Conventions

### 4.1 UI elements
Bold the exact label the user sees.

❌ "Tap the plus icon."
✅ "Tap **+ New Note**."

### 4.2 Actions
Refer to touch actions consistently:

| Action | Word to use |
| --- | --- |
| Single tap | **Tap** |
| Double tap | **Double-tap** |
| Long press (hold) | **Long-press** |
| Swipe left / right | **Swipe left** / **Swipe right** |
| Drag & drop | **Drag** (and, if needed, **drop**) |

Don't say "click" — Iron Rabbit is mobile-first.

### 4.3 Screen names
Match the exact screen title from the app:

- ✅ "In **Kid Mode**"
- ✅ "In **Grocery Lists**"
- ❌ "In the kids' screen"

### 4.4 Feature names
Iron Rabbit vocabulary must stay consistent everywhere:

- **Chore** (not "task" or "todo")
- **Tile** (not "widget")
- **Pack** (not "bundle" or "collection")
- **Zone** (in Pantry, not "location")
- **Quick Guide** (not "help" or "tutorial")
- **Meal Plan** (not "meal calendar")

---

## 5. Accessibility Rules

### 5.1 Never rely on colour alone
❌ "Tap the green button."
✅ "Tap the green **Save** button."

### 5.2 Assume the reader may use a screen reader
Every card body must make sense when read aloud, without seeing the illustration.

### 5.3 Icons are decoration, not information
If a card body says "tap the ⭐", the same body must ALSO say what the star means.

✅ "Tap the star icon (⭐) to favorite a note."

### 5.4 Alt text is mandatory for media
When a card includes a screenshot or illustration, the `media.alt` field must describe the image in one plain sentence.

---

## 6. Localization-Ready Writing

Even though Phase 1 ships English only, everything below Phase 2 goes through i18next.

### 6.1 Avoid idioms that don't translate
❌ "Piece of cake." · "Rocket science." · "Hit the ground running."
✅ "This is quick." · "This isn't complicated." · "Start right away."

### 6.2 Avoid puns and wordplay
They rarely survive translation and often confuse non-native speakers.

### 6.3 Keep sentences short
Short sentences translate reliably. Long, subordinate-clause sentences produce translation drift.

### 6.4 Avoid contractions where clarity is at stake
"Don't" is fine. But "It'll" or "You've" can trip up translators or screen readers.

### 6.5 Never embed variable placeholders in the middle of a sentence
❌ `"Your ${appName} data is safe."`
✅ Write as two sentences, or use a full i18n key that treats the variable as an atomic unit.

---

## 7. What Quick Guides Are NOT For

If a piece of writing falls into any of these, it doesn't belong in a Quick Guide:

- ❌ Troubleshooting a specific error (→ future Knowledge Base or Bug Reports)
- ❌ Explaining internal architecture (→ developer docs)
- ❌ Release notes ("New in v1.4…") (→ Release Notes module, Phase 4)
- ❌ Marketing prose ("Iron Rabbit is the best…") (→ store listing)
- ❌ Legal / privacy content (→ Privacy Policy)
- ❌ Feature comparison tables (→ Knowledge Base)
- ❌ FAQ answers ("Why doesn't my alarm work when the phone is off?") (→ FAQ module, Phase 3)

---

## 8. Editorial Workflow

### 8.1 Draft
Write in plain text or Markdown. Aim for the standard 5-card structure first, then trim.

### 8.2 Trim
After writing, cut each card body by 30%. What's left is almost always the version to ship.

### 8.3 Read aloud
Every card should sound natural when spoken. If you stumble, rewrite.

### 8.4 Show, don't tell
When a screenshot would help, add one. Reserve the `media` field even if you don't have the asset yet — the schema supports it from Day 1.

### 8.5 Ship as JSON
Save the article as `/frontend/src/quickguide/content/en/<ID>.json`. The build script and lint will catch any structural issues.

### 8.6 Test in the app
Open the target screen, tap `?`, swipe through. If any card feels dense, cut more.

---

## 9. Meta-Guide `IRR-9000` (ships in Phase 1)

The very first Quick Guide is about Quick Guides themselves. It's the reference implementation. Keep it exemplary.

- **Card 1** — What Quick Guides are (one sentence about the `?` button).
- **Card 2** — How to open a Quick Guide (tap ?, swipe cards).
- **Card 3** — How to close a Quick Guide (X button, confirm).
- **Card 4** — Where to find Quick Guide settings (Settings → Quick Guides).
- **Card 5** — Tip: rapidly tap `?` three times to see a guide even when Quick Guides are disabled.

---

## 10. Voice Cheatsheet — Copy These Patterns

Instead of writing from scratch, adapt these:

| Pattern | Example |
| --- | --- |
| Frame the screen | *"This is where you keep every shopping list you've made."* |
| First action | *"Tap **+ New List** at the top to start one."* |
| Second action | *"Tap any list to edit its items."* |
| Give a tip | *"**Tip:** Long-press a list to duplicate it as a template."* |
| Warn about a mistake | *"Deleted lists are gone for good. Consider archiving instead."* |
| Point to a related feature | *"Turn a list into a printable checklist from the Share menu."* |

---

## 11. Review Checklist (Before Publishing a Guide)

Before adding a new guide JSON to `/frontend/src/quickguide/content/`, check:

- [ ] Exactly one topic per card
- [ ] 5 cards or fewer
- [ ] Every card body ≤ 250 characters
- [ ] Second person, active voice, present tense
- [ ] No jargon, no idioms, no puns
- [ ] Every UI label is bolded and matches the app exactly
- [ ] Iron Rabbit vocabulary is consistent (Chore, Tile, Pack, Zone, Quick Guide, Meal Plan)
- [ ] Read aloud — flows naturally
- [ ] Alt text supplied for any `media` reference
- [ ] IRR-1000 range for a screen guide; IRR-2000 for a flow; IRR-9000 for a meta article
- [ ] `related_ids` all point to real articles
- [ ] `created_at` and `updated_at` set; author noted
- [ ] Feedback footer will appear automatically — no need to write it

---

## 12. Living Style Guide

This document is expected to evolve. When you notice a pattern working well or badly across multiple guides, update this file — never a single guide in isolation.

*Every future Iron Rabbit Quick Guide should feel like it was written by the same person, even when it wasn't.*
