# IRON RABBIT — REVISED CONSOLIDATED ARCHITECTURE (FINAL)

**Date**: November 4, 2026  
**Version**: 3.2 — Uniqueness, Sub-Level Branches, and Numbering Clarifications  
**Status**: 🎯 CLARIFICATIONS INCORPORATED — AWAITING APPROVAL ON PROPOSALS  
**Authorization**: ❌ NO IMPLEMENTATION UNTIL EXPLICIT APPROVAL

---

## 🎯 EXECUTIVE SUMMARY

### Architectural Direction: ACCEPTED with Corrections

This document integrates:
1. ✅ Recursive Category Branches specification
2. ✅ Two-Way Category-Note Association specification
3. ✅ User corrections and clarifications

### Implementation Status: NOT AUTHORIZED

- ❌ No code changes
- ❌ No CSS modifications
- ❌ No live publishing
- ✅ Architecture design only

---

## SECTION 1: CORRECTED SPECIFICATIONS

### 1.1 Plus Button Placement (CORRECTED)

#### Green Plus: Create Category/Branch

**Appears on**:
- ✅ Every Main Category (M)
- ✅ Every Subcategory (SC, Sc, sc, etc.)
- ✅ Every ordinary sub-level (L1, L2, L3, L4, L5, etc.)

