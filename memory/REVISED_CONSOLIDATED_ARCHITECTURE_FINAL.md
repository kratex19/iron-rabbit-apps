# IRON RABBIT — REVISED CONSOLIDATED ARCHITECTURE (FINAL)

**Date**: December 2025  
**Version**: 3.3 FINAL — Legacy Fields & Rollback Strategy Approved  
**Status**: 🎯 COMPLETE SPECIFICATION — READY FOR IMPLEMENTATION AUTHORIZATION  
**Authorization**: ❌ NO IMPLEMENTATION UNTIL EXPLICIT APPROVAL

---

## 📋 VERSION HISTORY

- **Version 3.0**: Initial consolidated specification
- **Version 3.1**: Capitalization rules clarified (SC vs Sc)
- **Version 3.2**: Level numbering clarified (l4,078), Branch designation (B) approved
- **Version 3.3**: Legacy field strategy approved, Rollback preservation enhanced, Migration trigger finalized, Testing strategy confirmed

---

## 🎯 EXECUTIVE SUMMARY

### Architectural Direction: APPROVED

This document integrates:
1. ✅ Recursive Category Branches specification
2. ✅ Two-Way Category-Note Association specification
3. ✅ Legacy field retention strategy (4-phase hybrid approach)
4. ✅ Enhanced rollback with data preservation (3-option strategy)
5. ✅ Migration trigger design (prominent banner + Settings)
6. ✅ Testing strategy (synthetic data first)

### Implementation Status: NOT AUTHORIZED

- ❌ No code changes
- ❌ No CSS modifications
- ❌ No data migrations
- ❌ No live publishing
- ✅ Architecture design only

---

## 🔒 SECTION 1: LOCKED ARCHITECTURAL DECISIONS

### These Decisions Are FINAL and Not Subject to Revision

The following architectural decisions have been approved through Version 3.2 and are preserved in Version 3.3. These are **established requirements**, not open questions.

---

### 1.1 Identifier Uniqueness

**LOCKED**: Compact identifiers (e.g., `M-Sc1`) may repeat across different branches.

**Rationale**: Permanent internal IDs (`cat-uuid-001`) uniquely identify categories. Compact identifiers are display references only, shown with sufficient context (breadcrumbs, full paths) to distinguish duplicates.

**Implementation Requirement**: All operations (move, delete, rename, query) MUST use permanent IDs, never compact identifiers.

---

### 1.2 Hierarchy Depth

**LOCKED**: Hierarchy nesting must be unlimited architecturally.

**Rationale**: System must support any depth. No artificial limits imposed.

**Clarification**: `l4,078` means ordinary sub-level **number** 4,078 (comma is thousands separator), not 4,078 levels of nesting depth.

---

### 1.3 Empty Category Visibility

**LOCKED**: Empty categories must always remain visible.

**Rationale**: Users see complete organizational structure. "Create note here" works before notes exist. Categories aren't hidden just because they're empty.

---

### 1.4 Migration Timing

**LOCKED**: Migration must be explicitly initiated by the user.

**Rule**: Never silently run at first application load. Never automatic. User decides when to migrate.

**Version 3.3 Enhancement**: Migration accessible via prominent non-blocking banner AND permanent Settings entry (see Section 6.1).

---

### 1.5 Button Definitions

**LOCKED**: 
- **Green Plus**: Creates category branches (appears on M, SC, Sc, l)
- **Blue Plus**: Creates notes (appears ONLY on ordinary sub-levels, NOT on category headers)

**Rationale**: Notes belong IN sub-levels, not directly in category headers.

---

### 1.6 Type Code Definitions

**LOCKED**: M, SC, Sc, l, and B retain their approved meanings and exact capitalization.

| Symbol | Meaning | Parent Type | Capitalization Rule |
|--------|---------|-------------|---------------------|
| M | Main Category | (root) | Always capital |
| SC | Subcategory beneath Main | M (or B) | Capital C |
| Sc | Subcategory beneath Subcategory | SC or Sc | Lowercase c |
| l | Ordinary sub-level | Any | Lowercase l |
| B | Branch beneath sub-level | M | Capital B |

**Never**: Convert SC ↔ Sc, normalize capitalization, or treat as equivalent.

---

### 1.7 Primary Note-Category Association

**LOCKED**: `category_node_id` is the ONLY stored relationship between notes and categories.

**Rule**: 
- Notes discovered by querying `WHERE category_node_id = X`
- NO `note_ids` arrays in categories (avoids sync issues)
- Legacy fields preserved but NOT used as source of truth (see Section 2)

**Source of Truth Hierarchy**:
1. **Primary**: `category_node_id` (permanent ID)
2. **Structure**: Category `parent_id` chains (complete hierarchy)
3. **Display**: Generated on-demand from tree traversal
4. **Legacy**: Frozen snapshot from migration (read-only, see Section 2)

---

### 1.8 Styling & Animations

**LOCKED**: Preserve all existing approved styling conventions, colors, and animations.

- Green Plus: Existing approved green from theme
- Blue Plus: Existing approved blue from theme, same size/style as green
- Animations: Reuse existing animations for new features
- No CSS redesign

---

### 1.9 Additional Locked Decisions

**From Version 3.2** (See original sections for details):
- ✅ Branch counters: Per-parent scoping
- ✅ Sub-level accordion transformation: Only when branch created
- ✅ Category deletion: Block until contents relocated
- ✅ Search scope: Include everything (categories, branches, notes)
- ✅ Migration preservation: All existing data preserved (ZERO DATA LOSS)
- ✅ Rollback window: 7 days minimum + downloadable backup forever
- ✅ Conflict resolution: Flag for review, never auto-resolve

**These decisions are closed and will not be reopened.**

---

## 📦 SECTION 2: LEGACY FIELD STRATEGY (VERSION 3.3)

### APPROVED: HYBRID FOUR-PHASE APPROACH WITH SAFEGUARDS

---

### 2.1 Legacy Fields Definition

