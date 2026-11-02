# 🔒 IRON RABBIT — PROTECTED GALLERY BASELINE

**Established:** November 1, 2026, 23:55 UTC  
**Purpose:** Freeze and protect existing working gallery implementations  
**Status:** PROTECTED — DO NOT MODIFY WITHOUT EXPLICIT APPROVAL

---

## PROTECTED COMPONENTS

### 1. HOME PAGE HEADER GALLERY
**File:** `/app/frontend/src/notes/HeaderPresetPicker.jsx`
- **Size:** 11,674 bytes (229 lines)
- **MD5:** `7ebafb19e26bd1493f1fa3dc16eabe4a`
- **Last Modified:** August 20, 2026, 00:09 UTC
- **Status:** ✅ FROZEN — WORKING CORRECTLY

**Location in UI:**
- HOME PAGE → SETTINGS (gear icon) → HEADER BACKGROUND → "Choose from presets" accordion

**Functionality:**
- Loads `/header-presets/manifest.json`
- Displays 205 curated images
- Shows 34 category tabs + "All" tab
- Full-text search (title/tags/category)
- Individual preset rename
- Bulk rename (Edit3 icon)
- Preset selection and application
- 16:5 aspect ratio thumbnails
- Collapsible accordion UI

**Protected Features:**
- ✅ Manifest loading: Line 34 `fetch("/header-presets/manifest.json")`
- ✅ Category tabs: Lines 46-50 (computed from manifest)
- ✅ Search functionality: Lines 52-60 (filters by query)
- ✅ Rename system: Lines 24-27 (title overrides)
- ✅ Grid display: Lines 140+ (preset thumbnails)

---

### 2. WEATHER DASHBOARD GALLERY
**File:** `/app/frontend/src/dashboard/pages/DashboardSettings.jsx`
- **Size:** 21,319 bytes (514 lines)
- **MD5:** `9ed4315d8aac335f397d2c6d3a59a0a4`
- **Last Modified:** August 20, 2026, 00:10 UTC
- **Status:** ✅ FROZEN — WORKING CORRECTLY

**Location in UI:**
- /dashboard → SETTINGS (gear icon) → BACKGROUND IMAGE section

**Functionality:**
- Loads `/header-presets/manifest.json`
- Displays 205 curated images
- Shows 34 category chips + "All" chip
- Full-text search (title/tags/category)
- Favorites system (star presets)
- Filter to favorites-only
- Individual preset rename
- Bulk rename (Edit3 icon)
- Preset selection and application
- 16:5 aspect ratio thumbnails
- Inline gallery (not accordion)

**Protected Features:**
- ✅ Manifest loading: Line 57 `fetch("/header-presets/manifest.json")`
- ✅ Category chips: Lines 39-52 (computed from presets)
- ✅ Search functionality: Lines 68-79 (filters by query + category)
- ✅ Favorites system: Lines 21-22, 330+ (star toggle)
- ✅ Rename system: Lines 32-35 (title overrides)
- ✅ Grid display: Lines 329-420 (preset thumbnails)

---

### 3. SHARED GALLERY DATA
**Manifest File:** `/app/frontend/public/header-presets/manifest.json`
- **Size:** 51,858 bytes (2,928 lines)
- **MD5:** `a8307346a7285a461d66561dde1c452a`
- **Last Modified:** August 20, 2026, 02:29 UTC
- **Status:** ✅ FROZEN — DO NOT MODIFY

**Structure:**
```json
{
  "version": 10,
  "categories": [ /* 34 categories */ ],
  "presets": [ /* 205 preset objects */ ],
  "count": 205
}
```

**Protected Data:**
- ✅ Version: 10
- ✅ Total presets: 205
- ✅ Total categories: 34
- ✅ Each preset: { id, file, width, height, category, tags, title }
- ✅ Each category: { key, count, icon?, description? }

**Image Files:** `/app/frontend/public/header-presets/`
- **Count:** 205 `.webp` files
- **Naming:** `header-01.webp` through `header-205.webp`
- **Status:** ✅ FROZEN — DO NOT DELETE OR REPLACE

**Category List (34 total):**
1. Southern (29), 2. Nature (18), 3. Sunset (16), 4. Gangster (15), 5. Faith (12), 6. Water (12), 7. Sky (9), 8. Wildlife (8), 9. Fishing (7), 10. ChainGang (6), 11. Christmas (5), 12. Cinco (5), 13. Halloween (5), 14. Lunar (5), 15. NewYear (5), 16. Easter (4), 17. Hunting (4), 18. Auto (3), 19. Patriotic (3), 20. Camping (2), 21. Space (2), 22. Underwater (2), 23. Adventure (17), 24. Canyon (1), 25. Country (1), 26. Cozy (1), 27. History (1), 28. Music (1), 29. Robotics (1), 30. Sci-Fi (1), 31. Sports (1), 32. Trades (1), 33. Urban (1), 34. Winter (1)

---

### 4. UTILITY FUNCTIONS
**File:** `/app/frontend/src/utils/presetTitle.js`
- **Used By:** HeaderPresetPicker, DashboardSettings
- **Purpose:** Preset rename functionality
- **Status:** ✅ PROTECTED

**Functions:**
- `getPresetTitle(preset, overrides)` — Get display title
- `getPresetAlt(preset, overrides)` — Get alt text
- `getPresetSearchHay(preset, overrides)` — Get search keywords
- `getPresetDefaultTitle(preset)` — Get default title
- `loadTitleOverrides()` — Load custom titles from localStorage
- `subscribeTitleOverrides(callback)` — Live title updates

