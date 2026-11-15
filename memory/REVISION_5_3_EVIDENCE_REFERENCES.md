# IRON RABBIT — REVISION 5.3 EVIDENCE REFERENCES

**Document Type**: Evidence Citations & Code References  
**Revision**: 5.3  
**Date**: December 2025  
**Purpose**: Document all code evidence supporting field classifications

---

## 📋 DOCUMENT OVERVIEW

This document provides complete evidence references for all field classifications in Revision 5.3. Each field classification is supported by:
1. Specific file path and line numbers
2. Code excerpt showing evidence
3. Explanation of what the evidence proves
4. Classification tier assignment

**Evidence Sources Examined**:
- `/app/frontend/src/storage/storageService.js` (916 lines)
- `/app/frontend/src/NotesApp.jsx` (note creation/editing logic)
- Additional files referenced but not fully examined

---

## 🗂️ NOTE FIELDS EVIDENCE

### ✅ CONFIRMED REQUIRED FIELDS (3 fields)

---

#### Field 1: `id`

**Classification**: ✅ ALWAYS REQUIRED

**Evidence Source**: `/app/frontend/src/NotesApp.jsx`

**Code Excerpt**:
```javascript
const newNote = {
  id: uuidv4(),
  ...enriched,
  order: maxOrder + 1,
  created_at: now,
  updated_at: now,
  last_viewed: now,
};
```

**Line Location**: Note creation (approximately line 11-16 of note creation block)

**What This Proves**:
- Every new note is assigned a UUID via `uuidv4()`
- No notes can be created without an ID
- ID is the first field assigned

**Usage Verification**:
```javascript
// storageService.js
await notesStore.setItem(note.id, note);
```

**Conclusion**: ID is the primary key for all IndexedDB operations. Cannot be null or undefined.

**Validation Rule**: Must exist AND be non-empty string

---

#### Field 2: `created_at`

**Classification**: ✅ ALWAYS REQUIRED

**Evidence Source**: `/app/frontend/src/NotesApp.jsx`

**Code Excerpt**:
```javascript
const now = new Date().toISOString();
const newNote = {
  id: uuidv4(),
  ...enriched,
  order: maxOrder + 1,
  created_at: now,
  updated_at: now,
  last_viewed: now,
};
```

**Line Location**: Note creation (approximately line 14)

**What This Proves**:
- Every new note is assigned `created_at` timestamp
- Value is `new Date().toISOString()` — always a string in ISO 8601 format
- No conditional logic — always assigned

**Usage**: Timestamp for note creation; never modified after creation

**Validation Rule**: Must exist AND be valid ISO 8601 timestamp string

---

#### Field 3: `updated_at`

**Classification**: ✅ ALWAYS REQUIRED

**Evidence Source 1**: `/app/frontend/src/NotesApp.jsx` (note creation)

**Code Excerpt 1**:
```javascript
const newNote = {
  id: uuidv4(),
  ...enriched,
  order: maxOrder + 1,
  created_at: now,
  updated_at: now,
  last_viewed: now,
};
```

**Evidence Source 2**: `/app/frontend/src/storage/storageService.js` (line 142)

**Code Excerpt 2**:
```javascript
note.updated_at = new Date().toISOString();
await notesStore.setItem(note.id, note);
```

**What This Proves**:
- Every new note assigned `updated_at` at creation
- Every note modification updates `updated_at`
- Used for sorting, filtering, and change tracking

**Validation Rule**: Must exist AND be valid ISO 8601 timestamp string

---

### ✅ CONFIRMED PRESENT FIELDS (2 fields)

---

#### Field 4: `order`

**Classification**: ✅ CONFIRMED PRESENT (expected but not absolutely required)

**Evidence Source 1**: `/app/frontend/src/NotesApp.jsx` (note creation)

**Code Excerpt 1**:
```javascript
const maxOrder = notes.reduce((max, n) => Math.max(max, n.order || 0), 0);
const newNote = {
  id: uuidv4(),
  ...enriched,
  order: maxOrder + 1,
  created_at: now,
  updated_at: now,
  last_viewed: now,
};
```

**Evidence Source 2**: `/app/frontend/src/storage/storageService.js` (lines 81-89)

**Code Excerpt 2**:
```javascript
async reorderNotes(notes) {
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    note.order = i;
    note.updated_at = new Date().toISOString();
    await notesStore.setItem(note.id, note);
  }
  return notes;
},
```

**What This Proves**:
- Every new note assigned `order` field
- `order` is actively used for note reordering feature
- Code has fallback `n.order || 0` suggesting it may be missing in old notes

