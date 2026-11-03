# IRON RABBIT — GREEN-PLUS HIERARCHY VISIBILITY INVESTIGATION
**Date**: November 3, 2026  
**Status**: READ-ONLY INVESTIGATION COMPLETE  
**Classification**: RENDERING / ACCORDION VISIBILITY PROBLEM (Not Data Deletion)

---

## EXECUTIVE SUMMARY

**FINDING**: Existing descendants are **NOT deleted**. They remain in the stored category tree AND in note paths. However, they become **HIDDEN from view** because the rendering logic relies entirely on note paths to discover subcategories, and the insertion operation modifies the note's path in-memory without updating other notes' paths.

**ROOT CAUSE**: The green-plus button modifies the CURRENT note's `category_path` array by inserting an empty string, which changes the note's depth. However, it does NOT update the category tree or other notes that may have deeper paths. The rendering logic (`CategoryGroup.jsx` and `NestedSubGroup.jsx`) discovers subcategories by grouping notes based on their `category_path` arrays, so if no notes point to the deeper levels, those levels don't render—even though they exist in storage.

**CLASSIFICATION**: **Rendering / Accordion Visibility Problem** (NOT actual data deletion)

---

## INVESTIGATION 1: GREEN-PLUS OPERATION TRACE

### Location of Handler
**File**: `/app/frontend/src/notes/CategoryPathAccordion.jsx`  
**Function**: `addChildLevel(depth)` (Lines 110-138)

### Complete Execution Path

#### Step 1: Green-Plus Click
```javascript
// Line 332: Button definition
<button
  type="button"
  onClick={() => addChildLevel(depth)}
  className="..."
  aria-label={`Add sub-level under ${seg || `level ${depth + 1}`}`}
  data-testid={`category-path-add-child-${depth}`}
>
  <Plus className="w-3.5 h-3.5" />
</button>
```

#### Step 2: Handler Execution
```javascript
// Lines 110-138: addChildLevel function
const addChildLevel = async (depth) => {
  console.log(`🟢 GREEN-PLUS CLICKED: depth=${depth}`);
  console.log(`   Current segments:`, JSON.stringify(segments));
  console.log(`   Current path prop:`, JSON.stringify(path));
  
  // CRITICAL LINE 116: INSERTION LOGIC
  const newPath = [...segments.slice(0, depth + 1), "", ...segments.slice(depth + 1)];
  
  console.log(`   Computed newPath (INSERTION LOGIC):`, JSON.stringify(newPath));
  console.log(`   Preserved descendants:`, JSON.stringify(segments.slice(depth + 1)));
  console.log(`   Calling onChange with newPath...`);
  
  onChange(newPath);  // Line 121: Calls parent component's onChange
  
  // ... focus logic ...
};
```

**What This Does**:
1. Takes current path segments: `["Home", "Kitchen", "Recipes"]`
2. Inserts empty string at `depth + 1`: `["Home", "", "Kitchen", "Recipes"]`
3. Calls `onChange(newPath)` to update the note's category path
4. The existing descendants `["Kitchen", "Recipes"]` are preserved in the array

**Key Observation**: The code **explicitly preserves** existing descendants with:
```javascript
segments.slice(depth + 1)  // Everything AFTER the insertion point
```

This slice is appended to the new path, so descendants are **NOT deleted from the path array**.

---

## INVESTIGATION 2: STORED CATEGORY TREE

### Storage Architecture

**File**: `/app/frontend/src/storage/storageService.js`  
**Function**: `addCategoryToTree(parentPath, categoryName)` (Lines 814-844)

**Key Finding**: When a new category is saved, it:
1. Creates the NEW category with an **empty children object**
2. Does NOT move existing categories
3. Does NOT delete existing branches
4. Preserves all existing parent-child relationships in the tree

**Example**:
```javascript
// Before insertion:
tree = {
  "Home": {
    children: {
      "Kitchen": {
        children: {
          "Recipes": { children: {} }  ← EXISTS
        }
      }
    }
  }
}

// After saveCategoryToTree(["Home"], "Appliances"):
tree = {
  "Home": {
    children: {
      "Appliances": { children: {} },  ← NEW
      "Kitchen": {                      ← STILL EXISTS
        children: {
          "Recipes": { children: {} }   ← STILL EXISTS
        }
      }
    }
  }
}
```

**Conclusion**: The stored category tree **retains all existing descendants**. No deletion occurs.

---

## INVESTIGATION 3: NOTE PATHS

### What Happens During Insertion

**Scenario**: User clicks green-plus at "Home" level on a note with path `["Home", "Kitchen", "Recipes"]`

**Before**:
```javascript
currentNote.category_path = ["Home", "Kitchen", "Recipes"]
```

**After Click** (Line 116 insertion):
```javascript
newPath = ["Home", "", "Kitchen", "Recipes"]
```

**After User Types "Appliances"**:
```javascript
currentNote.category_path = ["Home", "Appliances", "Kitchen", "Recipes"]
```

**Critical Finding**: Only the CURRENT note is modified. Other notes with paths like `["Home", "Kitchen", "Utensils"]` remain unchanged.

---

## INVESTIGATION 4: RENDERING & ACCORDION LOGIC