**Does NOT appear on**:
- Notes (notes don't create categories)

**Action**: Creates category branch or subcategory beneath selected item

**Example UI**:
```
Kitchen (M) [🟢]
├─ L1: Utensils [🟢]
├─ L2: Appliances [🟢]
├─ L3: Recipes [🟢]
│  ├─ L4: Desserts [🟢]
│  └─ L3 M1: Baking [🟢]
│     ├─ L1: Breads [🟢]
│     └─ L2: Cakes [🟢]
└─ M-SC1: Pantry [🟢]
   ├─ L1: Canned [🟢]
   └─ SC1-Sc1: Dry Goods [🟢]
```

Every row (M, SC, L-level) gets green plus.

---

#### Blue Plus: Create Note

**Appears on**:
- ✅ Every ordinary sub-level (L1, L2, L3, L4, L5, etc.)
- ✅ Includes sub-levels inside category branches
- ❌ Does NOT appear on Main Category headers (M)
- ❌ Does NOT appear on Subcategory headers (SC, Sc, sc)

**Action**: Creates note in that sub-level location

**Rationale**: Notes belong IN sub-levels, not directly in category headers.

**Example UI**:
```
Kitchen (M) [🟢]  ← No blue (category header)
├─ L1: Utensils [🟢] [🔵]  ← Both buttons
├─ L2: Appliances [🟢] [🔵]
├─ L3: Recipes [🟢] [🔵]
│  ├─ L4: Desserts [🟢] [🔵]
│  └─ L3 M1: Baking [🟢]  ← No blue (category header)
│     ├─ L1: Breads [🟢] [🔵]  ← Both buttons
│     └─ L2: Cakes [🟢] [🔵]
└─ M-SC1: Pantry [🟢]  ← No blue (category header)
   ├─ L1: Canned [🟢] [🔵]
   └─ SC1-Sc1: Dry Goods [🟢]  ← No blue (category header)
```

**Pattern**:
- Category headers (M, SC, Sc): Green only
- Sub-levels (L1-L∞): Green + Blue

---

### 1.2 Single Source of Truth (CORRECTED)

#### Primary Relationship: category_node_id

**Note Structure**:
```javascript
{
  id: "note-123",
  title: "Sourdough Recipe",
  
  // PRIMARY RELATIONSHIP (Single source of truth)
  category_node_id: "cat-baking-l1-breads",
  
  // DISPLAY PATH (Derived from category_node_id, not stored)
  // Generated on-demand by traversing tree from category_node_id
  
  // LEGACY FIELDS (For compatibility only)
  category: "Kitchen",  // Keep for old code
  subcategory: "Recipes",  // Keep for old code
  category_path: ["Kitchen", "Recipes", "Baking", "Breads"]  // Keep for display
}
```

**Key Points**:
- ✅ `category_node_id` is ONLY stored relationship
- ✅ `category_path` kept for display/compatibility but NOT source of truth
- ❌ NO duplicate `note_ids` arrays in categories (avoids sync issues)
- ✅ Notes discovered by querying: `WHERE category_node_id = X`

**Why this approach**:
- Single point of update (change note's category = change category_node_id only)
- No synchronization bugs (no dual-write to maintain)
- Legacy fields preserved for backward compatibility
- Display path generated on-demand from tree traversal

---

#### Category Structure (Enhanced with Capitalization Rules)

```javascript
{
  "Pantry": {
    id: "cat-pantry",
    name: "Pantry",
    type: "SC",  // Capital C = directly beneath Main
    
    // IDENTIFIERS
    identifier: "M-SC1",  // Compact identifier
    full_identifier: "M-SC1",  // Same as compact (no intermediate levels)
    
    // PARENT RELATIONSHIP
    parent_id: "cat-kitchen",
    parent_type: "M",  // Parent is Main Category
    
    // ANCESTRY (complete chain, reconstructable)
    ancestry_ids: ["cat-kitchen", "cat-pantry"],
    
    // NO note_ids ARRAY (notes found by querying category_node_id)
    
    // SUB-LEVEL TRACKING
    sub_levels: {
      "l1": ["Canned", "Dry Goods"],  // Lowercase 'l'
      "l2": ["Spices"]
    },
    
    // RECURSIVE BRANCHES
    category_branches: {
      "Sc1": {  // Lowercase 'c' = beneath another Subcategory
        id: "cat-canned",
        name: "Canned Goods",
        type: "Sc",
        identifier: "M-Sc1",  // Compact
        full_identifier: "M-SC1-Sc1",  // Full shows SC1 parent
        parent_id: "cat-pantry",
        parent_type: "SC"
      }
    },
    level_branches: {
      "l1": { "M1": { ... } }
    }
  }
}
```

**Nested Subcategory Example**:
```javascript
{
  "Canned Goods": {
    id: "cat-canned",
    name: "Canned Goods",
    type: "Sc",  // Lowercase 'c' = parent is another Subcategory
    
    // IDENTIFIERS
    identifier: "M-Sc1",  // Compact (omits intermediate SC1)
    full_identifier: "M-SC1-Sc1",  // Full path shows SC1
    
    // PARENT
    parent_id: "cat-pantry",  // Parent is SC1 (Pantry)
    parent_type: "SC",
    
    // ANCESTRY
    ancestry_ids: ["cat-kitchen", "cat-pantry", "cat-canned"],
    
    // Further nesting possible
    category_branches: {
      "Sc1": {  // Still "Sc" (parent is Sc)
        id: "cat-soups",
        name: "Soups",
        type: "Sc",
        identifier: "M-Sc1",  // Compact (counter scoped to parent)
        full_identifier: "M-SC1-Sc1-Sc1",  // Full shows complete path
        parent_id: "cat-canned",
        parent_type: "Sc"
      }
    }
  }
}
```

**Key Fields**:
- `type`: "M", "SC" (capital), "Sc" (lowercase), or "l" (lowercase)
- `identifier`: Compact reference (can omit intermediates)
- `full_identifier`: Complete hierarchy path
- `parent_id`: Source of truth for immediate parent
- `parent_type`: Validates correct type usage
- `ancestry_ids`: Complete chain (reconstructable from parent_id)

**Key Change**: Removed `note_ids` array from categories. Notes discovered by:

```javascript
// Get all notes in "Baking" category
const notes = await getAllNotes().filter(n => n.category_node_id === "cat-baking");
```

**Benefits**:
- No synchronization required
- Single update point
- No stale arrays
- Simpler logic

---

### 1.3 Identifier Conventions (REVISED - CAPITALIZATION RULES)

**CRITICAL**: Capitalization is structurally significant and must be preserved exactly.

---

#### Capitalization Defines Hierarchy Type

**Uppercase vs. Lowercase Distinguishes Relationships**:

| Identifier | Meaning | Parent Type |
|-----------|---------|-------------|
| **M** | Main Category | (root level) |
| **SC** | Subcategory DIRECTLY beneath Main Category | Main Category |
| **Sc** | Subcategory beneath ANOTHER Subcategory | Subcategory (SC or Sc) |
| **l** | Ordinary sub-level | Any category |

**Key Distinction**:
- `SC` (capital C) = First-level subcategory (parent is Main Category)
- `Sc` (lowercase c) = Nested subcategory (parent is another Subcategory)
- These are **structurally different** and MUST NOT be normalized or converted

---

#### Example A: M-SC45-l4

**Full Hierarchy**:
```
Main Category (M)
└─ Subcategory 45 (SC45) ← DIRECTLY beneath Main
   └─ Sub-level 4 (l4)
```

**Identifier**: `M-SC45-l4`

**Interpretation**:
- `M` = Main Category
- `SC45` = 45th subcategory directly beneath this Main Category
- `l4` = Ordinary sub-level 4

**Parent Relationship**: SC45's immediate parent is M

---

#### Example B: M-Sc45-l4

**Full Hierarchy** (actual data structure):
```
Main Category (M)
└─ Subcategory 1 (SC1) ← DIRECTLY beneath Main
   └─ Subcategory 45 (Sc45) ← Beneath SC1 (another Subcategory)
      └─ Sub-level 4 (l4)
```

**Compact Identifier**: `M-Sc45-l4`

**Interpretation**:
- `M` = Main Category (shown)
- `Sc45` = 45th nested subcategory somewhere in this Main's tree
- `l4` = Ordinary sub-level 4

**Important**: The compact identifier **omits** SC1 for brevity, but the **actual data structure** must maintain the complete chain: M → SC1 → Sc45 → l4

**Parent Relationship**: Sc45's immediate parent is another Subcategory (SC1 in this case)

---

#### Distinction: SC vs. Sc

**SC (capital C)**:
```javascript
{
  id: "cat-sc1",
  name: "Pantry",
  type: "SC",
  identifier: "M-SC1",
  parent_id: "cat-main-kitchen",  // Parent is Main Category
  parent_type: "M"
}
```

**Sc (lowercase c)**:
```javascript
{
  id: "cat-sc45",
  name: "Canned Goods",
  type: "Sc",
  identifier: "M-Sc45",  // Compact (omits intermediate SC)
  full_identifier: "M-SC1-Sc45",  // Complete path
  parent_id: "cat-sc1",  // Parent is SC1 (another Subcategory)
  parent_type: "SC"
}
```

**Never**:
- ❌ Convert `SC` to `Sc` or vice versa
- ❌ Normalize capitalization
- ❌ Treat them as equivalent
- ❌ Discard the distinction

---

#### Complete Identifier Format Table

| Structure | Type Code | Compact Identifier | Full Identifier | Parent Type |
|-----------|-----------|-------------------|----------------|-------------|
| Main Category | M | M | M | (root) |
| Sub directly beneath Main | SC | M-SC{n} | M-SC{n} | M |
| Sub beneath another Sub | Sc | M-Sc{n} | M-SC{x}-Sc{n} | SC or Sc |
| Sub beneath nested Sub | Sc | M-Sc{n} | M-SC{x}-Sc{y}-Sc{n} | Sc |
| Branch beneath L{n} | M | L{n} M{m} | L{n} M{m} | Sub-level |
| Sub beneath L{n} branch | SC | L{n} M{m}-SC{k} | L{n} M{m}-SC{k} | M (branch) |
| Ordinary sub-level | l | l{n} | l{n} | Any |

**Examples with Full Hierarchy**:

**Example 1: Two-Level Subcategories**
```
Main: Kitchen (M)
├─ Pantry (SC1) ← First level sub
   └─ Canned (Sc1) ← Nested sub
```

Identifiers:
- Kitchen: `M`
- Pantry: `M-SC1` (compact = full, parent is M)
- Canned: `M-Sc1` (compact) or `M-SC1-Sc1` (full, parent is SC1)

**Example 2: Three-Level Subcategories**
```
Main: Kitchen (M)
├─ Pantry (SC1)
   ├─ Canned (Sc1)
      └─ Soups (Sc2)
```

Identifiers:
- Kitchen: `M`
- Pantry: `M-SC1`
- Canned: `M-Sc1` (compact) or `M-SC1-Sc1` (full)
- Soups: `M-Sc2` (compact) or `M-SC1-Sc1-Sc2` (full)

**Example 3: Branch Beneath Sub-Level**
```
Main: Kitchen (M)
├─ l3: Recipes (ordinary sub-level)
   └─ l3 M1: Baking (branch beneath l3)
      └─ SC1: Breads (sub beneath branch)
         └─ Sc1: Sourdough (nested sub)
```

Identifiers:
- Kitchen: `M`
- Recipes: `l3`
- Baking: `l3 M1`
- Breads: `l3 M1-SC1`
- Sourdough: `l3 M1-Sc1` (compact) or `l3 M1-SC1-Sc1` (full)

---

#### Counter Scoping Rules

**Per-Parent Counters** (already decided):

**SC Counter** (capital C):
- Scoped to each Main Category
- Kitchen has: M-SC1, M-SC2, M-SC3
- Garden has: M-SC1, M-SC2 (independent counter)

**Sc Counter** (lowercase c):
- Scoped to each parent Subcategory
- SC1 has: Sc1, Sc2, Sc3
- SC2 has: Sc1, Sc2 (independent counter)
- Sc1 can have its own: Sc1, Sc2 (nested)

**Example**:
```
Kitchen (M)
├─ SC1: Pantry
│  ├─ Sc1: Canned ← First Sc beneath SC1
│  │  └─ Sc1: Soups ← First Sc beneath Sc1 (different parent)
│  └─ Sc2: Dry ← Second Sc beneath SC1
└─ SC2: Storage
   └─ Sc1: Tools ← First Sc beneath SC2 (independent counter)
```

Compact identifiers:
- Pantry: M-SC1
- Canned: M-Sc1 (45th would be M-Sc45)
- Soups: M-Sc1 (within Canned's scope)
- Dry: M-Sc2
- Storage: M-SC2
- Tools: M-Sc1 (within Storage's scope)

---

#### Compact vs. Full Identifiers

**Compact Identifier** (for display/reference):
- `M-Sc45-l4,078`
- Omits intermediate categories for brevity
- Quick reference/addressing
- **NOT** the sole source of truth

**Full Identifier** (internal, for complete path):
- `M-SC12-Sc8-Sc45-l4,078`
- Shows every intermediate category
- Complete parent-child chain
- Stored in data structure

**Data Structure Requirements**:

```javascript
{
  id: "cat-sc45",
  name: "Specific Item",
  type: "Sc",
  
  // Compact identifier (for reference)
  identifier: "M-Sc45-l4",
  
  // Full identifier (complete path)
  full_identifier: "M-SC12-Sc8-Sc45-l4",
  
  // Actual parent-child chain (source of truth)
  parent_id: "cat-sc8",  // Immediate parent
  parent_type: "Sc",
  
  // Complete ancestry (reconstructable from parent_id chain)
  ancestry_ids: ["cat-main", "cat-sc12", "cat-sc8", "cat-sc45"]
}
```

**Critical Rules**:
1. ✅ Compact identifier used for display and quick reference
2. ✅ Full identifier shows complete hierarchy
3. ✅ `parent_id` chain is source of truth for relationships
4. ❌ Never use compact identifier as sole data structure
5. ❌ Never bypass intermediate nodes in actual data
6. ✅ Complete hierarchy always recoverable from `parent_id` traversal

---

#### Validation Rules

**On Category Creation**:
```javascript
function validateIdentifier(category) {
  // 1. Check capitalization preserved
  if (category.type === "SC" && category.parent_type !== "M") {
    throw new Error("SC must have Main Category as parent");
  }
  
  if (category.type === "Sc" && !["SC", "Sc"].includes(category.parent_type)) {
    throw new Error("Sc must have Subcategory as parent");
  }
  
  // 2. Verify parent_id exists and matches parent_type
  const parent = await getCategoryById(category.parent_id);
  if (!parent || parent.type !== category.parent_type) {
    throw new Error("Parent type mismatch");
  }
  
  // 3. Generate both compact and full identifiers
  category.identifier = generateCompactIdentifier(category);
  category.full_identifier = generateFullIdentifier(category);
  
  // 4. Verify full hierarchy chain intact
  const ancestry = await getAncestry(category.parent_id);
  if (!ancestry || ancestry.length === 0) {
    throw new Error("Broken ancestry chain");
  }
}
```

**On Identifier Display**:
```javascript
// Use compact identifier for UI
function displayCategory(category) {
  return category.identifier;  // "M-Sc45-l4"
}

// Use full identifier for debugging/admin
function displayFullPath(category) {
  return category.full_identifier;  // "M-SC12-Sc8-Sc45-l4"
}

// Reconstruct complete hierarchy from data
function getCompletePath(category) {
  const path = [];
  let current = category;
  while (current) {
    path.unshift(current);
    current = await getCategoryById(current.parent_id);
  }
  return path;  // [M, SC12, Sc8, Sc45, l4]
}
```

---

#### Migration Implications

**During Migration**:
1. Analyze each category's immediate parent
2. Assign type based on parent:
   - Parent is Main → type = "SC"
   - Parent is SC or Sc → type = "Sc"
3. Generate compact identifier
4. Generate full identifier
5. Preserve complete `parent_id` chain
6. Verify ancestry reconstructable

**Example Migration Logic**:
```javascript
function assignCategoryType(category) {
  if (!category.parent_id) {
    return "M";  // Root level
  }
  
  const parent = getCategoryById(category.parent_id);
  
  if (parent.type === "M") {
    return "SC";  // Directly beneath Main
  }
  
  if (parent.type === "SC" || parent.type === "Sc") {
    return "Sc";  // Beneath another Subcategory
  }
  
  throw new Error(`Unknown parent type: ${parent.type}`);
}
```

---

#### Summary of Capitalization Rules

| Symbol | Meaning | Parent Must Be | Example |
|--------|---------|---------------|---------|
| M | Main Category | (none - root) | Kitchen |
| SC | Subcategory | M (Main) | M-SC1: Pantry |
| Sc | Nested Subcategory | SC or Sc | M-Sc1: Canned |
| l | Ordinary sub-level | Any category | l4 |

**Mandatory**:
- Preserve exact capitalization in all identifiers
- Never normalize or convert SC ↔ Sc
- Distinguish them in all code, validation, and display
- Use parent_type to verify correctness
- Maintain complete hierarchy in data regardless of compact identifier

---

### 1.4 Branch Counters (DECIDED)

**Per-parent counters** (NOT global)

**Example**:
```
Kitchen (M)
├─ M-SC1: Pantry
├─ M-SC2: Storage
└─ M-SC3: Garage

Garden (M)
├─ M-SC1: Tools  ← Counter resets per parent
└─ M-SC2: Plants
```

Each parent has independent counter sequence.

---

### 1.5 Sub-Level Accordion Transformation (DECIDED)

**Timing**: Only when category branch created beneath sub-level

**Before** (L3 has no branches):
```
├─ L3: Recipes
   ├─ L4: Desserts
   └─ L5: Mains
```
L3 is plain text, not accordion.

**After** (User creates L3 M1):
```
├─ L3: Recipes 🔽  ← NOW becomes accordion
   ├─ L4: Desserts
   ├─ L5: Mains
   └─ L3 M1: Baking  ← Branch triggers transformation
```

**Detection Logic**:
```javascript

### 1.3 Category Renaming (DECIDED)

**Rule**: Preserve existing approved editing behavior

**No New Interface**: Do NOT introduce:
- ❌ New modal for renaming
- ❌ New right-click menu
- ❌ Redesigned editing flow
- ❌ Different interaction patterns

**Use Existing**: Leverage current renaming mechanism
- ✅ If categories currently renamed via inline edit → keep inline edit
- ✅ If categories currently renamed via existing modal → keep existing modal
- ✅ Whatever interaction pattern exists today → preserve it exactly

**Enhanced Backend Only**:
When rename happens (via existing UI):
1. Category ID remains unchanged (stability)
2. Category name updated in tree
3. All notes' display paths regenerated from tree
4. Notes' `category_node_id` unchanged (still linked correctly)


---

### 1.3.1 Compact Identifier Uniqueness (CRITICAL CLARIFICATION)

**Issue**: Compact identifiers can repeat across different parents

**Example from Section 1.3**:
```
Kitchen (M)
├─ SC1: Pantry
│  ├─ Sc1: Canned     ← Compact: M-Sc1
│  │  └─ Sc1: Soups   ← Compact: M-Sc1 (same as Canned!)
│  └─ Sc2: Dry Goods
└─ SC2: Storage
   └─ Sc1: Tools      ← Compact: M-Sc1 (same as Canned!)
```

**CRITICAL**: Compact identifiers `M-Sc1` appears THREE times with different meanings.

---

#### Permanent IDs are Source of Truth

**Every category has a unique permanent ID**:

```javascript
{
  id: "cat-canned-goods-uuid-001",  // UNIQUE PERMANENT ID
  name: "Canned",
  identifier: "M-Sc1",  // Display reference (NOT unique)
  full_identifier: "M-SC1-Sc1"
}

{
  id: "cat-soups-uuid-002",  // DIFFERENT UNIQUE ID
  name: "Soups",
  identifier: "M-Sc1",  // Same display reference (OK)
  full_identifier: "M-SC1-Sc1-Sc1"
}

{
  id: "cat-tools-uuid-003",  // DIFFERENT UNIQUE ID
  name: "Tools",
  identifier: "M-Sc1",  // Same display reference (OK)
  full_identifier: "M-SC2-Sc1"
}
```

**Rules**:
1. ✅ `id` field is UNIQUE across entire system
2. ✅ `id` never changes (stable across renames, moves)
3. ✅ `parent_id` establishes hierarchy (source of truth)
4. ⚠️ `identifier` (compact) can repeat (display only)
5. ✅ `full_identifier` shows complete path (more unique, but still not ID)

---

#### Compact Identifiers Are Display References Only

**Purpose**: Brevity in UI labels, breadcrumbs, compact addressing

**NOT for**:
- ❌ Locating categories in database
- ❌ Retrieving category data
- ❌ Moving categories
- ❌ Renaming categories
- ❌ Associating notes with categories
- ❌ Any operation requiring unique identification

**Only for**:
- ✅ Display in UI
- ✅ Breadcrumb trails
- ✅ Quick visual reference
- ✅ Human-readable labels

---

#### Notes Use Permanent IDs

**Note Structure**:
```javascript
{
  id: "note-123",
  title: "Sourdough Recipe",
  
  // PRIMARY LINK (permanent ID)
  category_node_id: "cat-soups-uuid-002",  // Links to Soups
  
  // DISPLAY PATH (generated from ID traversal)
  category_path: ["Kitchen", "Pantry", "Canned", "Soups"],
  
  // NOT STORED: compact identifier
  // Generated on-demand for display only
}
```

**Critical**: `category_node_id` uses permanent ID, NEVER compact identifier.

---

#### UI Distinguishes Identical Compact Identifiers

**Problem**: Three categories with `M-Sc1` identifier in different branches

**Solution 1: Full Path Context** (Recommended)

Display full path alongside compact identifier:

```
UI Display:
┌─────────────────────────────────────┐
│ M-Sc1: Canned                       │
│ Path: Kitchen → Pantry → Canned     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ M-Sc1: Soups                        │
│ Path: Kitchen → Pantry → Canned →   │
│       Soups                          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ M-Sc1: Tools                        │
│ Path: Kitchen → Storage → Tools     │
└─────────────────────────────────────┘
```

---

**Solution 2: Hierarchical Context** (Breadcrumb)

Show parent context in breadcrumb:

```
Kitchen > Pantry > M-Sc1: Canned
Kitchen > Pantry > Canned > M-Sc1: Soups
Kitchen > Storage > M-Sc1: Tools
```

---

**Solution 3: Expand on Hover** (Interactive)

```
Compact view:
  M-Sc1: Canned

Hover/expand:
  M-SC1-Sc1: Canned
  (Kitchen → Pantry → Canned)
```

---

**Solution 4: Always Show Full Identifier** (Verbose but Unambiguous)

```
M-SC1-Sc1: Canned
M-SC1-Sc1-Sc1: Soups
M-SC2-Sc1: Tools
```

**Trade-off**: No ambiguity, but loses compactness

---

#### Internal Operations Use IDs

**Locate Category**:
```javascript
// CORRECT: Use permanent ID
const category = await getCategoryById("cat-soups-uuid-002");

// WRONG: Use compact identifier (ambiguous)
const category = await getCategoryByIdentifier("M-Sc1");  // Which one??
```

**Move Category**:
```javascript
// CORRECT: Use IDs
await moveCategory(


---

### 1.3.2 Categories Created Beneath Ordinary Sub-Levels (PROPOSED)

**Issue**: Version 3.1 defines M, SC, Sc, and l, but does not adequately specify what happens when a category branch is created beneath an ordinary sub-level.

**Example Scenario**:
```
Kitchen (M)
├─ l1: Utensils
│  ├─ l2: Cooking Utensils
│  │  ├─ l3: Wooden Spoons
│  │  │  └─ [USER CLICKS GREEN PLUS HERE]
│  │  │     → Creates new category branch
```

---

#### PROPOSED: Branch-Level Category Designation

**Proposal**: Use existing "Branch beneath L{n}" pattern from Section 1.3

**Type Designation**: When Main Category created beneath sub-level:
- Type: `M` (Main Category branch)
- Identifier prefix: `l{n}` (shows which level it's beneath)
- Counter: `M{m}` (Main branch counter, scoped to that level)

**Format**: `l{n} M{m}`

---

#### Example: Category Beneath l3

**Hierarchy**:
```
Kitchen (M)
├─ l1: Utensils
   ├─ l2: Cooking Utensils
      ├─ l3: Wooden Spoons
         └─ l3 M1: Premium Collection ← NEW BRANCH
```

**Data Structure**:
```javascript
{
  id: "cat-premium-uuid-001",
  name: "Premium Collection",
  type: "M",  // This is a Main Category (within sub-level context)
  
  // IDENTIFIERS
  identifier: "l3 M1",  // Compact
  full_identifier: "l3 M1",  // Same (no omitted intermediates)
  
  // PARENT RELATIONSHIP
  parent_id: "cat-kitchen-uuid",  // Parent is Kitchen (M)
  parent_type: "M",
  parent_level: "l3",  // Attached beneath l3
  parent_level_name: "Wooden Spoons",
  
  // This branch can have its own hierarchy
  category_branches: { ... },
  sub_levels: { ... }
}
```

**Key Points**:
- ✅ Type is "M" (Main Category, but in branch context)
- ✅ Identifier shows which level it's beneath: `l3 M1`
- ✅ Counter `M1` is scoped to l3 (first Main branch beneath l3)
- ✅ Can have its own subcategories and sub-levels

---

#### Subcategories Beneath Branch

**When Subcategory created beneath `l3 M1`**:

```
Kitchen (M)
├─ l1: Utensils
   ├─ l2: Cooking Utensils
      ├─ l3: Wooden Spoons
         └─ l3 M1: Premium Collection
            └─ SC1: Artisan Spoons ← Subcategory beneath l3 M1
```

**Data Structure**:
```javascript
{
  id: "cat-artisan-uuid-002",
  name: "Artisan Spoons",
  type: "SC",  // Subcategory directly beneath Main
  
  // IDENTIFIERS
  identifier: "l3 M1-SC1",  // Compact
  full_identifier: "l3 M1-SC1",  // Full
  
  // PARENT
  parent_id: "cat-premium-uuid-001",  // Parent is l3 M1
  parent_type: "M"
}
```

**Pattern**: `l3 M1-SC1` (shows branch location and subcategory)

---

#### Nested Subcategories Beneath Branch

**Further nesting**:

```
Kitchen (M)
├─ l1: Utensils
   ├─ l2: Cooking Utensils
      ├─ l3: Wooden Spoons
         └─ l3 M1: Premium Collection
            └─ SC1: Artisan Spoons
               └─ Sc1: Handcrafted ← Nested subcategory
```

**Data Structure**:
```javascript
{
  id: "cat-handcrafted-uuid-003",
  name: "Handcrafted",
  type: "Sc",  // Nested subcategory
  
  // IDENTIFIERS
  identifier: "l3 M1-Sc1",  // Compact
  full_identifier: "l3 M1-SC1-Sc1",  // Full
  
  // PARENT
  parent_id: "cat-artisan-uuid-002",  // Parent is SC1
  parent_type: "SC"
}
```

---

#### Complete Identifier Format Table (UPDATED)

| Structure | Type | Compact | Full | Parent |
|-----------|------|---------|------|--------|
| Main Category | M | M | M | (root) |
| Sub beneath Main | SC | M-SC{n} | M-SC{n} | M |
| Nested sub | Sc | M-Sc{n} | M-SC{x}-Sc{n} | SC or Sc |
| Ordinary sub-level | l | l{n} | l{n} | Any |
| **Branch at level** | **M** | **l{n} M{m}** | **l{n} M{m}** | **M** |
| **Sub beneath branch** | **SC** | **l{n} M{m}-SC{k}** | **l{n} M{m}-SC{k}** | **M (branch)** |
| **Nested sub in branch** | **Sc** | **l{n} M{m}-Sc{k}** | **l{n} M{m}-SC{x}-Sc{k}** | **SC or Sc** |

---

#### Counter Scoping for Branch-Level Categories

**M Counter** (beneath same level):
- l3 can have: `l3 M1`, `l3 M2`, `l3 M3`
- l4 can have: `l4 M1`, `l4 M2` (independent from l3)
- Each level has independent Main branch counter

**SC Counter** (beneath same branch):
- l3 M1 can have: `l3 M1-SC1`, `l3 M1-SC2`, `l3 M1-SC3`
- l3 M2 can have: `l3 M2-SC1`, `l3 M2-SC2` (independent)
- Each Main branch has independent SC counter

**Sc Counter** (beneath same parent):
- l3 M1-SC1 can have: `l3 M1-Sc1`, `l3 M1-Sc2`
- l3 M1-SC2 can have: `l3 M1-Sc1` (independent)
- Per-parent scoping applies

---

#### Distinguishing Sub-Levels from Category Branches

**Visual Distinction in UI**:

```
Kitchen (M) [🟢]
├─ l1: Utensils [🟢] [🔵]  ← Sub-level (both buttons)
│  ├─ Note: "Spatula set"
│  └─ l1 M1: Professional Set [🟢]  ← Branch (green only)
│     └─ SC1: Chef's Collection [🟢]
│
├─ l2: Appliances [🟢] [🔵]  ← Sub-level
   └─ Note: "Blender manual"
```

**Distinguishing Features**:

| Type | Identifier | Green Plus | Blue Plus | Purpose |
|------|-----------|------------|-----------|---------|
| Ordinary sub-level | `l{n}` | ✅ | ✅ | Holds notes, can have deeper sub-levels |
| Category branch | `l{n} M{m}` | ✅ | ❌ | Independent hierarchy, holds subcategories |
| Branch subcategory | `l{n} M{m}-SC{k}` | ✅ | ❌ | Part of branch hierarchy |

**Key Distinction**:
- Sub-levels (`l1`, `l2`) = Linear note organization, blue plus available
- Branches (`l3 M1`) = Category trees, no blue plus (notes in sub-categories or their sub-levels)

---

#### Original Hierarchy Preservation

**When branch created beneath l3**:

**Before**:
```
Kitchen (M)
├─ l1: Utensils
   ├─ l2: Cooking Utensils
      ├─ l3: Wooden Spoons
         ├─ l4: Premium
         └─ l5: Budget
```

**User Action**: Click green plus on l3 → Create "Artisan Collection"

**After**:


---

### 1.3.3 Level Numbering Clarification: l4,078 (AWAITING CLARIFICATION)

**Issue**: The compact identifier example `M-Sc45-l4,078` is ambiguous

**Example from Section 1.3**:
- Compact: `M-Sc45-l4,078`
- Full: `M-SC12-Sc8-Sc45-l4,078`

**Questions**:
1. What does `l4,078` mean?
2. Is the comma a thousands separator?
3. What is being numbered?

---

#### Interpretation 1: Sub-Level 4,078 (Thousands Separator)

**Meaning**: Ordinary sub-level number 4,078

**Hierarchy**:
```
Main Category (M)
├─ l1: Level 1
├─ l2: Level 2
├─ l3: Level 3
├─ l4: Level 4
...
├─ l4,077: Level 4,077
└─ l4,078: Level 4,078  ← Extremely deep
```

**Implications**:
- This represents an extraordinarily deep linear hierarchy
- 4,078 sequential sub-levels in one branch
- Comma is standard thousands separator
- Counter is continuous (l1, l2, l3... l4078)

**Display**:
- Compact: `M-Sc45-l4,078`
- Full: `M-SC12-Sc8-Sc45-l4,078`
- Both show "l4,078" with comma

**Scoping**: Level counter continuous within parent

---

#### Interpretation 2: Sub-Level 4, Item/Note 078

**Meaning**: Sub-level 4, with item number 078

**Hierarchy**:
```
Main Category (M)
└─ Subcategory 45 (Sc45)
   └─ Sub-level 4 (l4)
      ├─ Note 001
      ├─ Note 002
      ...
      └─ Note 078  ← 78th note at this level
```

**Identifier Components**:
- `l4` = Sub-level 4
- `,078` = Note/item counter (78th item)
- Comma separates level from item

**Implications**:
- Level numbering is modest (l4 = level 4)
- Item counter tracks notes at that level
- Comma is separator, not thousands

**Display**:
- Compact: `M-Sc45-l4,078` (shows level and item)
- Could also be: `M-Sc45-l4` (just level, omit item)

**Scoping**: Item counter per sub-level

---

#### Interpretation 3: Hierarchical Compound Identifier

**Meaning**: Multi-part identifier with sub-components

**Structure**: `l[major].[minor]` or `l[level],[sublevel]`

**Example**: `l4,078` could mean:
- Level 4, position 078 within level 4
- Level 4, variation 078
- Level group 4, item 078

**Display**:
- Compact: `M-Sc45-l4,078`
- Could expand to more detail if needed

---

#### Recommended Approach: Request User Clarification

**Questions for User**:

**Q1**: Does `l4,078` mean:
- **A**: Sub-level number 4,078 (comma is thousands separator)?
- **B**: Sub-level 4, item/note number 078 (comma separates components)?
- **C**: Something else?

**Q2**: If Interpretation A (level 4,078):
- Is this realistic for Iron Rabbit's use case?
- Should system support thousands of sequential sub-levels?
- How should extremely deep hierarchies be displayed?

**Q3**: If Interpretation B (level 4, item 078):
- Is the item counter necessary in identifiers?
- Should it be optional (show only when needed)?
- How are items numbered and scoped?

**Q4**: Display formatting:
- Should comma always appear in identifier?
- Is comma only for thousands (4,078) or always separator (4,078)?
- How to prevent confusion with multiple hierarchy components?

---

#### Proposed Rule (Pending Approval)

**PROPOSED**: Use Interpretation A (Thousands Separator)

**Rule**: 
- `l{n}` where {n} can be any positive integer
- Comma used as thousands separator for readability
- Examples: `l1`, `l42`, `l1,000`, `l4,078`

**Rationale**:
- Simpler: One counter per parent
- Consistent: Same pattern as M{n}, SC{n}, Sc{n}
- Standard: Comma as thousands separator is universal
- Flexible: Supports any depth (though extreme depth unusual)

**Display Rules**:
- Always use comma for thousands: `l4,078` (not `l4078`)
- Omit comma below 1,000: `l42` (not `l042`)
- Consistent in compact and full identifiers

**Scoping**:
- Level counter scoped to parent category
- Each parent has independent l1, l2, l3... sequence

**Example**:
```
Kitchen (M)
├─ l1: Utensils
├─ l2: Appliances
...
├─ l4,077: Item 4077
└─ l4,078: Item 4078

Garden (M)
├─ l1: Tools  ← Independent counter
└─ l2: Plants
```

---

#### Alternative Proposal (If Interpretation B)

**If user confirms item counter needed**:

**Format**: `l{level}#{item}`

**Examples**:
- `l4#078` = Level 4, item 78
- `M-Sc45-l4#078` = Full identifier with item

**Rationale**:
- `#` clearly separates level from item
- Avoids comma confusion
- Optional item counter (can show just `l4`)

---

#### Validation Implications

**If Interpretation A (thousands separator)**:

```javascript
function formatLevelIdentifier(levelNumber) {
  // Add commas for thousands
  return `l${levelNumber.toLocaleString()}`;
  // l4078 → "l4,078"
  // l1000000 → "l1,000,000"
}
```

**If Interpretation B (item counter)**:

```javascript
function formatLevelWithItem(level, itemNumber) {
  if (itemNumber) {
    return `l${level}#${itemNumber.toString().padStart(3, '0')}`;
    // l4, item 78 → "l4#078"
  }
  return `l${level}`;  // Just level
}
```

---

#### Display Consistency

**Regardless of interpretation, maintain consistency**:

**Compact identifier**:
- Same format everywhere in UI
- Same separator character
- Same padding/formatting

**Full identifier**:
- Matches compact format
- Shows complete path
- Uses same numbering convention

**Examples** (assuming Interpretation A):
```
Compact: M-Sc45-l4,078
Full: M-SC12-Sc8-Sc45-l4,078
Both use: "l4,078" with comma
```

---

#### STATUS: AWAITING USER CLARIFICATION

**This numbering interpretation is PENDING USER INPUT.**

**Required from User**:
1. Confirm meaning of `l4,078`
2. Approve thousands separator interpretation OR
3. Provide alternative interpretation
4. Confirm display formatting rules

**Once clarified**: Update all examples and validation rules to match.

---


```
Kitchen (M)
├─ l1: Utensils
   ├─ l2: Cooking Utensils
      ├─ l3: Wooden Spoons [🔽 Now has accordion]
         ├─ l4: Premium  ← UNCHANGED (still sub-level)
         ├─ l5: Budget   ← UNCHANGED (still sub-level)
         └─ l3 M1: Artisan Collection [NEW BRANCH]
```

**Critical**:
- ✅ l3 keeps name "Wooden Spoons" and "l3" designation
- ✅ l4 and l5 remain ordinary sub-levels (unchanged)
- ✅ l3 M1 is new independent branch
- ✅ l3 becomes accordion head to show both sub-levels and branch
- ❌ l4 does NOT become l5, l5 does NOT become l6

---

#### Validation Rules for Branch-Level Categories

```javascript
function validateBranchLevelCategory(category) {
  // 1. Verify parent is Main Category
  const parent = await getCategoryById(category.parent_id);
  if (parent.type !== "M") {
    throw new Error("Branch must be created beneath Main Category");
  }
  
  // 2. Verify parent_level specified
  if (!category.parent_level || !category.parent_level.startsWith("l")) {
    throw new Error("Branch must specify which level it's beneath");
  }
  
  // 3. Generate identifier with level prefix
  category.identifier = `${category.parent_level} M${counter}`;
  
  // 4. Type is "M" (Main branch)
  category.type = "M";
  
  // 5. Can have own subcategories
  category.category_branches = {};
  category.sub_levels = {};
}
```

---

#### Migration Implications for Branch-Level Categories

**During Migration**:
1. Detect categories attached to sub-levels via `parent_level` field
2. Assign type "M" (Main branch)
3. Generate identifier: `l{n} M{counter}`
4. Preserve complete parent-child chain
5. Ensure sub-level itself remains ordinary sub-level

**Example**:
```javascript
function migrateBranchLevelCategory(category) {
  if (category.parent_level && category.parent_level.startsWith("l")) {
    // This is a branch beneath a sub-level
    category.type = "M";  // Main branch
    
    const levelNumber = category.parent_level;
    const counter = getBranchCounterAtLevel(category.parent_id, levelNumber);
    
    category.identifier = `${levelNumber} M${counter}`;
    category.full_identifier = `${levelNumber} M${counter}`;
  }
}
```

---

#### Summary: Category Branch Beneath Sub-Level

**Designation**: `l{n} M{m}` where:
- `l{n}` = Sub-level number (which level it's beneath)
- `M{m}` = Main branch counter (scoped to that level)

**Type**: "M" (Main Category in branch context)

**Subcategories Beneath Branch**:
- First level: `l{n} M{m}-SC{k}` (type "SC")
- Nested: `l{n} M{m}-Sc{k}` (type "Sc")

**Counter Scoping**:
- M counter: Per sub-level (l3 M1, l3 M2, l4 M1)
- SC counter: Per Main branch (l3 M1-SC1, l3 M2-SC1)
- Sc counter: Per parent subcategory

**Distinction**:
- Sub-levels: Have blue plus, hold notes
- Branches: No blue plus, hold subcategories

**Preservation**:
- Original sub-levels unchanged (l4 stays l4, not renumbered)
- Sub-level becomes accordion when branch added
- Complete hierarchy maintained

---

#### STATUS: PROPOSED — AWAITING USER APPROVAL

**This naming convention for categories beneath sub-levels is PROPOSED.**

**Awaiting Confirmation**:
1. ✅ Approve `l{n} M{m}` designation?
2. ✅ Approve type "M" for branches?
3. ✅ Approve counter scoping per level?
4. ✅ Approve subcategory pattern `l{n} M{m}-SC{k}`?
5. ✅ Approve distinction from ordinary sub-levels?

**If approved**: This becomes the established convention.  
**If changes needed**: Provide revised designation before implementation.

---


  categoryId: "cat-soups-uuid-002",
  newParentId: "cat-storage-uuid-004"
);

// WRONG: Use compact identifiers
await moveCategory("M-Sc1", "M-SC2");  // Ambiguous!
```

**Associate Note**:
```javascript
// CORRECT: Use permanent ID
note.category_node_id = "cat-soups-uuid-002";

// WRONG: Use compact identifier
note.category_identifier = "M-Sc1";  // Which category??
```

---

#### Validation Rules

**On Category Creation**:
```javascript
function validateCategory(category) {
  // 1. Verify unique ID
  if (!category.id || await categoryIdExists(category.id)) {
    throw new Error("Category ID must be unique");
  }
  
  // 2. Compact identifier can repeat (OK)
  category.identifier = generateCompactIdentifier(category);
  // No uniqueness check on identifier
  
  // 3. Full identifier more unique but still not guaranteed
  category.full_identifier = generateFullIdentifier(category);
  
  // 4. Parent ID must exist
  if (category.parent_id && !await categoryExists(category.parent_id)) {
    throw new Error("Parent category does not exist");
  }
}
```

---

#### Summary: Three-Tier Identification System

| Tier | Field | Purpose | Unique? | Usage |
|------|-------|---------|---------|-------|
| **1** | `id` | Permanent unique identifier | ✅ YES | All operations, database queries, relationships |
| **2** | `full_identifier` | Complete hierarchy path | ⚠️ Usually | Debugging, admin, complete context |
| **3** | `identifier` | Compact display reference | ❌ NO | UI labels, breadcrumbs, quick reference |

**Rules**:
1. Always use `id` for any operation requiring unique identification
2. Display `identifier` (compact) in UI with sufficient context
3. Use `full_identifier` when more context needed
4. Never use `identifier` alone to locate, retrieve, or modify categories
5. `parent_id` chain is source of truth for hierarchy

---



**User Experience** (unchanged):
- Same click/tap to edit
- Same input field appearance
- Same save confirmation
- Same keyboard shortcuts
- Same validation messages

**Backend Cascade** (new, invisible to user):
```javascript
async function renameCategory(categoryId, newName) {
  // Update tree
  const category = findCategoryById(tree, categoryId);
  category.name = newName;
  await saveCategoryTree(tree);
  
  // Notes' category_node_id unchanged (still points to same ID)
  // Display paths auto-update on next render (generated from tree)
  
  // No user-facing changes to rename interaction
}
```

**Result**: Renaming looks and feels identical to current system, but now works correctly with stable IDs.

---

### 1.4 Animations (DECIDED)

**Rule**: Preserve existing approved animations exactly

**Green Plus Animation**:
- Use existing animation that plays on category/note creation
- Same timing, same easing, same visual effect
- No redesign, no new animation

**Blue Plus Animation**:
- Use same animation as green plus
- Consistency across both actions

**Branch Creation**:
- Play existing animation when branch created
- Same as current category creation animation

**Note Creation via Blue Plus**:
- Play existing animation when note created
- Same as current note creation animation

**Accordion Expand/Collapse**:
- Preserve existing accordion animation
- Same timing and easing values
- No changes to accordion behavior

**No New Animation Design**: All animations already approved. Simply reuse existing animations for new features.

---


// Check if sub-level needs accordion UI
function hasChildBranches(categoryNode, level) {
  return categoryNode.level_branches?.[level] !== undefined &&
         Object.keys(categoryNode.level_branches[level]).length > 0;
}
```

**Implementation**: Dynamically add accordion wrapper when first branch created.

---

### 1.6 Styling (DECIDED - DETAILED)

**Green Plus**:
- Icon: Plus symbol (existing design)
- Color: Existing approved green from theme
- Size: Match existing plus icons in app
- Style: Inherit from existing button styling conventions
- Hover: Existing hover behavior
- Animation: Existing approved animation on click

**Blue Plus**:
- Icon: Plus symbol (SAME DESIGN as green plus)
- Color: Existing approved blue from theme
- Size: Match green plus exactly
- Style: Inherit from existing button styling conventions
- Hover: Same hover behavior as green plus
- Animation: Existing approved animation on click (same as green)

**Positioning**:
```
Kitchen (M) [🟢 green plus]
├─ L1: Utensils [🟢 green plus] [🔵 blue plus]
└─ L2: Appliances [🟢 green plus] [🔵 blue plus]
```

**Visual Consistency**:
- Both buttons use identical size, padding, borders
- Only difference is color (green vs. blue)
- Maintain visual rhythm with existing UI
- Use existing spacing/margin values

**Tooltips**:
- Green plus: "Add category" or existing category-creation tooltip
- Blue plus: "Add note" or existing note-creation tooltip
- Style: Match existing tooltip design

**Preserve**: All existing styling conventions, colors, animations, transitions. No CSS redesign.

---

### 1.7 Category Deletion (DECIDED - ENHANCED)

**Rule**: Block deletion of branches containing notes or descendants until contents relocated

**Behavior**:

**Scenario A**: Delete category with notes
```javascript
// Kitchen M-SC1: Pantry has 5 notes
// User clicks delete on Pantry

// MUST BLOCK with error:
"Cannot delete Pantry
 
 This category contains 5 notes.
 
 You must move or delete these notes first:
 • Sourdough starter
 • Bread recipes
 • Baking supplies
 • Kitchen inventory
 • Pantry organization
 
 [Cancel] [Move Notes...] [Go to Category]"
```

**User must explicitly**:
1. Move notes to another category, OR
2. Delete notes individually, OR
3. Move notes to Uncategorized

**Then deletion allowed**.

---

**Scenario B**: Delete category with child branches
```javascript
// Kitchen M-SC1: Pantry has child SC1-Sc1: Canned
// User clicks delete on Pantry

// MUST BLOCK with error:
"Cannot delete Pantry
 
 This category contains subcategories:
 • Canned
 
 You must move or delete these subcategories first.
 
 [Cancel] [Go to Category]"
```

**User must explicitly**:
1. Delete child categories (which triggers their own checks), OR
2. Move child categories to another location

**Then deletion allowed**.

---

**Scenario C**: Delete empty category
```javascript
// Kitchen M-SC1: Storage is empty (no notes, no children)
// User clicks delete

// IMMEDIATE deletion (no warning needed)
toast.success("Storage deleted");
```

**Implementation**: Only empty categories can be deleted instantly. All others blocked until emptied.

**Critical**: Never silently cascade-delete notes or descendants. Always require explicit user action.

---

### 1.8 Search Scope (DECIDED)

**Include**:
- ✅ All category names (M, SC, Sc, sc)
- ✅ All branch names
- ✅ All sub-level names (L1, L2, etc.)
- ✅ All note titles
- ✅ All note content
- ✅ All note tags

**Display Results**:
```
Search: "bread"

Categories & Branches:
  🔵 Kitchen → L3 M1: Baking → L1: Breads

Notes:
  📝 Sourdough Starter
      Location: Kitchen → Recipes → Baking → Breads
  
  📝 Breadcrumb Navigation
      Location: Work → Projects → Documentation
```

**Show full path** for both categories and notes.

---

### 1.9 Migration Preservation (DECIDED - COMPREHENSIVE)

**Must preserve during migration** (ZERO DATA LOSS):

1. **All Notes**:
   - ✅ Every note title
   - ✅ Every note content (full HTML/text)
   - ✅ All note metadata (created_at, updated_at, color, icon, etc.)
   - ✅ All note attachments and file references
   - ✅ All note tags
   - ✅ All note alarms, recurring events, checklists
   - ✅ All note pinned status
   - ✅ All note order values

2. **All Category Data**:
   - ✅ All existing category_path arrays (unchanged)
   - ✅ All existing category names (unchanged)
   - ✅ All existing parent-child relationships
   - ✅ Legacy fields (category, subcategory)

3. **All Tree Structure**:
   - ✅ Existing category tree hierarchy
   - ✅ All nested relationships
   - ✅ All category metadata

4. **All Settings**:
   - ✅ User preferences
   - ✅ Theme settings
   - ✅ All configuration values

**Migration adds** (non-destructive):
- ✅ category_node_id to each note (NEW FIELD)
- ✅ Enhanced category tree structure (ADDS FIELDS)
- ✅ Category IDs (NEW FIELD)

**Migration does NOT**:
- ❌ Delete any fields from notes
- ❌ Modify note content
- ❌ Change category names
- ❌ Remove categories
- ❌ Alter note display order
- ❌ Change any user settings
- ❌ Delete attachments
- ❌ Modify gallery images

**Verification After Migration**:
```javascript
// Verify note count unchanged
const beforeCount = backupCounts.notes;
const afterCount = (await getAllNotes()).length;
if (beforeCount !== afterCount) {
  throw new Error('Note count mismatch - migration failed');
}

// Verify every note preserved
for (const originalNote of backup.notes) {
  const migratedNote = await getNote(originalNote.id);
  
  // Verify all original fields present
  if (migratedNote.title !== originalNote.title) {
    throw new Error(`Note ${originalNote.id} title changed`);
  }
  if (migratedNote.content !== originalNote.content) {
    throw new Error(`Note ${originalNote.id} content changed`);
  }
  // ... verify all fields unchanged
  
  // Verify new field added
  if (!migratedNote.category_node_id && originalNote.category_path.length > 0) {
    throw new Error(`Note ${originalNote.id} missing category_node_id`);
  }
}
```

**If Verification Fails**: Automatic rollback to backup, no partial migration.

### 1.2 Empty Category Display (DECIDED)

**Rule**: Display all categories and subcategories, even when they contain no notes

**Behavior**:

**Empty Main Category**:
```
Kitchen (M) [🟢]
├─ (No notes yet)
└─ (No sub-levels yet)
```
- Category visible and accessible
- Blue plus button available on sub-levels if any exist
- Can create branches with green plus
- Can create first note via sub-level

**Empty Subcategory Branch**:
```
Kitchen (M)
└─ M-SC1: Pantry [🟢]
   └─ (No sub-levels yet)
```
- Branch visible even with no contents
- Green plus can add sub-branches
- Organizational structure preserved

**Empty Sub-Level**:
```
Kitchen (M)
├─ L1: Utensils [🟢] [🔵]
│  └─ (No notes yet)
└─ L2: Appliances [🟢] [🔵]
   └─ (No notes yet)
```
- Sub-level visible
- Blue plus can create first note
- Green plus can add branch beneath it

**Rationale**:
- Users can see complete organizational structure
- "Create note here" works even before notes exist
- Categories aren't hidden just because they're empty
- Organizational planning possible before content creation

**Implementation**: Tree-based rendering shows all categories from tree structure, not just categories that notes reference.

### 2.1 DECIDED (No Further Input Needed)

| Decision | Status | Value |
|----------|--------|-------|
| Green plus placement | ✅ DECIDED | M, SC, all sub-levels |
| Blue plus placement | ✅ DECIDED | Sub-levels only (not category headers) |
| Blue plus icon | ✅ DECIDED | Blue plus symbol, matching green plus design |
| Empty categories | ✅ DECIDED | Display all, even with no notes |
| Category renaming | ✅ DECIDED | Preserve existing editing behavior |
| Animations | ✅ DECIDED | Preserve existing approved animations |
| Single source of truth | ✅ DECIDED | category_node_id (no note_ids arrays) |
| Identifier conventions | ✅ DECIDED | L4 M1, M-SC1, SC-Sc1 |
| Branch counters | ✅ DECIDED | Per-parent |
| Sub-level accordion | ✅ DECIDED | Only when branch created |
| Migration timing | ✅ DECIDED | User-triggered wizard (not automatic) |
| Rollback window | ✅ DECIDED | 7 days minimum + downloadable backup forever |
| Conflict resolution | ✅ DECIDED | Flag for review, never auto-resolve |
| Branch deletion | ✅ DECIDED | Block until contents relocated |
| Search scope | ✅ DECIDED | Include everything |
| Migration preservation | ✅ DECIDED | Preserve all existing data |

---

### 2.2 ALL QUESTIONS DECIDED

| Question | Decision | Details |
|----------|----------|---------|
| **Q1: Blue plus icon** | ✅ DECIDED | Blue plus symbol matching existing green plus design. Preserve existing styling conventions. |
| **Q2: Empty categories** | ✅ DECIDED | Display all categories and subcategories, even with no notes. Empty organizational structures remain visible. |
| **Q3: Renaming** | ✅ DECIDED | Preserve existing approved editing behavior. No new editing interface or redesign. |
| **Q4: Animation** | ✅ DECIDED | Preserve existing approved animations exactly. No new animation design. |
| **Q5: Migration timing** | ✅ DECIDED | Explicit user-triggered migration wizard. No silent automatic migration at startup. |
| **Q6: Rollback window** | ✅ DECIDED | Seven days minimum with independently downloadable backup retained beyond that period. |
| **Q7: Conflict resolution** | ✅ DECIDED | Never silently overwrite, guess, or auto-create categories. Flag conflicts for review. |
| **Q8: Deletion behavior** | ✅ DECIDED | Block deletion of branches with notes/descendants until contents relocated. Never cascade-delete. |

**All architectural decisions finalized.**

---

## SECTION 3: DETAILED MIGRATION STRATEGY

### 3.1 Pre-Migration Checklist

**Before migration begins**:

1. ✅ **Full Backup**
   - Export entire IndexedDB to JSON file
   - Store backup in browser localStorage (separate key)
   - Provide download link for user to save externally
   - Timestamp: Include in backup metadata

2. ✅ **Validation**
   - Count total notes
   - Count total unique categories
   - Verify no corrupted note records
   - Check IndexedDB integrity

3. ✅ **User Notification**
   ```
   ╔═══════════════════════════════════════════╗
   ║  IRON RABBIT ARCHITECTURE UPGRADE         ║
   ╠═══════════════════════════════════════════╣
   ║                                           ║
   ║  This upgrade adds new category features: ║
   ║  • Two-way note-category linking          ║
   ║  • Recursive category branches            ║
   ║  • Enhanced note organization             ║
   ║                                           ║
   ║  Your data will be preserved.             ║
   ║                                           ║
   ║  Time: ~2-5 minutes                       ║
   ║  Notes: 543                               ║
   ║  Categories: 47                           ║
   ║                                           ║
   ║  Backup created: Nov 4, 2026 3:42 PM     ║
   ║  [Download Backup] (recommended)          ║
   ║                                           ║
   ║          [Cancel]  [Start Upgrade]        ║
   ╚═══════════════════════════════════════════╝
   ```

4. ✅ **Dry Run Option**
   - Checkbox: "Preview changes without saving"
   - Shows migration plan without executing
   - User can review before committing

---

### 3.2 Migration Algorithm (ENHANCED WITH SAFEGUARDS)

**CRITICAL SAFEGUARDS**: Before migration commits changes, comprehensive validation must pass.

---

#### Pre-Commit Validation Checklist

**Before any data modification**:

```javascript
async function validateBeforeMigration() {
  const validation = {
    passed: true,
    errors: [],
    warnings: [],
    counts: {},
    conflicts: []
  };
  
  // 1. Verify all existing notes accounted for
  const allNotes = await getAllNotes();
  validation.counts.totalNotes = allNotes.length;
  validation.counts.notesWithPaths = allNotes.filter(n => 
    n.category_path && n.category_path.length > 0
  ).length;
  validation.counts.uncategorized = allNotes.length - validation.counts.notesWithPaths;
  
  if (validation.counts.totalNotes === 0) {
    validation.errors.push('No notes found - database may be empty or corrupted');
    validation.passed = false;
  }
  
  // 2. Verify all existing categories and sub-levels
  const tree = await getCategoryTree();
  const categoryNames = new Set();
  const traverseForNames = (node) => {
    if (node.name) categoryNames.add(node.name);
    if (node.children) {
      Object.values(node.children).forEach(traverseForNames);
    }
  };
  Object.values(tree).forEach(traverseForNames);
  validation.counts.existingCategories = categoryNames.size;
  
  // 3. Verify parent-child relationships in existing tree
  const orphanedNodes = [];
  const checkParentChild = (node, parent = null) => {
    if (parent && !node.parent_id) {
      orphanedNodes.push({ name: node.name, expectedParent: parent.name });
    }
    if (node.children) {
      Object.values(node.children).forEach(child => 
        checkParentChild(child, node)
      );
    }
  };
  Object.values(tree).forEach(node => checkParentChild(node));
  
  if (orphanedNodes.length > 0) {
    validation.warnings.push({
      type: 'orphaned_nodes',
      count: orphanedNodes.length,
      details: orphanedNodes
    });
  }
  
  // 4. Detect ambiguous paths and duplicate names
  const pathMap = new Map(); // path_string -> [note_ids]
  const duplicateNames = new Map(); // name -> count
  
  for (const note of allNotes) {
    if (!note.category_path || note.category_path.length === 0) continue;
    
    const pathKey = note.category_path.join('\u241E');
    if (!pathMap.has(pathKey)) pathMap.set(pathKey, []);
    pathMap.get(pathKey).push(note.id);
    
    // Check for duplicate category names in different contexts
    for (const segment of note.category_path) {
      duplicateNames.set(segment, (duplicateNames.get(segment) || 0) + 1);
    }
  }
  
  // Flag paths that don't exist in tree
  const ambiguousPaths = [];
  for (const [pathKey, noteIds] of pathMap) {
    const path = pathKey.split('\u241E');
    let current = tree;
    let exists = true;
    
    for (const segment of path) {
      if (!current[segment]) {
        exists = false;
        break;
      }
      current = current[segment].children || {};
    }
    
    if (!exists) {
      ambiguousPaths.push({
        path: path,
        noteCount: noteIds.length,
        noteIds: noteIds,
        reason: 'path_not_in_tree'
      });
    }
  }
  
  if (ambiguousPaths.length > 0) {
    validation.conflicts.push({
      type: 'ambiguous_paths',
      count: ambiguousPaths.length,
      details: ambiguousPaths,
      resolution_required: true
    });
    validation.errors.push(
      `Found ${ambiguousPaths.length} note paths that don't exist in category tree. ` +
      `Migration cannot proceed without resolving these conflicts.`
    );
    validation.passed = false;
  }
  
  // 5. Preserve all original category paths (verification)
  const originalPaths = allNotes.map(n => ({
    noteId: n.id,
    originalPath: n.category_path ? [...n.category_path] : []
  }));
  validation.originalPaths = originalPaths;
  
  // 6. Verify backup integrity
  const backup = await createBackup();
  const backupValid = await validateBackup(backup);
  
  if (!backupValid) {
    validation.errors.push('Backup integrity check failed. Cannot proceed safely.');
    validation.passed = false;
  } else {
    validation.counts.backupSize = JSON.stringify(backup).length;
    validation.backupId = backup.id;
  }
  
  // 7. Detect duplicate category names in different branches
  const nameContexts = new Map(); // name -> [full_paths]
  for (const note of allNotes) {
    if (!note.category_path) continue;
    for (let i = 0; i < note.category_path.length; i++) {
      const name = note.category_path[i];
      const fullPath = note.category_path.slice(0, i + 1).join(' → ');
      
      if (!nameContexts.has(name)) nameContexts.set(name, new Set());
      nameContexts.get(name).add(fullPath);
    }
  }
  
  const duplicateContexts = [];
  for (const [name, contexts] of nameContexts) {
    if (contexts.size > 1) {
      duplicateContexts.push({
        name: name,
        contexts: Array.from(contexts)
      });
    }
  }
  
  if (duplicateContexts.length > 0) {
    validation.warnings.push({
      type: 'duplicate_names_different_contexts',
      count: duplicateContexts.length,
      details: duplicateContexts,
      note: 'These categories have the same name in different locations. Each will get a unique ID.'
    });
  }
  
  return validation;
}
```

---

#### Pre-Commit Validation UI

**If validation passes**:
```
╔═══════════════════════════════════════════╗
║  PRE-MIGRATION VALIDATION ✓               ║
╠═══════════════════════════════════════════╣
║                                           ║
║  ✓ 543 notes accounted for                ║
║  ✓ 47 categories verified                 ║
║  ✓ Parent-child relationships intact      ║
║  ✓ No ambiguous paths detected            ║
║  ✓ Backup created and verified            ║
║                                           ║
║  ⚠ 3 warnings (non-critical):             ║
║    • 5 duplicate category names in        ║
║      different branches (normal)          ║
║                                           ║
║  Ready to proceed.                        ║
║                                           ║
║  [View Detailed Report]                   ║
║                                           ║
║          [Cancel]  [Start Migration]      ║
╚═══════════════════════════════════════════╝
```

**If validation fails**:
```
╔═══════════════════════════════════════════╗
║  ⚠️ PRE-MIGRATION VALIDATION FAILED        ║
╠═══════════════════════════════════════════╣
║                                           ║
║  ❌ Critical issues detected:              ║
║                                           ║
║  • 12 notes have paths not in tree        ║
║                                           ║
║  Examples:                                ║
║  - Note "Recipe ideas" has path:          ║
║    Home → OldCategory → Deleted           ║
║                                           ║
║  - Note "Todo list" has path:             ║
║    Work → NonExistent                     ║
║                                           ║
║  MIGRATION STOPPED                        ║
║  Your data has NOT been modified.         ║
║                                           ║
║  REQUIRED ACTION:                         ║
║  Review and fix these conflicts before    ║
║  migration can proceed.                   ║
║                                           ║
║  [View Full Conflict Report]              ║
║  [Download Diagnostic Log]                ║
║                                           ║
║               [Close]                     ║
╚═══════════════════════════════════════════╝
```

**Critical**: If validation fails, migration **MUST NOT PROCEED**. Original data remains untouched.

---

#### Conflict Resolution Flow

**When ambiguous paths detected**:

1. **Manual Review Interface**:
```
╔═══════════════════════════════════════════╗
║  RESOLVE PATH CONFLICTS                   ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Conflict 1 of 12:                        ║
║                                           ║
║  Note: "Recipe ideas"                     ║
║  Current path: Home → OldCategory         ║
║                                           ║
║  Problem: "OldCategory" doesn't exist     ║
║           in current tree                 ║
║                                           ║
║  RESOLUTION OPTIONS:                      ║
║                                           ║
║  ( ) Create "OldCategory" in tree         ║
║      Path: Home → OldCategory             ║
║                                           ║
║  ( ) Move note to existing category:      ║
║      [Dropdown: Kitchen, Garden, Work...] ║
║                                           ║
║  ( ) Move to Uncategorized                ║
║                                           ║
║  ( ) Skip this note (review later)        ║
║                                           ║
║          [Previous]  [Next]  [Apply All]  ║
╚═══════════════════════════════════════════╝
```

2. **Batch Resolution**:
```
"Apply same resolution to all 12 conflicts?"

[ ] Create all missing categories
[ ] Move all to: [Dropdown]
[ ] Move all to Uncategorized

[Cancel] [Apply to All]
```

3. **Resolution Required**: User MUST resolve conflicts before migration can proceed.

**Never**: Auto-resolve, guess, or silently create categories without explicit user choice.

---

**Phase 1: Build Enhanced Category Tree**

```javascript
async function buildEnhancedCategoryTree() {
  const oldTree = await getCategoryTree();  // Existing tree
  const allNotes = await getAllNotes();
  
  const newTree = {};
  const categoryIdMap = new Map();  // name_path → category_id
  
  // Step 1: Traverse existing tree, assign IDs to all nodes
  function traverseTree(node, parentId = null, parentPath = [], level = 0) {
    const fullPath = [...parentPath, node.name];
    const pathKey = fullPath.join('\u241E');
    
    // Assign ID if doesn't exist
    if (!node.id) {
      node.id = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Map path to ID for note linking
    categoryIdMap.set(pathKey, node.id);
    
    // Add parent relationship
    node.parent_id = parentId;
    
    // Initialize new structure fields
    if (!node.sub_levels) node.sub_levels = {};
    if (!node.category_branches) node.category_branches = {};
    if (!node.level_branches) node.level_branches = {};
    
    // Recursively process children
    if (node.children) {
      for (const [childName, childNode] of Object.entries(node.children)) {
        traverseTree(childNode, node.id, fullPath, level + 1);
      }
    }
  }
  
  // Process each root category
  for (const [rootName, rootNode] of Object.entries(oldTree)) {
    traverseTree(rootNode, null, [], 0);
    newTree[rootName] = rootNode;
  }
  
  // Step 2: Discover sub-levels from note paths
  for (const note of allNotes) {
    if (!note.category_path || note.category_path.length === 0) continue;
    
    // For each segment in path, record as sub-level
    let currentPath = [];
    for (let i = 0; i < note.category_path.length; i++) {
      currentPath.push(note.category_path[i]);
      const pathKey = currentPath.join('\u241E');
      const categoryId = categoryIdMap.get(pathKey);
      
      if (categoryId && i < note.category_path.length - 1) {
        // This is not the leaf, so next segment is a sub-level
        const nextSegment = note.category_path[i + 1];
        const levelKey = `L${i + 1}`;
        
        const category = findCategoryById(newTree, categoryId);
        if (category) {
          if (!category.sub_levels[levelKey]) {
            category.sub_levels[levelKey] = [];
          }
          if (!category.sub_levels[levelKey].includes(nextSegment)) {
            category.sub_levels[levelKey].push(nextSegment);
          }
        }
      }
    }
  }
  
  return { newTree, categoryIdMap };
}
```

---

**Phase 2: Link Notes to Categories**

```javascript
async function linkNotesToCategories(categoryIdMap) {
  const allNotes = await getAllNotes();
  const migrationLog = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const note of allNotes) {
    try {
      // Determine category_node_id from category_path
      let categoryId = null;
      
      if (note.category_path && note.category_path.length > 0) {
        // Try full path first
        const fullPathKey = note.category_path.join('\u241E');
        categoryId = categoryIdMap.get(fullPathKey);
        
        // If not found, find deepest matching category
        if (!categoryId) {
          for (let len = note.category_path.length; len > 0; len--) {
            const partialPath = note.category_path.slice(0, len);
            const partialKey = partialPath.join('\u241E');
            categoryId = categoryIdMap.get(partialKey);
            if (categoryId) break;
          }
        }
      }
      
      // Fallback: try legacy fields
      if (!categoryId && note.category) {
        categoryId = categoryIdMap.get(note.category);
      }
      
      // Add category_node_id to note
      note.category_node_id = categoryId || null;
      
      // Preserve existing fields (don't delete anything)
      // category, subcategory, category_path remain unchanged
      
      // Save updated note
      await saveNote(note);
      
      successCount++;
      migrationLog.push({
        noteId: note.id,
        noteTitle: note.title,
        categoryPath: note.category_path,
        assignedCategoryId: categoryId,
        status: categoryId ? 'success' : 'warning_no_category'
      });
      
    } catch (error) {
      errorCount++;
      migrationLog.push({
        noteId: note.id,
        noteTitle: note.title,
        error: error.message,
        status: 'error'
      });
    }
  }
  
  return {
    successCount,
    errorCount,
    migrationLog
  };
}
```

---

**Phase 3: Validate Migration**

```javascript
async function validateMigration() {
  const allNotes = await getAllNotes();
  const tree = await getCategoryTree();
  
  const validation = {
    totalNotes: allNotes.length,
    notesWithCategoryId: 0,
    notesWithoutCategoryId: 0,
    orphanedNotes: [],
    validLinks: 0,
    brokenLinks: 0
  };
  
  for (const note of allNotes) {
    if (note.category_node_id) {
      validation.notesWithCategoryId++;
      
      // Verify category exists in tree
      const categoryExists = findCategoryById(tree, note.category_node_id);
      if (categoryExists) {
        validation.validLinks++;
      } else {
        validation.brokenLinks++;
        validation.orphanedNotes.push({
          noteId: note.id,
          noteTitle: note.title,
          categoryNodeId: note.category_node_id
        });
      }
    } else {
      validation.notesWithoutCategoryId++;
    }
  }
  
  return validation;
}
```

---

### 3.3 Migration Progress UI (ENHANCED)

**Phase 0: Pre-Migration Validation** (NEW)
```
╔═══════════════════════════════════════════╗
║  VALIDATING DATA...                       ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Checking data integrity...               ║
║  ████████████████████████████ 100%       ║
║                                           ║
║  ✓ 543 notes verified                     ║
║  ✓ 47 categories verified                 ║
║  ✓ Backup created                         ║
║  ✓ No conflicts detected                  ║
║                                           ║
║  Validation complete!                     ║
║                                           ║
╚═══════════════════════════════════════════╝
```

**Phase 1: Building Category Tree**
```
╔═══════════════════════════════════════════╗
║  UPGRADING IRON RABBIT...                 ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Step 1/3: Building category tree         ║
║  ████████████████████░░░░░ 85%           ║
║                                           ║
║  Processed: 412 / 485 categories          ║
║                                           ║
║  Please wait...                           ║
║                                           ║
║  [Pause Migration]                        ║
║                                           ║
╚═══════════════════════════════════════════╝
```

**Phase 2: Linking Notes**
```
╔═══════════════════════════════════════════╗
║  UPGRADING IRON RABBIT...                 ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Step 2/3: Linking notes to categories    ║
║  ███████████████░░░░░░░░░ 68%            ║
║                                           ║
║  Linked: 372 / 543 notes                  ║
║                                           ║
║  Please wait...                           ║
║                                           ║
║  [Pause Migration]                        ║
║                                           ║
╚═══════════════════════════════════════════╝
```

**Phase 3: Final Validation**
```
╔═══════════════════════════════════════════╗
║  UPGRADING IRON RABBIT...                 ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Step 3/3: Validating migration           ║
║  ████████████████████████████ 100%       ║
║                                           ║
║  ✓ All notes linked correctly             ║
║  ✓ No orphaned data                       ║
║  ✓ Integrity verified                     ║
║                                           ║
║  Finalizing...                            ║
║                                           ║
╚═══════════════════════════════════════════╝
```

**Completion: Success**
```
╔═══════════════════════════════════════════╗
║  UPGRADE COMPLETE ✓                       ║
╠═══════════════════════════════════════════╣
║                                           ║
║  ✓ 543 notes linked to categories         ║
║  ✓ 47 categories enhanced                 ║
║  ✓ 0 errors, 3 warnings                   ║
║                                           ║
║  MIGRATION REPORT:                        ║
║                                           ║
║  • All existing data preserved            ║
║  • All parent-child relationships intact  ║
║  • 5 duplicate names in different         ║
║    branches (assigned unique IDs)         ║
║                                           ║
║  Your data is ready!                      ║
║                                           ║
║  [View Full Migration Report]             ║
║  [Download Report as PDF]                 ║
║                                           ║
║  Rollback available for 7 days            ║
║  [Download Backup for Safekeeping]        ║
║                                           ║
║               [Continue]                  ║
╚═══════════════════════════════════════════╝
```

**Completion: With Warnings**
```
╔═══════════════════════════════════════════╗
║  UPGRADE COMPLETE (with warnings)         ║
╠═══════════════════════════════════════════╣
║                                           ║
║  ✓ 541 notes linked successfully          ║
║  ⚠ 2 notes require review                 ║
║                                           ║
║  WARNINGS:                                ║
║                                           ║
║  • 2 notes had ambiguous paths:           ║
║    - "Old recipe" (assigned to Kitchen)   ║
║    - "Todo" (left uncategorized)          ║
║                                           ║
║  These notes are accessible but may need  ║
║  manual category assignment.              ║
║                                           ║
║  [View Warning Details]                   ║
║  [Go to Affected Notes]                   ║
║                                           ║
║  Rollback available for 7 days            ║
║                                           ║
║          [Continue]  [Rollback]           ║
╚═══════════════════════════════════════════╝
```

**Interruption & Resumption**
```
╔═══════════════════════════════════════════╗
║  MIGRATION PAUSED                         ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Progress: 68% complete                   ║
║  (372 of 543 notes processed)             ║
║                                           ║
║  You can safely close this window.        ║
║                                           ║
║  Resume migration when ready:             ║
║  Settings → Resume Upgrade                ║
║                                           ║
║  Your data has NOT been modified yet.     ║
║  Changes will be committed when           ║
║  migration completes.                     ║
║                                           ║
║  [Resume Now]  [Cancel Migration]         ║
╚═══════════════════════════════════════════╝
```

**On Next App Load (If Paused)**:
```
╔═══════════════════════════════════════════╗
║  INCOMPLETE MIGRATION DETECTED            ║
╠═══════════════════════════════════════════╣
║                                           ║
║  An upgrade was started but not finished. ║
║                                           ║
║  Progress: 68% complete                   ║
║  Last updated: Nov 4, 2026 4:23 PM       ║
║                                           ║
║  OPTIONS:                                 ║
║                                           ║
║  1. [Resume Upgrade]                      ║
║     Continue from where it left off       ║
║                                           ║
║  2. [Cancel Upgrade]                      ║
║     Discard progress, keep current system ║
║                                           ║
║  Your data is safe either way.            ║
║                                           ║
║               [Choose Option]             ║
╚═══════════════════════════════════════════╝
```

---

### 3.4 Migration Error Handling

**Scenario 1: Note has invalid category_path**

```javascript
// Note has: category_path: ["NonExistent", "Category"]
// Tree doesn't have "NonExistent"

// Action:
// 1. Create category in tree with that name
// 2. Assign ID
// 3. Link note
// 4. Log as "auto-created category"
```

**Scenario 2: Note has no category_path**

```javascript
// Note has: category_path: []

// Action:
// 1. Leave category_node_id as null
// 2. Note remains in "Uncategorized"
// 3. Log as "uncategorized note (normal)"
```

**Scenario 3: Duplicate category names in different branches**

```javascript
// Home → Kitchen
// Work → Kitchen

// Action:
// 1. Each gets unique ID (already handled by tree structure)
// 2. Notes linked to correct Kitchen based on full path
// 3. No ambiguity
```

**Scenario 4: Migration interrupted (browser closed)**

```javascript
// Recovery:
// 1. On next load, detect incomplete migration
// 2. Show: "Previous upgrade incomplete. Resume or rollback?"
// 3. [Resume Upgrade] [Rollback to Backup]
// 4. If resume: continue from last checkpoint
```

---

### 3.5 Migration Checkpoints

**Save state after each phase**:

```javascript
// localStorage key: 'ir_migration_state'
{
  status: 'in_progress',  // or 'complete', 'failed'
  startTime: '2026-11-04T15:42:00Z',
  phase: 2,  // 1=tree, 2=notes, 3=validation
  notesProcessed: 412,
  totalNotes: 543,
  errors: [],
  canRollback: true,
  backupKey: 'ir_backup_2026_11_04_15_42'
}
```

**If page reloaded during migration**:
- Resume from last checkpoint
- Show progress already made
- Continue without re-processing completed items

---

## SECTION 4: DETAILED ROLLBACK STRATEGY

### 4.1 Rollback Window (ENHANCED)

**Duration**: 7 days minimum from migration completion

**Backup Storage**:
- **Primary**: IndexedDB (separate store: `migration_backups`)
  - Retained for 7 days minimum
  - Auto-prompt after 7 days: Keep, Archive, or Delete
  
- **Independent Downloadable Backup**: User can download JSON backup anytime
  - Retained forever (user's responsibility)
  - Can be re-imported manually at any time
  - Provides long-term safety net beyond 7-day window

**After 7 Days**:
```
╔═══════════════════════════════════════════╗
║  MIGRATION BACKUP NOTICE                  ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Your migration backup is 7 days old.     ║
║                                           ║
║  Backup from: Nov 4, 2026 3:42 PM        ║
║  Size: 2.3 MB                             ║
║                                           ║
║  OPTIONS:                                 ║
║                                           ║
║  1. [Keep Backup Indefinitely]            ║
║     Continue taking up storage space      ║
║                                           ║
║  2. [Download and Delete]                 ║
║     Save externally, free up space        ║
║                                           ║
║  3. [Delete Backup]                       ║
║     Cannot automatic rollback after this  ║
║                                           ║
║  Recommended: Download before deleting    ║
║                                           ║
║               [Choose Option]             ║
╚═══════════════════════════════════════════╝
```

**Independent Backup Retention**:
- User can download backup as JSON file anytime during or after migration
- File stored on user's device/cloud storage
- Can be manually re-imported to restore Iron Rabbit
- Provides rollback capability beyond automated 7-day window
- User controls retention period (not system-enforced)

**Manual Restore from Downloaded Backup**:
```
Settings → Advanced → Import Data
→ [Select Backup File]
→ [Preview Data]
→ [Restore from Backup]
```

This ensures users can rollback months or years later if they saved the backup file.

---

### 4.2 Rollback Trigger

**User can trigger rollback via**:

1. Settings menu: "Advanced → Rollback Migration"
2. Migration complete screen: "Rollback" button
3. Error recovery: If validation fails, auto-offer rollback

**Confirmation Required**:
```
╔═══════════════════════════════════════════╗
║  ROLLBACK TO PREVIOUS VERSION             ║
╠═══════════════════════════════════════════╣
║                                           ║
║  ⚠️ This will restore Iron Rabbit to      ║
║     the state before the upgrade.         ║
║                                           ║
║  Backup from: Nov 4, 2026 3:42 PM        ║
║                                           ║
║  Current data will be replaced:           ║
║  • 543 notes                              ║
║  • 47 categories                          ║
║                                           ║
║  Changes made since upgrade will be lost. ║
║                                           ║
║  Are you sure?                            ║
║                                           ║
║          [Cancel]  [Rollback Now]         ║
╚═══════════════════════════════════════════╝
```

---

### 4.3 Rollback Algorithm

```javascript
async function performRollback() {
  try {
    // Step 1: Load backup
    const backup = await getBackup('ir_backup_2026_11_04_15_42');
    if (!backup) {
      throw new Error('Backup not found. Cannot rollback.');
    }
    
    // Step 2: Validate backup
    const isValid = validateBackup(backup);
    if (!isValid) {
      throw new Error('Backup is corrupted. Cannot rollback.');
    }
    
    // Step 3: Create snapshot of current state (in case user wants to re-migrate later)
    const currentSnapshot = {
      notes: await getAllNotes(),
      settings: await getSettings(),
      timestamp: new Date().toISOString()
    };
    await saveSnapshot('pre_rollback_snapshot', currentSnapshot);
    
    // Step 4: Clear current data
    await clearAllNotes();
    await clearSettings();
    
    // Step 5: Restore from backup
    for (const note of backup.notes) {
      await saveNote(note);
    }
    await saveSettings(backup.settings);
    
    // Step 6: Verify restoration
    const restoredNoteCount = (await getAllNotes()).length;
    if (restoredNoteCount !== backup.notes.length) {
      throw new Error('Restoration incomplete. Count mismatch.');
    }
    
    // Step 7: Mark rollback complete
    await saveRollbackState({
      status: 'complete',
      timestamp: new Date().toISOString(),
      notesRestored: restoredNoteCount
    });
    
    // Step 8: Clean up migration state
    await clearMigrationState();
    
    return {
      success: true,
      notesRestored: restoredNoteCount
    };
    
  } catch (error) {
    // Rollback failed - critical situation
    return {
      success: false,
      error: error.message,
      action: 'manual_recovery_required'
    };
  }
}
```

---

### 4.4 Rollback Verification

**After rollback**:

1. **Count Check**: Verify note count matches backup
2. **Spot Check**: Display 10 random notes, user confirms they look correct
3. **Category Check**: Verify category tree matches backup
4. **Functionality Check**: Try creating/editing note

**Verification UI**:
```
╔═══════════════════════════════════════════╗
║  ROLLBACK COMPLETE ✓                      ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Iron Rabbit restored to:                 ║
║  Nov 4, 2026 3:42 PM                     ║
║                                           ║
║  ✓ 543 notes restored                     ║
║  ✓ 47 categories restored                 ║
║  ✓ All settings restored                  ║
║                                           ║
║  Please verify your data looks correct.   ║
║                                           ║
║  [View Random Notes]                      ║
║                                           ║
║               [Continue]                  ║
╚═══════════════════════════════════════════╝
```

---

### 4.5 Rollback Failure Recovery

**If rollback fails** (worst case scenario):

```
╔═══════════════════════════════════════════╗
║  ⚠️ ROLLBACK FAILED                        ║
╠═══════════════════════════════════════════╣
║                                           ║
║  The automatic rollback encountered an    ║
║  error. Your data is safe.                ║
║                                           ║
║  Error: Backup restoration incomplete     ║
║                                           ║
║  RECOVERY OPTIONS:                        ║
║                                           ║
║  1. [Download Current Data]               ║
║     Save everything as JSON file          ║
║                                           ║
║  2. [Download Backup]                     ║
║     Save original backup as JSON          ║
║                                           ║
║  3. [Retry Rollback]                      ║
║     Attempt restoration again             ║
║                                           ║
║  4. [Contact Support]                     ║
║     Get help with manual recovery         ║
║                                           ║
║               [Choose Option]             ║
╚═══════════════════════════════════════════╝
```

**Manual Recovery Steps** (if all else fails):
1. User downloads both current data and backup as JSON
2. User reloads app (clears IndexedDB)
3. User imports backup JSON manually
4. Support team assists if needed

---

### 4.6 Preventing Rollback Data Loss

**Problem**: User creates notes after migration, then rolls back

**Solution**: Warn user about data created since migration

```
╔═══════════════════════════════════════════╗
║  ⚠️ ROLLBACK WARNING                       ║
╠═══════════════════════════════════════════╣
║                                           ║
║  You've created content since upgrade:    ║
║                                           ║
║  • 12 new notes                           ║
║  • 3 new categories                       ║
║  • 8 edited notes                         ║
║                                           ║
║  Rolling back will LOSE these changes.    ║
║                                           ║
║  RECOMMENDED: Download current data first ║
║  [Download Current Data as JSON]          ║
║                                           ║
║  Then rollback and manually re-add        ║
║  important new content.                   ║
║                                           ║
║     [Cancel]  [Download & Rollback]       ║
╚═══════════════════════════════════════════╝
```

---

## SECTION 5: IMPLEMENTATION PHASES (REVISED)

### Phase 0: Final Architecture Approval (Current)

**Tasks**:
- ✅ User reviews this document
- ❓ User answers remaining questions (Q1-Q8 in Section 2.2)
- ✅ User provides explicit approval to begin Phase 1
- ❌ NO IMPLEMENTATION YET

**Duration**: Awaiting user response

---

### Phase 1: Migration Infrastructure (FIRST)

**Tasks**:
1. Implement backup system
2. Implement migration algorithm (Section 3.2)
3. Implement rollback algorithm (Section 4.3)
4. Build migration UI (Section 3.3)
5. Write comprehensive tests
6. Test on copy of production data

**Deliverables**:
- Backup/restore functions
- Migration script with checkpoints
- Rollback script with verification
- Migration UI mockups
- Test results

**Duration**: 5-7 days

**Approval Checkpoint**: User reviews migration plan before proceeding

---

### Phase 2: Data Model Enhancement (FOUNDATION)

**Tasks**:
1. Add `category_node_id` field to note schema
2. Enhance category tree structure
3. Remove duplicate relationship tracking (no note_ids arrays)
4. Implement single-source-of-truth queries
5. Update storage service methods

**Deliverables**:
- Enhanced storageService.js
- Database schema documentation
- Unit tests for data layer

**Duration**: 4-6 days

---

### Phase 3: Two-Way Association Logic

**Tasks**:
1. Implement category_node_id assignment on note save
2. Implement tree-based category discovery
3. Update note move logic (change category_node_id)
4. Update category rename logic (preserve IDs)
5. Build category query functions

**Deliverables**:
- Note-category linking functions
- Category operations (rename, move, delete)
- Integration tests

**Duration**: 5-7 days

---

### Phase 4: Blue Plus (Create Note) UI

**Tasks**:
1. Add blue plus buttons to sub-levels
2. Wire blue plus to NoteModal with pre-set category_node_id
3. Ensure category_node_id saved on note creation
4. Update rendering to show notes from category queries

**Deliverables**:
- Blue plus button component
- Modified NoteModal
- End-to-end tests

**Duration**: 3-4 days

**Approval Checkpoint**: User tests two-way association working correctly

---

### Phase 5: Recursive Branch Storage

**Tasks**:
1. Add `category_branches` and `level_branches` to tree
2. Implement branch creation logic
3. Implement branch identifier generation
4. Add branch counter per-parent logic
5. Store branch metadata (type, parent, etc.)

**Deliverables**:
- Enhanced category tree structure
- Branch creation functions
- categoryBranchHelpers.js
- Storage tests

**Duration**: 5-7 days

---

### Phase 6: Green Plus (Create Branch) UI

**Tasks**:
1. Add green plus buttons to all M, SC, sub-levels
2. Wire green plus to branch creation flow
3. Implement accordion behavior (collapse, open, collapse)
4. Implement branch naming input
5. Play approved animation

**Deliverables**:
- Green plus button component
- Branch creation modal/inline editor
- Accordion state management
- UI tests

**Duration**: 4-6 days

---

### Phase 7: Branch Rendering

**Tasks**:
1. Build CategoryBranchNode component (recursive)
2. Display branch identifiers (L3 M1, M-SC1, etc.)
3. Transform sub-levels to accordions when branches added
4. Render branch sub-levels
5. Maintain display order (sub-levels before branches)

**Deliverables**:
- CategoryBranchNode.jsx
- Enhanced CategoryGroup.jsx
- Enhanced NestedSubGroup.jsx
- Rendering tests

**Duration**: 6-8 days

---

### Phase 8: Integration & Polish

**Tasks**:
1. Search integration (categories + branches + notes)
2. Category deletion with warnings
3. Move/rename cascade updates
4. Empty category display
5. Performance optimization
6. Comprehensive regression testing

**Deliverables**:
- Complete feature set
- All test suites passing
- Performance benchmarks
- User documentation

**Duration**: 5-7 days

**Final Approval Checkpoint**: User acceptance testing

---

### Phase 9: Migration Execution

**Tasks**:
1. User triggers migration
2. Monitor migration progress
3. Validate results
4. Provide rollback option
5. Archive backup

**Duration**: 5-10 minutes (user-facing)

---

**TOTAL ESTIMATED**: 37-52 development days (7-10 weeks)

**CRITICAL PATH**: Cannot skip Phase 1-4. Must validate foundation before Phase 5-8.

---

## SECTION 6: FILES REQUIRING MODIFICATION

### 6.1 Storage Layer

**storageService.js** (+400 lines)
- Enhanced `category_tree` structure
- Add category_node_id handling
- Remove note_ids tracking (single source of truth)
- New methods:
  - `addCategoryBranch(parentId, branchName, branchType)`
  - `addLevelBranch(parentId, level, branchName)`
  - `getCategoryById(categoryId)`
  - `getCategoryPath(categoryId)` (traverse tree)
  - `getNotesByCategory(categoryId)` (query notes)
  - `updateCategoryName(categoryId, newName)`
  - `deleteCategoryWithPrompt(categoryId)`

**backupService.js** (NEW, ~300 lines)
- `createBackup()`
- `restoreBackup(backupId)`
- `validateBackup(backup)`
- `listBackups()`
- `deleteBackup(backupId)`

**migrationService.js** (NEW, ~500 lines)
- `performMigration()`
- `buildEnhancedCategoryTree()`
- `linkNotesToCategories()`
- `validateMigration()`
- `rollbackMigration()`

---

### 6.2 UI Components

**CategoryGroup.jsx** (+250 lines)
- Add green plus button
- Add blue plus button to sub-levels
- Display category branches
- Transform sub-levels to accordions
- Wire branch creation handlers

**NestedSubGroup.jsx** (+250 lines)
- Add green plus button
- Add blue plus button
- Detect branches beneath sub-level
- Transform to accordion when needed
- Recursive branch rendering

**NotesApp.jsx** (+150 lines)
- Load category tree for rendering
- Manage branch accordion state
- Handle empty category display
- Pass tree to components

**NoteModal.jsx** (+80 lines)
- Accept `category_node_id` prop
- Set category_node_id on save
- Query category path from ID
- Display category path from tree

---

### 6.3 New Components

**CategoryBranchNode.jsx** (NEW, ~450 lines)
- Recursive component for branches
- Display branch identifiers
- Independent accordion per branch
- Green plus (sub-branch)
- Blue plus on branch's sub-levels
- Recursive rendering of nested branches

**TwoButtonControl.jsx** (NEW, ~120 lines)
- Green plus button
- Blue plus button
- Tooltip management
- Click handlers

**MigrationWizard.jsx** (NEW, ~400 lines)
- Migration UI
- Progress display
- Error handling
- Rollback interface

**categoryBranchHelpers.js** (NEW, ~350 lines)
- `generateBranchIdentifier(parent, type, counter)`
- `findCategoryById(tree, id)`
- `getChildBranches(category)`
- `getCategoryPathFromId(tree, id)`
- `validateBranchStructure(branch)`

---

### 6.4 Files NOT Modified

**Preserved (no changes)**:
- All note content rendering
- All attachment handling
- All 205 gallery images
- All theme/styling files (CSS unchanged)
- All existing animations
- NoteCard.jsx
- NoteTile.jsx
- All modal components (except NoteModal)

---

## SECTION 7: TESTING STRATEGY

### 7.1 Migration Testing

**Test Suite: Migration**

**Test M.1**: Backup Creation
- Create backup of 500+ notes
- Verify backup size reasonable
- Verify backup contains all data
- Verify backup downloadable

**Test M.2**: Migration Execution
- Run migration on test dataset
- Verify all notes get category_node_id
- Verify no data loss
- Verify category tree enhanced

**Test M.3**: Migration Validation
- Check all notes linked correctly
- Check no orphaned notes
- Check category path consistency
- Check no broken links

**Test M.4**: Rollback Success
- Perform rollback
- Verify data restored exactly
- Verify note count matches
- Verify categories restored

**Test M.5**: Rollback After Changes
- Migrate
- Create new notes
- Rollback
- Verify warning shown
- Verify old data restored

**Test M.6**: Migration Interruption
- Start migration
- Simulate browser close
- Reopen
- Verify resume offered
- Complete migration

**Test M.7**: Migration with Invalid Data
- Notes with empty category_path
- Notes with non-existent categories
- Malformed note objects
- Verify migration handles gracefully

---

### 7.2 Two-Way Association Testing

**Test Suite: Association**

**Test A.1**: Note Creation with Blue Plus
- Click blue plus on L2
- Create note
- Verify category_node_id set to L2's ID
- Verify note appears under L2

**Test A.2**: Note Move Between Categories
- Move note from Kitchen L1 to Garden L2
- Verify category_node_id updated
- Verify note appears under Garden L2
- Verify removed from Kitchen L1

**Test A.3**: Category Rename Cascades
- Rename "Kitchen" to "Cooking"
- Verify all notes under Kitchen still linked (by ID)
- Verify display path updated to "Cooking"

**Test A.4**: Empty Category Display
- Create category with no notes
- Verify category visible in UI
- Click blue plus on sub-level
- Create note
- Verify category now has note

**Test A.5**: Query Notes by Category
- Category has 10 notes
- Query: `getNotesByCategory(categoryId)`
- Verify returns all 10 notes
- Verify performance acceptable

---

### 7.3 Recursive Branch Testing

**Test Suite: Branches**

**Test B.1**: Create SC Beneath Main
- Click green plus on Kitchen M
- Create "M-SC1: Pantry"
- Verify identifier correct
- Verify Kitchen collapses
- Verify Pantry opens during creation
- Verify Pantry collapses after naming

**Test B.2**: Create Branch Beneath L3
- Note with path: M → L1 → L2 → L3 → L4
- Click green plus on L3
- Create "L3 M1: Branch"
- Verify L3 becomes accordion
- Verify L3 keeps "L3" designation
- Verify L4 unchanged
- Verify branch appears under L3

**Test B.3**: Multiple Branches Same Parent
- Create M-SC1, M-SC2, M-SC3 beneath Kitchen
- Verify counters: 1, 2, 3
- Create M-SC1 beneath Garden
- Verify counter resets to 1

**Test B.4**: Nested Branches (6 levels)
- M → M-SC1 → SC-Sc1 → Sc-sc1 → sc-sc1 → sc-sc1
- Verify all identifiers correct
- Verify all accordions work
- Verify unlimited depth supported

**Test B.5**: Sub-Level Accordion Transformation
- L3 has no branches (plain text)
- Create L3 M1
- Verify L3 becomes accordion
- Verify L3 sub-levels (L4, L5) preserved
- Verify branch renders correctly

**Test B.6**: Display Order
- Kitchen with: L1, L2, L3, M-SC1, M-SC2
- Verify order: Direct notes → L1 → L2 → L3 → M-SC1 → M-SC2

---

### 7.4 Integration Testing

**Test Suite: Integration**

**Test I.1**: Create Note in Branch Sub-Level
- Create branch: Kitchen → M-SC1: Pantry → L1: Canned
- Click blue plus on "L1: Canned"
- Create note
- Verify note's category_node_id points to Canned
- Verify note appears under Pantry → Canned

**Test I.2**: Search Across Everything
- Search "bread"
- Verify finds:
  - Category names containing "bread"
  - Branch names containing "bread"
  - Sub-level names containing "bread"
  - Note titles containing "bread"
  - Note content containing "bread"

**Test I.3**: Delete Category with Notes
- Pantry has 5 notes
- Click delete on Pantry
- Verify warning shown
- Select "Move to parent"
- Verify notes moved to Kitchen
- Verify Pantry deleted

**Test I.4**: Delete Branch with Sub-Branches
- Kitchen → M-SC1: Pantry → SC-Sc1: Canned
- Delete Pantry
- Verify warning about sub-branches
- Confirm deletion
- Verify Pantry and Canned both deleted

**Test I.5**: Offline Operation
- Go offline
- Create notes with blue plus
- Create branches with green plus
- Go online
- Verify all changes persisted

---

### 7.5 Regression Testing

**Test Suite: Existing Functionality**

**Test R.1**: Note Editor Sub-Levels
- Create note in note editor
- Add M → L1 → L2 → L3 path manually
- Save
- Verify category_node_id assigned
- Verify sub-levels render correctly

**Test R.2**: Note Discovery
- Create notes with various paths
- Verify all notes discovered
- Verify grouping by category
- Verify sub-level nesting

**Test R.3**: Pinned Notes
- Pin notes
- Verify appear in pinned rail
- Verify not duplicated in categories

**Test R.4**: Note Drag & Drop
- Drag note between categories
- Verify category_node_id updated
- Verify note appears in new location

**Test R.5**: Export/Import
- Export notes to JSON
- Clear database
- Import notes
- Verify all data restored
- Verify categories recreated

---

## SECTION 8: RISK MITIGATION

### 8.1 Data Loss Prevention

**Risk**: Migration fails, data corrupted

**Mitigation**:
- ✅ Full backup before migration
- ✅ Checkpointed migration (resume if interrupted)
- ✅ Validation after migration
- ✅ 7-day rollback window
- ✅ User can download backup externally
- ✅ Migration log for forensics

**Contingency**: If all else fails, user has backup JSON to manually restore

---

### 8.2 Performance Degradation

**Risk**: Tree-based rendering slower than discovery

**Mitigation**:
- ✅ Cache tree in memory
- ✅ Index notes by category_node_id in IndexedDB
- ✅ Lazy load collapsed branches
- ✅ Virtual scrolling for large lists
- ✅ Benchmark before/after

**Target**: Rendering time < 100ms for 500 notes, 50 categories

---

### 8.3 User Confusion

**Risk**: Users don't understand two plus buttons

**Mitigation**:
- ✅ Clear tooltips: "Create category" vs. "Create note here"
- ✅ Different colors (green vs. blue)
- ✅ Onboarding tutorial after migration
- ✅ Help documentation
- ✅ Visual examples in UI

---

### 8.4 Synchronization Bugs

**Risk**: category_node_id gets out of sync

**Mitigation**:
- ✅ Single source of truth (no duplicate tracking)
- ✅ Validation on app load (repair broken links)
- ✅ Comprehensive tests
- ✅ Defensive coding (handle null gracefully)

---

### 8.5 Migration Failure

**Risk**: Migration stops midway, database in inconsistent state

**Mitigation**:
- ✅ Checkpoint system (resume from last successful phase)
- ✅ Detection on load: "Incomplete migration detected"
- ✅ Automatic offer to resume or rollback
- ✅ Manual recovery option (download + reimport)

---

## SECTION 9: FINAL CHECKLIST

### 9.1 Before Implementation Begins

- [ ] User answers Q1-Q8 (Section 2.2)
- [ ] User approves migration strategy (Section 3)
- [ ] User approves rollback strategy (Section 4)
- [ ] User approves implementation phases (Section 5)
- [ ] User provides explicit authorization: "Begin Phase 1"

---

### 9.2 Before Phase 4 (Two-Way Association Validation)

- [ ] Migration tested on copy of production data
- [ ] Rollback tested successfully
- [ ] All notes linked correctly
- [ ] Performance acceptable
- [ ] User approves continuing to recursive branches

---

### 9.3 Before Phase 9 (Production Migration)

- [ ] All test suites passing
- [ ] User acceptance testing complete
- [ ] Migration UI reviewed and approved
- [ ] Rollback procedure verified
- [ ] Backup system tested
- [ ] User provides explicit authorization: "Run production migration"

---

## SECTION 10: SUMMARY OF CORRECTIONS

### What Changed from Previous Version

1. ✅ **Blue plus placement**: Only on sub-levels, NOT category headers
2. ✅ **Single source of truth**: Removed note_ids arrays, use category_node_id only
3. ✅ **Identifier conventions**: Confirmed exact formats (L4 M1, M-SC1, SC-Sc1)
4. ✅ **Branch counters**: Per-parent (decided)
5. ✅ **Sub-level accordion**: Only when branch created (decided)
6. ✅ **Styling**: Preserve existing green/blue, animations (decided)
7. ✅ **Category deletion**: Never cascade silently (decided)
8. ✅ **Search scope**: Include everything (decided)
9. ✅ **Migration preservation**: All existing data preserved (decided)

### Decisions Still Needed (8 Questions)

See Section 2.2 for Q1-Q8 requiring user input.

---

## 🛑 DOCUMENT COMPLETE — AWAITING FINAL APPROVAL

**Status**: ✅ REVISED ARCHITECTURE COMPLETE  
**Corrections**: ✅ ALL INCORPORATED  
**Code Changes**: ❌ NONE (Architecture only)  
**Next Step**: USER FINAL REVIEW & EXPLICIT AUTHORIZATION

---

**This document supersedes**:
- Previous consolidated architecture
- All earlier specifications
- Any conflicting information

**This is the FINAL architectural specification** for implementation.

---

**END OF REVISED SPECIFICATION**

---

## 🎯 FINAL ARCHITECTURAL SPECIFICATION — COMPLETE

### All Decisions Finalized

**16 Core Decisions**: ✅ ALL DECIDED
- Plus button placement, icons, styling
- Empty category display
- Category renaming (preserve existing)
- Animations (preserve existing)
- Single source of truth (category_node_id)
- Identifier conventions (L4 M1, M-SC1, SC-Sc1)
- Branch counters (per-parent)
- Sub-level accordions (transform when needed)
- Migration timing (user-triggered wizard)
- Rollback (7 days + downloadable forever)
- Conflict resolution (flag for review)
- Branch deletion (block until emptied)
- Search scope (everything)
- Data preservation (comprehensive)

**8 Open Questions**: ✅ ALL ANSWERED
1. Blue plus icon → Blue plus symbol, matching green
2. Empty categories → Display all, always visible
3. Renaming → Preserve existing editing behavior
4. Animation → Preserve existing animations
5. Migration → User-triggered wizard
6. Rollback → 7 days minimum + downloadable backup
7. Conflicts → Flag for review, never auto-resolve
8. Deletion → Block until contents relocated

**Additional Safeguards**: ✅ COMPREHENSIVE
- Pre-commit validation (8-point checklist)
- Conflict detection and resolution UI
- Migration report generation
- Interruption and safe resumption
- Critical failure = stop without modifying data
- All existing data preservation verified

---

### Authorization Status

**✅ AUTHORIZED**:
- Complete architectural specification
- Finalize documentation
- Answer all design questions

**❌ NOT AUTHORIZED**:
- Writing code
- Modifying CSS
- Running migration
- Publishing changes
- Modifying live application

---

### Next Steps

**For Implementation Authorization**:
User must provide explicit written statement:
"I authorize implementation of Phase 1 (Migration Infrastructure) as specified in REVISED_CONSOLIDATED_ARCHITECTURE_FINAL.md version 3.0"

**Required Before Phase 1**:
- ✅ All decisions finalized (COMPLETE)
- ✅ Migration strategy approved (COMPLETE)
- ✅ Rollback strategy approved (COMPLETE)
- ✅ Safeguards documented (COMPLETE)
- ❓ User provides implementation authorization (PENDING)

---

### Document Version

**Version**: 3.0 FINAL  
**Date**: November 4, 2026  
**Status**: All decisions incorporated, ready for implementation authorization  
**Supersedes**: All previous architecture documents

---

**This is the authoritative specification for Iron Rabbit's Two-Way Association and Recursive Category Branches architecture.**

**END OF SPECIFICATION**
