# 🔍 IRON RABBIT ARCHITECTURE REVIEW — REVISED
## Universal Hierarchy System — Version 3.2 FINAL
## Response to User Clarifications

**Date**: December 2025  
**Document Status**: Revised per User Instructions  
**Implementation Status**: ❌ Not Started (Awaiting Authorization)  
**IRON RABBIT BOUNDARY**: ✅ ACTIVE — No code changes, no CSS, no data modifications

---

## 📌 DOCUMENT STRUCTURE

This review is organized into three distinct sections:

### SECTION A: LOCKED DECISIONS (Previously Approved)
Architectural decisions already finalized. **Not reopened as questions.**

### SECTION B: INVESTIGATIONS & RECOMMENDATIONS (New Analysis)
Analysis of legacy fields and rollback scenarios per user instructions.

### SECTION C: GENUINE OPEN QUESTIONS (Requiring User Decision)
Only items that genuinely require new user input.

---

# SECTION A: LOCKED DECISIONS
## ✅ Previously Approved — Not Reopened

The following architectural decisions have been approved and are **not subject to revision**:

### A.1 Identifier Uniqueness
**LOCKED**: Compact identifiers (e.g., `M-Sc1`) may repeat across different branches.  
**Rationale**: Permanent internal IDs (`cat-uuid-001`) uniquely identify categories. Compact identifiers are display references only, shown with sufficient context (breadcrumbs, full paths) to distinguish duplicates.

### A.2 Hierarchy Depth
**LOCKED**: Hierarchy nesting must be unlimited architecturally.  
**Rationale**: System must support any depth. No artificial limits imposed.  
**Note**: `l4,078` means ordinary sub-level **number** 4,078, not 4,078 levels of nesting depth.

### A.3 Empty Category Visibility
**LOCKED**: Empty categories must always remain visible.  
**Rationale**: Users see complete organizational structure. "Create note here" works before notes exist. Categories aren't hidden just because they're empty.

### A.4 Migration Timing
**LOCKED**: Migration must be explicitly initiated by the user.  
**Rule**: Never silently run at first application load. User decides when to migrate.

### A.5 Button Definitions
**LOCKED**: 
- **Green Plus**: Creates category branches (appears on M, SC, Sc, l)
- **Blue Plus**: Creates notes (appears only on ordinary sub-levels, NOT on category headers)

### A.6 Type Code Definitions
**LOCKED**: M, SC, Sc, l, and B retain their approved meanings and exact capitalization.

| Symbol | Meaning | Parent Type | Capitalization Rule |
|--------|---------|-------------|---------------------|
| M | Main Category | (root) | Always capital |
| SC | Subcategory beneath Main | M | Capital C (directly beneath Main) |
| Sc | Subcategory beneath Subcategory | SC or Sc | Lowercase c (nested) |
| l | Ordinary sub-level | Any | Lowercase l |
| B | Branch beneath sub-level | M | Capital B |

**Never**: Convert SC ↔ Sc, normalize capitalization, or treat as equivalent.

### A.7 Single Source of Truth
**LOCKED**: `category_node_id` is the ONLY stored relationship between notes and categories.  
**Rule**: Notes discovered by querying `WHERE category_node_id = X`, not by maintaining dual arrays.

### A.8 Button Styling
**LOCKED**: 
- Green Plus: Existing approved green from theme
- Blue Plus: Existing approved blue from theme, same size/style as green
- Preserve all existing styling conventions, colors, animations

### A.9 All Other Finalized Decisions
See Version 3.2 FINAL document for complete list of 16 decisions.

**These decisions are closed and will not be reopened during this review.**

---

# SECTION B: INVESTIGATIONS & RECOMMENDATIONS
## 🔬 New Analysis Per User Instructions

---

## B.1 LEGACY FIELDS — COMPATIBILITY INVESTIGATION

### Current Specification Review

The Version 3.2 architecture specifies:

```javascript
{
  id: "note-123",
  title: "Sourdough Recipe",
  
  // PRIMARY RELATIONSHIP (Single source of truth)
  category_node_id: "cat-baking-l1-breads",
  
  // LEGACY FIELDS (For compatibility only)
  category: "Kitchen",
  subcategory: "Recipes",
  category_path: ["Kitchen", "Recipes", "Baking", "Breads"]
}
```

**Specification states**:
- ✅ Legacy fields preserved during migration
- ✅ Legacy fields kept for "compatibility" and "display"
- ✅ `category_node_id` is ONLY source of truth
- ⚠️ **Unclear**: Read-only status, consistency verification, retention period, removal validation