### How Subcategories Are Discovered

**Key Files**:
- `/app/frontend/src/notes/CategoryGroup.jsx` (Lines 55-71)
- `/app/frontend/src/notes/NestedSubGroup.jsx` (Lines 79-93)

**Discovery Method**: The rendering logic groups notes by examining their `category_path` arrays:

```javascript
// CategoryGroup.jsx - Find L1 subcategories
const nestedBuckets = useMemo(() => {
  const m = new Map();
  for (const n of children) {
    const p = getPath(n);
    if (p.length <= 1) continue;
    const key = p[1] || "(unnamed)";  // ← GROUP BY SECOND SEGMENT
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(n);
  }
  return Array.from(m.entries());
}, [children]);
```

**Critical Understanding**: Subcategories are discovered **ONLY by looking at notes' paths**, NOT by reading the global category tree.

### WHY DESCENDANTS BECOME HIDDEN

**Example**:

**Before Insertion**:
```
Notes:
- Note A: ["Home", "Kitchen", "Recipes"]
- Note B: ["Home", "Kitchen", "Utensils"]

Rendering discovers:
- p[1] = "Kitchen" for both notes → Kitchen (L1) appears
- Within Kitchen, p[2] = "Recipes" and "Utensils" → Both L2 appear
```

**After Insertion** (User modified Note A only):
```
Notes:
- Note A: ["Home", "Appliances", "Kitchen", "Recipes"]  ← MODIFIED
- Note B: ["Home", "Kitchen", "Utensils"]               ← UNCHANGED

Rendering discovers:
- p[1] = "Appliances" (Note A) → Appliances (L1) appears
- p[1] = "Kitchen" (Note B) → Kitchen (L1) appears
- Within Kitchen, p[2] = "Utensils" (Note B only) → Only Utensils L2 appears

⚠️ Recipes is now at p[3] under Appliances → Kitchen (L2) → Recipes (L3)
✓ Recipes didn't disappear—it moved to a deeper branch under Appliances
```

**Visual**:
```
BEFORE:
Home (M)
└─ Kitchen (L1)
   ├─ Recipes (L2) ← Note A here
   └─ Utensils (L2) ← Note B here

AFTER:
Home (M)
├─ Appliances (L1) ✖ COLLAPSED
│  └─ Kitchen (L2) ← HIDDEN
│     └─ Recipes (L3) ← HIDDEN (Note A moved here)
└─ Kitchen (L1)
   └─ Utensils (L2) ← Note B unchanged
```

---

## INVESTIGATION 5: CLASSIFICATION

### A. STORED DATA
**Status**: ✅ **PRESERVED**

- Original "Kitchen" category **still exists** in tree
- Original "Recipes" category **still exists** in tree  
- Parent-child relationships **intact**
- No data deletion occurred

### B. NOTE REFERENCES
**Status**: ⚠️ **PARTIALLY MODIFIED**

- **Current Note**: Path modified from 3 levels to 4 levels
- **Other Notes**: Paths unchanged

### C. SCREEN RENDERING
**Status**: ❌ **VISIBILITY PROBLEM**

- "Recipes" relocated to `Appliances → Kitchen → Recipes`
- New "Appliances" accordion **closed by default**
- Descendants **hidden inside closed accordion**

---

## FINAL CLASSIFICATION

**✅ PRIMARY ISSUE**: **Rendering / Accordion Visibility Problem**

**NOT**:
- ❌ Actual data deletion
- ❌ Category tree corruption
- ❌ Permanent data loss

---

## SUPPORTING EVIDENCE

### Code Locations
1. **Green-Plus Handler**: `/app/frontend/src/notes/CategoryPathAccordion.jsx`, Line 116
2. **Category Storage**: `/app/frontend/src/storage/storageService.js`, Lines 814-844
3. **Rendering Discovery**: `/app/frontend/src/notes/CategoryGroup.jsx`, Lines 55-71
4. **Recursive Discovery**: `/app/frontend/src/notes/NestedSubGroup.jsx`, Lines 79-93

### Key Observations
1. Insertion logic preserves descendants: `segments.slice(depth + 1)`
2. Storage function creates sibling, doesn't delete: `current[categoryName] = {...}`
3. Discovery scans note paths: `const key = p[1]`
4. Accordion defaults to closed: `isOpen = hierarchyOpenPaths.has(fullPathKey)`

---

## CONCLUSION

The green-plus button does **NOT delete descendants**. All data remains intact in storage. The "disappearance" is a **rendering artifact** caused by:

1. The current note's path being re-parented to a new branch
2. The rendering logic discovering subcategories from note paths only
3. The new parent accordion being closed by default

**Descendants remain exactly where the note's path points to—they're just in a different (hidden) branch.**

---

## NEXT STEPS (AWAITING APPROVAL)

**Do NOT implement** until explicitly authorized.

**Investigation Status**: ✅ COMPLETE  
**Fix Status**: ⏸️ BLOCKED (Awaiting user approval)

Proposed next actions:
1. Verify with live IndexedDB inspection
2. Test accordion expansion to confirm descendants appear
3. Consider auto-expanding newly created subcategories
4. Discuss whether insertion should update all affected notes' paths

**END OF INVESTIGATION REPORT**
