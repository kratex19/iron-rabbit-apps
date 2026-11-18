IRON RABBIT — REVISION 5.4
UNRESOLVED TECHNICAL QUESTIONS
Consolidated Technical Review Draft — Round 3 Corrections
Document Type: Open Questions, Assumptions, Architecture, and Recovery Safeguards
Revision: 5.4 — Consolidated Technical Review Draft
Status: NOT APPROVED — Awaiting independent Emergent review and user approval
Source: User-provided reconstructed Revision 5.4 document
Purpose: Record established requirements, verified source observations, proposed architecture, unresolved technical questions, and implementation restrictions.
0. DOCUMENT PROVENANCE AND STATUS
0.1 Reconstruction Notice
This document is a reconstruction based on Revision 5.3 source material and documented Revision 5.4 requirements.
It is NOT represented as a recovered copy of the original Revision 5.4 document delivered in a previous conversation.
The preservation of every original Revision 5.3 relationship, context, and nuance cannot be independently verified without the authoritative original Revision 5.4.
The source document reports that Revision 5.3 contained 546 lines and was used as the basis for Sections 1–7.
New Universal Hierarchy System architecture and recovery safeguards are documented as new material.
Preservation status: UNVERIFIED.
0.2 Status Definitions
VERIFIED: Supported by the source inspection specifically described in this document.
ESTABLISHED: Previously approved user requirement. Not reopened for preference or debate.
UNCONFIRMED: Evidence is insufficient.
ASSUMED: Reasonable possibility, not verified.
INVESTIGATE: Evidence exists but the relevant area has not been examined.
BLOCKED: Access or inspection is unauthorized.
PROPOSED: Design suggestion, not implemented or approved.
UNVERIFIED: Existence, feasibility, or behavior has not been demonstrated.
NOT APPROVED: A proposed design or mechanism that must not be treated as implementation authorization.
A proposed design must never be described as an existing application capability unless source evidence establishes that fact.
1. ESTABLISHED IRON RABBIT REQUIREMENTS
The following requirements are established and must be preserved.
1.1 Universal Hierarchy Requirements
Permanent Node Identity
Every category, subcategory, and hierarchy branch has a permanent unique identifier.
Identifiers survive rename, reparent, migration, backup, restore, export, and import.
Changing a label must not change node identity.
Identical labels under different parents represent distinct nodes.
Unlimited Conceptual Hierarchy Depth
The hierarchy supports unlimited conceptual depth.
No arbitrary fixed-depth restriction may be introduced into the data model or hierarchy operations.
Independent Category Colors
Each hierarchy node can maintain its own color.
A node's color must survive rename, reparent, backup, and restore.
Parent and child colors must not be forced to inherit from one another.
Blue Hierarchy Icon
The hierarchy UI retains the approved blue hierarchy icon.
Pinned Notes and Subcategories
Pinned items remain in their original hierarchy positions.
Pinned items also appear in a separate Pinned section as shortcuts.
Pinning does not move or duplicate the underlying item.
Uncategorized
Uncategorized is a permanent root node.
It is also available through a separate shortcut.
It is a first-class hierarchy category, not merely an empty or missing category state.
Green-Plus Insertion and Relative Renumbering
Preserve the approved insertion behavior.
Preserve relative renumbering.
A newly inserted SC may establish its own sublevel sequence.
Existing descendants must follow the approved insertion and reparenting behavior.
Storage implementation details remain subject to source inspection.
Main Category/Subcategory Accordion
Every Main Category and Subcategory is an accordion head.
M/SC accordion heads are collapsed by default.
Existing approved behavior must be preserved.
Edit Text Category Dropdown
The category dropdown in Edit Text remains unchanged.
Offline-First Operation
Preserve the offline-first IndexedDB architecture.
1.2 Additional Established Preservation Requirements
205 Gallery Images
All 205 gallery images must be preserved.
Gallery contents inspection is not authorized during the current documentation phase.
Complete Note Lifecycle Preservation
Backup and restore must preserve active, archived, deleted, and archived-then-deleted notes.
Both archived_at and deleted_at timestamps must be preserved exactly.
No lifecycle filtering may silently omit records.
These are 10 hierarchy requirements plus 2 additional preservation requirements: 12 established requirements in total.
2. PROPOSED UNIVERSAL HIERARCHY ARCHITECTURE
Status: PROPOSED — EXISTENCE IN CURRENT APPLICATION UNVERIFIED.
2.1 Three Separate Concepts
The proposed design distinguishes:
A. Global Category Tree
settings.category_tree
The application-wide hierarchy structure.
It is intended to define:
Permanent node IDs
Labels
Parent relationships
Ordering
Independent colors
Root node membership
Uncategorized root identity
Proposed example:
{
  nodes: {
    node_work: {
      id: "node_work",
      label: "Work",
      parent_id: null,
      order: 0,
      color: "#3B82F6"
    },
    node_projects: {
      id: "node_projects",
      label: "Projects",
      parent_id: "node_work",
      order: 0,
      color: "#16A34A"
    }
  },
  root_node_ids: ["node_work", "node_uncategorized"],
  uncategorized_node_id: "node_uncategorized"
}