The existing note fields are:
- `category` (string)
- `subcategory` (string)
- `category_path` (array of strings)

**Current Purpose**: Compatibility with pre-migration code and display.

**Future Status**: Read-only snapshots, eventually eligible for removal.

---

### 2.2 Phase 1 — Migration (Immediate)

**Actions**:
1. ✅ Retain all three legacy fields during migration
2. ✅ Populate with existing category information
3. ✅ Mark as **frozen snapshots** of original category information
4. ❌ DO NOT delete or overwrite them

**Field Status After Migration**:
```javascript
{
  id: "note-123",
  title: "Sourdough Recipe",
  
  // PRIMARY RELATIONSHIP (Single source of truth)
  category_node_id: "cat-baking-l1-breads",  // ACTIVE, ALWAYS CURRENT
  
  // LEGACY FIELDS (Frozen snapshot from migration)
  category: "Kitchen",                        // READ-ONLY, FROZEN
  subcategory: "Recipes",                     // READ-ONLY, FROZEN
  category_path: ["Kitchen", "Recipes",      // READ-ONLY, FROZEN
                  "Baking", "Breads"]
}
```

**Migration Algorithm**:
```javascript
async function migrateNote(note) {
  // 1. Determine category_node_id from category_path
  const categoryId = resolveCategoryId(note.category_path);
  
  // 2. ADD new field (primary relationship)
  note.category_node_id = categoryId;
  
  // 3. PRESERVE legacy fields (do not modify)
  // note.category remains unchanged
  // note.subcategory remains unchanged
  // note.category_path remains unchanged
  
  // 4. Mark migration timestamp
  note.migration_timestamp = new Date().toISOString();
  
  await saveNote(note);
}
```

---

### 2.3 Phase 2 — Compatibility Period (12 Months Minimum)

**Duration**: At least 12 months from migration completion.

**Field Behavior**:
- ✅ Legacy fields remain in database (frozen snapshot)
- ✅ New application functionality MUST use:
  - `category_node_id` for all category operations
  - Permanent category IDs for all queries
  - Complete category parent-child structure for hierarchy
- ❌ Legacy fields MUST NOT become a competing source of truth
- ❌ New code MUST NOT update legacy fields on category changes

**Example: Note Move Operation**:
```javascript
// ✅ CORRECT: Update only category_node_id
async function moveNote(noteId, newCategoryId) {
  const note = await getNote(noteId);
  
  // Update primary relationship
  note.category_node_id = newCategoryId;
  
  // Legacy fields NOT updated (remain frozen)
  // note.category_path still shows original location
  
  await saveNote(note);
}

// ❌ WRONG: Attempting to synchronize legacy fields
async function moveNoteWrong(noteId, newCategoryId) {
  const note = await getNote(noteId);
  
  note.category_node_id = newCategoryId;
  
  // DO NOT DO THIS:
  const newPath = getCategoryPath(newCategoryId);
  note.category = newPath[0];
  note.subcategory = newPath[1];
  note.category_path = newPath;  // ❌ Creates competing source of truth
}
```

**Display Current Category**:
```javascript
// Always generate display path from category_node_id
function getNoteCategoryDisplay(note) {
  if (note.category_node_id) {
    // Traverse tree from primary relationship
    return getCategoryPath(note.category_node_id);
  }
  
  // Fallback for uncategorized notes
  return [];
}

// ❌ WRONG: Using frozen legacy fields for display
function getNoteCategoryDisplayWrong(note) {
  return note.category_path;  // Shows outdated frozen snapshot!
}
```

**Rationale**: Legacy fields serve as archival snapshots of pre-migration category assignments. They are NOT maintained after migration. New code must use the tree-based system exclusively.

---

### 2.4 Phase 3 — Deprecation Review (After 6-12 Months)

**Actions**:
1. ✅ Document any remaining dependencies on legacy fields
2. ✅ Investigate whether any existing feature still reads these fields
3. ✅ Document consequences of retaining frozen snapshots
4. ✅ Verify all application functionality uses `category_node_id`
5. ❌ DO NOT allow active functionality to rely on outdated legacy snapshots

**Deprecation Warning UI** (after 6+ months):
```
╔═══════════════════════════════════════════╗
║  📋 LEGACY CATEGORY FIELDS                ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Your notes contain legacy category       ║
║  fields that may be removed in future.    ║
║                                           ║
║  Legacy fields: category, subcategory,    ║
║                 category_path             ║
║                                           ║
║  Status: Frozen snapshots from migration  ║
║  Not used by current functionality        ║
║                                           ║
║  ACTION: Download full backup             ║
║  [Download Backup Now]                    ║
║                                           ║
║               [Dismiss]                   ║
╚═══════════════════════════════════════════╝
```

**Code Audit Checklist**:
- [ ] Search all code for `note.category`
- [ ] Search all code for `note.subcategory`
- [ ] Search all code for `note.category_path`
- [ ] Verify each usage is display-only or can be replaced
- [ ] Confirm no functionality depends on frozen snapshots

---

### 2.5 Phase 4 — Possible Future Removal (After 12+ Months)

**IMPORTANT**: Twelve months does NOT mean automatic deletion.

**Eligibility**: After at least 12 months, fields MAY become eligible for a separate removal review.

**Removal Requirements** (ALL must be met):
1. ✅ Explicit user approval for field removal
2. ✅ Verified independent downloadable backup created
3. ✅ Successful validation of all note-category associations
4. ✅ Confirmation that no active functionality depends on legacy fields
5. ✅ Documented recovery strategy if removal causes issues
6. ✅ Pre-removal validation passes (see below)

**NO FIELD REMOVAL IS AUTHORIZED BY THIS SPECIFICATION**.

Future removal requires separate user authorization.

---

