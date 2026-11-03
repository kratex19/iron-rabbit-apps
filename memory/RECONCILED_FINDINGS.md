# IRON RABBIT — INVESTIGATION FINDING RECONCILIATION
**Date**: November 3, 2026  
**Status**: CORRECTED ANALYSIS — READ-ONLY

---

## ⚠️ CONTRADICTION IDENTIFIED AND CORRECTED

### Original Imprecise Statement
> "The original descendants are relocated beneath the newly created subcategory."

### Correction
**Descendants are NOT relocated.** The stored category tree and other notes' paths remain unchanged. What actually happens:

1. **One note's path is modified** (the note being edited)
2. **That note moves to a new branch** (due to its path change)
3. **Original branch loses visibility** (no notes reference it, so rendering skips it)
4. **Storage remains intact** (category tree and unedited notes unchanged)

---

## 📊 THREE PRECISE BEFORE/AFTER COMPARISONS

### EXAMPLE SCENARIO

**User Action**: 
- Opens a note with path `["Home", "Kitchen", "Utensils"]`
- Clicks green-plus at "Home" level (depth=0)
- Types "Appliances" in the inserted row
- Saves the note

---

## COMPARISON 1: STORED CATEGORY_TREE

### BEFORE Green-Plus Operation

**Source**: IndexedDB `settings` store, key: `app_settings`, field: `category_tree`

```json
{
  "Home": {
    "id": "cat-home-123",
    "name": "Home",
    "children": {
      "Kitchen": {
        "id": "cat-kitchen-456",
        "name": "Kitchen",
        "children": {
          "Utensils": {
            "id": "cat-utensils-789",
            "name": "Utensils",
            "children": {}
          },
          "Appliances": {
            "id": "cat-appliances-ABC",
            "name": "Appliances",
            "children": {}
          }
        }
      },
      "Garden": {
        "id": "cat-garden-DEF",
        "name": "Garden",
        "children": {}
      }
    }
  }
}
```

**Parent-Child Relationships**:
- `Home` (id: cat-home-123)
  - `children`: { "Kitchen": {...}, "Garden": {...} }
- `Kitchen` (id: cat-kitchen-456)
  - `parent`: Home (implicitly, as child of Home)
  - `children`: { "Utensils": {...}, "Appliances": {...} }
- `Utensils` (id: cat-utensils-789)
  - `parent`: Kitchen (implicitly)
  - `children`: {}
- `Appliances` (id: cat-appliances-ABC)
  - `parent`: Kitchen (implicitly)
  - `children`: {}

---

### AFTER Green-Plus Operation

**Function Responsible**: `storageService.js:814-844` (`addCategoryToTree`)

**Change Made**: New category "Appliances" added **as sibling to Kitchen at Home level**

```json
{
  "Home": {
    "id": "cat-home-123",
    "name": "Home",
    "children": {
      "Appliances": {                    // ← NEW NODE ADDED HERE
        "id": "cat-appliances-XYZ",      // ← NEW ID (different from old Appliances under Kitchen)
        "name": "Appliances",
        "children": {}
      },
      "Kitchen": {                       // ← UNCHANGED
        "id": "cat-kitchen-456",
        "name": "Kitchen",
        "children": {
          "Utensils": {                  // ← UNCHANGED
            "id": "cat-utensils-789",
            "name": "Utensils",
            "children": {}
          },
          "Appliances": {                // ← UNCHANGED (old Appliances still exists)
            "id": "cat-appliances-ABC",
            "name": "Appliances",
            "children": {}
          }
        }
      },
      "Garden": {                        // ← UNCHANGED
        "id": "cat-garden-DEF",
        "name": "Garden",
        "children": {}
      }
    }
  }
}
```

**Parent-Child Relationships**:
- `Home` (id: cat-home-123)
  - `children`: { **"Appliances": {...}**, "Kitchen": {...}, "Garden": {...} } ← ONE CHILD ADDED
- `Kitchen` (id: cat-kitchen-456)
  - `parent`: Home (unchanged)
  - `children`: { "Utensils": {...}, "Appliances": {...} } ← UNCHANGED