This is a proposed schema, not a verified existing schema.
B. Individual Note Assignment
note.category_node_path
Proposed array of permanent node IDs identifying the note's position in the hierarchy.
Example:
["node_work", "node_projects"]

This field is proposed as the authoritative per-note hierarchy assignment.
Its existence in the current application is unverified.
C. Derived Human-Readable Representations
note.category_path
note.category
note.subcategory
These are proposed derived representations.
The proposed direction is:
category_node_path + category_tree → human-readable labels.
Labels must not be treated as permanent node identity.
2.2 Existing Implementation Observations
The supplied source-inspection record reports:
note.category_path exists as a string array.
A source comment in storageService.js describes it as authoritative.
category and subcategory mirror the first two elements.
localforage is used over IndexedDB.
Five stores were reported: notes, settings, templates, files, and metadata.
These observations are limited to the source inspection described in the supplied document. They have not been independently rechecked during this review.
The following remain unverified:
settings.category_tree
note.category_node_path
Permanent node ID generation
Node-based hierarchy operations
One-way derivation synchronization
2.3 Question 0.1 — Does the Node-ID Architecture Exist?
Status: UNVERIFIED.
Read-only source inspection is required to determine:
Whether the settings schema contains a global category tree.
Whether note records contain permanent node IDs.
Whether node IDs are generated.
Whether rename and reparent preserve node identity.
Whether UI components use node IDs or label strings.
No implementation should begin until the actual architecture is established.
3. INDEXEDDB ATOMICITY AND RECOVERY ARCHITECTURE
3.1 Question 0.2 — Multi-Store Transaction Feasibility
Status: UNVERIFIED — CRITICAL.
The proposed hierarchy operations may need to update:
The settings store containing the global tree.
Multiple notes in the notes store.
A recovery journal.
The technical question is whether one IndexedDB transaction can safely cover all required reads and writes.
Investigation must establish:
Whether the transaction can span all required object stores.
Whether transaction lifetime and browser behavior support the required operation.
Whether localforage exposes the necessary transaction control.
Whether raw IndexedDB access is required.
Whether all supported browsers provide the required guarantees.
How transaction aborts and failures are handled.
Do not assume that a series of successful individual writes constitutes an atomic multi-record operation.
3.2 Question 0.3 — Durable Recovery Journal
Status: PROPOSED — NOT IMPLEMENTED.
A recovery journal may record:
Operation ID and operation type.
Original tree state.
Intended tree state.
Affected note IDs.
Original note category fields.
Intended note category fields.
Baseline versions.
Operation-specific write identity.
Actual state discovered during recovery.
Classification results.
Recovery attempts and outcomes.
The journal records intended changes and available evidence. It does NOT prove that an operation completed.
Recovery must inspect actual stored state.
3.3 Version Counters Are Not Sufficient Alone
A version counter can identify that a record changed, but cannot independently establish which operation performed the change.
A version increment may result from:
A hierarchy operation.
A content edit.
A title edit.
An attachment update.
Synchronization.
Recovery.
A version delta is evidence, not proof of operation identity.
3.4 Atomic Conditional Write Requirement
A proposed atomic conditional write must perform the following within a transaction:
Read the current note.
Read and verify its expected version.
Verify operation-specific identity.
Abort on conflict.
Apply only the approved category-field changes.
Write the updated record.
Commit atomically or abort.
Ordinary read/check/write code is not an acceptable substitute.
Retries, timestamps, and BroadcastChannel messages do not independently provide atomicity.
BroadcastChannel is for notification and coordination, not locking.
Feasibility remains unverified.
3.5 Operation-Specific Write Identity
The proposed fields are:
note.last_write_operation_id
note.last_category_write_timestamp
The proposed last_write_operation_id tracks the last hierarchy operation that changed category fields. It is not intended to identify ordinary content edits.
Rules proposed:
A hierarchy operation updates the identity.
A non-category content edit preserves the identity.
A later hierarchy operation replaces the previous identity.
Recovery must use a distinct, explicitly defined recovery identity.
These fields are not verified as existing or implemented.
Recovery Identity Problem
The earlier proposal used:
"recovery_" + operationId