### 2.6 Pre-Removal Validation (If Ever Proposed)

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
    (n.category_path && n.category_path.length > 0) && !n.category_node_id
  );
  
  if (notesWithoutId.length > 0) {
    validation.passed = false;
    validation.errors.push(
      `${notesWithoutId.length} notes missing category_node_id`
    );
  }
  
  // Check 2: All category_node_ids resolve to valid categories
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
    validation.errors.push(
      `${orphaned.length} notes point to deleted categories`
    );
  }
  
  // Check 3: Backup exists and is recent
  const backup = await getLatestBackup();
  if (!backup) {
    validation.warnings.push(
      'No recent backup found. User MUST download backup before removal.'
    );
  }
  
  // Check 4: Code audit completed
  const codeAudit = await getCodeAuditStatus();
  if (!codeAudit || !codeAudit.completed) {
    validation.passed = false;
    validation.errors.push(
      'Code audit not completed. Cannot confirm no dependencies.'
    );
  }
  
  return validation;
}
```

**If Validation Fails**: DO NOT remove fields. Fix issues first, then re-validate.

---

### 2.7 Consistency Verification During Compatibility Period

**At Migration Completion**:
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
        computed: computedPath,
        issue: 'Migration mismatch'
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

**Run This Verification**:
- ✅ At end of migration (before marking complete)
- ✅ If verification fails, rollback migration automatically

**Ongoing Spot-Check** (Post-Migration):
```javascript
// Run on app initialization
async function spotCheckCategoryAssociations() {
  const allNotes = await getAllNotes();
  
  // Check 10 random notes
  const sample = allNotes.sort(() => 0.5 - Math.random()).slice(0, 10);
  
  for (const note of sample) {
    if (!note.category_node_id) continue;
    
    // Verify category_node_id resolves to valid category
    const category = await getCategoryById(note.category_node_id);
    if (!category) {
      console.error(
        `Orphaned note: ${note.id} points to non-existent category ${note.category_node_id}`
      );
    }
  }
}
```

---

### 2.8 Legacy Field Strategy Summary

**Current Status** (Version 3.3):

| Field | Status | Updated After Migration? | Removal Timeline |
|-------|--------|-------------------------|------------------|
| `category_node_id` | **PRIMARY** | ✅ Always (source of truth) | Never (permanent) |
| `category` | Legacy | ❌ No (frozen at migration) | 12+ months eligibility |
| `subcategory` | Legacy | ❌ No (frozen at migration) | 12+ months eligibility |
| `category_path` | Legacy | ❌ No (frozen at migration) | 12+ months eligibility |

**Key Principles**:
1. ✅ Retain during migration (Phase 1)
2. ✅ Mark as read-only frozen snapshots
3. ✅ New code uses ONLY `category_node_id` + tree traversal (Phase 2)
4. ✅ Document dependencies during deprecation review (Phase 3)
5. ✅ Validate thoroughly before any removal (Phase 4)
6. ✅ Minimum 12-month retention (not automatic deletion)
7. ❌ NO removal authorized by this specification

---

## 🔄 SECTION 3: ENHANCED ROLLBACK STRATEGY (VERSION 3.3)

### APPROVED: THREE-OPTION STRATEGY WITH DATA PRESERVATION

---

### 3.1 Rollback Overview

**Problem Scenario**: User completes migration, creates 50 new notes, edits 8 notes, then requests rollback.

**Requirement**: Rollback MUST NOT silently delete those 50 new notes.

**Solution**: Three-option strategy with independent preservation archive.

---

### 3.2 Option 1 — Auto-Preserve (DEFAULT, RECOMMENDED)

**User Experience**:
1. User requests rollback
2. System detects 50 new notes + 8 edited notes
3. System shows rollback options dialog
4. User selects "Auto-Preserve" (pre-selected)
5. System creates independent preservation archive
6. System creates "📦 Preserved from New System" category
7. System adds all new/edited content to preservation category
8. System restores old backup (now includes preservation category)
9. User sees preserved notes in special folder for recategorization

**Implementation**:
```javascript
async function rollbackWithAutoPreserve(backup, changes) {
  // Step 1: Create independent preservation archive
  const preservationArchive = {
    timestamp: new Date().toISOString(),
    type: 'auto_preserve',
    newNotes: changes.newNotes,
    editedNotes: changes.editedNotes,
    categoryChanges: changes.categoryChanges
  };
  
  // Store archive independently (separate from backup)
  await db.preservation_archives.add(preservationArchive);
  
  // Step 2: Verify archive before proceeding
  const archiveValid = await validatePreservationArchive(preservationArchive);
  if (!archiveValid) {
    throw new Error('Preservation archive validation failed. Rollback stopped.');
  }
  
  // Step 3: Offer downloadable copy
  const downloadUrl = createDownloadLink(preservationArchive);
  
  // Step 4: Create preservation category in backup
  const preservationCategory = {
    id: "cat-post-migration-preserved",
    name: "📦 Preserved from New System",
    type: "M",
    created_at: new Date().toISOString()
  };
  
  // Step 5: Add new notes to preservation category
  for (const newNote of changes.newNotes) {
    const preservedNote = {
      ...newNote,
      category_path: ["📦 Preserved from New System"],
      category: "📦 Preserved from New System",
      subcategory: "",
      _original_category: newNote.category_node_id || null,
      _preservation_source: 'rollback',
      _preservation_timestamp: new Date().toISOString()
    };
    
    backup.notes.push(preservedNote);
  }
  
  // Step 6: Add edited note versions to preservation subcategory
  for (const edited of changes.editedNotes) {
    const preservedEdit = {
      ...edited.current,
      id: `${edited.current.id}-edited-${Date.now()}`,
      title: `${edited.current.title} (Edited Version)`,
      category_path: ["📦 Preserved from New System", "Edited Notes"],
      category: "📦 Preserved from New System",
      subcategory: "Edited Notes",
      _original_note_id: edited.current.id,
      _preservation_source: 'rollback',
      _preservation_timestamp: new Date().toISOString()
    };
    
    backup.notes.push(preservedEdit);
  }
  
  // Step 7: Add preservation category to tree
  backup.settings.category_tree["📦 Preserved from New System"] = {
    ...preservationCategory,
    children: {
      "Edited Notes": {
        id: "cat-preserved-edited",
        name: "Edited Notes",
        type: "SC",
        parent_id: "cat-post-migration-preserved"
      }
    }
  };
  
  // Step 8: Restore backup (includes preserved content)
  await restoreBackup(backup);
  
  // Step 9: Verify restoration
  const verification = await verifyRollback(backup, preservationArchive);
  if (!verification.success) {
    throw new Error('Rollback verification failed');
  }
  
  return {
    success: true,
    preservedNotes: changes.newNotes.length,
    preservedEdits: changes.editedNotes.length,
    archiveUrl: downloadUrl,
    archiveId: preservationArchive.timestamp
  };
}
```

**Result**:
```
After Rollback:

📦 Preserved from New System
├─ (50 new notes here)
└─ Edited Notes
   └─ (8 edited versions here)

Kitchen
Garden
Work
(... old categories restored ...)
```

**Advantages**:
- ✅ No data loss
- ✅ User doesn't need to remember to download
- ✅ Automatic preservation
- ✅ Clear visual distinction (emoji + folder name)
- ✅ Notes immediately visible for recategorization

---

### 3.3 Option 2 — Archive

**User Experience**:
1. User selects "Archive" option
2. System creates independent preservation archive
3. System offers download link
4. System restores old backup (WITHOUT new notes)
5. Post-rollback UI shows "Re-Import Preserved Notes" button
6. User can review and selectively re-import

**Implementation**:
```javascript
async function rollbackWithArchive(backup, changes) {
  // Step 1: Create independent preservation archive
  const preservationArchive = {
    timestamp: new Date().toISOString(),
    type: 'archive',
    description: "Notes created/edited after migration",
    newNotes: changes.newNotes,
    editedNotes: changes.editedNotes.map(e => ({
      noteId: e.current.id,
      backupVersion: e.backup,
      currentVersion: e.current,
      changes: {
        titleChanged: e.current.title !== e.backup.title,
        contentChanged: e.current.content !== e.backup.content,
        categoryChanged: e.current.category_node_id !== e.backup.category_node_id
      }
    })),
    deletedNotes: changes.deletedNotes,
    categoryChanges: changes.categoryChanges
  };
  
  // Step 2: Store archive in IndexedDB (separate store)
  await db.preservation_archives.add(preservationArchive);
  
  // Step 3: Offer download
  const downloadUrl = createDownloadLink(preservationArchive);
  
  // Step 4: Restore backup (WITHOUT new notes)
  await restoreBackup(backup);
  
  // Step 5: Verify archive remains accessible
  const archiveAccessible = await verifyArchiveAccessible(preservationArchive.timestamp);
  if (!archiveAccessible) {
    throw new Error('Preservation archive not accessible after rollback');
  }
  
  return {
    success: true,
    archiveId: preservationArchive.timestamp,
    downloadUrl: downloadUrl,
    requiresReconciliation: true
  };
}
```

**Post-Rollback Re-Import UI**:
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
║  [Download Archive] [View Details]        ║
║                                           ║
║          [Cancel]  [Choose Method]        ║
╚═══════════════════════════════════════════╝
```

**Advantages**:
- ✅ No data loss
- ✅ User has explicit control
- ✅ Can review before re-adding
- ✅ Selective re-import

---

### 3.4 Option 3 — Discard (Requires Explicit Confirmation)

**User Experience**:
1. User selects "Discard" option
2. System shows scary confirmation dialog
3. User must type exact phrase: "DELETE 50 NOTES"
4. System creates independent backup (even when discarding)
5. System restores old backup (new notes not included)
6. Discarded content documented in archive

**Confirmation UI**:
```
╔═══════════════════════════════════════════╗
║  ⚠️ CONFIRM PERMANENT DATA LOSS            ║
╠═══════════════════════════════════════════╣
║                                           ║
║  This will PERMANENTLY DELETE:            ║
║                                           ║
║  • 50 new notes                           ║
║  • 8 edited note versions                 ║
║  • 37 category associations               ║
║                                           ║
║  This action cannot be undone.            ║
║                                           ║
║  To confirm, type exactly:                ║
║                                           ║
║      DELETE 50 NOTES                      ║
║                                           ║
║  [____________________________]           ║
║                                           ║
║  Note: A backup archive will still be     ║
║  created and available for download.      ║
║                                           ║
║          [Cancel]  [Confirm]              ║
╚═══════════════════════════════════════════╝
```

**Implementation**:
```javascript
async function rollbackWithDiscard(backup, changes, userConfirmation) {
  // Step 1: Verify confirmation matches
  const expectedConfirmation = `DELETE ${changes.newNotes.length} NOTES`;
  if (userConfirmation !== expectedConfirmation) {
    throw new Error('Confirmation does not match. Rollback cancelled.');
  }
  
  // Step 2: Create preservation archive (even when discarding)
  const preservationArchive = {
    timestamp: new Date().toISOString(),
    type: 'discard',
    description: "Content discarded during rollback (user confirmed)",
    newNotes: changes.newNotes,
    editedNotes: changes.editedNotes,
    categoryChanges: changes.categoryChanges,
    userConfirmation: userConfirmation,
    discardedAt: new Date().toISOString()
  };
  
  // Store archive (for recovery if needed)
  await db.preservation_archives.add(preservationArchive);
  
  // Step 3: Offer download
  const downloadUrl = createDownloadLink(preservationArchive);
  
  // Step 4: Restore backup (WITHOUT new notes)
  await restoreBackup(backup);
  
  return {
    success: true,
    discarded: true,
    discardedNotes: changes.newNotes.length,
    archiveUrl: downloadUrl,
    archiveId: preservationArchive.timestamp
  };
}
```

**Important**: Even when "Discard" selected, independent backup preserved and documented.

---

### 3.5 Rollback Selection UI

