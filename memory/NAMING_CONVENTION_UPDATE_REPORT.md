# IRON RABBIT — NAMING CONVENTION UPDATE REPORT

**Date**: November 4, 2026  
**Type**: Specification Update Only  
**Status**: ✅ COMPLETE — NO CODE CHANGES

---

## 📋 WHAT WAS UPDATED

### Primary Document Updated

**File**: `/app/memory/REVISED_CONSOLIDATED_ARCHITECTURE_FINAL.md`  
**Version**: 3.1 (Capitalization Rules Addendum)  
**Sections Modified**: 2 major sections

---

## 🎯 KEY CHANGES INCORPORATED

### 1. Capitalization Rules (Section 1.3 - Complete Rewrite)

**Previous Understanding** (INCORRECT):
- Progressive lowercase: SC → Sc → sc → sc...
- Depth-based capitalization

**Corrected Understanding** (NOW CORRECT):
- **SC** (capital C) = Subcategory DIRECTLY beneath Main Category
- **Sc** (lowercase c) = Subcategory beneath ANOTHER Subcategory
- Capitalization indicates **relationship type**, not depth
- **l** (lowercase) = Ordinary sub-level

---

### 2. SC vs. Sc Distinction

#### SC (Capital C)

**Meaning**: First-level subcategory, parent is Main Category

**Example**:
```
Kitchen (M)
└─ Pantry (SC1) ← Parent is Main
```

**Identifier**: `M-SC1`

**Data Structure**:
```javascript
{
  type: "SC",
  identifier: "M-SC1",
  parent_type: "M"  // Must be Main
}
```

---

#### Sc (Lowercase c)

**Meaning**: Nested subcategory, parent is another Subcategory

**Example**:
```
Kitchen (M)
└─ Pantry (SC1)
   └─ Canned (Sc1) ← Parent is SC1
```

**Compact Identifier**: `M-Sc1` (omits SC1 for brevity)  
**Full Identifier**: `M-SC1-Sc1` (shows complete path)

**Data Structure**:
```javascript
{
  type: "Sc",
  identifier: "M-Sc1",  // Compact
  full_identifier: "M-SC1-Sc1",  // Full
  parent_type: "SC"  // Must be SC or Sc
}
```

---

### 3. Compact vs. Full Identifiers

#### Compact Identifier (Display/Reference)

**Purpose**: Brevity for UI display and quick reference

**Example**: `M-Sc45-l4,078`

**Interpretation**:
- M = Main Category
- Sc45 = 45th nested subcategory (intermediate levels omitted)
- l4 = Sub-level 4
- ,078 = Item counter

**Where Used**: UI labels, breadcrumbs, quick addressing

---

#### Full Identifier (Complete Path)

**Purpose**: Shows every intermediate category

**Example**: `M-SC12-Sc8-Sc45-l4,078`

**Interpretation**:
- M = Main
- SC12 = 12th subcategory beneath Main
- Sc8 = 8th nested sub beneath SC12
- Sc45 = 45th nested sub beneath Sc8
- l4 = Sub-level 4
- ,078 = Item counter

**Where Used**: Internal storage, debugging, admin views

---

#### Data Structure Maintains Complete Hierarchy

**CRITICAL**: Compact identifiers are references only, NOT source of truth

```javascript
{
  id: "cat-sc45",
  name: "Soups",
  
  // Display identifier (compact)
  identifier: "M-Sc45-l4",
  
  // Complete path identifier
  full_identifier: "M-SC12-Sc8-Sc45-l4",
  
  // SOURCE OF TRUTH: Parent chain
  parent_id: "cat-sc8",  // Immediate parent
  
  // Reconstructable complete chain
  ancestry_ids: ["cat-main", "cat-sc12", "cat-sc8", "cat-sc45"]
}
```

**Never**:
- ❌ Use compact identifier as sole data structure
- ❌ Bypass intermediate nodes in actual data
- ❌ Lose parent-child relationships for brevity

**Always**:
- ✅ Maintain complete `parent_id` chain
- ✅ Keep full identifier alongside compact
- ✅ Ensure complete hierarchy recoverable via traversal

---

### 4. Complete Identifier Format Table (Updated)

| Structure | Type | Compact | Full | Parent Type |
|-----------|------|---------|------|-------------|
| Main Category | M | M | M | (root) |
| Sub beneath Main | SC | M-SC{n} | M-SC{n} | M |
| Sub beneath Sub | Sc | M-Sc{n} | M-SC{x}-Sc{n} | SC or Sc |
| Deeper nesting | Sc | M-Sc{n} | M-SC{x}-Sc{y}-Sc{n} | Sc |
| Branch at level | M | l{n} M{m} | l{n} M{m} | Sub-level |
| Ordinary level | l | l{n} | l{n} | Any |