The classifier expected an exact match to the original operation ID.
These rules conflict.
A future design must explicitly distinguish:
Original operation.
First recovery attempt.
Subsequent recovery attempts.
Interrupted recovery.
Completed recovery.
Until this is resolved, automatic recovery after interruption during recovery must remain blocked.
4. RECOVERY CLASSIFICATION — CORRECTED PROPOSED RULES
Status: PROPOSED — NOT IMPLEMENTED OR TESTED.
4.1 Classification Labels
The proposed classification labels are:
written_by_this_operation
never_updated
concurrent_user_edit
another_operation
uncertain
unattributed_intervening_write
missing_or_unavailable
The label deleted must not be assigned merely because a lookup returns no record.
A missing lookup does not prove deletion.
4.2 Classification Confidence
Confidence levels:
High: Evidence meets the documented requirements for a reliable classification.
Medium: Evidence suggests a likely explanation but does not conclusively prove it.
Low: The source or outcome cannot be established reliably.
Mandatory rule: Any low-confidence classification blocks automatic recovery.
This requirement applies regardless of the classification label.
4.3 Missing or Unavailable Records
If a note lookup returns no record:
noteEntry.write_classification = "missing_or_unavailable";
noteEntry.classification_confidence = "low";
noteEntry.write_status = "blocked_uncertain";

Do not increment a deleted counter.
Do not claim that the note was deleted unless independent evidence establishes deletion.
Automatic recovery must stop.
4.4 Operation-ID Match
An exact operation ID match is necessary evidence, but not sufficient proof that recovery is safe.
The classifier must also verify:
All category representations.
Intended node path.
Intended label path.
Legacy category fields.
Parent/child resolution.
Version evidence.
Whether intervening writes occurred.
If any required verification fails, classify as uncertain with low confidence and block automatic recovery.
4.5 Version Delta
A version delta of exactly one may support a high-confidence classification only when:
Operation identity matches.
All category fields match the intended state.
The path resolves against the tree.
The version baseline is valid.
No other required verification fails.
A version delta greater than one must be classified as:
write_classification = "unattributed_intervening_write";
classification_confidence = "low";
write_status = "blocked_uncertain";

The source of intervening writes cannot be inferred from the version delta.
A version delta below one is uncertain and must block recovery.
4.6 No Operation-ID Match
If the version is unchanged from the baseline, the note may be classified as never_updated only when the baseline and actual record are both available and reliable.
If the version changed but operation identity cannot be established:
Intended category state alone does not prove this operation wrote it.
Original category state alone does not prove the only change was a user edit.
A third category state does not conclusively prove another hierarchy operation.
Classify only to the extent supported by evidence. Low-confidence cases must block automatic recovery.
4.7 Empty Category Paths
An empty category_node_path must not automatically be considered valid.
Uncategorized is an established root node. An empty array must not be assumed to represent that node.
Until the actual application semantics are verified, an empty or missing path must block automatic recovery.
4.8 Proposed Classification Function
The following is a conceptual pseudocode outline. It is not approved implementation code.
function blockClassification(entry, label, reason) {
  entry.write_classification = label;
  entry.classification_confidence = "low";
  entry.write_status = "blocked_uncertain";
  entry.classification_reason = reason;
  return entry;
}

function classifyAffectedNote(entry, journal, currentTree) {
  if (!entry.actual_exists_at_recovery) {
    return blockClassification(
      entry,
      "missing_or_unavailable",
      "Record absence does not establish deletion."
    );
  }

  if (
    entry.actual_version_at_recovery == null ||
    entry.baseline_version == null
  ) {
    return blockClassification(
      entry,
      "uncertain",
      "Version evidence is unavailable."
    );
  }

  const hasOperationId =
    entry.actual_last_write_operation_id_at_recovery != null;

  const operationIdMatches =
    hasOperationId &&
    entry.actual_last_write_operation_id_at_recovery ===
      journal.operation_id;

  const versionDelta =
    entry.actual_version_at_recovery - entry.baseline_version;

  const intendedFieldsMatch = verifyCategoryFieldsMatch(
    entry.actual_category_node_path_at_recovery,
    entry.actual_category_path_at_recovery,
    entry.actual_category_at_recovery,
    entry.actual_subcategory_at_recovery,
    entry.intended_category_node_path,
    entry.intended_category_path,
    entry.intended_category,
    entry.intended_subcategory
  );

  const originalFieldsMatch = verifyCategoryFieldsMatch(
    entry.actual_category_node_path_at_recovery,
    entry.actual_category_path_at_recovery,
    entry.actual_category_at_recovery,
    entry.actual_subcategory_at_recovery,
    entry.original_category_node_path,
    entry.original_category_path,
    entry.original_category,
    entry.original_subcategory
  );

  const pathResolves = verifyNoteResolvesAgainstTree(
    entry.actual_category_node_path_at_recovery,
    currentTree
  );

  if (versionDelta < 0) {
    return blockClassification(
      entry,
      "uncertain",
      "Version decreased below baseline."
    );
  }

  if (operationIdMatches) {
    if (!intendedFieldsMatch || !pathResolves) {
      return blockClassification(
        entry,
        "uncertain",
        "Operation identity matches but state verification failed."
      );
    }

    if (versionDelta !== 1) {
      return blockClassification(
        entry,
        "unattributed_intervening_write",
        "Exact version delta is not one."
      );
    }

    entry.write_classification = "written_by_this_operation";
    entry.classification_confidence = "high";
    entry.write_status = "verified";
    return entry;
  }

  if (versionDelta === 0 && originalFieldsMatch) {
    entry.write_classification = "never_updated";
    entry.classification_confidence = "high";
    entry.write_status = "pending";
    return entry;
  }

  if (versionDelta > 1) {
    return blockClassification(
      entry,
      "unattributed_intervening_write",
      "Multiple writes occurred; source cannot be established."
    );
  }

  if (versionDelta === 1 && originalFieldsMatch && pathResolves) {
    entry.write_classification = "concurrent_user_edit";
    entry.classification_confidence = "medium";
    entry.write_status = "skipped_conflict";
    return entry;
  }

  if (versionDelta === 1 && !originalFieldsMatch && pathResolves) {
    entry.write_classification = "another_operation";
    entry.classification_confidence = "medium";
    entry.write_status = "skipped_conflict";
    return entry;
  }

  return blockClassification(
    entry,
    "uncertain",
    "Available evidence cannot establish a safe classification."
  );
}