**Main Rollback Dialog**:
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
║  • 37 category changes                    ║
║                                           ║
║  CHOOSE ROLLBACK METHOD:                  ║
║                                           ║
║  (•) 1. ✅ Auto-Preserve (Recommended)    ║
║      Restored system will include a       ║
║      "📦 Preserved" folder with all new   ║
║      notes. Re-categorize them later.     ║
║                                           ║
║  ( ) 2. 📦 Archive                        ║
║      New notes saved in separate archive. ║
║      Re-import them manually later.       ║
║                                           ║
║  ( ) 3. ⚠️ Discard                         ║
║      New notes will be PERMANENTLY LOST.  ║
║      (Requires explicit confirmation)     ║
║                                           ║
║  [Download Current Data First]            ║
║                                           ║
║          [Cancel]  [Continue]             ║
╚═══════════════════════════════════════════╝
```

**Default Selection**: Option 1 (Auto-Preserve) pre-selected.

---

### 3.6 Mandatory Rollback Safeguards

**The following safeguards are MANDATORY for all rollback options**:

1. ✅ **Never silently delete new notes**
   - All rollback options preserve or require explicit confirmation
   
2. ✅ **Preserve edited note versions**
   - Both original and edited versions preserved
   
3. ✅ **Preserve category changes and mappings**
   - Track which notes moved between categories
   
4. ✅ **Preserve notes that cannot be automatically mapped**
   - No silent category assignment
   
5. ✅ **Never silently assign note to incorrect category**
   - Require explicit user decisions when uncertain
   
6. ✅ **Require explicit user decisions for reconciliation**
   - Manual review for ambiguous cases
   
7. ✅ **Stop rollback if preservation cannot be verified**
   - Fail-safe: Stop rather than lose data
   
8. ✅ **Never claim success until validation complete**
   - Post-rollback verification required

---

### 3.7 Archive Retention Policy

**APPROVED**: Archives retained **indefinitely** unless user explicitly deletes.

**Key Points**:
- ❌ NO automatic 30-day expiration
- ❌ NO automatic 90-day expiration
- ✅ User MUST have independent downloadable copy
- ✅ Archives remain in IndexedDB until manually deleted
- ✅ User can download archive at any time

**Archive Management UI**:
```
Settings → Advanced → Preservation Archives