---

### Compatibility Implications Analysis

#### Scenario 1: Code Still Reading Legacy Fields
**Risk**: Existing code may read `category` or `category_path` instead of querying from `category_node_id`.

**Implications**:
- If legacy fields become stale (not updated), old code shows incorrect data
- If legacy fields removed, old code breaks
- Dual maintenance burden if both must stay in sync

**Recommendation**: Retain as **read-only legacy fields** during compatibility period.

---

#### Scenario 2: User Moves Note to Different Category
**Current flow** (post-migration):
1. User moves note from "Kitchen" to "Garden"
2. System updates `category_node_id` to point to Garden's ID
3. **Question**: Do we also update legacy `category` field?

**Option A: Keep Legacy Fields Synchronized**
```javascript
async function moveNote(noteId, newCategoryId) {
  const note = await getNote(noteId);
  const newCategory = await getCategoryById(newCategoryId);
  
  // Update primary relationship
  note.category_node_id = newCategoryId;
  
  // ALSO update legacy fields (keep synchronized)
  const newPath = getCategoryPath(newCategoryId);
  note.category = newPath[0] || "";
  note.subcategory = newPath[1] || "";
  note.category_path = newPath;
  
  await saveNote(note);
}
```

**Pros**:
- Legacy fields always accurate
- Old code continues to work correctly
- No user confusion