- `Utensils` (id: cat-utensils-789)
  - `parent`: Kitchen (unchanged)
  - `children`: {} ← UNCHANGED
- `Appliances` (id: cat-appliances-ABC, under Kitchen)
  - `parent`: Kitchen (unchanged)
  - `children`: {} ← UNCHANGED
- **NEW**: `Appliances` (id: cat-appliances-XYZ, under Home)
  - `parent`: Home
  - `children`: {}

**Changes**:
- ✅ ONE node added: "Appliances" as child of "Home" with NEW ID
- ✅ ALL existing nodes preserved (Kitchen, Utensils, old Appliances)
- ✅ ALL existing parent-child relationships preserved
- ❌ NO nodes deleted
- ❌ NO nodes moved
- ❌ NO parent-child relationships broken

**Code Evidence**:
```javascript
// storageService.js:814-844
async addCategoryToTree(parentPath, categoryName) {
  const tree = await this.getCategoryTree();
  
  // Navigate to parent: parentPath = ["Home"]
  let current = tree;
  for (const segment of parentPath) {  // segment = "Home"
    if (!current[segment]) {
      // Home exists, skip creation
    }
    current = current[segment].children;  // current = tree["Home"].children
  }
  
  // Add new category: categoryName = "Appliances"
  if (!current[categoryName]) {  // current["Appliances"] doesn't exist at this level
    current[categoryName] = {    // Creates tree["Home"].children["Appliances"]
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: categoryName,
      children: {}  // ← Empty children object
    };
  }
  
  await this.saveCategoryTree(tree);  // ← Saves ENTIRE tree (preserves all existing nodes)
  return tree;
}
```

**Key Observation**: 
- Tree is modified by ADDING a key to `tree["Home"].children["Appliances"]`
- JavaScript object property addition does NOT delete other properties
- `tree["Home"].children["Kitchen"]` remains untouched

---

## COMPARISON 2: EVERY AFFECTED NOTE'S CATEGORY_PATH

### BEFORE Green-Plus Operation

**Source**: IndexedDB `notes` store

| Note ID | Title | category_path | Storage Location |
|---------|-------|---------------|------------------|
| note-001 | "Spatula Set" | `["Home", "Kitchen", "Utensils"]` | IndexedDB notes store |
| note-002 | "Knife Block" | `["Home", "Kitchen", "Utensils"]` | IndexedDB notes store |
| note-003 | "Blender" | `["Home", "Kitchen", "Appliances"]` | IndexedDB notes store |
| note-004 | "Toaster" | `["Home", "Kitchen", "Appliances"]` | IndexedDB notes store |
| note-005 | "Shovel" | `["Home", "Garden"]` | IndexedDB notes store |

**Notes Pointing to Each Branch**:
- `["Home", "Kitchen", "Utensils"]`: 2 notes (001, 002)
- `["Home", "Kitchen", "Appliances"]`: 2 notes (003, 004)
- `["Home", "Garden"]`: 1 note (005)

---

### DURING Green-Plus Operation

**User Action**: Opens note-001 "Spatula Set" for editing

**Function Responsible**: `CategoryPathAccordion.jsx:110-138` (`addChildLevel`)

**Code Executed**:
```javascript
// Current note: note-001
// segments = ["Home", "Kitchen", "Utensils"]
// depth = 0 (clicked green-plus on "Home" row)

const newPath = [
  ...segments.slice(0, 0 + 1),   // ["Home"]
  "",                             // Empty string
  ...segments.slice(0 + 1)        // ["Kitchen", "Utensils"]
];
// newPath = ["Home", "", "Kitchen", "Utensils"]

onChange(newPath);  // Updates note-001's category_path in memory
```

**User Types**: "Appliances" in the inserted row

**Updated Path** (in memory): `["Home", "Appliances", "Kitchen", "Utensils"]`

**User Saves Note**

**Function Responsible**: `NotesApp.jsx` (note save handler) → `StorageService.saveNote()`

---

### AFTER Green-Plus Operation

