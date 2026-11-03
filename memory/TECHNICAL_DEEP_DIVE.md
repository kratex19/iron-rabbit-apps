# TECHNICAL DEEP-DIVE: RECOVERY, ROLLBACK, AND CONCURRENCY
**Date**: November 3, 2026  
**Status**: Pre-Approval Technical Analysis

---

## 1. PSEUDO-TRANSACTIONAL BATCH RECOVERY SYSTEM

### How Crash Recovery Works

#### A. Checkpoint Mechanism

**Data Stored in IndexedDB `settings` Store**:
```javascript
// Checkpoint structure
{
  migration_progress: {
    last_note_index: 299,           // Last successfully migrated note
    timestamp: "2026-11-03T21:00:00Z",
    notes_migrated: 300,            // Total count
    batches_completed: 3,           // Batch 1: 0-99, Batch 2: 100-199, Batch 3: 200-299
    batch_size: 100,
    migration_started_at: "2026-11-03T20:55:00Z",
    migration_version: "2.0.0"
  }
}
```

#### B. Recovery Flow After Crash

**Step-by-Step Process**:

1. **Application Restarts**
   ```javascript
   // On app initialization
   const progress = await db.settings.get('migration_progress');
   ```

2. **Detect Incomplete Migration**
   ```javascript
   if (progress && progress.notes_migrated < totalNotes) {
     // Migration was interrupted
     showMigrationResumePrompt();
   }
   ```

3. **User Chooses to Resume**
   ```javascript
   await migrateAllNotes({ 
     resume: true,      // Read checkpoint
     batchSize: 100     // Same as original
   });
   ```

4. **Batch Processing Resumes**
   ```javascript
   // Inside migrateAllNotes()
   let startIndex = 0;
   if (resume && checkpoint) {
     const progress = await getMigrationProgress();
     if (progress) {
       startIndex = progress.last_note_index + 1;  // Resume from 300
     }
   }
   
   // Continue from note 300 onwards
   for (let batchStart = startIndex; ...) {
     // Process remaining batches
   }
   ```

#### C. Crash Scenarios and Outcomes

**Scenario 1: Crash During Batch Processing (In-Memory)**
```
State:
- Batch 1 (0-99): ✅ Committed to IndexedDB
- Batch 2 (100-199): ✅ Committed to IndexedDB
- Batch 3 (200-299): ✅ Committed to IndexedDB
- Batch 4 (300-399): ⚠️ IN MEMORY (not yet saved)
- Checkpoint: last_note_index = 299

Crash occurs →

Recovery:
- Notes 0-299: Already migrated ✅
- Notes 300-399: Lost from memory, NOT migrated ❌
- Resume from index 300
- Batch 4 re-processed from scratch
- No data corruption (batch 4 was never saved)
```

**Scenario 2: Crash During IndexedDB Write**
```
State:
- Batch 4 (300-399): Validated, calling saveMigratedNotesBatch()
- IndexedDB transaction started but not committed

Crash occurs →

Outcome:
- IndexedDB transaction auto-rolled back by browser
- Notes 300-399 NOT saved
- Checkpoint still at last_note_index = 299
- Resume from index 300
- Batch 4 re-processed
```

**Scenario 3: Crash After Save, Before Checkpoint**
```
State:
- Batch 4 (300-399): ✅ Committed to IndexedDB
- Checkpoint update started but not completed

Crash occurs →

Outcome:
- Notes 300-399 ARE migrated ✅
- Checkpoint still at last_note_index = 299 ❌
- Resume from index 300
- Batch 4 re-processed → Duplicate migration attempt

⚠️ PROBLEM: Notes 300-399 will be re-migrated
```

#### D. Idempotency Protection

**Problem**: Scenario 3 causes duplicate migration.

**Solution**: Check if note is already migrated before processing.

```javascript
async function migrateNote(note, tree, lookupData, options = {}) {
  // IDEMPOTENCY CHECK (not in current Parts A-E)
  if (note.migration_version === "2.0.0" && note.category_node_path) {
    console.log(`[Migrate] Note ${note.id} already migrated, skipping`);
    return { 
      status: "already_migrated", 
      note 
    };
  }
  
  // ... rest of migration logic ...
}
```