---

### 5. Counter Scoping (Clarified)

**SC Counter** (capital C):
- Scoped to each Main Category
- Kitchen: M-SC1, M-SC2, M-SC3
- Garden: M-SC1, M-SC2 (independent)

**Sc Counter** (lowercase c):
- Scoped to each parent Subcategory
- SC1: Sc1, Sc2, Sc3 (within SC1)
- SC2: Sc1, Sc2 (within SC2, independent)
- Sc1: Sc1, Sc2 (within Sc1, nested scoping)

**Example Tree with Counters**:
```
Kitchen (M)
├─ SC1: Pantry
│  ├─ Sc1: Canned
│  │  └─ Sc1: Soups ← Counter scoped to Canned
│  │     └─ Sc1: Vegetable ← Counter scoped to Soups
│  └─ Sc2: Dry Goods
└─ SC2: Storage
   └─ Sc1: Tools ← Independent Sc1 (different parent)
```

Compact Identifiers:
- Pantry: `M-SC1`
- Canned: `M-Sc1`
- Soups: `M-Sc1` (within Canned)
- Vegetable: `M-Sc1` (within Soups)
- Dry Goods: `M-Sc2` (within Pantry)
- Storage: `M-SC2`
- Tools: `M-Sc1` (within Storage)

Full Identifiers:
- Vegetable: `M-SC1-Sc1-Sc1-Sc1`

---

### 6. Validation Rules Added

**On Category Creation**:
```javascript
// Verify capitalization matches parent type
if (category.type === "SC" && category.parent_type !== "M") {
  throw new Error("SC must have Main Category as parent");
}

if (category.type === "Sc" && !["SC", "Sc"].includes(category.parent_type)) {
  throw new Error("Sc must have Subcategory as parent");
}

// Generate both identifiers
category.identifier = generateCompactIdentifier(category);
category.full_identifier = generateFullIdentifier(category);

// Verify ancestry intact
const ancestry = await getAncestry(category.parent_id);
if (!ancestry || ancestry.length === 0) {
  throw new Error("Broken ancestry chain");
}
```

---

### 7. Migration Implications Updated

**Type Assignment Logic**:
```javascript
function assignCategoryType(category) {
  if (!category.parent_id) return "M";
  
  const parent = getCategoryById(category.parent_id);
  
  if (parent.type === "M") {
    return "SC";  // Parent is Main → use capital C
  }
  
  if (parent.type === "SC" || parent.type === "Sc") {
    return "Sc";  // Parent is Subcategory → use lowercase c
  }
  
  throw new Error(`Unknown parent type`);
}
```

**Both Identifiers Generated**:
```javascript
// During migration, create both
note.category_node_id = categoryId;
category.identifier = generateCompact(category);  // "M-Sc45"
category.full_identifier = generateFull(category);  // "M-SC12-Sc8-Sc45"
```

---

## 📊 EXAMPLES REVIEWED AND UPDATED

### Example 1: Two-Level Hierarchy

**Structure**:
```
Kitchen (M)
└─ Pantry (SC1) ← Capital C
   └─ Canned (Sc1) ← Lowercase c
```

**Identifiers**:
- Kitchen: `M`
- Pantry: `M-SC1` (compact = full)
- Canned: `M-Sc1` (compact), `M-SC1-Sc1` (full)

---

### Example 2: Deep Nesting

**Structure**:
```
Kitchen (M)
└─ Pantry (SC1)
   └─ Canned (Sc1)
      └─ Soups (Sc1)
         └─ Vegetable (Sc1)
```

**Identifiers**:
- Kitchen: `M`
- Pantry: `M-SC1`
- Canned: `M-Sc1` compact, `M-SC1-Sc1` full
- Soups: `M-Sc1` compact, `M-SC1-Sc1-Sc1` full
- Vegetable: `M-Sc1` compact, `M-SC1-Sc1-Sc1-Sc1` full

**Note**: All nested subs use "Sc" (lowercase c), counters scoped per parent.

---

### Example 3: Multiple SC Branches

**Structure**:
```
Kitchen (M)
├─ SC1: Pantry
│  └─ Sc1: Canned
└─ SC2: Storage
   └─ Sc1: Tools
```

**Identifiers**:
- Pantry: `M-SC1`
- Canned: `M-Sc1` (within Pantry)
- Storage: `M-SC2`
- Tools: `M-Sc1` (within Storage, independent counter)

---