**Source**: IndexedDB `notes` store

| Note ID | Title | category_path | Changed? |
|---------|-------|---------------|----------|
| note-001 | "Spatula Set" | `["Home", "Appliances", "Kitchen", "Utensils"]` | ✅ **MODIFIED** |
| note-002 | "Knife Block" | `["Home", "Kitchen", "Utensils"]` | ❌ UNCHANGED |
| note-003 | "Blender" | `["Home", "Kitchen", "Appliances"]` | ❌ UNCHANGED |
| note-004 | "Toaster" | `["Home", "Kitchen", "Appliances"]` | ❌ UNCHANGED |
| note-005 | "Shovel" | `["Home", "Garden"]` | ❌ UNCHANGED |

**Notes Pointing to Each Branch**:
- `["Home", "Kitchen", "Utensils"]`: **1 note** (002) ← Lost note-001
- `["Home", "Kitchen", "Appliances"]`: 2 notes (003, 004) ← UNCHANGED
- `["Home", "Garden"]`: 1 note (005) ← UNCHANGED
- **NEW**: `["Home", "Appliances", "Kitchen", "Utensils"]`: **1 note** (001) ← Gained note-001

**Changes**:
- ✅ ONE note modified (note-001)
- ❌ FOUR notes unchanged (note-002, 003, 004, 005)
- ✅ Note-001 now points to DIFFERENT path
- ❌ NO other notes' paths modified

**Code Evidence**:
```javascript
// CategoryPathAccordion.jsx:121
onChange(newPath);  // Calls parent's setState

// Parent component (NotesApp.jsx or NoteModal.jsx) updates state:
setEditingNote(prev => ({ ...prev, category_path: newPath }));

// On save:
await StorageService.saveNote(editingNote);  // Saves ONLY this note to IndexedDB
```

**Key Observation**:
- `onChange` callback affects ONLY the note being edited (note-001)
- React state update modifies one note object in memory
- `saveNote` writes ONLY one note document to IndexedDB
- Other notes (002-005) are never loaded, modified, or saved

---

## COMPARISON 3: ACTUAL RENDERED HIERARCHY

### BEFORE Green-Plus Operation

**Source**: React component rendering (`CategoryGroup.jsx`, `NestedSubGroup.jsx`)

**Rendered Structure**:
```
Home (M) — 5 notes
├─ Kitchen (L1) — 4 notes
│  ├─ Utensils (L2) — 2 notes
│  │  ├─ note-001: "Spatula Set"
│  │  └─ note-002: "Knife Block"
│  └─ Appliances (L2) — 2 notes
│     ├─ note-003: "Blender"
│     └─ note-004: "Toaster"
└─ Garden (L1) — 1 note
   └─ note-005: "Shovel"
```

**Function Responsible**: `CategoryGroup.jsx:55-71` (nestedBuckets computation)

**Discovery Algorithm**:
```javascript
// All notes under "Home": [note-001, note-002, note-003, note-004, note-005]

// Step 1: Group by p[1]
for (const n of children) {
  const p = getPath(n);  // Gets category_path array
  const key = p[1];       // Second segment
  
  // note-001: p = ["Home", "Kitchen", "Utensils"] → p[1] = "Kitchen"
  // note-002: p = ["Home", "Kitchen", "Utensils"] → p[1] = "Kitchen"
  // note-003: p = ["Home", "Kitchen", "Appliances"] → p[1] = "Kitchen"
  // note-004: p = ["Home", "Kitchen", "Appliances"] → p[1] = "Kitchen"
  // note-005: p = ["Home", "Garden"] → p[1] = "Garden"
}

// Result: nestedBuckets = [
//   ["Kitchen", [note-001, note-002, note-003, note-004]],
//   ["Garden", [note-005]]
// ]

// Renders:
// - Kitchen (L1) with 4 notes
// - Garden (L1) with 1 note
```

