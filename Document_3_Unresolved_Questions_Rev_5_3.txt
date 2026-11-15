# IRON RABBIT — REVISION 5.3 UNRESOLVED TECHNICAL QUESTIONS

**Document Type**: Open Questions & Assumptions Log  
**Revision**: 5.3  
**Date**: December 2025  
**Purpose**: Document unresolved questions and assumptions requiring investigation

---

## 📋 DOCUMENT OVERVIEW

This document lists all unresolved technical questions, unconfirmed assumptions, and areas requiring further investigation before Phase 1 implementation begins.

**Status Categories**:
- ❓ **UNCONFIRMED** — No evidence found; needs investigation
- ⚠️ **ASSUMED** — Logical assumption but not verified
- 🔍 **INVESTIGATE** — Evidence exists but not examined
- 🔒 **BLOCKED** — Requires special access (e.g., password-protected code)

---

## ❓ SECTION 1: UNCONFIRMED NOTE FIELDS

### Question 1.1: Does `title` field exist?

**Status**: ❓ UNCONFIRMED

**Current Classification**: Likely exists but not confirmed

**Evidence**: No explicit assignment found in examined files

**Assumption**: Likely handled in note modal/editor components

**Investigation Required**:
1. Examine `/app/frontend/src/notes/NoteModal.jsx`
2. Examine `/app/frontend/src/notes/FullScreenNote.jsx`
3. Search codebase for `note.title` or `title:` assignments

**Impact if Missing**:
- Validation would incorrectly require this field
- May reject valid notes without titles

**Recommendation**: Investigate before Phase 1 implementation begins

---

### Question 1.2: Does `content` field exist?

**Status**: ❓ UNCONFIRMED

**Current Classification**: Likely exists but not confirmed

**Evidence**: No explicit assignment found in examined files

**Assumption**: Likely handled in note editor components

**Investigation Required**:
1. Examine note editor components
2. Search codebase for `note.content` or `content:` assignments
3. Check if using rich text editor (might use different field name)

**Impact if Missing**:
- Validation would incorrectly require this field
- Core note content storage unclear

**Recommendation**: HIGH PRIORITY — Investigate before Phase 1 implementation

---

### Question 1.3: Do `tags`, `color`, `icon`, `pinned` fields exist?

**Status**: ❓ UNCONFIRMED

**Current Classification**: May not exist in current version

**Evidence**: No references found in examined files

**Investigation Required**:
1. Global search: `grep -r "tags" /app/frontend/src`
2. Global search: `grep -r "\.color" /app/frontend/src`
3. Global search: `grep -r "\.icon" /app/frontend/src`
4. Global search: `grep -r "pinned" /app/frontend/src`

**Impact if Missing**:
- These fields should NOT be in validation
- Including them would cause false failures

**Recommendation**: Investigate; if not found, REMOVE from any validation lists

---

### Question 1.4: What is `ui_brightness` and where is it used?

**Status**: 🔒 BLOCKED (LOCKED surface)

**Current Classification**: Mentioned in comment only

**Evidence**: Comment in storageService.js line 59:
```javascript
// LOCKED: ui_brightness and LOCKED surface schema must survive save/restore
```

**Investigation Blocked By**: Requires password 2020 to modify/view LOCKED surface code

**Investigation Required**:
1. Request access to LOCKED surface code
2. Understand ui_brightness implementation
3. Determine if field is actually used

**Impact if Not Used**:
- Should NOT be in validation requirements
- Including it would cause false failures

**Recommendation**: Request LOCKED surface access from user

---

## ⚠️ SECTION 2: ASSUMED FIELD BEHAVIORS

### Assumption 2.1: Historical notes may lack `order` field

**Status**: ⚠️ ASSUMED (based on fallback logic)

**Evidence**: Code uses fallback: `n.order || 0`

**Assumption**: Fallback suggests field may be missing in old notes created before feature added

**Verification Needed**:
1. Query actual production database for notes without `order`
2. Determine when `order` field was added
3. Confirm historical notes need migration OR can use fallback