This outline still requires technical review. In particular, the semantics of concurrent_user_edit and another_operation must be confirmed against actual write behavior before implementation.
5. RECOVERY DECISION LOGIC — CORRECTED REQUIREMENTS
Status: PROPOSED — NOT IMPLEMENTED OR TESTED.
5.1 Classification Counter Requirements
Every possible classification must have a defined counter.
No classification may be silently counted under a different label.
No undefined counter may be incremented.
A safe accounting pattern must validate the label before incrementing.
Conceptual example:
const classificationLabels = [
  "written_by_this_operation",
  "never_updated",
  "concurrent_user_edit",
  "another_operation",
  "uncertain",
  "unattributed_intervening_write",
  "missing_or_unavailable"
];

const counts = Object.fromEntries(
  classificationLabels.map(label => [label, 0])
);

for (const entry of journal.affected_notes) {
  const label = entry.write_classification;

  if (!Object.prototype.hasOwnProperty.call(counts, label)) {
    return {
      action: "block_manual_reconciliation",
      status: "blocked_unknown_classification",
      preserve_all: true
    };
  }

  counts[label]++;
}

This prevents undefined counters and NaN values.
5.2 Mandatory Confidence Gate
Before any automatic recovery decision:
const unsafeEntries = journal.affected_notes.filter(entry =>
  entry.classification_confidence === "low" ||
  entry.write_classification === "uncertain" ||
  entry.write_classification === "missing_or_unavailable" ||
  entry.write_classification === "unattributed_intervening_write"
);

if (unsafeEntries.length > 0) {
  return {
    action: "block_manual_reconciliation",
    status: "blocked_uncertain_classification",
    preserve_all: true
  };
}