**Recursive Discovery** (within Kitchen):
```javascript
// Notes in Kitchen: [note-001, note-002, note-003, note-004]

// Step 2: Group by p[2] (depth=1, so depth+1=2)
for (const n of bucketNotes) {
  const p = getPath(n);
  const key = p[2];  // Third segment
  
  // note-001: p = ["Home", "Kitchen", "Utensils"] → p[2] = "Utensils"
  // note-002: p = ["Home", "Kitchen", "Utensils"] → p[2] = "Utensils"
  // note-003: p = ["Home", "Kitchen", "Appliances"] → p[2] = "Appliances"
  // note-004: p = ["Home", "Kitchen", "Appliances"] → p[2] = "Appliances"
}

// Result: deeperBuckets = [
//   ["Utensils", [note-001, note-002]],
//   ["Appliances", [note-003, note-004]]
// ]

// Renders under Kitchen:
// - Utensils (L2) with 2 notes
// - Appliances (L2) with 2 notes
```

**Why These Render**:
- ✅ Kitchen renders because 4 notes have `p[1] = "Kitchen"`
- ✅ Utensils renders because 2 notes have `p[2] = "Utensils"` (within Kitchen group)
- ✅ Appliances (L2) renders because 2 notes have `p[2] = "Appliances"` (within Kitchen group)

---

### AFTER Green-Plus Operation

**Source**: React component rendering (`CategoryGroup.jsx`, `NestedSubGroup.jsx`)

**Rendered Structure**:
```
Home (M) — 5 notes
├─ Appliances (L1) ✖ COLLAPSED — 1 note
│  └─ Kitchen (L2) — 1 note ← HIDDEN (inside collapsed accordion)
│     └─ Utensils (L3) — 1 note ← HIDDEN
│        └─ note-001: "Spatula Set" ← HIDDEN
├─ Kitchen (L1) — 4 notes
│  ├─ Utensils (L2) — 1 note
│  │  └─ note-002: "Knife Block"
│  └─ Appliances (L2) — 2 notes
│     ├─ note-003: "Blender"
│     └─ note-004: "Toaster"
└─ Garden (L1) — 1 note
   └─ note-005: "Shovel"
```

**Discovery Algorithm** (Step 1):
```javascript
// All notes under "Home": [note-001, note-002, note-003, note-004, note-005]

// Group by p[1]
for (const n of children) {
  const p = getPath(n);
  const key = p[1];
  
  // note-001: p = ["Home", "Appliances", "Kitchen", "Utensils"] → p[1] = "Appliances"
  // note-002: p = ["Home", "Kitchen", "Utensils"] → p[1] = "Kitchen"
  // note-003: p = ["Home", "Kitchen", "Appliances"] → p[1] = "Kitchen"
  // note-004: p = ["Home", "Kitchen", "Appliances"] → p[1] = "Kitchen"
  // note-005: p = ["Home", "Garden"] → p[1] = "Garden"
}

// Result: nestedBuckets = [
//   ["Appliances", [note-001]],  ← NEW GROUP
//   ["Kitchen", [note-002, note-003, note-004]],  ← Lost note-001
//   ["Garden", [note-005]]
// ]

// Renders:
// - Appliances (L1) with 1 note ← NEW
// - Kitchen (L1) with 3 notes ← Lost 1 note
// - Garden (L1) with 1 note
```

**Recursive Discovery** (within Kitchen):
```javascript
// Notes in Kitchen: [note-002, note-003, note-004]  ← note-001 is gone

// Group by p[2] (depth=1, so depth+1=2)
for (const n of bucketNotes) {
  const p = getPath(n);
  const key = p[2];
  
  // note-002: p = ["Home", "Kitchen", "Utensils"] → p[2] = "Utensils"
  // note-003: p = ["Home", "Kitchen", "Appliances"] → p[2] = "Appliances"
  // note-004: p = ["Home", "Kitchen", "Appliances"] → p[2] = "Appliances"
}

// Result: deeperBuckets = [
//   ["Utensils", [note-002]],  ← Lost note-001
//   ["Appliances", [note-003, note-004]]
// ]

// Renders under Kitchen:
// - Utensils (L2) with 1 note ← Lost note-001
// - Appliances (L2) with 2 notes
```