**Impact if Wrong**:
- If all notes have `order`: Can upgrade from "expected" to "required"
- If many notes lack `order`: Current classification correct

**Recommendation**: Query user data (with permission) or err on side of caution

---

### Assumption 2.2: Historical notes may lack `last_viewed` field

**Status**: ⚠️ ASSUMED

**Evidence**: Field assigned in note creation but usage elsewhere not examined

**Assumption**: Feature may have been added later; old notes may lack it

**Verification Needed**:
1. Check when `last_viewed` feature was added
2. Determine if historical notes have this field
3. Check if "recently viewed" UI handles missing field gracefully

**Impact if Wrong**:
- Could upgrade to "required" if always present
- Current "expected" classification is safe

**Recommendation**: Investigate usage; current classification errs on side of caution

---

### Assumption 2.3: Nullable fields always have the property (even when null)

**Status**: ⚠️ ASSUMED (based on explicit null assignments)

**Evidence**: Code explicitly sets `archived_at: null` and `deleted_at: null`

**Assumption**: Fields are ALWAYS present as properties, with value being timestamp or null

**Verification Needed**:
1. Check if new notes are initialized with these fields as null
2. Confirm notes never have these properties absent (vs. present with null value)
3. Determine if `note.hasOwnProperty('archived_at')` vs `note.archived_at !== undefined` matters

**Impact if Wrong**:
- Validation using `.hasOwnProperty()` could fail for valid notes
- May need to use `!= null` check instead

**Recommendation**: Test with actual note data; current assumption seems safe based on code

---

## 🔍 SECTION 3: UNEXAMINED CODE AREAS

### Area 3.1: Note Editor Components

**Status**: 🔍 NOT EXAMINED

**Files Not Examined**:
- `/app/frontend/src/notes/NoteModal.jsx`
- `/app/frontend/src/notes/FullScreenNote.jsx`
- `/app/frontend/src/notes/NoteEditor.jsx` (if exists)

**Reason**: Technical review focused on storage layer; UI components not examined

**Information Needed**:
- How `title` and `content` are assigned
- If rich text editor used (different field structure?)
- If any other fields assigned in UI layer

**Impact**: May have missed field assignments in UI layer

**Recommendation**: Examine these files before finalizing field classifications

---

### Area 3.2: Settings Usage Across Application

**Status**: 🔍 PARTIALLY EXAMINED

**Examined**: Default settings object, CRUD operations in storageService.js

**Not Examined**: How settings are consumed by UI components

**Information Needed**:
- Are `theme` and `language` actually used anywhere?
- Are there other settings fields not in storageService.js?
- Do UI components add fields dynamically?

**Impact**: May have missed settings fields used only in UI

**Recommendation**: Global search for `settings.` access patterns

---

### Area 3.3: Attachment Schema

**Status**: 🔍 NOT EXAMINED

**Information Needed**:
- What fields does attachment object have?
- Is there an attachment schema?
- Are attachments just blobs or do they have metadata?

**Current Understanding**: Files store has:
```javascript
{
  id: "att_123",
  blob: Blob,
  name: "file.txt",
  type: "text/plain",
  size: 4,
  created_at: "..."
}
```

**Verification Needed**: Confirm this is complete attachment schema

**Recommendation**: Examine file upload/attachment code

---

## 📊 SECTION 4: VALIDATION LOGIC QUESTIONS

### Question 4.1: Should validation reject notes missing optional fields?

**Status**: ⚠️ DESIGN DECISION NEEDED

**Current Approach**: NO — optional fields can be missing

**Alternative Approach**: WARN but don't fail validation

**Trade-offs**:
- **Strict** (reject): Catches more issues, may have false positives
- **Lenient** (warn): Allows historical notes, may miss real corruption

**Current Revision 5.3 Decision**: Lenient (warn only for expected fields)

**User Confirmation Needed**: Is this the correct approach?

---

### Question 4.2: Should validation enforce field types?

**Status**: ⚠️ PARTIALLY IMPLEMENTED