This gate must execute before any completion, reversal, or partial-recovery decision.
It must not depend exclusively on the uncertain counter.
5.3 Missing Records Are Not Deleted Records
The current classifier does not establish a confirmed deletion state.
Therefore:
Remove the old counts.deleted recovery branch.
Do not use an all-deleted completion shortcut.
Do not mark an operation complete merely because all affected note lookups returned no record.
Treat missing_or_unavailable as a blocking condition.
If future independent evidence can establish deletion, a separate documented classification and authorization rule must be designed and reviewed.
5.4 Empty Affected-Notes Collection
A missing or malformed affected_notes field is journal corruption.
An empty array may be valid for some tree-only operations.
However, operation-specific rules have not been defined.
Until rules exist:
Do not assume an empty array is valid.
Do not assume it is invalid for every operation.
Block automatic recovery when its validity cannot be established.
5.5 Completion Verification
Before marking an operation complete, verify:
The journal structure is valid.
Every affected record is accounted for.
No low-confidence classification exists.
The tree state is known.
All required tree-node states match the expected state.
Every affected note's category fields match the intended state.
All paths resolve against the final tree.
No unresolved conflicts exist.
No unexpected modifications exist.
No newer user changes will be overwritten.
A valid-looking tree node is not necessarily the correct tree node state.
A complete expected-state snapshot for every affected node may be required. If the journal does not contain enough information to verify an affected node's expected state, completion cannot be established.
5.6 Important Limitation: Empty Collections and Completion
The proposed verification function currently rejects empty affected_notes collections.
That is conservative but incomplete for tree-only operations.
The future design must define rules by operation type, such as:
Rename node label.
Change node color.
Reorder node.
Reparent node.
Delete empty node.
Delete non-empty node.
No operation-specific exception is approved by this document.
6. TREE AND NOTE STATE VERIFICATION
6.1 Inspect All Category Representations
For every affected note, inspect:
category_node_path
category_path
category
subcategory
Version
Operation identity
Category-write timestamp
Record existence
If any required representation is inconsistent, classification must be blocked.
6.2 Verify Hierarchy Resolution
A proposed path-resolution check must establish:
The path is present and valid.
The first node exists.
The first node is a root.
Every referenced node exists.
Each child has the expected parent.
The final path resolves against the current tree.
The current proposed helper does not establish all global tree constraints.
In particular, sequential parent-child validation does not detect every possible circular relationship elsewhere in the tree.
A separate full-tree validator may be required.
6.3 Tree-State Completeness
The journal must record enough expected information to verify all affected nodes.
Checking only node existence or valid property types is insufficient.
For each affected node, relevant expected properties may include:
ID
Label
Parent ID
Order
Color
Other preserved node properties
If expected state is unavailable, automatic completion must remain blocked.
7. JOURNAL DURABILITY AND RECOVERY-OF-RECOVERY
7.1 Journal Write Ordering
The proposed sequence is:
Capture original tree state.
Determine intended tree state.
Identify affected notes.
Capture original note category fields.
Capture baseline version and operation identity.
Write the journal durably.
Execute the hierarchy operation.
Verify actual final state.
Mark the journal completed only after verification.
This sequence is proposed, not implemented.
7.2 Journal Storage Location
Unresolved options:
Dedicated IndexedDB store.
Existing metadata store.
Separate localforage instance.
The choice must account for durability, transaction scope, corruption handling, and recovery access.
7.3 Crash Scenarios
Crash point Required behavior Before journal creation No operation should have started During journal creation Do not assume journal is safely absent After journal creation, before data writes Inspect actual state During tree update Inspect actual tree and notes During note updates Classify every affected note During completion marker write Verify actual state before marking complete During recovery itself Block unless recovery-of-recovery rules are established
The journal records intent, not proof of successful completion.
7.4 Corrupt or Incomplete Journal
If required journal fields are missing, inconsistent, or corrupted:
Do not guess.
Do not silently discard the journal.
Do not perform automatic recovery.
Preserve available data.
Require manual reconciliation.
Rules for safe journal disposal remain unresolved.
7.5 Recovery-of-Recovery
Recovery can itself be interrupted.
A safe design must explain:
How recovery attempts are identified.
How a recovery write is distinguished from the original operation.
How repeated attempts are handled.
How partial recovery writes are recognized.
How recovery avoids infinite recursion.
How data remains recoverable after another interruption.
Until these rules are established, automatic recovery after interrupted recovery must remain blocked.
8. ROLLBACK SAFEGUARDS
Status: PROPOSED — NOT APPROVED.
8.1 Category-Only Restoration
Rollback must never restore an entire stale note record.
Only approved category fields may be restored.
Unrelated fields must remain preserved, including:
Title
Content
Attachments
Featured image
Pin state
Archive state
Delete state
Other user metadata
8.2 Atomicity Requirement
A rollback must not use ordinary read/check/write logic.
The required transaction must protect:
Current note read.
Current tree read.
Version verification.
Operation identity verification.
Category-only restoration.
Final tree/path consistency verification.
Whether IndexedDB can provide the full required transaction behavior remains unverified.
8.3 Rename Rollback Inconsistency
A rename rollback has an unresolved ordering problem.
Example:
Original tree label: Work
Intended renamed label: Career
Original derived path: ["Work", "Projects"]
Intended derived path: ["Career", "Projects"]
Restoring the original derived label path while the tree still contains Career creates an inconsistency.
Unresolved design questions:
Must the tree be restored before note paths?
Can node IDs be used to validate assignments while labels are temporarily inconsistent?
Must tree and note restoration occur in one transaction?
How are intermediate states prevented?
Automatic rename rollback must remain blocked until a safe sequence is established.
8.4 Transaction-Protected Tree State
A stale tree snapshot is not acceptable for rollback validation.
The tree state used to verify a rollback must be protected against concurrent modification.
If this cannot be guaranteed within the same transaction, automatic rollback must remain unavailable for that scenario.
9. DERIVED PATH SYNCHRONIZATION
Question 0.4 — PROPOSED, NOT APPROVED.
If node IDs become authoritative, derived labels must be regenerated from the node-ID path and global tree.
Proposed direction:
category_node_path + category_tree → category_path
Synchronization must not reverse this direction by treating labels as permanent identity.
Unresolved design choices:
Synchronization within the tree update transaction.
Synchronization as a separately identified operation.
Synchronization with a separate versioning strategy.
All approaches require investigation of:
Concurrent edits.
Partial failures.
Retry behavior.
Recovery classification.
Transaction limits.
Large note counts.
No approach is approved.
10. MIGRATION FROM STRING PATHS TO NODE IDS
Question 0.5 — UNRESOLVED, NOT APPROVED.
If the existing application does not have permanent node IDs, migration may be necessary.
Migration must preserve:
Permanent identity after creation.
Parent/child relationships.
Ordering.
Independent colors.
All note assignments.
Distinct nodes with identical labels under different parents.
Uncategorized root identity.
Pinned-item behavior.
Existing user data.
Identical labels must never be merged solely because their text matches.
Example:
Work → Projects
Personal → Projects
These are distinct Projects nodes.
Unresolved migration questions:
ID generation strategy.
Collision prevention.
Parent relationship preservation.
Ordering preservation.
Color preservation.
Correct note-to-node association.
Backup requirements.
Rollback feasibility.
Rollback data loss.
Post-migration verification.
Migration is not approved and must not be executed.
11. HIERARCHY UI QUESTIONS
Question 0.6 — NOT EXAMINED.
Read-only source inspection is required to establish:
Whether a hierarchy tree component exists.
Whether drag-and-drop reparenting exists.
Whether inline rename exists.
Whether colors are stored and displayed per node.
How notes are assigned to hierarchy nodes.
How the green-plus insertion behavior maps to storage ordering.
How M/SC accordion behavior is implemented.
The following source areas were identified for inspection:
/app/frontend/src/notes/CategoryPathAccordion.jsx
Category tree components.
Green-plus insertion logic.
Note assignment components.
Inspection is limited to source code. Do not access production records or protected surfaces.
12. ORIGINAL NOTE AND SETTINGS QUESTIONS
The following questions remain unresolved unless verified by source inspection.
12.1 Title Field
Status: UNCONFIRMED.
Inspect note editor components and source assignments.
Do not make title mandatory in validation until its actual schema is established.
12.2 Content Field
Status: UNCONFIRMED.
Inspect note editor components and determine whether content uses a different rich-text representation.
12.3 Tags, Color, Icon, and Pinned Fields
Status: UNCONFIRMED.
Do not require these fields merely because they are plausible note properties.
12.4 ui_brightness and LOCKED Surface
Status: BLOCKED.
The LOCKED surface is protected.
Do not inspect it.
Do not modify it.
Do not request credentials.
Do not attempt to obtain or use a password.
Preserve it without modification.
12.5 Historical order Field
Status: ASSUMED.
Historical notes may lack order.
Read-only source inspection may establish how fallback logic is used.
No production database or user-record inspection is authorized.
12.6 Historical last_viewed Field
Status: ASSUMED.
Determine from source code whether older notes may lack the field.
12.7 Nullable Fields
Status: ASSUMED.
The existence of a property is different from its value being null.
Determine whether fields such as archived_at and deleted_at are always present or may be absent in historical records.
Do not assume that explicit null assignments in new-note creation prove every historical record has those properties.
13. UNEXAMINED SOURCE AREAS
13.1 Note Editor Components
Identified files:
/app/frontend/src/notes/NoteModal.jsx
/app/frontend/src/notes/FullScreenNote.jsx
/app/frontend/src/notes/NoteEditor.jsx, if present
Read-only inspection is required to establish field assignments and editor behavior.
13.2 Settings Usage
The settings object has not been fully traced through UI consumers.
Read-only source searches may establish which settings are used and whether additional fields are added dynamically.
13.3 Attachment Schema
The attachment schema is not fully verified.
The supplied document describes a possible file record with:
ID
Blob
Name
MIME type
Size
Creation timestamp
This must not be treated as the complete schema without inspecting the relevant source code.
14. VALIDATION QUESTIONS
14.1 Optional Fields
The supplied Revision 5.3 decision was to be lenient with optional fields.
This document does not authorize changing that decision without evidence and user review.
14.2 Field Types
Potential validation candidates include:
order as a number.
attachments as an array.
category_path as an array.
Validation rules must account for historical records and valid edge cases.
14.3 Unknown Settings Fields
The established approach is to preserve unknown settings fields.
Unknown fields may be reported as warnings, but must not be silently discarded.
15. TESTING QUESTIONS
Testing and experiments require separate explicit authorization.
15.1 Synthetic Note Data
Potential test sets:
Minimal records containing confirmed required fields.
Extended records containing suspected optional fields.
Do not treat unconfirmed fields as part of the actual schema merely because they appear in synthetic test data.
15.2 Restaurants Galore Preservation
Actual Restaurants Galore records must not be inspected during the current phase.
A future authorized test may use synthetic feature-pack data.
15.3 Concurrent Modification
The supplied Revision 5.3 material describes Jest mocks for simulating changes between reads.
This is a proposed test strategy, not proof of recovery correctness.
Execution requires separate authorization.
16. IMPLEMENTATION QUESTIONS
The following remain unresolved:
How should code access unconfirmed fields?
How should feature-pack detection work?
How should future feature packs avoid overlapping settings field names?
How should user reconciliation work when automatic recovery is blocked?
What UI communicates blocked recovery?
How can a user reconcile safely without overwriting newer data?
The existing feature-pack detection example uses:
Object.prototype.hasOwnProperty.call(
  snapshot.settings,
  field
);

