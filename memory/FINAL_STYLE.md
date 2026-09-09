# 🔒 FINAL STYLE — Iron Rabbit Design System Snapshot
_Locked reference snapshot taken 2026-02-28. User approved these styles verbatim: "It really looks great, exactly what I was wanting as far as styles, looks, layouts etc."_

**⚠️ RULE**: Any future style change to these surfaces requires an explicit unlock from the user. Colors, glass effect, spacing, radius, animation timing MUST be preserved unless the user requests a change by name.

---

## 1. Header (`.header-compact` + `.ir-header-inner` + `.ir-header-glass-strip`)

### Structure
- **Row 1 — Branding**: title (H1) + URL on the left, **[FocusStatusChip]** + logo on the right. Flex row, `items-start justify-between gap-3`.
- **Row 2 — Glass Icon Strip**: full-width frosted-glass bar containing every action icon. Wraps naturally on mobile.

### Container padding (fluid)
- `padding-inline: var(--ir-container-pad-x)` — matches body gutter exactly.
- `padding-top: calc(env(safe-area-inset-top, 0px) + var(--ir-container-pad-y))` on Row 1.
- `padding-top: var(--ir-container-pad-y)` on Row 2 (safe-area consumed by Row 1).

### Row 2 — Glass Strip
```css
background: transparent;
border: 1px solid rgba(255, 255, 255, 0.10);
border-radius: 0.75rem;
backdrop-filter: blur(18px) saturate(140%);
-webkit-backdrop-filter: blur(18px) saturate(140%);
box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset,
            0 6px 16px -14px rgba(0,0,0,0.4);
padding: 0 var(--ir-space-2);
margin-top: var(--ir-space-2);
```

### Icon buttons in the strip
- Size: `clamp(1.625rem, 3.4vw, 2rem)` — 26 px on tightest phones → 32 px on desktops.
- SVG: `clamp(0.85rem, 1.8vw, 1.05rem)`.
- Gap: `clamp(0.15rem, 0.4vw, 0.35rem)`.
- Background: fully transparent at every state. Hover lifts with `transform: translateY(-1px)` + color change only.

### Title / branding
- H1: `font-bold text-white tracking-tight truncate` at `font-size: var(--ir-text-2xl)`.
- URL link: `text-xs text-slate-300 hover:text-white` with tiny `ExternalLink` icon.

### Logo
- `width / height: clamp(2.5rem, 5vw, 3.5rem)`.
- `rounded-lg object-cover border border-white/20`.

---

## 2. FocusStatusChip (approved by user 2026-02-28)

### OFF state (dim/muted pill)
```
inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium
bg-white/[0.06] text-slate-300 border border-white/15 backdrop-blur-sm
hover:bg-white/[0.12] hover:text-white transition-colors
```
- Bell icon (lucide `Bell`, `w-3 h-3`, strokeWidth 2.4)
- Label: `Focus · off`

### ON state (active indigo pill)
```
inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded-full text-[10px] font-medium
bg-indigo-500/25 text-indigo-100 border border-indigo-400/40 backdrop-blur-sm shrink-0
```
- BellOff icon (`w-3 h-3`, strokeWidth 2.4)
- Label variants: `Focus · ON` / `Focus · Xm left` / `Focus · Xh Ym left` / `Focus · scheduled`
- X cancel button on the right (only when manual OR timer active): `ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-white/10`

### Menu (portaled to document.body — must NOT be inside the header stacking context)
```jsx
<div style={{
  position: "fixed",
  top: menuPos.top,
  right: menuPos.right,
  zIndex: 2147483000,
  backgroundColor: "rgb(15 23 42)"  // slate-900 opaque
}}
className="min-w-[160px] rounded-lg border border-white/15 shadow-2xl py-1">
```
- Rendered via `createPortal(..., document.body)`.
- Row style: `w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 inline-flex items-center gap-2 transition-colors`.
- Divider: `<div class="h-px bg-white/10 my-1" />`.
- Options in order: 30 minutes · 1 hour · 2 hours · Until sunrise · **divider** · Turn ON (indefinite).

**Why portal, not `position: absolute`**: `.ir-header-glass-strip` has `backdrop-filter` which creates a stacking context. An absolute-positioned menu inside the header is trapped behind sibling elements. Portaling to `body` fully escapes all ancestor contexts. Anchor point is recomputed via `getBoundingClientRect()` on the chip button.

---

## 3. Design Tokens (CSS variables, defined in `index.css`)

### Container padding
- `--ir-container-pad-x` — horizontal gutter (fluid, clamp-based)
- `--ir-container-pad-y` — vertical gutter
- `--ir-space-2` — small spacing token used for icon-strip padding + margin-top

### Text scale
- `--ir-text-2xl` — H1 header title size (fluid clamp)

---

## 4. Colors — Approved Palette

### Dark mode (default)
- App container base: `#020617` (matches PWA manifest)
- Text primary: `text-white`
- Text secondary: `text-slate-300`
- Text tertiary: `text-slate-400` / `text-slate-500`
- Muted surface: `bg-white/[0.06]` / `bg-white/[0.04]`
- Menu surface: `rgb(15 23 42)` (slate-900 opaque)
- Border muted: `border-white/15` / `border-white/10`
- Accent indigo: `bg-indigo-500/25` + `border-indigo-400/40` + `text-indigo-100`
- Pin marker: `text-amber-400` (bright amber)

### Header background
- Uses `resolveBackgroundStyle(settings?.header_bg)` — customizable per user.

---

## 5. Behavior Contracts (do not regress)

- **Chip visibility**: The chip is **always visible** in both ON and OFF states. No `return null`.
- **OFF-state tap**: Opens the portal menu; tapping outside or Escape closes it.
- **ON-state tap**: Label is a no-op. Only the X cancels. Prevents accidental cancels.
- **Cancel semantics**: Clears `focus_mode` + `focus_until`. Leaves `focus_schedule` untouched.
- **Placement**:
  - Home view — INLINE inside `AppHeader.jsx`, left of the rusty-rabbit logo.
  - Fullscreen tile view (Expanded Text) — floating top-right via `GlobalFocusChip.jsx` overlay, only active when `body.ir-tile-open` is set.

---

## 6. Files that carry this style (do not restyle without unlock)

- `/app/frontend/src/notes/FocusStatusChip.jsx` — the pill + menu component
- `/app/frontend/src/notes/AppHeader.jsx` — inline placement in Row 1 (right side of branding row)
- `/app/frontend/src/components/GlobalFocusChip.jsx` — fullscreen-mode overlay placement
- `/app/frontend/src/index.css` — `.ir-header-inner`, `.ir-header-glass-strip`, icon button sizing
- `/app/frontend/src/App.css` — `.header-compact` base styles

---

## 7. Snapshot Reference Copies (frozen source at time of approval)

Frozen copies of the exact files above are stored at:
- `/app/memory/style_snapshots/FocusStatusChip.jsx`
- `/app/memory/style_snapshots/AppHeader.jsx`
- `/app/memory/style_snapshots/GlobalFocusChip.jsx`
- `/app/memory/style_snapshots/index.css.header-slice.txt` (header-related rules only)
- `/app/memory/style_snapshots/App.css.header-slice.txt` (header-related rules only)

If a future agent (or the user) ever needs to restore, diff against these snapshots.