╔═══════════════════════════════════════════╗
║  PRESERVATION ARCHIVES                    ║
╠═══════════════════════════════════════════╣
║                                           ║
║  1. Auto-Preserve Archive                 ║
║     Created: Nov 8, 2026 2:32 PM         ║
║     Size: 2.4 MB                          ║
║     Contains: 50 notes, 8 edits           ║
║     [Download] [Delete]                   ║
║                                           ║
║  2. Manual Backup                         ║
║     Created: Oct 15, 2026 10:00 AM       ║
║     Size: 18.7 MB                         ║
║     [Download] [Delete]                   ║
║                                           ║
║  Total storage: 21.1 MB                   ║
║                                           ║
║  [Create New Archive]                     ║
║                                           ║
╚═══════════════════════════════════════════╝
```

---

### 3.8 Category Reconciliation Strategy

**Challenge**: New notes have `category_node_id` pointing to categories that may not exist in old system.

**Solution**: Three-tier fallback matching.

**Reconciliation Algorithm**:
```javascript
async function reconcileCategoryAssociation(preservedNote, oldTree) {
  // Step 1: Get resolved category path from new system
  const newCategoryPath = preservedNote._resolved_category_path;
  // e.g., ["Kitchen", "Recipes", "Desserts"]
  
  // Step 2: Try exact match
  const exactMatch = findCategoryByPath(oldTree, newCategoryPath);
  if (exactMatch) {
    return {
      strategy: 'exact_match',
      targetPath: newCategoryPath,
      confidence: 'high'
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
        unmatchedSegments: newCategoryPath.slice(len),
        confidence: 'medium',
        note: `Originally in ${newCategoryPath.join(' → ')}`
      };
    }
  }
  
  // Step 4: No match — use preservation folder
  return {
    strategy: 'no_match',
    targetPath: ["📦 Preserved from New System"],
    originalPath: newCategoryPath,
    confidence: 'low',
    note: `Originally in ${newCategoryPath.join(' → ')} (not found in old system)`
  };
}
```

**Reconciliation Examples**:

**Case 1: Exact Match** ✅
- New: `["Kitchen", "Recipes"]`
- Old: Has `["Kitchen", "Recipes"]`
- Result: Import to `["Kitchen", "Recipes"]`

**Case 2: Partial Match** ⚠️
- New: `["Kitchen", "Recipes", "Desserts"]`
- Old: Has `["Kitchen", "Recipes"]` but NOT "Desserts"
- Result: Import to `["Kitchen", "Recipes"]` + note "Originally in Desserts"

**Case 3: No Match** ❌
- New: `["Garden", "Tips"]`
- Old: Does NOT have "Garden"
- Result: Import to `["📦 Preserved from New System"]` + note "Originally in Garden → Tips"

---

### 3.9 Post-Rollback Verification

**Verification Checklist**:
```javascript
async function verifyRollback(backup, preservationArchive) {
  const verification = {
    success: true,
    errors: [],
    warnings: []
  };
  
  // Check 1: Note count matches backup
  const currentCount = (await getAllNotes()).length;
  const expectedCount = backup.notes.length;
  
  if (currentCount !== expectedCount) {
    verification.success = false;
    verification.errors.push(
      `Note count mismatch: expected ${expectedCount}, got ${currentCount}`
    );
  }
  
  // Check 2: Preservation archive accessible
  if (preservationArchive) {
    const archiveExists = await db.preservation_archives.get(preservationArchive.timestamp);
    if (!archiveExists) {
      verification.success = false;
      verification.errors.push('Preservation archive not found after rollback');
    }
  }
  
  // Check 3: Category tree restored
  const currentTree = await getCategoryTree();
  if (!currentTree || Object.keys(currentTree).length === 0) {
    verification.success = false;
    verification.errors.push('Category tree empty after rollback');
  }
  
  // Check 4: Settings restored
  const currentSettings = await getSettings();
  if (!currentSettings) {
    verification.success = false;
    verification.errors.push('Settings not restored');
  }
  
  return verification;
}
```

**If Verification Fails**: Stop and show error. Do NOT claim rollback succeeded.

---

### 3.10 Rollback Strategy Summary

**Version 3.3 Rollback Guarantees**:

1. ✅ **Three user options**: Auto-Preserve (default), Archive, Discard
2. ✅ **Independent archives**: Exist separately from restored data
3. ✅ **No silent deletion**: All options preserve or require explicit confirmation
4. ✅ **Downloadable backups**: Always available
5. ✅ **Category reconciliation**: Best-effort matching with three-tier fallback
6. ✅ **Indefinite retention**: No automatic archive expiration
7. ✅ **Post-rollback verification**: Validation before claiming success
8. ✅ **Fail-safe design**: Stop if preservation cannot be verified

---

## SECTION 4: PLUS BUTTON PLACEMENT

*(Content from Version 3.2 preserved — see original document for full details)*

### 4.1 Green Plus: Create Category/Branch

**Appears on**:
- ✅ Every Main Category (M)
- ✅ Every Subcategory (SC, Sc)
- ✅ Every ordinary sub-level (l1, l2, l3...)

**Does NOT appear on**: Notes

**Action**: Creates category branch or subcategory beneath selected item

---

### 4.2 Blue Plus: Create Note

**Appears on**:
- ✅ Every ordinary sub-level (l1, l2, l3...)
- ✅ Includes sub-levels inside category branches

**Does NOT appear on**:
- ❌ Main Category headers (M)
- ❌ Subcategory headers (SC, Sc)

**Action**: Creates note in that exact sub-level location

**Rationale**: Notes belong IN sub-levels, not directly in category headers.

---

## SECTION 5: IDENTIFIER CONVENTIONS

*(Content from Version 3.2 preserved — see original document for full details)*

### 5.1 Type Codes Summary

| Symbol | Meaning | Parent Type | Format Example |
|--------|---------|-------------|----------------|
| M | Main Category | (root) | `M` |
| SC | Sub beneath Main | M or B | `M-SC1` |
| Sc | Sub beneath Sub | SC or Sc | `M-Sc1` (compact) |
| l | Ordinary level | Any | `l4,078` |
| B | Branch at level | M | `l3-B1` |

### 5.2 Capitalization Rules (LOCKED)

**SC vs Sc Distinction**:
- **SC** (capital C): Parent is Main Category
- **Sc** (lowercase c): Parent is another Subcategory
- **Never** normalize or convert between them

### 5.3 Level Numbering (LOCKED)

**l4,078 Interpretation**: Ordinary sub-level **number** 4,078

**Comma**: Thousands separator (not component divider)

---

## 🚀 SECTION 6: MIGRATION TRIGGER (VERSION 3.3)

### APPROVED: PROMINENT BANNER PLUS SETTINGS ENTRY

---

### 6.1 Two Access Methods

**Method 1: Prominent Non-Blocking Banner**

```
╔═══════════════════════════════════════════╗
║  📢 NEW HIERARCHY SYSTEM AVAILABLE        ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Enhanced category features now ready:    ║
║  • Recursive category branches            ║
║  • Permanent category IDs                 ║
║  • Enhanced organization                  ║
║                                           ║
║  [Learn More]  [Upgrade Now]  [Later]     ║
║                                           ║
╚═══════════════════════════════════════════╝
```

**Behavior**:
- ✅ Appears at top of app on first load after system update
- ✅ Non-blocking: User can dismiss and continue using app
- ✅ Reappears on next session if dismissed (until migration complete)
- ❌ Does NOT force migration
- ❌ Does NOT prevent normal application use
- ✅ [Later] button dismisses for current session
- ✅ [Upgrade Now] opens migration wizard

---

**Method 2: Permanent Settings Entry**

```
Settings → Advanced → System