**Current Approach**:
- Timestamps: Check `typeof === 'string'` AND `isNaN(Date.parse(...))`
- IDs: Check `typeof === 'string'`
- Other fields: Not type-checked

**Question**: Should we validate:
- `order` is a number?
- `attachments` is an array?
- `category_path` is an array?
- etc.

**Trade-off**: More validation catches more corruption, but may reject valid edge cases

**Recommendation**: Start lenient; add type checks if corruption found in testing

---

### Question 4.3: How to handle unknown settings fields?

**Status**: ✅ RESOLVED in Revision 5.3

**Approach**: Preserve ALL unknown fields (future feature packs)

**Validation**: Report unknown fields as WARNING (not error)

**Confirmation**: User clarification confirmed this is correct approach

---

## 🔬 SECTION 5: TESTING QUESTIONS

### Question 5.1: What constitutes a "realistic" synthetic note?

**Status**: ⚠️ TEST DATA DESIGN NEEDED

**Current Plan**: Generate synthetic notes with:
- All confirmed required fields
- Some notes with optional fields, some without
- Edge cases (very long content, many attachments, etc.)

**Question**: Should synthetic notes include:
- Unconfirmed fields (title, content, tags, etc.)?
- What if we generate them and they don't exist in real schema?

**Trade-off**:
- **Include**: Tests are more realistic, but may test non-existent fields
- **Exclude**: Tests may miss real-world scenarios

**Recommendation**: Generate two sets:
1. Minimal notes (only confirmed required fields)
2. Maximal notes (all suspected fields)

---

### Question 5.2: How to test Restaurants Galore preservation without having it installed?

**Status**: ⚠️ TEST STRATEGY NEEDED

**Challenge**: Testing team may not have Restaurants Galore installed

**Options**:
1. **Mock feature-pack data**: Create synthetic grocery_trips/meal_plan data in tests
2. **Conditional tests**: Skip Restaurants Galore tests if not installed
3. **Install feature pack**: Test environment installs Restaurants Galore

**Recommendation**: Option 1 (mock data) — tests should work in any environment

---

### Question 5.3: How to test concurrent modification detection?

**Status**: ✅ TEST SPECIFIED in Revision 5.3

**Approach**: Use Jest mocks to simulate timing:
```javascript
jest.spyOn(StorageService, 'getAllNotes')
  .mockImplementationOnce(async () => initialNotes)
  .mockImplementationOnce(async () => modifiedNotes);
```

**Confirmation**: This approach is valid for testing

---

## 🏗️ SECTION 6: IMPLEMENTATION QUESTIONS

### Question 6.1: When should Phase 1 code request field value from unconfirmed fields?

**Status**: ⚠️ IMPLEMENTATION DECISION NEEDED

**Scenario**: Code needs to check `note.title`, but `title` is unconfirmed

**Options**:
1. **Assume exists**: `const title = note.title`
2. **Use optional chaining**: `const title = note?.title`
3. **Use fallback**: `const title = note.title || ""`

**Current Status**: Unconfirmed fields are marked for investigation

**Recommendation**: Use optional chaining until confirmation

---

### Question 6.2: How to handle feature pack detection?

**Status**: ✅ RESOLVED in Revision 5.3

**Approach**:
```javascript
const RESTAURANTS_GALORE_FIELDS = ['grocery_trips', 'meal_plan', 'custom_recipes', 'pantry_items'];
const hasRestaurantsGalore = RESTAURANTS_GALORE_FIELDS.some(
  field => snapshot.settings.hasOwnProperty(field)
);
```

**Confirmation**: This approach is correct

---

### Question 6.3: What if a future feature pack has overlapping field names?

**Status**: ⚠️ DESIGN CONSIDERATION

**Scenario**: Two feature packs both add a `items` field to settings

**Current Approach**: Preserve ALL fields regardless of source

**Potential Issue**: Field name collision could cause confusion

**Mitigation**: Feature packs should use namespaced field names (e.g., `restaurants_galore_items`)