---

### 5. BACKGROUND VALUE UTILITIES
**File:** `/app/frontend/src/utils/bgValue.js`
- **Used By:** DashboardSettings
- **Purpose:** Background serialization
- **Status:** ✅ PROTECTED

**Functions:**
- `bgObjToString(obj)` — Convert background object to string
- `stringToBgObj(str)` — Parse background string to object

---

## SEPARATE SYSTEM: TILE BACKGROUND PICKER

### BackgroundPicker.jsx (NOT PART OF GALLERY)
**File:** `/app/frontend/src/components/BackgroundPicker.jsx`
- **Size:** 28,844 bytes (678 lines)
- **MD5:** `40bdad2129133adf264e2c34ad8ab310`
- **Last Modified:** November 1, 2026, 23:52 UTC (Unsplash removal)
- **Status:** ✅ MODIFIED (Unsplash removed) — ISOLATED FROM GALLERIES

**Purpose:** Individual note tile backgrounds (Edit Text modal)
- **NOT** for header backgrounds
- **NOT** connected to 205-image gallery
- **NOT** using `/header-presets/manifest.json`

**Functionality:**
- Color picker (42 preset colors + recents + pinned)
- Gradient picker (30 preset gradients + custom builder)
- Image upload (personal images only)
- ❌ NO gallery integration
- ❌ NO manifest loading
- ❌ NO category system

**Verification:**
- References to `header-presets`: **0** ✓
- References to `manifest.json`: **0** ✓
- Upload functionality: **3 references** ✓

**Used In:**
- `NoteModal.jsx` — Tile background for notes
- `PackBuilderModal.jsx` — Tile background for packs
- `DashboardSettings.jsx` — Color/gradient for full dashboard background
- `SettingsModal.jsx` — Color/gradient for Home Page header

---

## PROTECTION RULES

### ❌ DO NOT:
1. Modify `HeaderPresetPicker.jsx` without explicit approval
2. Modify `DashboardSettings.jsx` gallery sections without explicit approval
3. Delete, rename, or replace any of the 205 `.webp` files
4. Modify `manifest.json` structure or data
5. Remove categories or change category counts
6. Alter search, filter, or rename functionality
7. Redesign gallery layouts or appearance
8. Change image paths or URLs
9. Consolidate or rewrite gallery code
10. Add Unsplash or external images to galleries
11. Merge `BackgroundPicker.jsx` with gallery components
12. Make unrelated improvements to gallery code

### ✅ ALLOWED (with approval):
1. Bug fixes that preserve exact functionality
2. Security patches
3. Performance optimizations that don't change behavior
4. Accessibility improvements
5. Adding NEW features to SEPARATE components (not galleries)

---

## VERIFICATION CHECKLIST

Run these commands to verify baseline integrity:

### Check Image Files
```bash
ls /app/frontend/public/header-presets/*.webp | wc -l
# Expected: 205
```

### Check Manifest
```bash
cat /app/frontend/public/header-presets/manifest.json | python3 -c "import sys,json; m=json.load(sys.stdin); print(f'{len(m[\"presets\"])} presets, {len(m[\"categories\"])} categories')"
# Expected: 205 presets, 34 categories
```

### Check Gallery Components
```bash
md5sum /app/frontend/src/notes/HeaderPresetPicker.jsx
# Expected: 7ebafb19e26bd1493f1fa3dc16eabe4a

md5sum /app/frontend/src/dashboard/pages/DashboardSettings.jsx
# Expected: 9ed4315d8aac335f397d2c6d3a59a0a4

md5sum /app/frontend/public/header-presets/manifest.json
# Expected: a8307346a7285a461d66561dde1c452a
```

### Verify Gallery Isolation
```bash
grep -c "header-presets\|manifest.json" /app/frontend/src/components/BackgroundPicker.jsx
# Expected: 0 (Isolated from gallery system)
```

---

## BASELINE SUMMARY

**Protected Files:** 5 core files + 205 image files
- `HeaderPresetPicker.jsx` ✅
- `DashboardSettings.jsx` ✅
- `manifest.json` ✅
- `presetTitle.js` ✅
- `bgValue.js` ✅
- 205 x `.webp` files ✅

**Protected Data:**
- ✅ 205 curated images
- ✅ 34 categories
- ✅ Manifest version 10
- ✅ All preset metadata (tags, titles, dimensions)

**Protected Functionality:**
- ✅ Category filtering (tabs/chips)
- ✅ Full-text search
- ✅ Individual rename
- ✅ Bulk rename
- ✅ Favorites system (Dashboard only)
- ✅ Preset selection
- ✅ Image application
- ✅ Grid layouts

**Isolation Verified:**
- ✅ `BackgroundPicker.jsx` does NOT reference galleries
- ✅ Gallery components do NOT reference `BackgroundPicker.jsx`
- ✅ Unsplash removal isolated to tile backgrounds
- ✅ Header galleries unaffected by recent changes

---

## CHANGE LOG

| Date | Component | Change | Approved By |
|------|-----------|--------|-------------|
| 2026-11-01 23:52 | BackgroundPicker.jsx | Removed Unsplash gallery (45 lines) | User |
| 2026-11-01 23:55 | All Gallery Components | BASELINE ESTABLISHED — FROZEN | User |

---

**END OF PROTECTED BASELINE**

✅ All 205 images verified intact  
✅ All 34 categories verified intact  
✅ Both galleries verified working  
✅ Tile picker verified isolated  
✅ Baseline documented and frozen  

**Last Verified:** November 1, 2026, 23:55 UTC