**Usage**: User-defined display ordering

**Validation Rule**: Should exist; if missing, warn but don't fail

**Why Not "Required"**: Fallback logic (`|| 0`) suggests historical notes may lack this field

---

#### Field 5: `last_viewed`

**Classification**: ✅ CONFIRMED PRESENT (expected but not absolutely required)

**Evidence Source**: `/app/frontend/src/NotesApp.jsx` (note creation)

**Code Excerpt**:
```javascript
const newNote = {
  id: uuidv4(),
  ...enriched,
  order: maxOrder + 1,
  created_at: now,
  updated_at: now,
  last_viewed: now,
};
```

**What This Proves**:
- Every new note assigned `last_viewed` timestamp at creation
- Likely used for "recently viewed" features

**Usage**: Timestamp of last view

**Validation Rule**: Should exist; if missing, warn but don't fail

**Why Not "Required"**: Feature may have been added later; historical notes may lack it

---

### ⚠️ NULLABLE FIELDS (2 fields)

---

#### Field 6: `archived_at`

**Classification**: ⚠️ NULLABLE (property must exist, value can be null)

**Evidence Source**: `/app/frontend/src/storage/storageService.js` (line 158)

**Code Excerpt**:
```javascript
async archiveNote(noteId) {
  const note = await this.getNote(noteId);
  note.archived_at = new Date().toISOString();
  note.deleted_at = null; // Ensure not marked as deleted
  note.updated_at = new Date().toISOString();
  await notesStore.setItem(note.id, note);
  return note;
},
```

**What This Proves**:
- When note archived: `archived_at` set to timestamp
- When note archived: `deleted_at` explicitly set to `null`
- Field is set to timestamp OR null (never undefined)

**Usage**: Timestamp when archived (null if not archived)

**Validation Rule**: Property must exist; value can be null OR ISO timestamp

---

#### Field 7: `deleted_at`

**Classification**: ⚠️ NULLABLE (property must exist, value can be null)

**Evidence Source**: `/app/frontend/src/storage/storageService.js` (line 166)

**Code Excerpt**:
```javascript
async deleteNote(noteId) {
  const note = await this.getNote(noteId);
  note.deleted_at = new Date().toISOString();
  note.archived_at = null; // Ensure not marked as archived
  note.updated_at = new Date().toISOString();
  await notesStore.setItem(note.id, note);
  return note;
},
```

**What This Proves**:
- When note deleted: `deleted_at` set to timestamp
- When note deleted: `archived_at` explicitly set to `null`
- Field is set to timestamp OR null (never undefined)

**Usage**: Timestamp when deleted (null if not deleted)

**Validation Rule**: Property must exist; value can be null OR ISO timestamp

---

### ⚠️ OPTIONAL FIELDS (5 fields)

---

#### Field 8: `category`

**Classification**: ⚠️ OPTIONAL (may be undefined, empty string, or category name)

**Evidence Source**: `/app/frontend/src/NotesApp.jsx` (approximately line 44)

**Code Excerpt**:
```javascript
const haveCat = String(n.category || "").trim();
```

**What This Proves**:
- Code uses fallback: `n.category || ""`
- Suggests field may be undefined or empty
- Defensive coding indicates field is optional

**Usage**: Main category name (empty string if uncategorized)

**Validation Rule**: Optional; may be undefined, empty string, or category name

---

#### Field 9: `subcategory`

**Classification**: ⚠️ OPTIONAL (may be undefined, empty string, or subcategory name)

**Evidence Source**: `/app/frontend/src/NotesApp.jsx` (approximately line 45)

**Code Excerpt**:
```javascript
const haveSub = String(n.subcategory || "").trim();
```

**What This Proves**:
- Code uses fallback: `n.subcategory || ""`
- Suggests field may be undefined or empty
- Defensive coding indicates field is optional

**Usage**: Subcategory name (empty string if no subcategory)

**Validation Rule**: Optional; may be undefined, empty string, or subcategory name

---

#### Field 10: `category_path`

**Classification**: ⚠️ OPTIONAL (only exists for categorized notes)

**Evidence Source**: `/app/frontend/src/NotesApp.jsx` (approximately line 48)

**Code Excerpt**:
```javascript
await StorageService.saveNote({
  ...n,
  category: wantCat,
  subcategory: wantSub,
  category_path: path,
  updated_at: new Date().toISOString(),
});
```

**What This Proves**:
- `category_path` assigned during note save when category exists
- Only assigned when hierarchy exists
- No evidence of initialization in note creation