**Current Status**: ⚠️ **NOT IMPLEMENTED** in Parts A-E.  
**Risk**: Duplicate migration if crash occurs after save but before checkpoint.  
**Mitigation**: Needed in Parts F-L.

#### E. What Happens to Partially-Migrated Data

**Guaranteed Properties**:
1. ✅ All notes in completed batches are fully migrated
2. ✅ All notes in incomplete batches are NOT migrated
3. ✅ No "half-migrated" notes (either has `category_node_path` or doesn't)
4. ❌ No automatic rollback of completed batches

**Example State After Crash**:
```javascript
// Notes 0-299: Migrated
{
  id: "note-123",
  title: "Example",
  category_path: ["Home", "Kitchen"],           // Legacy (preserved)
  category_node_path: ["node-1", "node-5"],     // ✅ New field
  migration_version: "2.0.0",                    // ✅ Migrated
  migrated_at: "2026-11-03T20:58:15Z"
}

// Notes 300+: Not migrated
{
  id: "note-456",
  title: "Example 2",
  category_path: ["Home", "Bedroom"],           // Legacy
  // ❌ No category_node_path
  // ❌ No migration_version
}
```

**User Options After Crash**:
1. **Resume Migration**: Continue from last checkpoint
2. **Full Rollback**: Restore from pre-migration snapshot (requires snapshot feature)
3. **Manual Fix**: Edit notes 0-299 manually if needed

---

## 2. COMPLETE ROLLBACK SNAPSHOT STRATEGY

### Current Status: ⚠️ NOT IMPLEMENTED

**Parts A-E do NOT include rollback snapshot logic.**  
**This must be added in Parts F-L.**

### Proposed Complete Strategy

#### A. Pre-Migration Snapshot Creation

**What to Snapshot**:
```javascript
{
  snapshot_id: "snapshot-2026-11-03-210000",
  created_at: "2026-11-03T21:00:00Z",
  
  // 1. Complete category tree (before conversion)
  category_tree_backup: {
    "Home": {
      id: "cat-old-1",
      name: "Home",
      children: {
        "Kitchen": { ... }
      }
    }
  },
  
  // 2. All notes with legacy fields
  notes_backup: [
    {
      id: "note-1",
      title: "Test",
      category: "Home",
      subcategory: "Kitchen",
      category_path: ["Home", "Kitchen"],
      // ... all other fields
    }
    // ... all notes
  ],
  
  // 3. Global settings
  settings_backup: {
    root_node_ids: [...],
    nodes: {...},
    // ... other settings
  },
  
  // 4. Metadata
  metadata: {
    total_notes: 1000,
    total_categories: 50,
    snapshot_size_bytes: 5242880,
    migration_version_before: "1.0.0"
  }
}
```

**Storage Location**: IndexedDB `snapshots` object store (new)

**Implementation**:
```javascript
async function createPreMigrationSnapshot() {
  const db = await openDB();
  
  console.log('[Snapshot] Creating pre-migration snapshot...');
  
  // 1. Read current category tree
  const settings = await db.settings.get('app_settings');
  const categoryTreeBackup = JSON.parse(JSON.stringify(settings.category_tree));
  
  // 2. Read all notes
  const notesBackup = await db.notes.toArray();
  
  // 3. Create snapshot object
  const snapshot = {
    snapshot_id: `snapshot-${Date.now()}`,
    created_at: new Date().toISOString(),
    category_tree_backup: categoryTreeBackup,
    notes_backup: notesBackup,
    settings_backup: {
      root_node_ids: settings.root_node_ids || [],
      nodes: settings.nodes || {}
    },
    metadata: {
      total_notes: notesBackup.length,
      total_categories: Object.keys(categoryTreeBackup).length,
      snapshot_size_bytes: JSON.stringify(notesBackup).length,
      migration_version_before: settings.migration_version || "1.0.0"
    }
  };
  
  // 4. Save snapshot
  await db.snapshots.put(snapshot, snapshot.snapshot_id);
  
  // 5. Save snapshot ID in settings for easy access
  await db.settings.put({
    ...settings,
    last_snapshot_id: snapshot.snapshot_id
  }, 'app_settings');
  
  console.log(`[Snapshot] ✅ Created: ${snapshot.snapshot_id}`);
  console.log(`[Snapshot] Size: ${(snapshot.metadata.snapshot_size_bytes / 1024 / 1024).toFixed(2)} MB`);
  
  return snapshot.snapshot_id;
}
```

#### B. Rollback Execution

**Full Rollback Process**:
```javascript
async function rollbackToSnapshot(snapshotId) {
  const db = await openDB();
  
  console.log(`[Rollback] Starting rollback to ${snapshotId}...`);
  
  // 1. Retrieve snapshot
  const snapshot = await db.snapshots.get(snapshotId);
  if (!snapshot) {
    throw new Error(`Snapshot ${snapshotId} not found`);
  }
  
  console.log(`[Rollback] Snapshot found: ${snapshot.metadata.total_notes} notes`);
  
  // 2. Confirmation prompt (UI)
  const confirmed = await showRollbackConfirmation({
    snapshotDate: snapshot.created_at,
    noteCount: snapshot.metadata.total_notes,
    categoryCount: snapshot.metadata.total_categories
  });
  
  if (!confirmed) {
    console.log('[Rollback] User cancelled');
    return { success: false, reason: 'user_cancelled' };
  }
  
  try {
    // 3. Create backup of CURRENT state (before rollback)
    const preRollbackSnapshot = await createPreMigrationSnapshot();
    console.log(`[Rollback] Current state backed up: ${preRollbackSnapshot}`);
    
    // 4. Restore category tree
    const settings = await db.settings.get('app_settings');
    settings.category_tree = snapshot.category_tree_backup;
    settings.root_node_ids = snapshot.settings_backup.root_node_ids || [];
    settings.nodes = snapshot.settings_backup.nodes || {};
    settings.migration_version = snapshot.metadata.migration_version_before;
    await db.settings.put(settings, 'app_settings');
    console.log('[Rollback] ✅ Category tree restored');
    
    // 5. Restore notes (batch processing)
    const batchSize = 100;
    let restoredCount = 0;
    
    for (let i = 0; i < snapshot.notes_backup.length; i += batchSize) {
      const batch = snapshot.notes_backup.slice(i, i + batchSize);
      
      // Delete new fields, restore to original state
      const cleanedNotes = batch.map(note => {
        const { category_node_path, migration_version, migrated_at, ...original } = note;
        return original;
      });
      
      await db.notes.bulkPut(cleanedNotes);
      restoredCount += cleanedNotes.length;
      console.log(`[Rollback] Restored ${restoredCount}/${snapshot.notes_backup.length} notes`);
    }
    
    console.log('[Rollback] ✅ All notes restored');
    
    // 6. Clear migration progress
    await db.settings.delete('migration_progress');
    console.log('[Rollback] ✅ Migration progress cleared');
    
    // 7. Mark rollback complete
    await db.settings.put({
      rollback_completed_at: new Date().toISOString(),
      rollback_from_snapshot: snapshotId,
      rollback_to_snapshot: preRollbackSnapshot
    }, 'last_rollback');
    
    console.log('[Rollback] ✅ ROLLBACK COMPLETE');
    
    return {
      success: true,
      notes_restored: restoredCount,
      categories_restored: Object.keys(snapshot.category_tree_backup).length,
      snapshot_id: snapshotId
    };
    
  } catch (error) {
    console.error('[Rollback] ❌ FAILED:', error);
    throw new Error(`Rollback failed: ${error.message}`);
  }
}
```

#### C. Note and Category Relationship Restoration

**How Legacy Relationships Are Restored**:

1. **Category Tree**:
   ```javascript
   // BEFORE MIGRATION (restored state)
   settings.category_tree = {
     "Home": {
       id: "cat-old-1",
       children: {
         "Kitchen": { id: "cat-old-2", children: {} }
       }
     }
   }
   ```

2. **Note References**:
   ```javascript
   // BEFORE MIGRATION (restored state)
   {
     id: "note-123",
     category_path: ["Home", "Kitchen"],  // ✅ Restored
     // category_node_path: REMOVED
     // migration_version: REMOVED
   }
   ```

3. **Display Logic**:
   - Application reverts to using `category_path` array
   - CategoryPathAccordion component reads `category_path` (not `category_node_path`)
   - All notes appear in their original categories

**Key Properties**:
- ✅ 100% restoration of original data structure
- ✅ All new fields removed (category_node_path, migration_version, migrated_at)
- ✅ Legacy fields preserved (category, subcategory, category_path)
- ✅ No data loss (snapshot is deep copy, not reference)

#### D. Snapshot Storage Considerations

**Storage Requirements**:
```
Typical Dataset:
- 1,000 notes × ~5 KB per note = 5 MB
- 200 categories × ~1 KB = 200 KB
- Total snapshot size: ~5.2 MB

IndexedDB Limits:
- Chrome: 60% of available disk space (hundreds of GB typically)
- Firefox: 2 GB per origin
- Safari: 1 GB per origin

Conclusion: Storage is not a constraint for typical datasets
```

**Snapshot Retention Policy**:
```javascript
// Keep last 3 snapshots, delete older ones
async function cleanupOldSnapshots(keepCount = 3) {
  const db = await openDB();
  const allSnapshots = await db.snapshots.toArray();
  
  // Sort by created_at DESC
  allSnapshots.sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
  
  // Delete all except last 3
  for (let i = keepCount; i < allSnapshots.length; i++) {
    await db.snapshots.delete(allSnapshots[i].snapshot_id);
    console.log(`[Cleanup] Deleted snapshot: ${allSnapshots[i].snapshot_id}`);
  }
}
```

---

## 3. CONCURRENT MODIFICATION DETECTION & PREVENTION

### Current Status: ⚠️ NOT IMPLEMENTED

**Parts A-E do NOT include any concurrency protection.**

### The Multi-Tab Problem

**Scenario**:
```
Tab A: Running migration (migrateAllNotes in progress)
Tab B: User editing note #456
Tab C: User creating new category "Garden"

Conflicts:
1. Tab A tries to migrate note #456 → reads old data
2. Tab B saves edit to note #456 → writes new data
3. Tab A completes batch, saves note #456 → OVERWRITES Tab B's edit
4. Result: User's edit in Tab B is LOST
```

### Detection Strategies

#### A. Migration Lock (Exclusive Access)

**Implementation**:
```javascript
// Acquire migration lock before starting
async function acquireMigrationLock() {
  const db = await openDB();
  const lockKey = 'migration_lock';
  
  // Try to acquire lock
  const existingLock = await db.settings.get(lockKey);
  
  if (existingLock && existingLock.locked_at) {
    const lockAge = Date.now() - new Date(existingLock.locked_at).getTime();
    
    // Lock is stale (older than 5 minutes) → assume crash, steal lock
    if (lockAge > 5 * 60 * 1000) {
      console.warn('[Lock] Stale lock detected, stealing');
      await db.settings.delete(lockKey);
    } else {
      // Lock is held by another tab
      throw new Error('Migration already in progress in another tab');
    }
  }
  
  // Acquire lock
  const lock = {
    locked_at: new Date().toISOString(),
    tab_id: `tab-${Math.random().toString(36).substr(2, 9)}`,
    pid: process.pid || 'unknown'
  };
  
  await db.settings.put(lock, lockKey);
  console.log(`[Lock] ✅ Acquired: ${lock.tab_id}`);
  
  return lock.tab_id;
}

// Release lock after migration
async function releaseMigrationLock(tabId) {
  const db = await openDB();
  const lockKey = 'migration_lock';
  
  const existingLock = await db.settings.get(lockKey);
  
  if (existingLock && existingLock.tab_id === tabId) {
    await db.settings.delete(lockKey);
    console.log(`[Lock] ✅ Released: ${tabId}`);
  } else {
    console.warn(`[Lock] Cannot release: lock held by ${existingLock?.tab_id}`);
  }
}
```

**Usage**:
```javascript
async function migrateAllNotes(options = {}) {
  let lockId;
  
  try {
    // Acquire lock
    lockId = await acquireMigrationLock();
    
    // ... migration logic ...
    
  } catch (error) {
    if (error.message.includes('already in progress')) {
      // Show user-friendly error
      alert('Migration is already running in another tab. Please close other tabs and try again.');
      return { success: false, reason: 'concurrent_migration' };
    }
    throw error;
  } finally {
    // Always release lock
    if (lockId) {
      await releaseMigrationLock(lockId);
    }
  }
}
```

#### B. UI Blocking During Migration

**Full-Screen Modal Overlay**:
```javascript
// Show modal when migration starts
function showMigrationInProgressModal() {
  const modal = document.createElement('div');
  modal.id = 'migration-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.95);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: not-allowed;
  `;
  
  modal.innerHTML = `
    <div style="text-align: center; color: white;">
      <h2>⏳ Migration in Progress</h2>
      <p>Please do not close this tab or edit notes.</p>
      <p id="migration-progress">Processing batch 1...</p>
      <div class="spinner"></div>
    </div>
  `;
  
  // Prevent all user interactions
  modal.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  
  document.body.appendChild(modal);
  return modal;
}