## ✅ CONFLICTS WITH EXISTING ARCHITECTURE

### Conflict Analysis: NONE

**Reviewed**:
- ✅ Section 1.1: Plus button placement (no conflicts)
- ✅ Section 1.2: Empty categories (no conflicts)
- ✅ Section 1.3: Identifier conventions (UPDATED)
- ✅ Section 1.4: Branch counters (clarified, no conflicts)
- ✅ Section 2: All decisions (no conflicts)
- ✅ Section 3: Migration (updated with new validation)
- ✅ Section 4: Rollback (no conflicts)
- ✅ All data models (updated for SC/Sc distinction)

**Changes Made**:
1. Replaced SC → Sc → sc progression with SC/Sc parent-based distinction
2. Added compact vs. full identifier concept
3. Updated all data structure examples
4. Added validation rules for capitalization
5. Updated migration type assignment logic

**No Conflicts**: The new convention is MORE PRECISE than the previous one and resolves ambiguities.

---

## 🔒 WHAT WAS NOT CHANGED

### Code: ZERO CHANGES

- ❌ No .js files modified
- ❌ No .jsx files modified
- ❌ No React components changed
- ❌ No storage service changed
- ❌ No database queries modified

### CSS/Styling: ZERO CHANGES

- ❌ No CSS files modified
- ❌ No styling changes
- ❌ No layout changes
- ❌ No animation changes

### Data: ZERO CHANGES

- ❌ No user data modified
- ❌ No notes changed
- ❌ No categories renamed
- ❌ No migrations run
- ❌ IndexedDB untouched

### Deployment: ZERO CHANGES

- ❌ No publishing
- ❌ No deployment
- ❌ No live changes
- ❌ Application unchanged

---

## 📝 REMAINING AMBIGUITIES

### No Ambiguities Identified

All aspects of the naming convention are now clearly specified:

✅ SC (capital) vs. Sc (lowercase) distinction defined  
✅ Compact vs. full identifier usage defined  
✅ Counter scoping rules defined  
✅ Parent-child relationship requirements defined  
✅ Validation rules specified  
✅ Migration logic updated  
✅ Data structure requirements complete  

**No further clarification needed** for naming convention.

---

## 📋 SUMMARY

### What Was Incorporated

**1. Capitalization Rules**:
- SC (capital C) = directly beneath Main
- Sc (lowercase c) = beneath another Subcategory
- Structural significance, never normalize

**2. Compact Identifiers**:
- `M-Sc45-l4` = reference only
- Omits intermediate levels for brevity
- NOT source of truth

**3. Full Identifiers**:
- `M-SC12-Sc8-Sc45-l4` = complete path
- Shows every intermediate level
- Stored alongside compact

**4. Data Structure**:
- `parent_id` chain is source of truth
- Complete hierarchy always recoverable
- Both identifiers stored
- `parent_type` validates correctness

**5. Validation**:
- Type must match parent type
- Ancestry must be intact
- Both identifiers generated
- Capitalization preserved

---

### Where Naming Convention Appears

**Section 1.3**: Complete identifier convention (750+ lines)
- Capitalization rules
- SC vs. Sc distinction
- Compact vs. full identifiers
- Counter scoping
- Validation rules
- Migration implications
- Examples

**Section 1.2 (Data Models)**: Updated category structure examples
- Added `type` field
- Added `identifier` (compact)
- Added `full_identifier` (full)
- Added `parent_type`
- Added `ancestry_ids`

**Section 3 (Migration)**: Updated type assignment logic
- Analyze parent type
- Assign SC vs. Sc correctly
- Generate both identifiers
- Validate capitalization

---

### Confirmation Checklist

✅ Capitalization rules incorporated (SC vs. Sc distinction)  
✅ Compact identifiers defined (display/reference)  
✅ Full identifiers defined (complete path)  
✅ Data structure preserves complete hierarchy  
✅ Parent-child chain is source of truth  
✅ No conflicts with existing architecture  
✅ No code changes made  
✅ No CSS changes made  
✅ No user data modified  
✅ No deployment or publishing  
✅ Specification update only  

---

## 🎯 DOCUMENT STATUS

**Updated Document**: `/app/memory/REVISED_CONSOLIDATED_ARCHITECTURE_FINAL.md`  
**New Version**: 3.1 (Capitalization Rules Addendum)  
**Date**: November 4, 2026  
**Status**: ✅ SPECIFICATION COMPLETE

**Supersedes**: Version 3.0

**Authorization**: ❌ NO IMPLEMENTATION AUTHORIZATION

---

**END OF NAMING CONVENTION UPDATE REPORT**