╔═══════════════════════════════════════════╗
║  SYSTEM UPGRADES                          ║
╠═══════════════════════════════════════════╣
║                                           ║
║  📢 Universal Hierarchy System            ║
║     Status: Available                     ║
║     [Start Upgrade]                       ║
║                                           ║
║  Other system information...              ║
║                                           ║
╚═══════════════════════════════════════════╝
```

**Behavior**:
- ✅ Always accessible via Settings menu
- ✅ User can initiate migration at any time
- ✅ Clear status indicator (Available / In Progress / Complete)

---

### 6.2 Migration Initiation Rules (LOCKED)

1. ❌ **NEVER automatic**: Migration never starts without user action
2. ❌ **NEVER forced**: User can postpone indefinitely
3. ❌ **NEVER silent**: Always requires explicit user initiation
4. ✅ **User control**: User decides when to migrate
5. ✅ **Clear options**: Both banner and Settings provide access

---

### 6.3 Migration Wizard Preservation

**All Previously Approved Safeguards Preserved**:
- ✅ Pre-validation (8-point checklist)
- ✅ Backup creation
- ✅ Conflict resolution UI
- ✅ Interruption and resumption
- ✅ Post-validation
- ✅ Rollback option (7-day window + indefinite downloadable backup)

*(See Section 7 for complete migration algorithm)*

---

## SECTION 7: MIGRATION ALGORITHM

*(Content from Version 3.2 preserved — see original document for complete migration strategy)*

### 7.1 Pre-Migration Validation

**8-Point Checklist** (must pass before migration proceeds):
1. ✅ All existing notes accounted for
2. ✅ All existing categories verified
3. ✅ Parent-child relationships intact
4. ✅ Ambiguous paths detected and flagged
5. ✅ Original paths preserved for verification
6. ✅ Backup integrity validated
7. ✅ Duplicate names in different contexts identified
8. ✅ No critical conflicts detected

**If Validation Fails**: Migration MUST NOT PROCEED. Show conflict resolution UI.

---

### 7.2 Migration Phases

**Phase 1: Build Enhanced Category Tree**
- Traverse existing tree
- Assign permanent IDs to all nodes
- Add parent relationships
- Discover sub-levels from note paths
- Create categoryIdMap (path → ID)

**Phase 2: Link Notes to Categories**
- For each note, determine `category_node_id` from `category_path`
- ADD new field `category_node_id`
- PRESERVE legacy fields (category, subcategory, category_path) — see Section 2
- Save updated note

**Phase 3: Final Validation**
- Verify all notes linked correctly
- Check for orphaned notes
- Verify category path consistency
- Check for broken links
- **If validation fails**: Automatic rollback

---

## 🧪 SECTION 8: TESTING STRATEGY (VERSION 3.3)

### APPROVED: SYNTHETIC TEST DATA FIRST

---

### 8.1 Testing Data Source

**Primary Approach**: Synthetic test data

**Rules**:
1. ✅ Begin with synthetic test data
2. ❌ Do NOT request user's actual IndexedDB without separate explicit permission
3. ❌ Do NOT export, inspect, or modify user's actual data without authorization
4. ✅ Synthetic data must cover all edge cases

**If Real Data Ever Needed**: Requires separate explicit user authorization (not granted by this specification).

---

### 8.2 Synthetic Test Data Requirements

**Dataset Composition**:
- 500+ notes with varied category paths
- 50+ unique categories
- 10+ deeply nested hierarchies (8+ levels)
- 5+ empty categories
- 10+ duplicate category names in different branches
- 20+ notes with ambiguous paths
- 10+ orphaned note scenarios
- 5+ extremely deep sub-levels (l1000+)

**Edge Cases to Include**:
1. Notes with no category_path (uncategorized)
2. Notes with invalid category_path (references non-existent categories)
3. Categories with identical names in different branches
4. Extremely deep nesting (10+ levels)
5. Very long category names (100+ characters)
6. Special characters in category names
7. Unicode and emoji in category names
8. Empty string category names
9. Duplicate category_path arrays
10. Notes created during migration interruption

---

### 8.3 Test Scenarios (Comprehensive List)

**Migration Testing**:
1. ✅ Existing categories and subcategories preserved
2. ✅ Empty categories remain visible
3. ✅ Deeply nested branches migrated correctly
4. ✅ Duplicate compact identifiers handled
5. ✅ Permanent note-category associations created
6. ✅ Legacy fields preserved (category, subcategory, category_path)
7. ✅ Interrupted migration can resume
8. ✅ Migration conflict resolution UI works
9. ✅ Post-validation catches errors
10. ✅ Automatic rollback on validation failure

**Rollback Testing**:
11. ✅ Rollback after new notes created (Auto-Preserve)
12. ✅ Rollback with Archive option
13. ✅ Rollback with Discard option (confirmation required)
14. ✅ Preservation of edited notes
15. ✅ Preservation of category relationships
16. ✅ Category reconciliation (exact, partial, no match)
17. ✅ Independent archive accessible after rollback
18. ✅ Post-rollback verification

**UI Testing**:
19. ✅ Green plus button behavior (creates branches)
20. ✅ Blue plus button behavior (creates notes)
21. ✅ Blue plus appears only on sub-levels
22. ✅ Green plus appears on M, SC, Sc, l
23. ✅ Empty categories display correctly
24. ✅ Accordion transformation when branch created
25. ✅ Recursive branch rendering
26. ✅ Identifier display (compact vs full)

**Data Integrity Testing**:
27. ✅ No data loss during migration
28. ✅ All notes preserved
29. ✅ All attachments preserved
30. ✅ All metadata preserved
31. ✅ Note count matches before/after
32. ✅ Category tree structure intact
33. ✅ Legacy fields frozen correctly
34. ✅ Spot-check ongoing (orphan detection)

**Offline & PWA Testing**:
35. ✅ Migration works offline
36. ✅ Rollback works offline
37. ✅ IndexedDB persistence
38. ✅ Capacitor compatibility
39. ✅ Service worker integration
40. ✅ Background sync (if applicable)

---

### 8.4 Testing Phases

**Phase 1: Unit Tests (Individual Functions)**
- Category ID generation
- Identifier formatting (l4,078 with comma)
- Type validation (M, SC, Sc, l, B)
- Capitalization preservation
- Tree traversal
- Path resolution

**Phase 2: Integration Tests (Combined Features)**
- Migration algorithm end-to-end
- Rollback with preservation
- Conflict resolution flow
- Note creation with blue plus
- Branch creation with green plus

**Phase 3: UI Tests (User Interactions)**
- Button placement verification
- Modal interactions
- Accordion behavior
- Migration wizard flow
- Rollback option selection

**Phase 4: Regression Tests (Existing Functionality)**
- Note creation still works
- Note editing still works
- Search still works
- Filters still work
- Gallery still works
- All 205 gallery images load

**Phase 5: Performance Tests**
- Rendering time < 100ms for 500 notes
- Migration completes in < 5 minutes for 500 notes
- Tree traversal performance
- IndexedDB query performance

---

## SECTION 9: DATA PRESERVATION VALIDATION

### 9.1 Interaction Review

**Components in the System**:
1. Permanent category IDs (`cat-uuid-001`)
2. `category_node_id` (primary note-category link)
3. Legacy category fields (frozen snapshots)
4. Full hierarchy identifiers (`M-SC1-Sc1`)
5. Compact identifiers (`M-Sc1`)
6. Rollback archives (independent preservation)
7. Post-migration note creation/editing

---

### 9.2 Potential Conflicts Analysis

**Conflict 1: Legacy Fields vs category_node_id**

**Scenario**: Note moved after migration. Legacy `category_path` shows old location, `category_node_id` shows new location.

**Resolution** (APPROVED):
- ✅ Legacy fields remain frozen (not updated)
- ✅ Display uses `category_node_id` + tree traversal (always current)
- ✅ Legacy fields serve as archival snapshot only
- ❌ No competing source of truth

**Status**: ✅ Resolved by Section 2 (Legacy Field Strategy)

---

**Conflict 2: Compact Identifier Ambiguity**

**Scenario**: Multiple categories have compact identifier `M-Sc1` in different branches.

**Resolution** (APPROVED):
- ✅ Permanent IDs are source of truth (unique)
- ✅ Compact identifiers are display-only
- ✅ UI shows full context (breadcrumbs, full paths)
- ❌ Never use compact identifiers for queries or operations

**Status**: ✅ Resolved by Section 1.1 (Locked Decision)

---

**Conflict 3: Rollback Archive vs Restored Data**

**Scenario**: User rolls back with Auto-Preserve. Preservation category added to backup. Is this competing data?

**Resolution** (APPROVED):
- ✅ Preservation archive exists independently in IndexedDB (separate store)
- ✅ Preservation category in restored data clearly marked (📦 emoji, special name)
- ✅ User explicitly chose Auto-Preserve (aware of preservation)
- ✅ Notes in preservation category are real notes in restored system
- ❌ No hidden or competing data

**Status**: ✅ Resolved by Section 3 (Rollback Strategy)

---

**Conflict 4: Post-Migration Edits in Rollback**

**Scenario**: User edits note after migration, then rolls back. Which version preserved?

**Resolution** (APPROVED):
- ✅ Both versions preserved:
  - Original (from backup)
  - Edited (from preservation archive)
- ✅ Edited version gets new ID to avoid conflict
- ✅ Edited version clearly labeled "(Edited Version)"
- ✅ User sees both and can choose

**Status**: ✅ Resolved by Section 3.2 (Auto-Preserve Implementation)

---

**Conflict 5: Category Reconciliation Ambiguity**

**Scenario**: New note was in `["Kitchen", "Recipes", "Desserts"]` (new system). Old system only has `["Kitchen", "Recipes"]`. Where to place note?

**Resolution** (APPROVED):
- ✅ Three-tier fallback matching:
  1. Exact match (if exists)
  2. Partial match (deepest common ancestor)
  3. Preservation folder (if no match)
- ✅ User notified of original location
- ✅ User can manually recategorize
- ❌ Never silent assignment to wrong category

**Status**: ✅ Resolved by Section 3.8 (Category Reconciliation)

---

### 9.3 Unresolved Technical Details

**After comprehensive review**: All potential conflicts identified have approved resolutions.

**No items require additional user approval at this time.**

---

## SECTION 10: IMPLEMENTATION PHASES

*(Content from Version 3.2 preserved — see original document for 9-phase implementation plan)*

**Total Estimated Duration**: 37-52 development days (7-10 weeks)

**Critical Path**: Phase 1-4 (foundation) must complete before Phase 5-8 (recursive branches)

---

## SECTION 11: FILES REQUIRING MODIFICATION

*(Content from Version 3.2 preserved — see original document for complete file list)*

**Summary**:
- 6 existing files to modify
- 5 new files to create
- All styling/animation files preserved (no changes)
- All 205 gallery images preserved

---

## 📋 SECTION 12: VERSION 3.3 SUMMARY

### 12.1 What Changed in Version 3.3

**New in This Version**:
1. ✅ **Legacy Field Strategy** (Section 2)
   - 4-phase hybrid approach approved
   - Read-only frozen snapshots
   - Minimum 12-month retention
   - Validation requirements for eventual removal

2. ✅ **Enhanced Rollback Strategy** (Section 3)
   - Three-option strategy (Auto-Preserve, Archive, Discard)
   - Independent preservation archives
   - Category reconciliation algorithm
   - Indefinite archive retention (no auto-expiration)

3. ✅ **Migration Trigger Design** (Section 6)
   - Prominent non-blocking banner
   - Permanent Settings entry
   - Never automatic, user-initiated only

4. ✅ **Testing Strategy** (Section 8)
   - Synthetic test data first
   - Comprehensive test scenario list (40+ scenarios)
   - No user data access without permission

5. ✅ **Data Preservation Validation** (Section 9)
   - All potential conflicts reviewed
   - All conflicts resolved
   - No unresolved technical details

**Preserved from Version 3.2**:
- All locked architectural decisions (Section 1)
- Plus button placement (Section 4)
- Identifier conventions (Section 5)
- Migration algorithm (Section 7)
- Implementation phases (Section 10)
- File modification list (Section 11)

---

### 12.2 Authorization Status

**✅ AUTHORIZED** (Architecture Design):
- Complete architectural specification Version 3.3
- Legacy field retention strategy
- Enhanced rollback with preservation
- Migration trigger design
- Testing strategy

**❌ NOT AUTHORIZED** (Implementation):
- Writing JavaScript or React code
- Modifying CSS, layouts, styling
- Modifying IndexedDB or user data
- Running migrations
- Publishing or deploying application
- Beginning implementation planning

---

### 12.3 Next Steps

**Required from User**:
1. Review Version 3.3 architecture specification
2. Review Version 3.3 report (separate document)
3. Approve or request changes
4. If approved: Provide explicit implementation authorization

**After User Approval**:
1. Create detailed Phase 1 implementation plan
2. Present plan for user approval
3. Begin Phase 1 (Migration Infrastructure)
4. Present completed Phase 1 for review before Phase 2

**IRON RABBIT BOUNDARY remains in effect** until explicit implementation authorization provided.

---

## 🛑 DOCUMENT STATUS

**Version**: 3.3 FINAL  
**Date**: December 2025  
**Status**: ✅ ARCHITECTURE COMPLETE — AWAITING USER REVIEW  
**Authorization**: ❌ NO IMPLEMENTATION  
**Next Action**: USER REVIEW AND APPROVAL  

---

**This document supersedes**:
- Version 3.2 FINAL
- All earlier specifications
- Any conflicting information

**This is the FINAL architectural specification (Version 3.3)** for implementation.

---

**END OF SPECIFICATION VERSION 3.3**