// Update progress
function updateMigrationProgress(message) {
  const progress = document.getElementById('migration-progress');
  if (progress) progress.textContent = message;
}

// Remove modal when complete
function hideMigrationModal() {
  const modal = document.getElementById('migration-modal');
  if (modal) modal.remove();
}
```

#### C. Cross-Tab Communication (BroadcastChannel API)

**Notify All Tabs When Migration Starts**:
```javascript
// Create broadcast channel
const migrationChannel = new BroadcastChannel('iron_rabbit_migration');

// Tab A: Start migration
migrationChannel.postMessage({
  type: 'migration_started',
  timestamp: Date.now()
});

// Tab B, C, D: Receive message
migrationChannel.onmessage = (event) => {
  if (event.data.type === 'migration_started') {
    // Show read-only mode UI
    showReadOnlyBanner('Migration in progress in another tab. Edits are disabled.');
    disableAllEditButtons();
  }
  
  if (event.data.type === 'migration_completed') {
    // Re-enable editing
    hideReadOnlyBanner();
    enableAllEditButtons();
    // Reload data to show migrated state
    window.location.reload();
  }
};

// Tab A: Finish migration
migrationChannel.postMessage({
  type: 'migration_completed',
  timestamp: Date.now(),
  notes_migrated: 1000
});
```

#### D. Optimistic Locking (Version Numbers)

**Detect Concurrent Edits**:
```javascript
// Add version field to every note
{
  id: "note-123",
  title: "Example",
  version: 5,  // Incremented on every save
  // ...
}