**Usage**: Array path through category hierarchy

**Validation Rule**: Optional; may not exist for uncategorized notes

---

#### Field 11: `attachments`

**Classification**: ⚠️ OPTIONAL (only exists when attachments added)

**Evidence Source**: `/app/frontend/src/storage/storageService.js` (line 67)

**Code Excerpt**:
```javascript
if (note?.attachments?.length) {
  for (const att of note.attachments) {
    await filesStore.removeItem(att.id);
  }
}
```

**What This Proves**:
- Code uses optional chaining: `note?.attachments?.length`
- Indicates field may not exist
- Only checked when present

**Usage**: Array of attachment objects

**Validation Rule**: Optional; only exists when attachments added

---

#### Field 12: `featured_image`

**Classification**: ⚠️ OPTIONAL (only exists when featured image set)

**Evidence Source**: `/app/frontend/src/storage/storageService.js` (line 74)

**Code Excerpt**:
```javascript
if (note?.featured_image?.attachment_id) {
  await filesStore.removeItem(note.featured_image.attachment_id);
}
```

**What This Proves**:
- Code uses optional chaining: `note?.featured_image?.attachment_id`
- Indicates field may not exist
- Only checked when present

**Usage**: Featured image object with attachment_id

**Validation Rule**: Optional; only exists when featured image set

---

### ❓ STATUS UNCONFIRMED (7 fields)

---

#### Field 13: `title`

**Classification**: ❓ LIKELY EXISTS BUT UNCONFIRMED

**Evidence Search Results**: No explicit assignment found in examined files

**Files Examined**:
- `/app/frontend/src/storage/storageService.js` — No direct reference
- `/app/frontend/src/NotesApp.jsx` — No explicit assignment in note creation

**Assumption**: Likely handled in note modal/editor components not examined

**Recommendation**: INVESTIGATE — View `/app/frontend/src/notes/NoteModal.jsx` or similar editor components

---

#### Field 14: `content`

**Classification**: ❓ LIKELY EXISTS BUT UNCONFIRMED

**Evidence Search Results**: No explicit assignment found in examined files

**Files Examined**:
- `/app/frontend/src/storage/storageService.js` — No direct reference
- `/app/frontend/src/NotesApp.jsx` — No explicit assignment in note creation

**Assumption**: Likely handled in note modal/editor components not examined

**Recommendation**: INVESTIGATE — View note editor components

---

#### Field 15: `tags`

**Classification**: ❓ UNCONFIRMED

**Evidence Search Results**: No references found

**Files Examined**:
- `/app/frontend/src/storage/storageService.js` — No reference
- `/app/frontend/src/NotesApp.jsx` — No reference

**Status**: May not exist in current version

**Recommendation**: INVESTIGATE — Search entire codebase for `tags` references

---

#### Field 16: `color`

**Classification**: ❓ UNCONFIRMED

**Evidence Search Results**: No references found

**Status**: May not exist in current version

**Recommendation**: INVESTIGATE — Search entire codebase for note color references

---

#### Field 17: `icon`

**Classification**: ❓ UNCONFIRMED

**Evidence Search Results**: No references found

**Status**: May not exist in current version

**Recommendation**: INVESTIGATE — Search entire codebase for note icon references

---

#### Field 18: `pinned`

**Classification**: ❓ UNCONFIRMED

**Evidence Search Results**: No references found

**Status**: May not exist in current version

**Recommendation**: INVESTIGATE — Search entire codebase for pinned note references

---

#### Field 19: `ui_brightness`

**Classification**: ❓ MENTIONED IN COMMENT ONLY

**Evidence Source**: `/app/frontend/src/storage/storageService.js` (line 59)

**Code Excerpt**:
```javascript
// LOCKED: ui_brightness and LOCKED surface schema must survive save/restore
```

**What This Proves**:
- Field is mentioned in comment
- Related to "LOCKED surface" (requires password 2020 to modify)
- Implementation not examined

**Status**: Referenced but implementation not confirmed

**Recommendation**: INVESTIGATE — Requires LOCKED surface examination

---

## 🗂️ SETTINGS FIELDS EVIDENCE

### ✅ CORE IRON RABBIT SETTINGS (7 fields)

**Evidence Source**: `/app/frontend/src/storage/storageService.js` (lines 219-227)

