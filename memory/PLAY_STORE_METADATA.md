# Iron Rabbit — Google Play Store Listing Metadata

Paste these values into the Google Play Console →
_All apps → Iron Rabbit → Grow → Store presence → Main store listing_.
Every field is sized to fit Play's character limits.

---

## App details

| Field | Value | Limit |
| --- | --- | --- |
| **App name** | Iron Rabbit | 30 |
| **Short description** | Offline reminders & chores that stay on your device | 80 |
| **Full description** | see below | 4000 |

### Full description (4000 chars)

Iron Rabbit is the offline-first reminder and chore list built for people
who don't want a cloud account for every little thing.

WHAT IT DOES
• Daily, weekly, and monthly reminders that repeat exactly the way you
  set them — no complicated scheduling.
• Chores you can share around the household, with a big satisfying tick
  when you knock one out.
• Photos, PDFs, and voice attachments so a note isn't just text.
• Full-screen editing that respects your eyes — every note has its own
  background and text-brightness sliders so late-night writing doesn't
  burn.
• Categories, tile packs, and colour tags that turn your list into a
  visual memory palace instead of a wall of grey text.

WHERE YOUR DATA LIVES
On your device. Nothing else. Iron Rabbit does not require an account,
does not upload your notes, and does not send your reminders anywhere.
Export a Markdown or ZIP archive any time — your notes travel with you.

BUILT FOR HABITS
Iron Rabbit is quiet. It fires a notification when your reminder is due,
then gets out of the way. No streak nagging, no coaching, no "content."
Just the same reliable list you'd write on a fridge whiteboard, except
it moves with you.

ACCESSIBILITY
Two independent brightness sliders per note (text + background). WCAG
AA contrast ratio surfaced live inside the display panel. Large tap
targets throughout. Dark mode by default; a "Choose your theme" prompt
on first launch.

COMMUNITY TIPS
A read-only feed of tips from other Iron Rabbit users. Submit your own
from Settings → Community. Every tip is reviewed by a human before it
appears.

FUTURE
If enough people ask, we'll add optional Google Drive backup — always
opt-in, always your own Google account, never ours.

---

## Categorization

| Field | Value |
| --- | --- |
| **Application type** | App |
| **Category** | Productivity |
| **Tags** | Reminders, To-do lists, Habit tracking |

---

## Contact

| Field | Value |
| --- | --- |
| **Email** | *(your public support email)* |
| **Phone** | *(optional — leave blank unless you want it visible)* |
| **Website** | *(your marketing URL — optional)* |
| **Privacy policy URL** | *(required — must be a live URL; host `memory/GOOGLE_DRIVE_PRIVACY.md` publicly or write a plain HTML version)* |

---

## Graphics

| Asset | Size | Source in this repo |
| --- | --- | --- |
| **App icon** | 512×512 PNG (32-bit) | Regenerate from `frontend/assets/icon-only.png` (already 1024²) using any online resizer, or add `frontend/assets/icon-only.png` and run `npx @capacitor/assets generate --android`. |
| **Feature graphic** | 1024×500 JPG/PNG | `frontend/public/feature-graphic-1024x500.png` — already the correct size. |
| **Phone screenshots** | at least 2, min 320×569, max 3840×3840 | `frontend/public/screenshots/*` (existing 1920×1080 shots work as tablet-orientation, but Play prefers narrow phone shots). |
| **7" tablet screenshots** | 1024×600 or similar | Optional. Skip for launch. |
| **10" tablet screenshots** | 2048×2732 or similar | Reuse iOS iPad shots at `frontend/public/screenshots/ios/ipad-12.9/*` — Play accepts them. |

---

## Data safety questionnaire

Google Play's data-safety wizard asks a series of yes/no questions.
Iron Rabbit's answers:

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data? | **No** |
| Is your app end-to-end encrypted? | Not applicable (no data leaves the device) |
| Do you provide a way for users to request that their data be deleted? | Not applicable |
| Is your data collected securely? | Not applicable |
| Data types collected | None |
| Data used for | Not applicable |

_If you enable Google Drive backup later, revisit this: add "User Content
→ collected on user's own Drive only when opted in → not shared with any
third party → user can delete via Drive Settings"._

---

## Content rating

Run Google's IARC questionnaire in Play Console → App content → Content
ratings. Iron Rabbit's expected rating: **Everyone / PEGI 3 / IARC 3+**.

- No violence
- No sexual content
- No profanity
- No controlled substances
- No user-generated content that's publicly viewable (Community Tips are
  moderated before display)
- No location tracking
- No in-app purchases

---

## Target audience & content

| Field | Value |
| --- | --- |
| **Target age range** | 13+ (general audience; Community Tips are moderated) |
| **Appeals to children?** | No |
| **Ads** | None |
| **In-app purchases** | None |
| **Government app?** | No |
| **News app?** | No |

---

## App access

| Field | Value |
| --- | --- |
| **Are parts of your app restricted?** | No — Iron Rabbit is fully usable without any account |
| **Login required?** | No |

---

## What's new in this version

For v1.0, leave blank. For every update after, fill 500 chars max.

---

## Release management

| Option | Recommendation |
| --- | --- |
| **Managed publishing** | ON — you approve each release before it hits the store |
| **Staged rollout** | Start at 10 % for v1.0, ramp to 100 % over ~48 h |
| **Countries** | Start with your primary country, expand after a stable week |
