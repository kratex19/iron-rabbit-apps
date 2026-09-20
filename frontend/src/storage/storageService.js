// storage/storageService.js
// Modular storage service - offline-first with future cloud sync support
// All cloud functionality is isolated behind this interface

import localforage from 'localforage';

// Configure separate stores for different data types
const notesStore = localforage.createInstance({
  name: 'IronRabbit',
  storeName: 'notes',
  description: 'User notes storage'
});

const settingsStore = localforage.createInstance({
  name: 'IronRabbit',
  storeName: 'settings',
  description: 'App settings storage'
});

const templatesStore = localforage.createInstance({
  name: 'IronRabbit',
  storeName: 'templates',
  description: 'Note templates storage'
});

const filesStore = localforage.createInstance({
  name: 'IronRabbit',
  storeName: 'files',
  description: 'Note attachments (blobs)'
});

const metadataStore = localforage.createInstance({
  name: 'IronRabbit',
  storeName: 'metadata',
  description: 'App metadata storage'
});

// ==================== STORAGE INTERFACE ====================
// This is the abstract interface. Future cloud sync will implement this same API.

export const StorageService = {
  // ========== NOTES ==========
  async getAllNotes() {
    const notes = [];
    await notesStore.iterate((value) => {
      notes.push(value);
    });
    return notes;
  },

  async getNote(id) {
    return await notesStore.getItem(id);
  },

  async saveNote(note) {
    // 🔒 LOCKED (star-mode expanded text persistence) — see /app/memory/LOCKED_SURFACES.md
    // Password required to modify: 2020
    // Must remain a full-object passthrough so `ui_brightness` and any other
    // per-note fields survive save/restore. Do NOT filter or whitelist fields.
    await notesStore.setItem(note.id, note);
    return note;
  },

  async deleteNote(id) {
    // Clean up any attached files so we don't orphan Blobs
    const note = await notesStore.getItem(id);
    if (note?.attachments?.length) {
      for (const att of note.attachments) {
        await filesStore.removeItem(att.id);
      }
    }
    await notesStore.removeItem(id);
    return true;
  },

  async reorderNotes(noteIds) {
    for (let i = 0; i < noteIds.length; i++) {
      const note = await notesStore.getItem(noteIds[i]);
      if (note) {
        note.order = i;
        await notesStore.setItem(note.id, note);
      }
    }
    return true;
  },

  // Persist a user-defined ordering of category names. Categories not in the
  // stored list fall back to alphabetical / creation order.
  async saveCategoryOrder(orderedNames) {
    await this.saveSettings({ category_order: orderedNames });
    return true;
  },
  async getCategoryOrder() {
    const settings = await this.getSettings();
    return Array.isArray(settings?.category_order) ? settings.category_order : [];
  },

  // Move a note into a different category / subcategory (drag & drop).
  //
  // Hierarchy consistency rule (see Repair #1):
  //   `category_path` is the authoritative representation. `category`
  //   and `subcategory` MUST always mirror the first two levels.
  //   Callers pass a destination as (newCategory, newSubcategory); an
  //   explicit deeper destination path may be supplied via
  //   `options.categoryPath` (used by Undo to restore a note back to
  //   its ORIGINAL deep path). When `categoryPath` is not supplied it
  //   is derived from the two legacy args:
  //     ("",       "")       → []
  //     ("Personal","")      → ["Personal"]
  //     ("Personal","Projects") → ["Personal","Projects"]
  //   The returned `prev` snapshot includes the full previous
  //   `category_path` so callers can round-trip Undo correctly even
  //   when the source note had a deep path such as
  //   ["Work","Projects","2026","January"].
  async moveNoteToCategory(noteId, newCategory, newSubcategory = "", options = {}) {
    const note = await notesStore.getItem(noteId);
    if (!note) return null;
    const prevPath = Array.isArray(note.category_path) ? note.category_path.slice() : [];
    const prev = {
      category: note.category || "",
      subcategory: note.subcategory || "",
      category_path: prevPath,
    };
    let nextPath;
    if (Array.isArray(options.categoryPath)) {
      nextPath = options.categoryPath.filter((s) => typeof s === "string" && s.trim() !== "");
    } else if (!newCategory) {
      nextPath = [];
    } else if (!newSubcategory) {
      nextPath = [newCategory];
    } else {
      nextPath = [newCategory, newSubcategory];
    }
    note.category_path = nextPath;
    note.category = nextPath[0] || "";
    note.subcategory = nextPath[1] || "";
    note.updated_at = new Date().toISOString();
    await notesStore.setItem(note.id, note);
    return prev;
  },

  // ========== ARCHIVE / TRASH ==========
  // Notes carry two lifecycle timestamps:
  //   archived_at : non-null => kept indefinitely, hidden from default views
  //   deleted_at  : non-null => in Trash; permanently purged on Empty Trash
  //                            or when older than settings.trash_retention_days
  // A note is "active" when both are null.
  async archiveNote(noteId) {
    const note = await notesStore.getItem(noteId);
    if (!note) return null;
    const now = new Date().toISOString();
    const prev = { archived_at: note.archived_at || null, deleted_at: note.deleted_at || null };
    await notesStore.setItem(noteId, { ...note, archived_at: now, deleted_at: null, updated_at: now });
    return prev;
  },
  async moveNoteToTrash(noteId) {
    const note = await notesStore.getItem(noteId);
    if (!note) return null;
    const now = new Date().toISOString();
    const prev = { archived_at: note.archived_at || null, deleted_at: note.deleted_at || null };
    await notesStore.setItem(noteId, { ...note, deleted_at: now, archived_at: null, updated_at: now });
    return prev;
  },
  async restoreNote(noteId) {
    const note = await notesStore.getItem(noteId);
    if (!note) return null;
    const now = new Date().toISOString();
    const prev = { archived_at: note.archived_at || null, deleted_at: note.deleted_at || null };
    await notesStore.setItem(noteId, { ...note, archived_at: null, deleted_at: null, updated_at: now });
    return prev;
  },
  async restoreLifecycle(noteId, prev) {
    // Used by Undo — restores archived_at / deleted_at to a previously captured snapshot.
    const note = await notesStore.getItem(noteId);
    if (!note) return;
    const now = new Date().toISOString();
    await notesStore.setItem(noteId, {
      ...note,
      archived_at: prev?.archived_at || null,
      deleted_at: prev?.deleted_at || null,
      updated_at: now,
    });
  },
  async emptyTrash() {
    const all = await this.getAllNotes();
    const trashed = all.filter(n => n.deleted_at);
    for (const n of trashed) await notesStore.removeItem(n.id);
    return trashed.length;
  },

  // ========== CATEGORIES ==========
  async getCategories() {
    const notes = await this.getAllNotes();
    const categories = {};
    notes.forEach(note => {
      const cat = note.category || '';
      const subcat = note.subcategory || '';
      if (cat) {
        if (!categories[cat]) categories[cat] = new Set();
        if (subcat) categories[cat].add(subcat);
      }
    });
    const result = {};
    Object.keys(categories).forEach(cat => {
      result[cat] = Array.from(categories[cat]);
    });
    return result;
  },

  // ========== SETTINGS ==========
  async getSettings() {
    const settings = await settingsStore.getItem('app_settings');
    if (!settings) {
      const defaults = {
        id: 'app_settings',
        logo_url: '',
        header_bg: 'https://images.unsplash.com/photo-1771814536315-ae11952227fc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHw0fHxkYXJrJTIwZnV0dXJpc3RpYyUyMGFic3RyYWN0JTIwdGV4dHVyZXxlbnwwfHx8fDE3NzMxNjM2OTR8MA&ixlib=rb-4.1.0&q=85',
        website_url: 'https://ironrabbitapps.com',
        company_name: 'Iron Rabbit',
        view_mode: 'list',
        attachment_limits: { max_images: 10, max_files: 10, max_mb: 10 },
      };
      await settingsStore.setItem('app_settings', defaults);
      return defaults;
    }
    return settings;
  },

  async saveSettings(settings) {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await settingsStore.setItem('app_settings', updated);
    // Fire a global event so components living outside of NotesApp
    // (e.g. GlobalFocusChip mounted at the App root, other routes)
    // can react to setting changes without polling.
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ir:settings-changed", { detail: updated }));
      }
    } catch { /* noop — happens in SSR / test envs */ }
    return updated;
  },

  // ========== TEMPLATES ==========
  async getTemplates() {
    const templates = [];
    await templatesStore.iterate((value) => {
      templates.push(value);
    });
    return templates;
  },

  async saveTemplate(template) {
    await templatesStore.setItem(template.id, template);
    return template;
  },

  async deleteTemplate(id) {
    await templatesStore.removeItem(id);
    return true;
  },

  // ========== FILE UPLOADS (as base64 data URLs) ==========
  async uploadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // ========== FILE ATTACHMENTS (Blob-based, for notes) ==========
  // Files are stored as Blobs in a dedicated IndexedDB store.
  // Notes reference them by id — see note.attachments = [{ id, name, type, size }]

  ALLOWED_ATTACHMENT_TYPES: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf'
  ],
  // Attachment limits — kept as regular properties so callers (Attachments,
  // NoteModal) can read them, but they can be updated at runtime by
  // configureAttachmentLimits() from persisted app settings.
  MAX_ATTACHMENT_BYTES: 10 * 1024 * 1024, // 10 MB per file
  MAX_ATTACHMENTS_PER_NOTE: 20,            // total cap (images + files) — legacy
  MAX_IMAGES_PER_NOTE: 10,                 // configurable image cap
  MAX_FILES_PER_NOTE: 10,                  // configurable non-image (PDF) cap

  isImageMimeType(type) {
    return typeof type === 'string' && type.startsWith('image/');
  },

  // Apply user-adjusted limits (from Settings). Falls back to defaults for
  // any value missing/invalid. Called on app boot and whenever the user
  // saves the numbers in the Settings modal.
  configureAttachmentLimits(limits = {}) {
    const clamp = (v, min, max, fallback) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return fallback;
      return Math.max(min, Math.min(max, Math.floor(n)));
    };
    const images = clamp(limits.max_images, 1, 50, 10);
    const files  = clamp(limits.max_files,  0, 50, 10);
    const mb     = clamp(limits.max_mb,     1, 100, 10);
    this.MAX_IMAGES_PER_NOTE = images;
    this.MAX_FILES_PER_NOTE = files;
    this.MAX_ATTACHMENT_BYTES = mb * 1024 * 1024;
    this.MAX_ATTACHMENTS_PER_NOTE = images + files;
    return { max_images: images, max_files: files, max_mb: mb };
  },

  async saveAttachment(file) {
    if (!this.ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type || 'unknown'}. Allowed: images (JPG, PNG, GIF, WebP) and PDF.`);
    }
    if (file.size > this.MAX_ATTACHMENT_BYTES) {
      const mb = (this.MAX_ATTACHMENT_BYTES / (1024 * 1024)).toFixed(0);
      throw new Error(`File too large. Max ${mb} MB per attachment.`);
    }
    const id = 'att_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    // Store the Blob directly — localforage handles it natively
    await filesStore.setItem(id, {
      blob: file,
      name: file.name,
      type: file.type,
      size: file.size,
      created_at: new Date().toISOString(),
    });
    return { id, name: file.name, type: file.type, size: file.size };
  },

  async getAttachmentUrl(id) {
    const entry = await filesStore.getItem(id);
    if (!entry?.blob) return null;
    return URL.createObjectURL(entry.blob);
  },

  async getAttachmentBlob(id) {
    const entry = await filesStore.getItem(id);
    return entry?.blob || null;
  },

  async getAttachmentMeta(id) {
    const entry = await filesStore.getItem(id);
    if (!entry) return null;
    return { id, name: entry.name, type: entry.type, size: entry.size, created_at: entry.created_at };
  },

  async deleteAttachment(id) {
    await filesStore.removeItem(id);
    return true;
  },

  // Returns metadata for every stored attachment blob, sorted largest first.
  // Optionally cross-references with the notes list to attach a
  // { note_id, note_title } pair for each entry so the cleanup wizard can
  // show which note the attachment belongs to.
  async listAllAttachments({ notes } = {}) {
    const rows = [];
    await filesStore.iterate((entry, key) => {
      rows.push({
        id: key,
        name: entry?.name || 'file',
        type: entry?.type || 'application/octet-stream',
        size: Number(entry?.size) || 0,
        created_at: entry?.created_at || null,
      });
    });
    if (Array.isArray(notes) && notes.length) {
      const byAttId = new Map();
      for (const n of notes) {
        for (const a of (n.attachments || [])) {
          byAttId.set(a.id, { note_id: n.id, note_title: n.title || 'Untitled', archived: !!n.archived_at, deleted: !!n.deleted_at });
        }
      }
      for (const r of rows) {
        const link = byAttId.get(r.id);
        if (link) Object.assign(r, link);
        else Object.assign(r, { note_id: null, note_title: null, orphan: true });
      }
    }
    rows.sort((a, b) => b.size - a.size);
    return rows;
  },

  // Remove attachment blobs by id AND detach them from their host notes.
  // Passes notes-modified back so UI can refresh.
  async removeAttachmentsByIds(ids, { notes, saveNote } = {}) {
    if (!Array.isArray(ids) || ids.length === 0) return { removed: 0, notesUpdated: 0 };
    const idSet = new Set(ids);
    let removed = 0;
    for (const id of ids) {
      try { await filesStore.removeItem(id); removed++; } catch { /* ignore */ }
    }
    let notesUpdated = 0;
    if (Array.isArray(notes) && typeof saveNote === 'function') {
      for (const n of notes) {
        if (!Array.isArray(n.attachments) || n.attachments.length === 0) continue;
        const filtered = n.attachments.filter(a => !idSet.has(a.id));
        if (filtered.length !== n.attachments.length) {
          await saveNote({ ...n, attachments: filtered });
          notesUpdated++;
        }
      }
    }
    return { removed, notesUpdated };
  },

  // Restore previously-removed attachments. Each snapshot must contain
  // { id, blob, name, type, size, created_at, hostAttachments } where
  // hostAttachments is a { [noteId]: attachmentRecord } map captured
  // BEFORE removal. Re-writes blobs directly to filesStore (bypassing
  // the MIME/size validators) and re-attaches to each host note using
  // the note's CURRENT state (freshly read) so we don't clobber other
  // edits made during the undo window.
  async restoreAttachments(snapshots, { saveNote } = {}) {
    if (!Array.isArray(snapshots) || snapshots.length === 0) return { restored: 0, notesUpdated: 0 };
    let restored = 0;
    for (const s of snapshots) {
      if (!s?.id || !s?.blob) continue;
      try {
        await filesStore.setItem(s.id, {
          blob: s.blob,
          name: s.name,
          type: s.type,
          size: s.size,
          created_at: s.created_at || new Date().toISOString(),
        });
        restored++;
      } catch { /* ignore */ }
    }
    let notesUpdated = 0;
    if (typeof saveNote === 'function') {
      const additionsByNote = new Map(); // noteId -> [attachmentRecord, ...]
      for (const s of snapshots) {
        for (const [noteId, rec] of Object.entries(s.hostAttachments || {})) {
          if (!additionsByNote.has(noteId)) additionsByNote.set(noteId, []);
          additionsByNote.get(noteId).push(rec);
        }
      }
      for (const [noteId, additions] of additionsByNote) {
        const fresh = await notesStore.getItem(noteId);
        if (!fresh) continue;
        const existing = Array.isArray(fresh.attachments) ? fresh.attachments : [];
        const existingIds = new Set(existing.map(a => a.id));
        const additionsToApply = additions.filter(a => !existingIds.has(a.id));
        if (additionsToApply.length === 0) continue;
        await saveNote({ ...fresh, attachments: [...existing, ...additionsToApply] });
        notesUpdated++;
      }
    }
    return { restored, notesUpdated };
  },

  // Called when a note is deleted so we don't orphan blobs
  async deleteAttachmentsForNote(note) {
    if (!note?.attachments?.length) return;
    for (const att of note.attachments) {
      await filesStore.removeItem(att.id);
    }
  },

  // ========== BACKUP & RESTORE ==========
  async exportAllData() {
    const notes = await this.getAllNotes();
    const settings = await this.getSettings();
    const templates = await this.getTemplates();
    const exportedAt = new Date().toISOString();

    // Preset title overrides live in localStorage (fast, cross-tab). Include
    // them in backups so custom preset names follow the user to a new phone.
    let presetTitleOverrides = {};
    try {
      const raw = localStorage.getItem("iron_rabbit_preset_title_overrides_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") presetTitleOverrides = parsed;
      }
    } catch { /* localStorage disabled — ship an empty map */ }

    // Export attachments as base64 so the backup is a single portable JSON
    const files = {};
    await filesStore.iterate((entry, key) => {
      files[key] = entry; // preserve name/type/size/created_at
    });
    // Convert each blob to base64 (blobs don't survive JSON.stringify natively)
    const fileEntries = await Promise.all(
      Object.entries(files).map(async ([id, entry]) => {
        const b64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(entry.blob);
        });
        return [id, { name: entry.name, type: entry.type, size: entry.size, created_at: entry.created_at, data: b64 }];
      })
    );
    const filesSerialized = Object.fromEntries(fileEntries);

    return {
      version: '1.1',
      app: 'Iron Rabbit',
      exported_at: exportedAt,
      data: {
        notes,
        settings,
        templates,
        files: filesSerialized,
        preset_title_overrides: presetTitleOverrides,
      }
    };
  },

  async importAllData(backupData, mode = "replace") {
    if (!backupData || !backupData.data) {
      throw new Error('Invalid backup file');
    }

    const { notes = [], settings, templates = [], files = {}, preset_title_overrides } = backupData.data;

    // Replace mode wipes existing data; merge mode preserves and overwrites by id.
    if (mode === "replace") {
      await notesStore.clear();
      await templatesStore.clear();
      await filesStore.clear();
    }

    // Restore attachments (base64 → Blob)
    for (const [id, entry] of Object.entries(files)) {
      try {
        const res = await fetch(entry.data);
        const blob = await res.blob();
        await filesStore.setItem(id, {
          blob,
          name: entry.name,
          type: entry.type,
          size: entry.size,
          created_at: entry.created_at,
        });
      } catch (err) {
        console.error(`Failed to restore attachment ${id}:`, err);
      }
    }

    // Import notes (setItem overwrites by id in both modes)
    for (const note of notes) {
      await notesStore.setItem(note.id, note);
    }

    // Import templates
    for (const template of templates) {
      await templatesStore.setItem(template.id, template);
    }

    // Import settings — in merge mode preserve unspecified user keys
    if (settings) {
      if (mode === "merge") {
        const existing = (await settingsStore.getItem('app_settings')) || {};
        await settingsStore.setItem('app_settings', { ...existing, ...settings });
      } else {
        await settingsStore.setItem('app_settings', settings);
      }
    }

    // Restore custom preset title overrides (localStorage-backed) — merge
    // mode keeps existing local names, replace mode overwrites everything.
    if (preset_title_overrides && typeof preset_title_overrides === "object") {
      try {
        const key = "iron_rabbit_preset_title_overrides_v1";
        let next = preset_title_overrides;
        if (mode === "merge") {
          const raw = localStorage.getItem(key);
          const existing = raw ? (JSON.parse(raw) || {}) : {};
          next = { ...existing, ...preset_title_overrides };
        }
        // Coerce to strings + drop empties
        const clean = {};
        for (const [k, v] of Object.entries(next)) {
          if (typeof v === "string" && v.trim()) clean[k] = v.trim();
        }
        localStorage.setItem(key, JSON.stringify(clean));
        // Broadcast so any mounted picker refreshes without reload
        window.dispatchEvent(new CustomEvent("iron-rabbit-preset-overrides-changed"));
      } catch (err) {
        console.error("Failed to restore preset title overrides:", err);
      }
    }

    const summary = {
      notesRestored: notes.length,
      templatesRestored: templates.length,
      filesRestored: Object.keys(files).length,
    };
    // Keep legacy keys too for any older callers
    return { ...summary, notes: summary.notesRestored, templates: summary.templatesRestored, files: summary.filesRestored };
  },

  async clearAllData() {
    await notesStore.clear();
    await settingsStore.clear();
    await templatesStore.clear();
    await filesStore.clear();
    await metadataStore.clear();
    return true;
  },

  // ========== MIGRATION FROM BACKEND ==========
  async migrateFromBackend(backendUrl, force = false) {
    const alreadyMigrated = await metadataStore.getItem('migrated_from_backend');
    if (alreadyMigrated && !force) return { migrated: false, reason: 'already_migrated' };

    // Set flag immediately to prevent concurrent duplicate runs (StrictMode)
    if (!force) await metadataStore.setItem('migrated_from_backend', true);

    try {
      const [notesRes, settingsRes, templatesRes] = await Promise.all([
        fetch(`${backendUrl}/api/notes`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${backendUrl}/api/settings`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${backendUrl}/api/templates`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);

      const existingIds = new Set();
      await notesStore.iterate((value, key) => { existingIds.add(key); });

      let notesCount = 0;
      for (const note of notesRes) {
        if (!existingIds.has(note.id)) {
          await notesStore.setItem(note.id, note);
          notesCount++;
        }
      }

      let templatesCount = 0;
      const existingTemplateIds = new Set();
      await templatesStore.iterate((value, key) => { existingTemplateIds.add(key); });
      for (const template of templatesRes) {
        if (!existingTemplateIds.has(template.id)) {
          await templatesStore.setItem(template.id, template);
          templatesCount++;
        }
      }

      if (force) await metadataStore.setItem('migrated_from_backend', true);
      return { migrated: true, notes: notesCount, templates: templatesCount };
    } catch (err) {
      console.error('Migration failed:', err);
      return { migrated: false, reason: 'error', error: err.message };
    }
  },

  // ========== STORAGE QUOTA ==========
  async getStorageInfo() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          usageMB: ((estimate.usage || 0) / (1024 * 1024)).toFixed(2),
          quotaMB: ((estimate.quota || 0) / (1024 * 1024)).toFixed(2),
          percentUsed: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(2) : 0,
        };
      } catch (err) {
        console.error('Storage estimate error:', err);
      }
    }
    return { usage: 0, quota: 0, usageMB: '0', quotaMB: 'Unknown', percentUsed: 0 };
  },

  // ========== METADATA ==========
  async getMetadata(key) {
    return await metadataStore.getItem(key);
  },

  async setMetadata(key, value) {
    await metadataStore.setItem(key, value);
    return value;
  },

  // ========== GROCERY TRIP JOURNAL ==========
  // Trips are stored as an array in `settings.grocery_trips`.
  // Shape: { id, date (ISO), item_count, total_spent, items: [{text, price, dept}], notes }
  async getGroceryTrips() {
    const settings = await this.getSettings();
    return Array.isArray(settings?.grocery_trips) ? settings.grocery_trips : [];
  },
  async saveGroceryTrip(trip) {
    const trips = await this.getGroceryTrips();
    const withId = { id: trip.id || `trip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, ...trip };
    trips.push(withId);
    // Cap history at 500 trips
    const trimmed = trips.slice(-500);
    await this.saveSettings({ grocery_trips: trimmed });
    return withId;
  },
  async deleteGroceryTrip(id) {
    const trips = await this.getGroceryTrips();
    const next = trips.filter(t => t.id !== id);
    await this.saveSettings({ grocery_trips: next });
    return true;
  },
  async updateGroceryTrip(id, updates) {
    const trips = await this.getGroceryTrips();
    const next = trips.map(t => t.id === id ? { ...t, ...updates } : t);
    await this.saveSettings({ grocery_trips: next });
    return next.find(t => t.id === id);
  },

  // ========== MEAL PLAN + RECIPES ==========
  // Meal plan is a 7-day map keyed by ISO date (yyyy-mm-dd) →
  // { breakfast: recipeId|null, lunch: recipeId|null, dinner: recipeId|null }
  async getMealPlan() {
    const settings = await this.getSettings();
    return settings?.meal_plan || {};
  },
  async saveMealPlan(plan) {
    await this.saveSettings({ meal_plan: plan });
    return plan;
  },
  async getCustomRecipes() {
    const settings = await this.getSettings();
    return Array.isArray(settings?.custom_recipes) ? settings.custom_recipes : [];
  },
  async saveCustomRecipe(recipe) {
    const list = await this.getCustomRecipes();
    const withId = { id: recipe.id || `recipe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, ...recipe };
    const idx = list.findIndex(r => r.id === withId.id);
    if (idx >= 0) list[idx] = withId;
    else list.push(withId);
    await this.saveSettings({ custom_recipes: list });
    return withId;
  },
  async deleteCustomRecipe(id) {
    const list = await this.getCustomRecipes();
    await this.saveSettings({ custom_recipes: list.filter(r => r.id !== id) });
    return true;
  },

  // ========== PANTRY ==========
  // Pantry items are stored in `settings.pantry_items[]`.
  // Shape: { id, name, qty, unit, dept, added_at, expires_at?, opened_at?, notes? }
  async getPantryItems() {
    const settings = await this.getSettings();
    return Array.isArray(settings?.pantry_items) ? settings.pantry_items : [];
  },
  async savePantryItem(item) {
    const list = await this.getPantryItems();
    const generatedId = `pantry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const withId = {
      added_at: new Date().toISOString(),
      ...item,
      id: item.id || generatedId,
    };
    const idx = list.findIndex(p => p.id === withId.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...withId };
    else list.push(withId);
    await this.saveSettings({ pantry_items: list });
    return withId;
  },
  async deletePantryItem(id) {
    const list = await this.getPantryItems();
    await this.saveSettings({ pantry_items: list.filter(p => p.id !== id) });
    return true;
  },
  async updatePantryItem(id, updates) {
    const list = await this.getPantryItems();
    const next = list.map(p => p.id === id ? { ...p, ...updates } : p);
    await this.saveSettings({ pantry_items: next });
    return next.find(p => p.id === id);
  },
};

// ==================== FUTURE: CLOUD SYNC INTERFACE ====================
// This is a stub for future premium cloud sync features.
// It follows the same interface as StorageService so it can be swapped in.
// 
// export const CloudSyncService = {
//   ...StorageService,  // Extends offline behavior
//   syncToCloud: async () => { /* Premium feature */ },
//   syncFromCloud: async () => { /* Premium feature */ },
//   isCloudEnabled: () => false,  // Toggled by user upgrade
// };

export default StorageService;