// Before saving batch
async function saveMigratedNotesBatch(notes) {
  const db = await openDB();
  
  for (const migratedNote of notes) {
    // Re-read current version from DB
    const currentNote = await db.notes.get(migratedNote.id);
    
    if (currentNote.version !== migratedNote.version) {
      // Note was modified during migration!
      throw new Error(
        `Concurrent modification detected: Note ${migratedNote.id} ` +
        `(DB version ${currentNote.version}, migration version ${migratedNote.version})`
      );
    }
    
    // Increment version
    migratedNote.version = currentNote.version + 1;
  }
  
  // Save batch
  await db.notes.bulkPut(notes);
}
```

**Current Status**: ⚠️ **NOT IMPLEMENTED** - Notes don't have version field.

### Complete Prevention Strategy

**Recommended Multi-Layered Approach**:

1. **Layer 1: Migration Lock** (Prevents concurrent migrations)
2. **Layer 2: UI Blocking** (Prevents user edits during migration)
3. **Layer 3: Cross-Tab Communication** (Disables edits in all tabs)
4. **Layer 4: Optimistic Locking** (Detects any edits that slip through)

**Implementation Priority**:
- ✅ Layer 1 & 2: MUST HAVE (Layers 3 & 4 optional but recommended)

---

## 4. SUMMARY: WHAT PARTS A-E ACTUALLY IMPLEMENT

### ✅ Implemented:
1. Tree conversion with ID uniqueness
2. Bidirectional validation
3. Batch processing with checkpoints
4. Immutable note object creation
5. Partial path matching

### ❌ NOT Implemented (Required for Production):
1. Idempotency checks (prevent duplicate migration)
2. Pre-migration snapshot creation
3. Rollback to snapshot
4. Migration lock (concurrency control)
5. UI blocking during migration
6. Cross-tab communication
7. Optimistic locking (version numbers)

**Conclusion**: Parts A-E solve core algorithm problems but lack production-safety features.

---

**END OF TECHNICAL DEEP-DIVE**