**Recursive Discovery** (within Appliances L1):
```javascript
// Notes in Appliances L1: [note-001]

// Group by p[2] (depth=1, so depth+1=2)
for (const n of bucketNotes) {
  const p = getPath(n);
  const key = p[2];
  
  // note-001: p = ["Home", "Appliances", "Kitchen", "Utensils"] → p[2] = "Kitchen"
}

// Result: deeperBuckets = [
//   ["Kitchen", [note-001]]
// ]

// Renders under Appliances:
// - Kitchen (L2) with 1 note
```

**Recursive Discovery** (within Appliances → Kitchen L2):
```javascript
// Notes in Appliances→Kitchen L2: [note-001]

// Group by p[3] (depth=2, so depth+1=3)
for (const n of bucketNotes) {
  const p = getPath(n);
  const key = p[3];
  
  // note-001: p = ["Home", "Appliances", "Kitchen", "Utensils"] → p[3] = "Utensils"
}

// Result: deeperBuckets = [
//   ["Utensils", [note-001]]
// ]

// Renders under Appliances→Kitchen:
// - Utensils (L3) with 1 note
```

**Accordion State**:
```javascript
// NestedSubGroup.jsx:73
const fullPathKey = "Home\u241EAppliances";  // Path separator
const isOpen = hierarchyOpenPaths.has("Home\u241EAppliances");  // → false (not in Set)

// Result: Appliances accordion is CLOSED
// - Kitchen (L2) is NOT rendered to DOM
// - Utensils (L3) is NOT rendered to DOM
// - note-001 is NOT rendered to DOM
```

---

### WHAT RENDERS vs WHAT DOESN'T (After)

**Rendered Nodes**:
- ✅ Home (M)
- ✅ Appliances (L1) — accordion CLOSED
- ✅ Kitchen (L1) — accordion OPEN
- ✅ Utensils (L2 under Kitchen L1) — with note-002 only
- ✅ Appliances (L2 under Kitchen L1) — with note-003, note-004
- ✅ Garden (L1)

**NOT Rendered (Hidden Inside Closed Accordion)**:
- ❌ Kitchen (L2 under Appliances L1) — hidden because Appliances accordion is closed
- ❌ Utensils (L3 under Appliances→Kitchen) — hidden because ancestor accordion is closed
- ❌ note-001 under Appliances→Kitchen→Utensils — hidden because ancestor accordion is closed

**NOT Rendered (No Notes Reference Them)**:
- *NONE* — All category tree nodes that have notes pointing to them are discovered and would render if visible

**Changes**:
- ✅ NEW branch appears: Appliances (L1) → Kitchen (L2) → Utensils (L3)
- ✅ Existing branch loses note: Kitchen (L1) → Utensils (L2) now has 1 note instead of 2
- ❌ NO category tree nodes deleted
- ❌ NO note paths changed except note-001

**Why Utensils "Disappears" from Kitchen L1**:
- ✅ Utensils (L2) under Kitchen (L1) STILL RENDERS (not deleted)
- ✅ It now shows only note-002 (instead of note-001 + note-002)
- ❌ note-001 is NOT under Kitchen→Utensils anymore
- ✅ note-001 is now under Appliances→Kitchen→Utensils (hidden)

**User Perception**: 
- User sees: "Spatula Set disappeared from Kitchen → Utensils"
- Reality: "Spatula Set moved to Appliances → Kitchen → Utensils (hidden inside closed accordion)"

---

## 🎯 PRECISE TERMINOLOGY CORRECTIONS

### ❌ INCORRECT STATEMENTS

1. ~~"Descendants are relocated"~~
   - **Correction**: Note-001 is relocated. Other notes and category tree nodes are NOT relocated.

2. ~~"Original descendants become hidden"~~
   - **Correction**: The MODIFIED note becomes hidden (inside new closed accordion). UNMODIFIED notes remain visible in original location.

3. ~~"The green-plus operation affects descendants"~~
   - **Correction**: The green-plus operation affects ONLY the note being edited. Other notes are unaffected.

---

### ✅ CORRECTED STATEMENTS