**Default Settings Object**:
```javascript
async getSettings() {
  const settings = await settingsStore.getItem('app_settings');
  if (!settings) {
    const defaults = {
      id: 'app_settings',
      logo_url: '',
      header_bg: 'https://images.unsplash.com/photo-1771814536315-ae11952227fc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHw0fHxkYXJrJTIwZnV0dXJpc3RpYyUyMGFic3RyYWN0JTIwdGV4dHVyZXxlbnwwfHx8fDE3NzMxNjM2OTR8MA&ixlib=rb-4.1.0&q=85',
      website_url: 'https://ironrabbitapps.com',
      company_name: 'Iron Rabbit',
      view_mode: 'list',
      attachment_limits: { max_images: 10, max_files: 10, max_mb: 10 },
    };
    await settingsStore.setItem('app_settings', defaults);
    return defaults;
  }
  return settings;
},
```

---

#### Field 1: `id`

**Value**: `'app_settings'`  
**Type**: string  
**Usage**: Settings document identifier  
**Classification**: ✅ CORE REQUIRED  
**Evidence**: Line 220

---

#### Field 2: `logo_url`

**Value**: `''` (empty string)  
**Type**: string  
**Usage**: Custom logo URL (empty if not set)  
**Classification**: ✅ CORE REQUIRED  
**Evidence**: Line 221

---

#### Field 3: `header_bg`

**Value**: Unsplash image URL  
**Type**: string  
**Usage**: Header background image URL  
**Classification**: ✅ CORE REQUIRED  
**Evidence**: Line 222

---

#### Field 4: `website_url`

**Value**: `'https://ironrabbitapps.com'`  
**Type**: string  
**Usage**: Company/user website URL  
**Classification**: ✅ CORE REQUIRED  
**Evidence**: Line 223

---

#### Field 5: `company_name`

**Value**: `'Iron Rabbit'`  
**Type**: string  
**Usage**: Company/user name for branding  
**Classification**: ✅ CORE REQUIRED  
**Evidence**: Line 224

---

#### Field 6: `view_mode`

**Value**: `'list'`  
**Type**: string  
**Usage**: Default view mode  
**Classification**: ✅ CORE REQUIRED  
**Evidence**: Line 225

---

#### Field 7: `attachment_limits`

**Value**: `{ max_images: 10, max_files: 10, max_mb: 10 }`  
**Type**: object  
**Usage**: File attachment size/count limits  
**Classification**: ✅ CORE REQUIRED  
**Evidence**: Line 226

---

### ⚠️ OPTIONAL CORE SETTINGS (2 fields)

---

#### Field 8: `category_tree`

**Classification**: ⚠️ OPTIONAL CORE (created on-demand)

**Evidence Source**: `/app/frontend/src/storage/storageService.js` (line 805)

**Code Excerpt**:
```javascript
await this.saveSettings({ category_tree: tree });
```

**What This Proves**:
- NOT in default settings object
- Created when user adds categories
- Dynamically added via `saveSettings`

**Usage**: Hierarchical category structure

**Validation Rule**: Optional; only present when user has created categories

---

#### Field 9: `category_order`

**Classification**: ⚠️ OPTIONAL CORE (created on-demand)

**Evidence Source**: `/app/frontend/src/storage/storageService.js` (line 95)

**Code Excerpt**:
```javascript
await this.saveSettings({ category_order: orderedNames });
```

**What This Proves**:
- NOT in default settings object
- Created when user reorders categories
- Dynamically added via `saveSettings`

**Usage**: User-defined category display order

**Validation Rule**: Optional; only present when user has reordered categories

---

### 🎁 RESTAURANTS GALORE FEATURE PACK (4 fields)

**Status**: Feature-pack data (NOT core Iron Rabbit)

---

#### Field 10: `grocery_trips`

**Classification**: 🎁 RESTAURANTS GALORE

**Evidence Source**: `/app/frontend/src/storage/storageService.js`

**Code Excerpts**:
```javascript
// Line 705
await this.saveSettings({ grocery_trips: trimmed });

// Line 711
await this.saveSettings({ grocery_trips: next });

// Line 717
await this.saveSettings({ grocery_trips: next });
```

**What This Proves**:
- Field is actively used for CRUD operations
- Part of Restaurants Galore feature pack
- NOT in default settings

**Usage**: Grocery shopping trip tracking

**Validation Rule**: IF present → preserve completely; IF absent → do not require

---

#### Field 11: `meal_plan`

**Classification**: 🎁 RESTAURANTS GALORE

**Evidence Source**: `/app/frontend/src/storage/storageService.js` (line 729)

**Code Excerpt**:
```javascript
await this.saveSettings({ meal_plan: plan });
```

**Usage**: Meal planning data

**Validation Rule**: IF present → preserve completely; IF absent → do not require

---