**Cons**:
- Dual writes (maintenance burden)
- Performance cost (tree traversal on every move)
- Delayed removal (fields can't be removed while still updated)

---

**Option B: Make Legacy Fields Read-Only (Frozen at Migration)**
```javascript
async function moveNote(noteId, newCategoryId) {
  const note = await getNote(noteId);
  
  // Update ONLY primary relationship
  note.category_node_id = newCategoryId;
  
  // Legacy fields NOT updated (frozen at migration snapshot)
  // note.category_path stays ["Kitchen", "Recipes", "Baking"]
  // even though note now in Garden
  
  await saveNote(note);
}
```

**Pros**:
- No dual writes
- Clear signal: legacy fields are deprecated
- Simplifies code

**Cons**:
- Legacy fields become stale immediately after first move
- Old code shows incorrect categories
- User confusion if viewing via old interface

---

**Option C: Generate Legacy Fields On-Demand (Computed Property)**
```javascript
// Legacy fields not stored in database
// Generated when note retrieved

async function getNote(noteId) {
  const note = await db.notes.get(noteId);
  
  if (note.category_node_id) {
    // Compute legacy fields from tree traversal
    const path = getCategoryPath(note.category_node_id);
    
    note.category = path[0] || "";
    note.subcategory = path[1] || "";
    note.category_path = path;
  }
  
  return note;
}
```

**Pros**:
- Always accurate (computed from source of truth)
- No dual writes
- No storage overhead
- Can be removed by simply stopping computation

**Cons**:
- Performance cost (tree traversal on every note load)
- Computed fields may not behave identically to stored fields in all contexts

---

### Recommended Approach: Hybrid Strategy

**Phase 1: Migration (Immediate)**
- ✅ Keep all three legacy fields: `category`, `subcategory`, `category_path`
- ✅ Populate during migration from existing data
- ✅ Mark as **read-only** (not updated by new code)
- ✅ Document clearly: "Legacy fields frozen at migration. Use `category_node_id` for current category."

**Phase 2: Compatibility Period (6-12 months)**
- ✅ Legacy fields remain in database (frozen snapshot)
- ✅ New code reads ONLY from `category_node_id` + tree traversal
- ✅ Display current path by traversing tree from `category_node_id`
- ✅ Validation: On app load, spot-check that computed paths match stored paths for unmoved notes

**Phase 3: Deprecation Warning (After 6+ months)**
- ✅ App shows warning: "Legacy category fields will be removed in next version"
- ✅ User downloads full backup
- ✅ Validation: Confirm no code still reading legacy fields

**Phase 4: Removal (After 12+ months, explicit user approval)**
- ✅ Remove `category`, `subcategory`, `category_path` fields from notes
- ✅ All code uses tree traversal
- ✅ Pre-removal validation: Verify all notes have valid `category_node_id`

---

### Consistency Verification Strategy

**Verification 1: At Migration Completion**
```javascript
async function verifyLegacyFieldConsistency() {
  const allNotes = await getAllNotes();
  const errors = [];
  
  for (const note of allNotes) {
    if (!note.category_node_id) continue;
    
    // Compute path from category_node_id
    const computedPath = getCategoryPath(note.category_node_id);
    
    // Compare with stored legacy path
    const storedPath = note.category_path || [];
    
    if (JSON.stringify(computedPath) !== JSON.stringify(storedPath)) {
      errors.push({
        noteId: note.id,
        noteTitle: note.title,
        stored: storedPath,
        computed: computedPath
      });
    }
  }
  
  return {
    totalChecked: allNotes.length,
    mismatches: errors.length,
    errors: errors
  };
}
```

**Run at**:
- ✅ End of migration (before marking complete)
- ✅ On app load (spot-check random sample)
- ✅ Before legacy field removal

---

**Verification 2: Ongoing Spot-Check (Post-Migration)**
```javascript
async function spotCheckLegacyFields() {
  const allNotes = await getAllNotes();
  
  // Check 10 random notes
  const sample = allNotes.sort(() => 0.5 - Math.random()).slice(0, 10);
  
  for (const note of sample) {
    if (!note.category_node_id) continue;
    
    // Verify category_node_id resolves to valid category
    const category = await getCategoryById(note.category_node_id);
    if (!category) {
      console.warn(`Orphaned note: ${note.id} points to non-existent category ${note.category_node_id}`);
    }
  }
}

// Run on app initialization
```

---

### Retention Period Recommendation

**Minimum Retention**: 12 months

**Rationale**:
- Users may not notice issues immediately
- Rollback window (7 days) too short for long-term compatibility
- Some users may use app infrequently (monthly access)
- Provides buffer for unforeseen compatibility issues

**Milestone-Based Removal**:
1. ✅ 0-6 months: Full compatibility period (no warnings)
2. ✅ 6-9 months: Deprecation warnings shown
3. ✅ 9-12 months: Final warnings + download backup prompt
4. ✅ 12+ months: Eligible for removal (requires explicit user approval)

---

### Validation Before Removal

**Pre-Removal Validation Checklist**:

1. ✅ **Data Integrity**: All notes have valid `category_node_id`
2. ✅ **Orphan Detection**: No notes point to deleted categories
3. ✅ **Code Audit**: No remaining code reads legacy fields
4. ✅ **Backup Created**: User has downloaded full backup
5. ✅ **User Approval**: Explicit authorization to remove fields
6. ✅ **Rollback Plan**: Legacy fields archived for manual restoration if needed

**Validation Script**:
```javascript
async function validateReadyForLegacyFieldRemoval() {
  const validation = {
    passed: true,
    errors: [],
    warnings: []
  };
  
  // Check 1: All notes have category_node_id
  const allNotes = await getAllNotes();
  const notesWithoutId = allNotes.filter(n => 
    n.category_path && n.category_path.length > 0 && !n.category_node_id
  );
  
  if (notesWithoutId.length > 0) {
    validation.passed = false;
    validation.errors.push(`${notesWithoutId.length} notes missing category_node_id`);
  }
  
  // Check 2: All category_node_ids resolve
  const orphaned = [];
  for (const note of allNotes) {
    if (note.category_node_id) {
      const category = await getCategoryById(note.category_node_id);
      if (!category) {
        orphaned.push(note.id);
      }
    }
  }
  
  if (orphaned.length > 0) {
    validation.passed = false;
    validation.errors.push(`${orphaned.length} notes point to deleted categories`);
  }
  
  // Check 3: Backup exists
  const backup = await getLatestBackup();
  if (!backup) {
    validation.warnings.push('No recent backup found. User should download backup before removal.');
  }
  
  return validation;
}
```

**If validation fails**: Do NOT remove fields. Fix issues first.

---

### Summary: Legacy Fields Recommendation

**RECOMMENDATION**: ✅ Retain legacy fields as read-only for 12+ months

| Field | Status | Updated After Migration? | Removal Timeline |
|-------|--------|-------------------------|------------------|
| `category_node_id` | **PRIMARY** | ✅ Always (source of truth) | Never (permanent) |
| `category` | Legacy | ❌ No (frozen at migration) | 12+ months |
| `subcategory` | Legacy | ❌ No (frozen at migration) | 12+ months |
| `category_path` | Legacy | ❌ No (frozen at migration) | 12+ months |

**Key Points**:
1. ✅ Keep during migration and compatibility period
2. ✅ Mark as read-only (not updated by new code)
3. ✅ Verify consistency at migration completion
4. ✅ Spot-check ongoing (detect orphaned notes)
5. ✅ Retain for 12+ months minimum
6. ✅ Validate before removal (5-point checklist)
7. ✅ Require explicit user approval for removal

---

## B.2 ROLLBACK WITH NEW DATA — INVESTIGATION

### Problem Statement

**Scenario**:
1. User completes migration successfully
2. User creates 50 new notes over several days
3. User decides to rollback to pre-migration state
4. **Current spec**: Warns user, offers download, then deletes 50 notes

**User Requirement**: Rollback must NOT silently delete those 50 notes.

---

### Current Rollback Behavior Analysis

**From Version 3.2 specification** (Section 4.6):

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

**Issues with current approach**:
1. ❌ User must manually download before rollback
2. ❌ User must manually re-import after rollback
3. ❌ Notes can be lost if user forgets to download
4. ❌ No automatic preservation
5. ❌ No reconciliation attempt

---

### Enhanced Rollback Strategy: Preserve New Data

**Principle**: Never silently delete user-created content. Always preserve.

---

#### Enhanced Algorithm: Smart Rollback with Data Preservation

**Phase 1: Detect New/Modified Content**
```javascript
async function detectPostMigrationChanges(migrationTimestamp) {
  const allNotes = await getAllNotes();
  const backup = await getMigrationBackup();
  const backupNoteIds = new Set(backup.notes.map(n => n.id));
  
  const changes = {
    newNotes: [],        // Created after migration
    editedNotes: [],     // Modified after migration
    deletedNotes: [],    // Existed before, deleted after
    newCategories: [],   // Created after migration
    categoryChanges: []  // Notes moved between categories
  };
  
  // Detect new notes
  for (const note of allNotes) {
    if (!backupNoteIds.has(note.id)) {
      changes.newNotes.push(note);
    } else {
      // Check if edited
      const backupNote = backup.notes.find(n => n.id === note.id);
      if (note.updated_at > migrationTimestamp) {
        changes.editedNotes.push({
          current: note,
          backup: backupNote
        });
      }
      
      // Check if category changed
      if (note.category_node_id !== backupNote.category_node_id) {
        changes.categoryChanges.push({
          noteId: note.id,
          oldCategory: backupNote.category_node_id,
          newCategory: note.category_node_id
        });
      }
    }
  }
  
  // Detect deleted notes
  for (const backupNote of backup.notes) {
    const currentNote = allNotes.find(n => n.id === backupNote.id);
    if (!currentNote) {
      changes.deletedNotes.push(backupNote);
    }
  }
  
  return changes;
}
```

---

**Phase 2: Preservation Strategy Options**

**Option A: Automatic Preservation in "Post-Migration" Category**
```javascript
async function rollbackWithPreservation(backup, changes) {
  // Step 1: Create special category in backup data
  const preservationCategory = {
    id: "cat-post-migration-preserved",
    name: "📦 Preserved from New System",
    type: "M",
    created_at: new Date().toISOString()
  };
  
  // Step 2: Map new notes to preservation category
  for (const newNote of changes.newNotes) {
    // Convert category_node_id to old category_path format
    const preservedNote = {
      ...newNote,
      category_path: ["📦 Preserved from New System"],
      category: "📦 Preserved from New System",
      subcategory: ""
    };
    
    backup.notes.push(preservedNote);
  }
  
  // Step 3: Preserve edited notes in separate category
  for (const edited of changes.editedNotes) {
    const preservedEdit = {
      ...edited.current,
      id: `${edited.current.id}-edited`,  // New ID to avoid conflict
      title: `${edited.current.title} (Edited Version)`,
      category_path: ["📦 Preserved from New System", "Edited Notes"],
      category: "📦 Preserved from New System",
      subcategory: "Edited Notes"
    };
    
    backup.notes.push(preservedEdit);
  }
  
  // Step 4: Add preservation category to tree
  backup.settings.category_tree["📦 Preserved from New System"] = preservationCategory;
  
  // Step 5: Restore backup (now includes new notes)
  await restoreBackup(backup);
  
  return {
    success: true,
    preservedNotes: changes.newNotes.length,
    preservedEdits: changes.editedNotes.length
  };
}
```

**Result**: User sees:
```
📦 Preserved from New System
├─ (50 new notes here)
└─ Edited Notes
   └─ (8 edited versions here)
```

**Pros**:
- ✅ No data loss
- ✅ User doesn't need to remember to download
- ✅ Automatic preservation
- ✅ Clear visual distinction (emoji + folder name)

**Cons**:
- ⚠️ New notes lose their category associations (all dumped in one folder)
- ⚠️ User must manually re-categorize
- ⚠️ Edited notes duplicated (original + edited version both exist)

---

**Option B: Preservation Archive + Manual Reconciliation**
```javascript
async function rollbackWithArchive(backup, changes) {
  // Step 1: Create preservation archive (separate JSON file)
  const preservationArchive = {
    timestamp: new Date().toISOString(),
    description: "Notes created/edited after migration",
    newNotes: changes.newNotes,
    editedNotes: changes.editedNotes.map(e => e.current),
    deletedNotes: changes.deletedNotes,
    categoryChanges: changes.categoryChanges
  };
  
  // Step 2: Store archive in IndexedDB (separate store)
  await db.preservation_archives.add(preservationArchive);
  
  // Step 3: Offer download
  const downloadUrl = createDownloadLink(preservationArchive);
  
  // Step 4: Restore backup (WITHOUT new notes)
  await restoreBackup(backup);
  
  // Step 5: Show reconciliation UI
  return {
    success: true,
    archiveId: preservationArchive.timestamp,
    downloadUrl: downloadUrl,
    requiresReconciliation: true
  };
}
```

**Post-Rollback UI**:
```
╔═══════════════════════════════════════════╗
║  ROLLBACK COMPLETE WITH PRESERVATION      ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Your data has been restored.             ║
║                                           ║
║  📦 PRESERVED CONTENT:                    ║
║  • 50 new notes                           ║
║  • 8 edited notes                         ║
║                                           ║
║  These notes are saved in a separate      ║
║  archive and can be re-imported.          ║
║                                           ║
║  [Download Preservation Archive]          ║
║  [Re-Import Preserved Notes]              ║
║  [Review Changes First]                   ║
║                                           ║
║               [Continue]                  ║
╚═══════════════════════════════════════════╝
```

**Pros**:
- ✅ No data loss
- ✅ User has explicit control over re-import
- ✅ Can review preserved content before re-adding
- ✅ Avoids clutter in main app

**Cons**:
- ⚠️ Requires user action (re-import)
- ⚠️ Preserved notes not immediately visible
- ⚠️ Multi-step process

---

**Option C: Block Rollback if Significant New Data Exists**
```javascript
async function attemptRollback(backup) {
  const changes = await detectPostMigrationChanges(backup.timestamp);
  
  const significantThreshold = {
    newNotes: 10,
    editedNotes: 20,
    categoryChanges: 50
  };
  
  const isSignificant = 
    changes.newNotes.length > significantThreshold.newNotes ||
    changes.editedNotes.length > significantThreshold.editedNotes ||
    changes.categoryChanges.length > significantThreshold.categoryChanges;
  
  if (isSignificant) {
    return {
      blocked: true,
      reason: 'significant_new_data',
      changes: changes,
      recommendation: 'Too much new data created. Rollback would cause data loss. Please export current data and start fresh if needed.'
    };
  }
  
  // Proceed with rollback (small changes can be manually recreated)
  return await rollbackWithWarning(backup, changes);
}
```

**UI**:
```
╔═══════════════════════════════════════════╗
║  ⛔ ROLLBACK BLOCKED                       ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Too much content created since upgrade:  ║
║                                           ║
║  • 50 new notes                           ║
║  • 15 edited notes                        ║
║  • 37 category changes                    ║
║                                           ║
║  Rolling back would cause significant     ║
║  data loss.                               ║
║                                           ║
║  RECOMMENDED OPTIONS:                     ║
║                                           ║
║  1. Continue using new system             ║
║  2. Export all data, clear app, manually  ║
║     restore old backup                    ║
║                                           ║
║  Automatic rollback is not safe.          ║
║                                           ║
║               [Close]                     ║
╚═══════════════════════════════════════════╝
```

**Pros**:
- ✅ Prevents accidental data loss
- ✅ Forces user to think about implications
- ✅ Clear "point of no return"

**Cons**:
- ❌ User cannot rollback even if they want to
- ❌ May frustrate users who understand the consequences
- ❌ Threshold values arbitrary

---

### Recommended Approach: Hybrid Preservation + User Choice

**Combined strategy**:

1. **Detect Changes**: Always analyze post-migration changes
2. **Automatic Preservation**: Create preservation archive in IndexedDB
3. **User Choice**: Offer three rollback options

**Enhanced Rollback UI**:
```
╔═══════════════════════════════════════════╗
║  ROLLBACK WITH DATA PRESERVATION          ║
╠═══════════════════════════════════════════╣
║                                           ║
║  You've created content since upgrade:    ║
║                                           ║
║  • 50 new notes                           ║
║  • 3 new categories                       ║
║  • 8 edited notes                         ║
║                                           ║
║  CHOOSE ROLLBACK METHOD:                  ║
║                                           ║
║  1. ✅ Rollback + Auto-Preserve           ║
║     Restored system will include a        ║
║     "📦 Preserved" folder with new notes. ║
║     You can re-categorize them later.     ║
║                                           ║
║  2. 📦 Rollback + Archive                 ║
║     New notes saved in separate archive.  ║
║     You can re-import them manually.      ║
║                                           ║
║  3. ⚠️ Rollback + Discard                 ║
║     New notes will be LOST.               ║
║     (Requires explicit confirmation)      ║
║                                           ║
║  [Download Full Current Data First]       ║
║                                           ║
║          [Cancel]  [Choose Method]        ║
╚═══════════════════════════════════════════╝
```

**Option 1 Flow** (Auto-Preserve — RECOMMENDED):
1. Create "📦 Preserved from New System" category in backup
2. Add all 50 new notes to preservation category
3. Add edited versions to "Edited Notes" subcategory
4. Restore backup (now includes preserved content)
5. User sees preserved notes in special folder

**Option 2 Flow** (Archive):
1. Create preservation archive in IndexedDB
2. Offer download link for archive
3. Restore backup (WITHOUT new notes)
4. Show "Re-Import Preserved Notes" button post-rollback
5. User can re-import when ready

**Option 3 Flow** (Discard):
1. Show scary confirmation:
   ```
   ⚠️ TYPE "DELETE 50 NOTES" TO CONFIRM
   
   This will permanently delete:
   • 50 new notes
   • 8 edited versions
   
   [Input Box]
   
   [Cancel]  [Confirm Deletion]
   ```
2. Only proceed if user types exact phrase
3. Restore backup (new notes discarded)

---

### Preservation Archive Format

**Archive Structure**:
```javascript
{
  "archive_type": "post_migration_preservation",
  "archive_id": "preservation-2026-11-08-14-32",
  "created_at": "2026-11-08T14:32:00Z",
  "migration_timestamp": "2026-11-04T15:42:00Z",
  "rollback_timestamp": "2026-11-08T14:32:00Z",
  
  "statistics": {
    "new_notes": 50,
    "edited_notes": 8,
    "deleted_notes": 2,
    "category_changes": 37
  },
  
  "preserved_content": {
    "new_notes": [
      {
        "id": "note-new-001",
        "title": "New Recipe",
        "content": "...",
        "category_node_id": "cat-uuid-123",
        "resolved_category_path": ["Kitchen", "Recipes", "Desserts"],
        "created_at": "2026-11-05T10:00:00Z"
      }
      // ... 49 more
    ],
    
    "edited_notes": [
      {
        "note_id": "note-existing-042",
        "title": "Updated Title",
        "backup_version": { /* original from backup */ },
        "current_version": { /* edited version */ },
        "changes": {
          "title_changed": true,
          "content_changed": true,
          "category_changed": false
        }
      }
      // ... 7 more
    ],
    
    "deleted_notes": [
      {
        "id": "note-deleted-001",
        "title": "Removed Note",
        "from_backup": { /* full backup record */ },
        "deleted_at": "2026-11-06T08:00:00Z"
      }
      // ... 1 more
    ],
    
    "category_changes": [
      {
        "note_id": "note-moved-001",
        "title": "Moved Note",
        "old_category_id": "cat-kitchen",
        "new_category_id": "cat-garden",
        "old_path": ["Kitchen", "Recipes"],
        "new_path": ["Garden", "Tips"]
      }
      // ... 36 more
    ]
  },
  
  "reconciliation_instructions": [
    "Review new notes in 'preserved_content.new_notes'",
    "Each note includes 'resolved_category_path' showing where it was",
    "Re-import using: Settings → Import → Preserved Content",
    "Category associations will need manual review"
  ]
}
```

---

### Reconciliation UI (Post-Rollback Re-Import)

**Post-Rollback Screen**:
```
╔═══════════════════════════════════════════╗
║  RE-IMPORT PRESERVED NOTES                ║
╠═══════════════════════════════════════════╣
║                                           ║
║  50 notes were created after migration    ║
║  and preserved during rollback.           ║
║                                           ║
║  IMPORT OPTIONS:                          ║
║                                           ║
║  1. ✅ Import all to "Preserved" folder   ║
║     (You can re-categorize later)         ║
║                                           ║
║  2. 📝 Review each note before import     ║
║     (Choose category for each)            ║
║                                           ║
║  3. 🔍 Preview notes first                ║
║     (See list, decide which to import)    ║
║                                           ║
║  [View Preservation Archive]              ║
║                                           ║
║          [Cancel]  [Choose Method]        ║
╚═══════════════════════════════════════════╝
```

**Detailed Review Mode**:
```
╔═══════════════════════════════════════════╗
║  REVIEW PRESERVED NOTE 1 of 50            ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Title: "New Sourdough Recipe"            ║
║  Created: Nov 5, 2026 10:00 AM           ║
║                                           ║
║  Original category (new system):          ║
║  Kitchen → Recipes → Desserts             ║
║                                           ║
║  [View Full Content]                      ║
║                                           ║
║  IMPORT THIS NOTE TO:                     ║
║                                           ║
║  ( ) Same category: Kitchen → Recipes     ║
║      (closest match in old system)        ║
║                                           ║
║  ( ) "Preserved" folder (sort later)      ║
║                                           ║
║  ( ) Choose different category:           ║
║      [Dropdown: Kitchen, Garden, Work...] ║
║                                           ║
║  ( ) Skip this note (don't import)        ║
║                                           ║
║          [Previous]  [Next]  [Import All] ║
╚═══════════════════════════════════════════╝
```

---

### Category Association Reconciliation

**Challenge**: New notes have `category_node_id` pointing to categories that may not exist in old system.

**Solution: Category Path Fallback**

```javascript
async function reconcileCategoryAssociation(preservedNote, oldTree) {
  // Step 1: Get category path from new system archive
  const newCategoryPath = preservedNote.resolved_category_path;
  // e.g., ["Kitchen", "Recipes", "Desserts"]
  
  // Step 2: Try to find matching path in old tree
  const match = findCategoryByPath(oldTree, newCategoryPath);
  
  if (match) {
    // Exact match found
    return {
      strategy: 'exact_match',
      targetPath: newCategoryPath
    };
  }
  
  // Step 3: Try partial match (deepest common ancestor)
  for (let len = newCategoryPath.length - 1; len > 0; len--) {
    const partialPath = newCategoryPath.slice(0, len);
    const partialMatch = findCategoryByPath(oldTree, partialPath);
    
    if (partialMatch) {
      return {
        strategy: 'partial_match',
        targetPath: partialPath,
        unmatchedSegments: newCategoryPath.slice(len)
      };
    }
  }
  
  // Step 4: No match — default to preservation folder
  return {
    strategy: 'no_match',
    targetPath: ["📦 Preserved from New System"],
    originalPath: newCategoryPath
  };
}
```

**Reconciliation Result Examples**:

**Case 1: Exact Match**
- New system: `["Kitchen", "Recipes"]`
- Old system: Has `["Kitchen", "Recipes"]`
- Result: Import to `["Kitchen", "Recipes"]` ✅

**Case 2: Partial Match**
- New system: `["Kitchen", "Recipes", "Desserts"]`
- Old system: Has `["Kitchen", "Recipes"]` but NOT "Desserts"
- Result: Import to `["Kitchen", "Recipes"]` with note: "Originally in Desserts subfolder"

**Case 3: No Match**
- New system: `["Garden", "Tips"]`
- Old system: Has "Kitchen" but NOT "Garden"
- Result: Import to `["📦 Preserved from New System"]` with note: "Originally in Garden → Tips"

---

### Summary: Rollback with Data Preservation

**RECOMMENDATION**: ✅ Implement hybrid preservation strategy

**Default Behavior** (when user clicks "Rollback"):
1. ✅ Detect all post-migration changes
2. ✅ Create preservation archive automatically
3. ✅ Show three rollback options (Auto-Preserve, Archive, Discard)
4. ✅ Recommend "Auto-Preserve" (selected by default)
5. ✅ Require scary confirmation for "Discard"

**Auto-Preserve Method** (RECOMMENDED DEFAULT):
- ✅ Create "📦 Preserved from New System" folder in backup
- ✅ Add all new notes to preservation folder
- ✅ Preserve edited versions in "Edited Notes" subfolder
- ✅ Restore backup (includes preserved content)
- ✅ User can re-categorize preserved notes later

**Archive Method** (ADVANCED USERS):
- ✅ Save preservation archive in IndexedDB
- ✅ Offer download link
- ✅ Restore backup (without new notes)
- ✅ Provide re-import UI post-rollback
- ✅ Allow selective re-import with category reconciliation

**Safety Guarantees**:
1. ✅ **Never silently delete**: Always preserve or explicitly confirm
2. ✅ **Always offer download**: User can save full current state
3. ✅ **Automatic preservation**: Default option preserves everything
4. ✅ **Clear consequences**: Each option explains what happens
5. ✅ **Independent backup**: Downloadable JSON always available
6. ✅ **Reconciliation support**: Help user re-import preserved content
7. ✅ **Category mapping**: Best-effort category association on re-import

**If safe rollback cannot be completed**: Stop and explain the problem. Offer alternatives:
- Download current data
- Download preservation archive
- Keep new system
- Contact support for manual recovery

---

# SECTION C: GENUINE OPEN QUESTIONS
## ❓ Items Requiring New User Decision

Based on the investigations above, the following decisions are needed:

---

## C.1 Legacy Field Retention Strategy

**Question**: Which legacy field retention strategy do you approve?

**Recommended**: Hybrid Strategy (Phase 1-4 approach)
- Phase 1: Keep all three fields (`category`, `subcategory`, `category_path`) as read-only
- Phase 2: Compatibility period 6-12 months
- Phase 3: Deprecation warnings after 6+ months
- Phase 4: Removal after 12+ months with explicit user approval

**Alternative A**: Keep synchronized (dual-write all category changes)

**Alternative B**: Generate on-demand (computed property, not stored)

**Your decision**: ?

---

## C.2 Rollback Preservation Method

**Question**: Which rollback preservation method do you approve?

**Recommended**: Hybrid with three user options
- Option 1: Auto-Preserve (put new notes in "📦 Preserved" folder) — DEFAULT
- Option 2: Archive (separate archive, manual re-import)
- Option 3: Discard (requires scary confirmation)

**Alternative A**: Always auto-preserve (no user choice)

**Alternative B**: Always archive (no auto-preserve)

**Alternative C**: Block rollback if significant new data exists

**Your decision**: ?

---

## C.3 Migration Trigger Location

**Question**: Where should the migration wizard be accessible?

**Option A**: Prominent banner on first load after update
- "New features available — Upgrade Now"
- Cannot be permanently dismissed (reappears until migration completes)

**Option B**: One-time modal on first load
- Shows migration wizard immediately
- User can dismiss and access later via Settings

**Option C**: Settings only (user must seek it out)
- Settings → Advanced → Upgrade to New System
- No banner or modal

**Recommended**: Option A (prominent banner)

**Your decision**: ?

---

## C.4 Testing Data Source

**Question**: For migration testing, should I:

**Option A**: Create synthetic test data only
- 500+ notes with complex hierarchies
- Various edge cases (empty categories, deep nesting, duplicates)

**Option B**: Request user's IndexedDB export
- Test on real-world data
- Identify actual compatibility issues

**Option C**: Both (synthetic first, then real if needed)

**Recommended**: Option A (synthetic only, unless issues arise)

**Your decision**: ?

---

## C.5 Preservation Archive Retention

**Question**: How long should preservation archives be retained in IndexedDB?

**Option A**: 30 days (user can download for longer retention)

**Option B**: 90 days

**Option C**: Indefinitely (user must manually delete)

**Recommended**: Option A (30 days)

**Your decision**: ?

---

# SUMMARY & NEXT STEPS

## What Has Been Clarified

### ✅ Previously Approved Decisions (Section A)
- 8 locked decisions documented
- Not reopened as questions
- Preserved from Version 3.2

### ✅ New Investigations (Section B)
- **Legacy Fields**: Hybrid strategy recommended (12-month retention, read-only, phased removal)
- **Rollback Preservation**: Enhanced algorithm with three user options (Auto-Preserve default)

### ❓ Genuine Open Questions (Section C)
- 5 questions requiring user decision
- Each has recommended approach
- All blocked pending user response

---

## Deliverables Completed

1. ✅ **Separated locked vs open decisions** clearly
2. ✅ **Legacy field compatibility investigation** complete
3. ✅ **Rollback preservation strategy** documented with algorithms
4. ✅ **Testing approach** clarified (synthetic data first)
5. ✅ **Preservation archive format** specified

---

## What I Need From You

Please review this document and provide:

1. **Section A**: Confirm these locked decisions are correct (no changes needed)
2. **Section B**: Approve or modify the two recommended strategies
   - B.1 Legacy Fields: Hybrid strategy (12-month retention)
   - B.2 Rollback: Hybrid with three options (Auto-Preserve default)
3. **Section C**: Answer the 5 open questions (C.1 through C.5)

---

## What Happens Next

**After you approve**:
1. ✅ I'll update Version 3.2 architecture document with these clarifications
2. ✅ I'll create Version 3.3 incorporating your decisions
3. ✅ I'll present for final approval before implementation planning
4. ❌ I will NOT begin coding or request implementation authorization yet

**IRON RABBIT BOUNDARY remains active** — No code changes until explicit authorization.

---

**END OF REVISED REVIEW**