1. **Category Tree**:
   - ✅ "One NEW node is added to the category tree"
   - ✅ "All existing nodes remain unchanged"
   - ✅ "No parent-child relationships are broken"

2. **Note Paths**:
   - ✅ "One note's category_path is modified (the note being edited)"
   - ✅ "The modified note now references a different branch"
   - ✅ "All other notes' category_paths remain unchanged"

3. **Rendering**:
   - ✅ "The modified note appears in a new branch (discovered from its new path)"
   - ✅ "The modified note no longer appears in the original branch (its path no longer matches)"
   - ✅ "The new branch's accordion is closed by default, hiding the modified note"
   - ✅ "The original branch still renders if other notes reference it"

---

## 📋 DISTINGUISHING FOUR SCENARIOS

### Scenario 1: Category Tree Node Exists But Not Rendering

**Example**: `tree["Home"].children["Kitchen"].children["Recipes"]` exists in storage

**Condition**: NO notes have `category_path` including "Recipes"

**Result**: "Recipes" does NOT render (rendering logic skips it)

**Evidence**: Rendering loops through notes, not category tree nodes

---

### Scenario 2: Note Path Changed

**Example**: note-001's `category_path` changes from `["Home", "Kitchen", "Utensils"]` to `["Home", "Appliances", "Kitchen", "Utensils"]`

**Condition**: User edited note-001 and used green-plus

**Result**: 
- Note-001 no longer appears under Kitchen→Utensils
- Note-001 now appears under Appliances→Kitchen→Utensils

**Evidence**: `CategoryPathAccordion.jsx:121` calls `onChange(newPath)`

---

### Scenario 3: Accordion Closed

**Example**: "Appliances" (L1) accordion is closed

**Condition**: `hierarchyOpenPaths` Set does not contain `"Home\u241EAppliances"`

**Result**:
- "Appliances" row is visible
- Children of "Appliances" are NOT rendered to DOM
- Accordion chevron points right (collapsed state)

**Evidence**: `NestedSubGroup.jsx:73` checks `hierarchyOpenPaths.has(fullPathKey)`

---

### Scenario 4: Category Absent Because No Note References It

**Example**: If ALL notes with `category_path` starting with `["Home", "Kitchen"]` are deleted

**Condition**: NO notes have `p[1] = "Kitchen"`

**Result**:
- "Kitchen" does NOT render under "Home"
- Category tree still has `tree["Home"].children["Kitchen"]`

**Evidence**: `CategoryGroup.jsx:66` creates nestedBuckets from notes, not tree

---

## 🔬 WHAT ACTUALLY HAPPENS IN OUR CASE

**After green-plus operation on note-001**:

### Category Tree:
- ✅ **Scenario N/A** - Tree has NEW node added, all old nodes preserved
- **Status**: All nodes exist in storage

### Note-001:
- ✅ **Scenario 2** - Note path CHANGED from `["Home", "Kitchen", "Utensils"]` to `["Home", "Appliances", "Kitchen", "Utensils"]`
- **Status**: Relocated to different branch

### Note-002:
- ✅ **Scenario N/A** - Note path UNCHANGED at `["Home", "Kitchen", "Utensils"]`
- **Status**: Remains in original branch, still renders

### Kitchen→Utensils (L2):
- ✅ **Scenario N/A** - Still renders because note-002 references it
- **Status**: Visible, but with only 1 note instead of 2

### Appliances→Kitchen→Utensils (L3):
- ✅ **Scenario 3** - Accordion closed
- **Status**: Exists in rendering structure but hidden in DOM

### Old Appliances (under Kitchen):
- ✅ **Scenario N/A** - Still renders because note-003 and note-004 reference it
- **Status**: Unchanged and visible

---

## 🛑 LIMITATIONS REAFFIRMED

### What Was NOT Verified (Due to Technical Blocks):

1. **Live IndexedDB Data**
   - ❌ Cannot confirm actual stored category_tree structure
   - ❌ Cannot confirm actual note paths in database
   - ❌ Cannot confirm timestamps or IDs