#### Field 12: `custom_recipes`

**Classification**: 🎁 RESTAURANTS GALORE

**Evidence Source**: `/app/frontend/src/storage/storageService.js`

**Code Excerpts**:
```javascript
// Line 742
await this.saveSettings({ custom_recipes: list });

// Line 747
await this.saveSettings({ custom_recipes: list.filter(r => r.id !== id) });
```

**Usage**: User-created recipes (CRUD operations)

**Validation Rule**: IF present → preserve completely; IF absent → do not require

---

#### Field 13: `pantry_items`

**Classification**: 🎁 RESTAURANTS GALORE

**Evidence Source**: `/app/frontend/src/storage/storageService.js`

**Code Excerpts**:
```javascript
// Line 769
await this.saveSettings({ pantry_items: list });

// Line 774
await this.saveSettings({ pantry_items: list.filter(p => p.id !== id) });

// Line 780
await this.saveSettings({ pantry_items: next });
```

**Usage**: Pantry inventory management (CRUD operations)

**Validation Rule**: IF present → preserve completely; IF absent → do not require

---

### ❓ UNCONFIRMED SETTINGS (2 fields)

---

#### Field 14: `theme`

**Classification**: ❓ UNCONFIRMED

**Evidence Search Results**: No code references found

**Files Examined**: storageService.js — No reference

**Status**: May not exist in current version

**Recommendation**: INVESTIGATE — Search codebase for theme settings

---

#### Field 15: `language`

**Classification**: ❓ UNCONFIRMED

**Evidence Search Results**: No code references found

**Files Examined**: storageService.js — No reference

**Status**: May not exist in current version

**Recommendation**: INVESTIGATE — Search codebase for language/i18n settings

---

## 📊 EVIDENCE SUMMARY

### Note Fields Evidence Quality

| Classification | Count | Evidence Quality |
|----------------|-------|------------------|
| ✅ Confirmed Required | 3 | ⭐⭐⭐ Strong (explicit assignment in code) |
| ✅ Confirmed Present | 2 | ⭐⭐⭐ Strong (explicit assignment + usage) |
| ⚠️ Nullable | 2 | ⭐⭐⭐ Strong (explicit null assignments) |
| ⚠️ Optional | 5 | ⭐⭐ Moderate (optional chaining / fallback logic) |
| ❓ Unconfirmed | 7 | ⭐ Weak (no evidence in examined files) |

### Settings Fields Evidence Quality

| Classification | Count | Evidence Quality |
|----------------|-------|------------------|
| ✅ Core Required | 7 | ⭐⭐⭐ Strong (in default object) |
| ⚠️ Optional Core | 2 | ⭐⭐⭐ Strong (dynamic assignment) |
| 🎁 Restaurants Galore | 4 | ⭐⭐⭐ Strong (CRUD operations) |
| ❓ Unconfirmed | 2 | ⭐ Weak (no evidence) |

### Files Examined

1. ✅ `/app/frontend/src/storage/storageService.js` — FULLY EXAMINED (916 lines)
2. ⚠️ `/app/frontend/src/NotesApp.jsx` — PARTIALLY EXAMINED (note creation logic only)
3. ❌ `/app/frontend/src/notes/NoteModal.jsx` — NOT EXAMINED (may contain title/content logic)
4. ❌ `/app/frontend/src/notes/CategoryPathAccordion.jsx` — NOT EXAMINED
5. ❌ Other UI components — NOT EXAMINED

### Recommended Investigations

**High Priority**:
1. Examine note editor components to confirm `title` and `content` fields
2. Search codebase for `ui_brightness` implementation (LOCKED surface)
3. Verify `order` and `last_viewed` presence in all historical notes

**Medium Priority**:
4. Search for `tags`, `color`, `icon`, `pinned` implementations
5. Verify `theme` and `language` settings existence

**Low Priority**:
6. Comprehensive scan of all field usage across entire codebase

---

## 🛑 CONFIRMATION STATEMENT

**Evidence Gathering Status**: ✅ COMPLETE (within scope)

**Evidence Quality**: ⭐⭐⭐ Strong for examined files

**Limitations Acknowledged**:
- Not all UI components examined
- LOCKED surface not examined (requires password)
- Some fields may exist in unexamined files

**Classification Approach**: Conservative — only classify as "confirmed" when direct code evidence found

**Unconfirmed Fields**: Marked as ❓ UNCONFIRMED rather than making assumptions

**No False Claims**: Did NOT turn assumptions into facts

---

**END OF REVISION 5.3 EVIDENCE REFERENCES**