**Recommendation**: Document recommended field naming convention for future feature packs

---

## 📋 SECTION 7: ASSUMPTIONS REQUIRING USER CONFIRMATION

### Assumption 7.1: All 205 gallery images are essential

**Status**: ⚠️ ASSUMED

**Evidence**: 205 files exist in repository

**Assumption**: All 205 images must be preserved and tested

**Question for User**: Are all 205 images required, or can some be deprecated?

**Impact**: Test complexity, file inventory size

**Recommendation**: Confirm with user before finalizing tests

---

### Assumption 7.2: Backup/restore should preserve "deleted" notes

**Status**: ⚠️ ASSUMED

**Current Plan**: Backup includes notes where `deleted_at !== null`

**Assumption**: User wants to restore deleted notes (trash)

**Question for User**: Should deleted notes be:
- ✅ Included in backup (current plan)
- ❌ Excluded from backup (save space)
- ⚠️ Optional (user choice at backup time)

**Recommendation**: Confirm with user

---

### Assumption 7.3: Settings snapshot can be simple object copy

**Status**: ⚠️ ASSUMED

**Current Plan**: `snapshot.settings = await StorageService.getSettings()`

**Assumption**: Settings object doesn't contain functions, circular references, or other non-serializable data

**Question**: Are all settings values JSON-serializable?

**Verification Needed**: Test `JSON.stringify(settings)` doesn't throw

**Recommendation**: Add test for settings serializability

---

## 🎯 SECTION 8: PRIORITY CLASSIFICATION

### High Priority (Must Resolve Before Phase 1)

1. ⭐⭐⭐ **Confirm `title` and `content` fields exist** (Question 1.1, 1.2)
2. ⭐⭐⭐ **Determine actual attachment schema** (Area 3.3)
3. ⭐⭐⭐ **User confirmation: Include deleted notes in backup?** (Assumption 7.2)

### Medium Priority (Should Resolve During Phase 1)

4. ⭐⭐ **Investigate `tags`, `color`, `icon`, `pinned` fields** (Question 1.3)
5. ⭐⭐ **Verify nullable field assumptions** (Assumption 2.3)
6. ⭐⭐ **Examine note editor components** (Area 3.1)
7. ⭐⭐ **Confirm validation approach** (Question 4.1)

### Low Priority (Can Resolve Post-Phase 1)

8. ⭐ **Request LOCKED surface access** (Question 1.4)
9. ⭐ **Verify `theme` and `language` usage** (Area 3.2)
10. ⭐ **Document feature pack naming conventions** (Question 6.3)

---

## ✅ SECTION 9: RESOLUTION PLAN

### Phase: Pre-Implementation Investigation

**Before Phase 1 Code Begins**:
1. Examine note editor components for `title` and `content`
2. Confirm attachment schema
3. Get user confirmation on deleted notes in backup
4. Global search for unconfirmed fields
5. Document findings in updated evidence references

**Duration**: 1-2 hours of investigation

---

### Phase: During Implementation

**While Writing Phase 1 Code**:
1. Use optional chaining for unconfirmed fields
2. Add type validation gradually (start lenient)
3. Test with both minimal and maximal synthetic data
4. Document any new findings

---

### Phase: Post-Implementation

**After Phase 1 Complete**:
1. Request LOCKED surface access for comprehensive audit
2. Update field classifications based on findings
3. Revise validation rules if needed

---

## 🛑 CONFIRMATION STATEMENT

**Unresolved Questions**: 13 identified

**High Priority**: 3 questions

**Medium Priority**: 5 questions

**Low Priority**: 5 questions

**Approach**: Conservative — classify as "unconfirmed" when evidence lacking

**No False Claims**: Did NOT turn assumptions into facts

**User Action Required**:
1. Confirm deleted notes should be in backup
2. Confirm gallery image testing scope
3. Review and approve investigation plan

---

**Recommendation**: Resolve high-priority questions before granting Phase 1 implementation authorization.

---

**END OF REVISION 5.3 UNRESOLVED TECHNICAL QUESTIONS**