2. **Before-State**
   - ❌ No historical snapshots available
   - ❌ Cannot compare actual before/after database dumps
   - ❌ Examples are HYPOTHETICAL based on code logic

3. **Live UI Accordion Behavior**
   - ❌ Cannot test expanding "Appliances" accordion to reveal note-001
   - ❌ Cannot visually confirm rendering matches code prediction
   - ❌ Cannot verify user experience

### Why Analysis Remains Valid:

1. **Code Logic is Deterministic**
   - JavaScript object property addition doesn't delete other properties
   - Array slice operation preserves specified elements
   - React rendering follows predictable rules

2. **Function Calls Are Traceable**
   - `addCategoryToTree` only adds keys, never deletes
   - `onChange` callback affects one state variable
   - `saveNote` writes one document to IndexedDB

3. **Rendering Algorithm is Explicit**
   - Groups notes by path segments (observable in code)
   - Accordion state uses Set membership (observable in code)
   - No hidden logic or side effects

---

## ✅ FINAL RECONCILED FINDINGS

### A. STORED CATEGORY_TREE
**Status**: ✅ **ONE NODE ADDED, ALL EXISTING NODES PRESERVED**

**Change**: 
- New node created at `tree["Home"].children["Appliances"]` with NEW ID
- All other nodes unchanged (including `tree["Home"].children["Kitchen"].children["Appliances"]` with OLD ID)

**Function**: `storageService.js:814-844` (`addCategoryToTree`)

---

### B. NOTE CATEGORY_PATHS
**Status**: ⚠️ **ONE NOTE MODIFIED, ALL OTHERS UNCHANGED**

**Change**:
- note-001: `["Home", "Kitchen", "Utensils"]` → `["Home", "Appliances", "Kitchen", "Utensils"]`
- note-002, 003, 004, 005: UNCHANGED

**Function**: `CategoryPathAccordion.jsx:116` (insertion), Line 121 (onChange callback)

---

### C. RENDERED HIERARCHY
**Status**: ❌ **VISIBILITY PROBLEM DUE TO PATH CHANGE + CLOSED ACCORDION**

**Change**:
- NEW branch appears: Appliances (L1) → Kitchen (L2) → Utensils (L3) with note-001
- Existing branch loses note: Kitchen (L1) → Utensils (L2) now has only note-002
- NEW accordion is CLOSED, hiding note-001 from view

**Function**: `CategoryGroup.jsx:55-71` (discovery), `NestedSubGroup.jsx:79-93` (recursive), `NestedSubGroup.jsx:73` (accordion state)

---

### D. ROOT CAUSE (CORRECTED)
**Classification**: **Single Note Path Modification + Note-Based Rendering Discovery + Closed Accordion**

**Sequence**:
1. User edits note-001, uses green-plus to insert "Appliances" at Home level
2. note-001's path changes to `["Home", "Appliances", "Kitchen", "Utensils"]`
3. Rendering discovers "Appliances" (L1) because note-001 has `p[1]="Appliances"`
4. Rendering discovers "Kitchen" (L2) under Appliances because note-001 has `p[2]="Kitchen"`
5. Rendering discovers "Utensils" (L3) under Appliances→Kitchen because note-001 has `p[3]="Utensils"`
6. "Appliances" accordion defaults to CLOSED, hiding all descendants including note-001
7. Kitchen (L1) → Utensils (L2) still renders because note-002 still points to it
8. User perceives: "note-001 disappeared from Kitchen→Utensils"
9. Reality: "note-001 is in Appliances→Kitchen→Utensils (hidden)"

**NOT**:
- ❌ Multiple notes relocated
- ❌ Descendants deleted
- ❌ Category tree corruption

**IS**:
- ✅ Single note path change
- ✅ Note-based rendering discovers new branch
- ✅ Closed accordion hides modified note
- ✅ Original branch still exists with remaining notes

---

**END OF RECONCILED FINDINGS**

**Status**: ✅ CORRECTED AND CLARIFIED  
**No code changes. No data changes. No repairs proposed.**

**Awaiting approval before any fix design.**
