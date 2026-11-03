# COMPLETE CODE REVIEW: DEFECTS & CORRECTIONS (PARTS A-D)
**Review Document for Approval**  
**No Implementation - Code Review Only**

---

## PART 1: COMPLETE DEFECT REPORT

### DEFECT SUMMARY BY SEVERITY

**CRITICAL (System-Breaking)**:
1. Duplicate ID generation in child processing
2. No transaction handling for note updates
3. Unconditional reparenting of ALL children
4. Circular reference infinite loops
5. No rollback data preservation
6. Self-parenting possibility
7. No SC vs L distinction in UI

**HIGH (Data Integrity)**:
1. No uniqueness validation
2. Parent-child bidirectional inconsistency
3. No validation before tree commit
4. Unsafe array mutation (splice)
5. No change reconciliation in rollback
6. No confirmation preview for reparenting
7. Multiple ID generation collision risks
8. Missing parent preservation

**MEDIUM (Quality & UX)**:
1. Partial path handling
2. Ambiguous path detection
3. Incomplete verification
4. No operation journal
5. No level calculation cache
6. Missing node handling
7. Resume capability
8. Orphaned node detection

**LOW (Minor)**:
1. Accordion state persistence confusion

**Total**: 26 defects identified

---

## PART 2: ORIGINAL vs CORRECTED CODE

### A. NODE ID GENERATION - DETAILED COMPARISON

#### ORIGINAL DEFECTIVE CODE:

```javascript
async function convertTreeToFlatMap(oldTree) {
  const nodes = {};
  const rootIds = [];
  
  function traverse(oldNode, parentId = null, oldPath = []) {
    // DEFECT 1: ID generation without uniqueness check
    const nodeId = oldNode.id || `node-migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // DEFECT 2: Children IDs generated BEFORE traversal
    const childrenIds = [];
    if (oldNode.children) {
      Object.values(oldNode.children).forEach(child => {
        // ID generated here
        const childId = child.id || `node-migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        childrenIds.push(childId);  // ← Different ID pushed
      });
    }
    
    nodes[nodeId] = {
      id: nodeId,
      type: parentId === null ? "M" : "L",
      name: oldNode.name,
      parent_id: parentId,
      children_ids: childrenIds,  // ← References wrong IDs
      // ...
    };
    
    // DEFECT 3: Children traversed AFTER, generating NEW IDs
    if (oldNode.children) {
      Object.entries(oldNode.children).forEach(([childName, childNode]) => {
        traverse(childNode, nodeId, [...oldPath, childName]);  // ← Generates DIFFERENT IDs
      });
    }
    
    return nodeId;
  }
  
  // Process roots
  Object.entries(oldTree).forEach(([rootName, rootNode]) => {
    traverse(rootNode, null, [rootName]);
  });
  
  // DEFECT 4: No validation
  return { nodes, root_node_ids: rootIds };
}
```

**PROBLEMS**:
1. Child ID generated in line 12
2. Same child traversed in line 29, generates DIFFERENT ID
3. Parent's `children_ids` array has WRONG IDs
4. Children nodes have DIFFERENT IDs than parent expects
5. Result: **Complete parent-child relationship breakdown**

**EXAMPLE OF FAILURE**:
```javascript
// Input tree:
{ "Home": { id: "existing-1", children: { "Kitchen": { id: "existing-2" } } } }

// First loop (line 12): generates childId = "node-migrated-1702000001-abc123"
// children_ids = ["node-migrated-1702000001-abc123"]

// Second loop (line 29): traverse(Kitchen) generates DIFFERENT ID
// nodeId = "node-migrated-1702000001-def456" (time advanced, different random)

// Result:
nodes = {
  "existing-1": {
    children_ids: ["node-migrated-1702000001-abc123"]  // ← WRONG
  },
  "node-migrated-1702000001-def456": {  // ← Kitchen has DIFFERENT ID
    parent_id: "existing-1"
  }
}

// Parent thinks child is "abc123", but child is actually "def456"
// RELATIONSHIP BROKEN
```

---

#### CORRECTED CODE WITH DETAILED EXPLANATION:

```javascript
/**
 * CORRECTED: Convert nested tree to flat node map
 * 
 * KEY IMPROVEMENTS:
 * 1. ID generated ONCE per node during traversal
 * 2. Uniqueness registry prevents collisions
 * 3. Children traversed BEFORE parent created
 * 4. Full bidirectional validation
 * 5. Preserves existing valid IDs
 */
async function convertTreeToFlatMap(oldTree) {
  const nodes = {};
  const rootIds = [];
  
  // IMPROVEMENT 1: ID Registry for uniqueness
  const idRegistry = new Set();
  
  /**
   * Generate guaranteed-unique ID
   * 
   * HOW IT WORKS:
   * 1. Check if existing ID is valid and unique
   * 2. If not, generate new ID with collision detection
   * 3. Add to registry immediately
   * 4. Retry up to 1000 times if collision (safety)
   */
  function generateUniqueId(baseName, existingId = null) {
    // IMPROVEMENT 2: Preserve existing IDs if valid
    if (existingId && typeof existingId === 'string' && existingId.trim()) {
      if (!idRegistry.has(existingId)) {
        idRegistry.add(existingId);  // ← Register immediately
        return existingId;
      }
      console.warn(`Duplicate ID detected: ${existingId}, generating new ID`);
    }
    
    // IMPROVEMENT 3: Collision-resistant ID generation
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const slug = baseName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substr(0, 20);
    
    let attempt = 0;
    let candidateId;
    
    do {
      const suffix = attempt > 0 ? `-${attempt}` : '';
      candidateId = `node-migrated-${slug}-${timestamp}${suffix}-${random}`;
      attempt++;
      
      if (attempt > 1000) {
        throw new Error(`Cannot generate unique ID for: ${baseName}`);
      }
    } while (idRegistry.has(candidateId));  // ← Check registry
    
    idRegistry.add(candidateId);  // ← Register before returning
    return candidateId;
  }
  
  /**
   * IMPROVEMENT 4: Children processed BEFORE parent
   * 
   * WHY: This ensures child IDs exist before parent references them
   */
  function traverse(oldNode, parentId = null, oldPath = []) {
    // Step 1: Generate ID ONCE
    const nodeId = generateUniqueId(oldNode.name, oldNode.id);
    console.log(`[TreeConvert] Node "${oldNode.name}" assigned ID: ${nodeId}`);
    
    // Step 2: Determine type
    let type = "L";
    if (parentId === null) {
      type = "M";
    }
    
    // Step 3: RECURSE TO CHILDREN FIRST (critical fix)
    const childrenIds = [];
    if (oldNode.children && typeof oldNode.children === 'object') {
      for (const [childName, childNode] of Object.entries(oldNode.children)) {
        // ← Child traversed here, ID generated in recursive call
        const childId = traverse(childNode, nodeId, [...oldPath, childName]);
        childrenIds.push(childId);  // ← Pushes ACTUAL child ID
        console.log(`[TreeConvert]   Child "${childName}" ID: ${childId}`);
      }
    }
    
    // Step 4: Create node AFTER children processed
    nodes[nodeId] = {
      id: nodeId,
      type: type,
      name: oldNode.name || "Unnamed",
      parent_id: parentId,
      children_ids: childrenIds,  // ← Now has CORRECT IDs
      accordion_open: false,
      created_at: oldNode.created_at || new Date().toISOString(),
      updated_at: oldNode.updated_at || new Date().toISOString(),
      _legacy_path: oldPath.join(' > ')  // Debug info
    };
    
    // Step 5: Track roots
    if (parentId === null) {
      rootIds.push(nodeId);
    }
    
    return nodeId;  // ← Return ID so parent can reference it
  }
  
  // Process all roots
  if (!oldTree || typeof oldTree !== 'object') {
    throw new Error('Invalid tree structure');
  }
  
  for (const [rootName, rootNode] of Object.entries(oldTree)) {
    if (rootNode && typeof rootNode === 'object') {
      traverse(rootNode, null, [rootName]);
    }
  }
  
  // IMPROVEMENT 5: Validation before returning
  console.log('[TreeConvert] Validating tree integrity...');
  const validation = validateTreeIntegrity(nodes, rootIds);
  
  if (!validation.valid) {
    throw new Error(`Tree validation failed: ${JSON.stringify(validation.errors)}`);
  }
  
  console.log('[TreeConvert] ✅ Validation passed');
  console.log(`[TreeConvert] Total nodes: ${Object.keys(nodes).length}`);
  console.log(`[TreeConvert] Root nodes: ${rootIds.length}`);
  
  return {
    nodes,
    root_node_ids: rootIds,
    version: "2.0.0",
    migrated_at: new Date().toISOString(),
    validation_passed: true
  };
}
```

**HOW THE UNIQUE ID REGISTRY WORKS**:

```javascript
// Example execution trace:

// Initial state:
idRegistry = Set([])

// Node 1: "School Supplies" with existing ID
generateUniqueId("School Supplies", "cat-old-123")
  → Check: idRegistry.has("cat-old-123")? No
  → Add: idRegistry.add("cat-old-123")
  → Return: "cat-old-123"
  → idRegistry = Set(["cat-old-123"])

// Node 2: "Writing" no existing ID
generateUniqueId("Writing", null)
  → Generate: "node-migrated-writing-1702000001-abc123"
  → Check: idRegistry.has("node-migrated-writing-1702000001-abc123")? No
  → Add: idRegistry.add("node-migrated-writing-1702000001-abc123")
  → Return: "node-migrated-writing-1702000001-abc123"
  → idRegistry = Set(["cat-old-123", "node-migrated-writing-1702000001-abc123"])

// Node 3: Another "Writing" node (duplicate name, different location)
generateUniqueId("Writing", null)
  → Generate: "node-migrated-writing-1702000001-def456" (different random)
  → Check: idRegistry.has(...)? No (different suffix)
  → Add and return
  → Unique ID guaranteed even with same name

// Node 4: Duplicate existing ID
generateUniqueId("Pencils", "cat-old-123")  // Collision!
  → Check: idRegistry.has("cat-old-123")? YES (already used)
  → Warn: "Duplicate ID detected"
  → Generate new: "node-migrated-pencils-1702000002-ghi789"
  → Return new unique ID
```

---

### B. BIDIRECTIONAL VALIDATION - DETAILED EXPLANATION

```javascript
/**
 * IMPROVEMENT 6: Comprehensive tree integrity validation
 * 
 * VALIDATES:
 * 1. All parent_id references exist
 * 2. All children_ids references exist
 * 3. Bidirectional consistency (parent↔child)
 * 4. No circular references
 * 5. No self-parenting
 * 6. No orphaned nodes
 */
function validateTreeIntegrity(nodes, rootIds) {
  const errors = [];
  const visited = new Set();
  
  console.log('[Validation] Starting tree integrity check...');
  
  // CHECK 1: Root IDs are valid
  console.log('[Validation] Check 1: Validating root nodes...');
  for (const rootId of rootIds) {
    if (!nodes[rootId]) {
      errors.push({ 
        type: 'missing_root', 
        rootId,
        message: `Root node ${rootId} does not exist in nodes map`
      });
    }
  }
  
  // CHECK 2: Bidirectional parent-child consistency
  console.log('[Validation] Check 2: Validating parent-child relationships...');
  for (const [nodeId, node] of Object.entries(nodes)) {
    
    // 2a. Parent exists (except roots)
    if (node.parent_id !== null) {
      if (!nodes[node.parent_id]) {
        errors.push({ 
          type: 'invalid_parent_ref', 
          nodeId,
          node_name: node.name,
          parent_id: node.parent_id,
          message: `Node "${node.name}" references non-existent parent ${node.parent_id}`
        });
      } else {
        // 2b. Parent lists this child (BIDIRECTIONAL CHECK)
        const parent = nodes[node.parent_id];
        if (!parent.children_ids.includes(nodeId)) {
          errors.push({ 
            type: 'parent_missing_child', 
            nodeId,
            node_name: node.name,
            parent_id: node.parent_id,
            parent_name: parent.name,
            message: `Parent "${parent.name}" does not list child "${node.name}" in children_ids`
          });
        }
      }
    }
    
    // 2c. Children exist
    for (const childId of node.children_ids) {
      if (!nodes[childId]) {
        errors.push({ 
          type: 'invalid_child_ref', 
          nodeId,
          node_name: node.name,
          child_id: childId,
          message: `Node "${node.name}" references non-existent child ${childId}`
        });
      } else {
        // 2d. Child points back to this parent (BIDIRECTIONAL CHECK)
        const child = nodes[childId];
        if (child.parent_id !== nodeId) {
          errors.push({ 
            type: 'child_wrong_parent', 
            nodeId,
            node_name: node.name,
            child_id: childId,
            child_name: child.name,
            expected_parent: nodeId,
            actual_parent: child.parent_id,
            message: `Child "${child.name}" should point to parent "${node.name}" but points to ${child.parent_id}`
          });
        }
      }
    }
    
    // 2e. Self-parenting check
    if (node.parent_id === nodeId) {
      errors.push({ 
        type: 'self_parenting', 
        nodeId,
        node_name: node.name,
        message: `Node "${node.name}" lists itself as parent (infinite loop risk)`
      });
    }
  }
  
  // CHECK 3: Circular reference detection via DFS
  console.log('[Validation] Check 3: Detecting circular references...');
  
  function detectCycle(nodeId, ancestors = new Set()) {
    if (ancestors.has(nodeId)) {
      // Cycle detected
      const cycle = Array.from(ancestors).concat([nodeId]);
      const cycleNames = cycle.map(id => nodes[id]?.name || id);
      errors.push({ 
        type: 'circular_reference', 
        cycle: cycle,
        cycle_names: cycleNames,
        message: `Circular reference detected: ${cycleNames.join(' → ')}`
      });
      return;
    }
    
    if (visited.has(nodeId)) {
      return;  // Already checked
    }
    
    visited.add(nodeId);
    const node = nodes[nodeId];
    if (!node) return;
    
    const newAncestors = new Set(ancestors);
    newAncestors.add(nodeId);
    
    for (const childId of node.children_ids) {
      detectCycle(childId, newAncestors);
    }
  }
  
  for (const rootId of rootIds) {
    detectCycle(rootId);
  }
  
  // CHECK 4: Orphaned nodes (unreachable from roots)
  console.log('[Validation] Check 4: Detecting orphaned nodes...');
  const allNodeIds = new Set(Object.keys(nodes));
  const reachableIds = new Set(visited);
  const orphanedIds = [...allNodeIds].filter(id => !reachableIds.has(id));
  
  if (orphanedIds.length > 0) {
    const orphanedNames = orphanedIds.map(id => nodes[id]?.name || id);
    errors.push({ 
      type: 'orphaned_nodes', 
      node_ids: orphanedIds,
      node_names: orphanedNames,
      count: orphanedIds.length,
      message: `${orphanedIds.length} orphaned nodes found: ${orphanedNames.join(', ')}`
    });
  }
  
  // Results
  const stats = {
    total_nodes: Object.keys(nodes).length,
    root_nodes: rootIds.length,
    visited_nodes: visited.size,
    orphaned_nodes: orphanedIds.length,
    error_count: errors.length
  };
  
  if (errors.length > 0) {
    console.error('[Validation] ❌ FAILED with', errors.length, 'errors');
    errors.forEach(err => console.error(`  - ${err.type}: ${err.message}`));
  } else {
    console.log('[Validation] ✅ PASSED all checks');
  }
  
  console.log('[Validation] Stats:', stats);
  
  return {
    valid: errors.length === 0,
    errors,
    stats
  };
}
```

**BIDIRECTIONAL VALIDATION EXAMPLE**:

```javascript
// Example: Detect inconsistent relationship

nodes = {
  "node-a": {
    id: "node-a",
    name: "Parent",
    parent_id: null,
    children_ids: ["node-b", "node-c"]  // Claims to have 2 children
  },
  "node-b": {
    id: "node-b",
    name: "Child B",
    parent_id: "node-a",  // ✅ Correctly points to parent
    children_ids: []
  },
  "node-c": {
    id: "node-c",
    name: "Child C",
    parent_id: "node-x",  // ❌ Points to WRONG parent!
    children_ids: []
  }
}

// Validation catches this:
// Check 2d: Child "node-c" should point to "node-a" but points to "node-x"
// Error: { type: 'child_wrong_parent', ... }

// Without bidirectional validation, this corruption would go undetected
```

---

### C. BATCH PROCESSING & CHECKPOINTS

```javascript
/**
 * IMPROVEMENT 7: Batch processing with checkpoint/resume
 * 
 * HOW IT PREVENTS INCONSISTENT DATA:
 * 1. Processes notes in batches (e.g., 100 at a time)
 * 2. Validates entire batch before saving any
 * 3. Saves checkpoint after each successful batch
 * 4. Can resume from last checkpoint if interrupted
 * 5. All-or-nothing per batch (pseudo-transaction)
 */
async function migrateAllNotes(options = {}) {
  const {
    batchSize = 100,
    checkpoint = true,
    resume = true
  } = options;
  
  const tree = await getCategoryTree();
  const lookupData = buildNameToIdLookup(tree);
  const notes = await getAllNotes();
  
  const results = {
    total: notes.length,
    migrated: 0,
    errors: [],
    batches_completed: 0,
    start_time: new Date().toISOString()
  };
  
  // IMPROVEMENT 8: Resume from last checkpoint
  let startIndex = 0;
  if (resume && checkpoint) {
    const progress = await getMigrationProgress();
    if (progress) {
      startIndex = progress.last_note_index + 1;
      console.log(`[Migration] ✅ Resuming from note ${startIndex}`);
    }
  }
  
  // Process in batches
  for (let batchStart = startIndex; batchStart < notes.length; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, notes.length);
    const batch = notes.slice(batchStart, batchEnd);
    
    console.log(`[Migration] Batch ${results.batches_completed + 1}: notes ${batchStart}-${batchEnd - 1}`);
    
    // Step 1: Migrate all notes in batch (NO saves yet)
    const batchResults = [];
    for (const note of batch) {
      try {
        const result = await migrateNote(note, tree, lookupData, options);
        batchResults.push(result);
      } catch (err) {
        // Batch fails if any note fails
        console.error(`[Migration] ❌ Batch failed at note ${note.id}`);
        throw err;
      }
    }
    
    // Step 2: Validate all results
    const migrated = batchResults.filter(r => r.status === "migrated");
    for (const result of migrated) {
      // Validate each migrated note
      if (!result.note.category_node_path) {
        throw new Error(`Invalid migration result for note ${result.note.id}`);
      }
    }
    
    // Step 3: Save entire batch (all-or-nothing)
    try {
      await saveMigratedNotesBatch(migrated.map(r => r.note));
      results.migrated += migrated.length;
      results.batches_completed++;
      
      // Step 4: Checkpoint (save progress)
      if (checkpoint) {
        await saveMigrationProgress({
          last_note_index: batchEnd - 1,
          timestamp: new Date().toISOString(),
          notes_migrated: results.migrated
        });
        console.log(`[Migration] ✅ Checkpoint saved at note ${batchEnd - 1}`);
      }
    } catch (err) {
      console.error(`[Migration] ❌ CRITICAL: Batch save failed`);
      results.critical_error = {
        message: "Batch save failed",
        error: err.message,
        failed_at_index: batchEnd - 1
      };
      throw err;  // Stop migration
    }
  }
  
  results.end_time = new Date().toISOString();
  return results;
}
```

**HOW BATCH PROCESSING PROTECTS DATA**:

```javascript
// Scenario: Migration of 1000 notes, batch size 100

// Batch 1: Notes 0-99
//   1. Migrate note 0 → result
//   2. Migrate note 1 → result
//   ... (all in memory, no saves yet)
//   99. Migrate note 99 → result
//   100. Validate all 100 results
//   101. Save all 100 notes (pseudo-atomic)
//   102. If save succeeds → checkpoint(last_note_index: 99)
//   103. If save fails → throw error, stop migration

// Batch 2: Notes 100-199
//   (same process)

// --- Power failure at note 550 ---

// Resume:
//   1. Read checkpoint: last_note_index = 499
//   2. Start from note 500
//   3. Notes 0-499 already migrated ✅
//   4. Notes 500-999 will be processed
//   5. NO data corruption (batches 1-4 committed, batch 6 not started)

// Compare to individual saves (DEFECTIVE):
// --- Power failure at note 550 ---
//   1. Notes 0-549 migrated ❌
//   2. Notes 550-999 NOT migrated ❌
//   3. No checkpoint → restart from 0 → attempt to re-migrate notes 0-549
//   4. Already-migrated notes have new structure, original has old structure
//   5. INCONSISTENT DATA
```

---

### D. IMMUTABLE UPDATES

```javascript
/**
 * IMPROVEMENT 9: Immutable note updates
 * 
 * WHY: Prevents corruption if save fails
 */
async function migrateNote(note, tree, lookupData, options = {}) {
  // ... (path resolution) ...
  
  // CRITICAL: Create NEW object, don't mutate original
  const updatedNote = {
    ...note,  // ← Spread operator creates shallow copy
    category_node_path: nodePath,  // ← New field
    migration_version: "2.0.0",
    migrated_at: new Date().toISOString()
    
    // PRESERVATION: Legacy fields automatically included via ...note
    // category: note.category,
    // subcategory: note.subcategory,
    // category_path: note.category_path
  };
  
  // Original note object UNTOUCHED
  // If save fails, original note still intact in memory
  
  return { 
    status: "migrated", 
    note: updatedNote  // ← Return new object
  };
}
```

**IMMUTABLE vs MUTABLE COMPARISON**:

```javascript
// DEFECTIVE (Original): Mutable update
async function migrateNote_DEFECTIVE(note, tree, lookup) {
  // ... resolve path ...
  
  // MUTATES original object
  note.category_node_path = nodePath;  // ❌ Direct mutation
  note.migration_version = "2.0.0";
  
  await saveNote(note);  // ← If this fails...
  return { status: "migrated", note };  // ...note is already corrupted in memory
}

// Usage:
const myNote = { id: "123", title: "Test", category_path: ["Home"] };
const result = await migrateNote_DEFECTIVE(myNote, tree, lookup);
// If save failed, myNote is now corrupted:
// myNote.category_node_path exists but wasn't saved
// Can't retry migration cleanly


// CORRECTED: Immutable update
async function migrateNote_CORRECTED(note, tree, lookup) {
  // ... resolve path ...
  
  // CREATE new object
  const updatedNote = {
    ...note,  // ← Original preserved
    category_node_path: nodePath,
    migration_version: "2.0.0"
  };
  
  // Don't save here, return for batch processing
  return { status: "migrated", note: updatedNote };
}

// Usage:
const myNote = { id: "123", title: "Test", category_path: ["Home"] };
const result = await migrateNote_CORRECTED(myNote, tree, lookup);
// myNote is UNCHANGED
// result.note is NEW object
// Can retry safely if batch save fails
```

---

### E. PARTIAL PATH SUPPORT

```javascript
/**
 * IMPROVEMENT 10: Partial path support with missing segment handling
 * 
 * SCENARIOS:
 * 1. Full path exists → use it
 * 2. Partial path exists → use deepest match, log warning
 * 3. No path exists → mark as orphaned
 */
async function migrateNote(note, tree, lookupData, options = {}) {
  const { usePartialPath = true } = options;
  
  // ... extract legacy path ...
  // legacyPath = ["Home", "Kitchen", "Recipes", "Desserts"]
  
  const nodePath = [];
  let currentPath = [];
  let lastMatchedIndex = -1;
  
  for (let i = 0; i < legacyPath.length; i++) {
    const segment = legacyPath[i];
    currentPath.push(segment);
    const pathKey = currentPath.join('\u241E');
    const nodeId = lookup[pathKey];
    
    if (nodeId) {
      // Match found
      nodePath.push(nodeId);
      lastMatchedIndex = i;
      console.log(`[Migrate] ✅ Matched: ${currentPath.join(' > ')}`);
    } else {
      // Path not found
      console.warn(`[Migrate] ❌ Not found: ${currentPath.join(' > ')}`);
      
      if (usePartialPath && lastMatchedIndex >= 0) {
        // Use partial match
        console.warn(
          `[Migrate] Using partial path for note "${note.title}"`,
          `\n  Full path: ${legacyPath.join(' > ')}`,
          `\n  Matched:   ${legacyPath.slice(0, lastMatchedIndex + 1).join(' > ')}`,
          `\n  Missing:   ${legacyPath.slice(lastMatchedIndex + 1).join(' > ')}`
        );
        
        return {
          status: "partial_match",
          note_id: note.id,
          note: {
            ...note,
            category_node_path: nodePath,
            migration_version: "2.0.0",
            migration_note: "partial_path_used",
            full_path_intended: legacyPath,
            migrated_at: new Date().toISOString()
          },
          matched_depth: lastMatchedIndex + 1,
          missing_segments: legacyPath.slice(lastMatchedIndex + 1)
        };
      } else {
        // Cannot resolve
        return {
          status: "orphaned_path",
          note_id: note.id,
          legacy_path: legacyPath,
          note
        };
      }
    }
  }
  
  // Full match
  return { 
    status: "migrated", 
    note: {
      ...note,
      category_node_path: nodePath,
      migration_version: "2.0.0",
      migrated_at: new Date().toISOString()
    }
  };
}
```

**PARTIAL PATH EXAMPLE**:

```javascript
// Scenario: Note has path ["Home", "Kitchen", "Recipes", "Desserts"]
// But tree only has: Home → Kitchen → Recipes (Desserts missing)

// Iteration 1: Check "Home"
currentPath = ["Home"]
lookup["Home"] = "node-1" ✅ Found
nodePath = ["node-1"]
lastMatchedIndex = 0

// Iteration 2: Check "Home > Kitchen"
currentPath = ["Home", "Kitchen"]
lookup["Home\u241EKitchen"] = "node-2" ✅ Found
nodePath = ["node-1", "node-2"]
lastMatchedIndex = 1

// Iteration 3: Check "Home > Kitchen > Recipes"
currentPath = ["Home", "Kitchen", "Recipes"]
lookup["Home\u241EKitchen\u241ERecipes"] = "node-3" ✅ Found
nodePath = ["node-1", "node-2", "node-3"]
lastMatchedIndex = 2

// Iteration 4: Check "Home > Kitchen > Recipes > Desserts"
currentPath = ["Home", "Kitchen", "Recipes", "Desserts"]
lookup["Home\u241EKitchen\u241ERecipes\u241EDesserts"] = undefined ❌ Not found

// usePartialPath = true, lastMatchedIndex = 2 (≥ 0)
// → Use partial match
// → nodePath = ["node-1", "node-2", "node-3"]
// → Note migrated to "Recipes" level instead of "Desserts"
// → Logged as partial match for manual review

// Result:
{
  status: "partial_match",
  note: {
    ...originalNote,
    category_node_path: ["node-1", "node-2", "node-3"],
    migration_note: "partial_path_used",
    full_path_intended: ["Home", "Kitchen", "Recipes", "Desserts"]
  },
  matched_depth: 3,
  missing_segments: ["Desserts"]
}

// Manual review report will show:
// "Note 'My Dessert Recipe' intended for Desserts but migrated to Recipes"
// User can then:
// 1. Create "Desserts" node under "Recipes"
// 2. Re-run migration for this note
```

---