The requirement is to preserve unknown settings fields regardless of source.
No implementation is authorized by this document.
17. BACKUP AND RESTORE REQUIREMENTS
17.1 Gallery Images
All 205 gallery images must be preserved.
Inspection of gallery contents is not authorized at this stage.
17.2 Complete Note Lifecycles
Backup and restore must preserve:
Active notes.
Archived notes.
Deleted notes.
Archived-then-deleted notes.
Both lifecycle timestamps must be preserved exactly.
No backup or restore filtering may silently remove notes based on archived_at or deleted_at.
The following is a proposed requirement illustration, not verified implementation:
const allNotes = await StorageService.getAllNotes();

snapshot.notes = allNotes;

The actual backup implementation has not been verified here.
17.3 Settings Serializability
Status: ASSUMED — NOT VERIFIED.
The settings object must be examined through authorized source inspection before assuming that it is safely serializable.
Potential risks include:
Circular references.
Functions.
Undefined values.
Symbols.
Non-JSON data types.
Testing serializability requires separate authorization if it involves execution or experimentation.
18. PRIORITY CLASSIFICATION
The priority classification below is a planning aid, not authorization to begin implementation.
High Priority
Question 0.1 — Determine whether node-ID architecture exists.
Question 0.2 — Establish IndexedDB transaction feasibility.
Question 0.3 — Establish recovery journal durability and storage requirements.
Questions 12.1 and 12.2 — Verify title and content schema.
Section 13.3 — Establish attachment schema.
Medium Priority
Question 10 — Migration path and reversibility.
Question 9 — Derived-path synchronization.
Question 12.3 — Tags, color, icon, and pinned fields.
Questions 12.5 and 12.6 — Historical order and last_viewed fields.
Section 13.1 — Note editor components.
Question 14.1 — Validation approach.
Question 11 — Hierarchy UI components.
Low Priority
Question 12.4 — Protected LOCKED surface preservation without inspection.
Section 13.2 — Settings usage.
Question 16.3 — Feature-pack naming conventions.
Additional Unprioritized Questions
The following remain documented but are not assigned a priority above:
Question 12.7 — Nullable field property existence.
Question 14.2 — Field type validation.
Question 14.3 — Unknown settings fields.
Question 15.1 — Synthetic test data.
Question 15.2 — Restaurants Galore testing strategy.
Question 15.3 — Concurrent modification testing.
Question 16.1 — Access to unconfirmed fields.
Question 16.2 — Feature-pack detection.
Blocked-recovery user experience.
Recovery-of-recovery handling.
Corrupt journal handling.
Empty affected-note collection rules.
Complete expected-state capture for all affected nodes.
Rename rollback ordering.
Accounting rule: The priority list is not a claim that every unresolved technical sub-question has been individually counted. The detailed question inventory and priority inventory must be maintained separately. Emergent must reconcile any numerical unresolved-item total against an explicit item-by-item register before presenting a final count.
19. RESOLUTION PLAN
19.1 Pre-Implementation Investigation
Currently authorized scope:
Read-only source inspection only, within the approved repository and source files.
Questions to investigate:
Existing hierarchy data model.
Existing note category fields.
Settings schema.
Note editor field assignments.
Attachment source schema.
Hierarchy UI behavior.
Existing storage operations.
Do not inspect production records or user data.
19.2 Research, Testing, and Experiments
These require separate explicit authorization.
Examples:
IndexedDB transaction feasibility experiments.
Atomic conditional-write prototypes.
Recovery journal tests.
Concurrency experiments.
Performance testing.
Migration prototypes.
Do not interpret permission for read-only source inspection as permission for these activities.
19.3 Architectural Documentation
After authorized investigation:
Record verified facts.
Record implementation gaps.
Evaluate technical feasibility.
Document proposed architecture.
Identify unresolved or infeasible mechanisms.
Present the complete design for user approval.
Prepare an implementation plan only after the architecture is approved.
19.4 Implementation
Phase 1 implementation remains explicitly unauthorized.
This document does not grant implementation permission.
No mechanism may be implemented merely because it appears in a code example or proposed design.
19.5 Post-Implementation
Any future implementation and testing require separate authorization.
Potential verification areas include:
Hierarchy consistency.
Atomic transaction behavior.
Journal durability.
Classification accuracy.
Recovery interruption handling.
Rollback safety.
Migration safety.
Preservation of all note lifecycles.
Preservation of all 205 gallery images.
Preservation of feature-pack data.
20. CORRECTION HISTORY AND DOCUMENT ACCOUNTING
The supplied source contains several historical correction rounds and intermediate line counts.
These records are historical evidence, not separate current deliverables.
The following historical counts were reported:
2,519 → 2,745 → 2,900 → 2,976 → 3,009 → 3,062 → 3,063 → 3,408 → 3,606.
These figures must not be presented as independently verified by this rewrite.
The current file's actual line count, byte count, checksum, and final lines must be recalculated by Emergent after review and before any replacement of the GitHub file.
20.1 Round 3 Technical Corrections to Preserve
The supplied Round 3 history identifies these correction areas:
Version-delta attribution must not infer the source of intervening writes.
Missing records must not automatically be classified as deleted.
Operation-ID mismatch must be treated as uncertain when the cause cannot be established.
Classification labels must reflect the revised categories.
Low confidence must block automatic recovery regardless of label.
Tree order value zero must not be lost through truthiness checks.
Empty category paths must not be assumed valid.
Empty affected-note collections require operation-specific rules.
Rename rollback ordering remains unresolved.
Recovery-of-recovery identity mismatch remains unresolved.
Original paths must be included when identifying affected nodes.
Valid-looking node properties do not prove correct intended state.
Established requirements must include the blue hierarchy icon.
Priority references must be consistent.
Unresolved-item accounting must not double-count or misclassify assumptions.
Newly clarified unresolved items must remain visible.
The actual correction history must be reconciled against the final content. Do not claim 16 or 18 corrections were verified without an explicit item-by-item comparison.
20.2 Superseded Historical Blocks
The older section titled "FINAL DELIVERABLES — ROUND 2 CORRECTIONS COMPLETE" must not be presented as the current final deliverable.
Its historical content may be retained in an archive or clearly labeled as historical, but it must not contradict the current document's status, line count, requirements, or correction history.
The older 3,408-line statement must not be represented as the current file count.
20.3 Requirement Count Reconciliation
The current requirements inventory is:
10 Universal Hierarchy requirements.
2 additional preservation requirements.
12 established requirements in total.
The blue hierarchy icon is included.
The earlier 10- and 11-item summaries are historical counting errors and must not be repeated as the current total.
20.4 Priority Reference Reconciliation
The current priority inventory uses:
High: 5 entries.
Medium: 7 entries.
Low: 3 entries.
Medium item 9 in the older correction history conflicts with the current placement of historical order and last_viewed assumptions.
The current priority list places those two assumptions together at Medium item 9.
Assumption 2.3 concerns nullable property existence and is not the same question. It is listed as unprioritized.
Emergent must verify that all cross-references agree before final approval.
21. STRICT AUTHORIZATION BOUNDARY
The following restrictions are mandatory.
Authorized
Review of this document.
Documentation-only corrections after explicit authorization.
Read-only source inspection within the approved scope.
Not Authorized
Application source-code modification.
Database or production-data inspection.
Actual user-record inspection.
Gallery contents inspection.
Restaurants Galore record inspection.
LOCKED surface inspection or modification.
Credential or password requests.
Tests, migrations, experiments, or prototypes without separate authorization.
UI modification.
Preview modification.
Production modification.
Deployment.
Phase 1 implementation.
Document 4 creation.
No authorization may be inferred from a proposed code example, technical recommendation, or documentation correction.
Protected Data
Preserve all existing user data and protected application surfaces.
Do not inspect, modify, delete, or overwrite protected resources.
22. CURRENT STATUS AND USER APPROVAL
Document status: NOT APPROVED — Consolidated Technical Review Draft.
Reconstruction status: Reconstructed, not recovered original.
Implementation status: No implementation authorized.
Phase 1: Explicitly unauthorized.
Document 4: Not started.
GitHub replacement: Not authorized by this draft.
The following must occur before approval:
Emergent reviews the corrected technical logic.
Emergent checks all code examples for internal consistency.
Emergent reconciles every requirement count and cross-reference.
Emergent identifies any remaining unresolved defects.
Emergent verifies that no established requirement was weakened or omitted.
Emergent returns a review report.
The user reviews the report and explicitly approves Document 3.
Only after explicit approval may a separate request authorize a GitHub replacement or the next documentation deliverable.
END OF CONSOLIDATED REVISION 5.4 TECHNICAL REVIEW DRAFT
Status: NOT APPROVED — AWAITING EMERGENT REVIEW AND USER DECISION
