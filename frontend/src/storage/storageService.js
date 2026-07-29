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
  async moveNoteToCategory(noteId, newCategory, newSubcategory = "") {
    const note = await notesStore.getItem(noteId);
    if (!note) return null;
    const prev = { category: note.category || "", subcategory: note.subcategory || "" };
    note.category = newCategory || "";
    note.subcategory = newSubcategory || "";
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

  // ========== FULL BACKUP · EXPORT / IMPORT ==========
  // Serializes every user-owned store into a portable JSON blob.
  // Files (attachments) are converted to base64 data URLs so the entire
  // backup is a single self-contained JSON — no sidecar assets.
  async exportAllData() {
    const notesArr = await this.getAllNotes();
    const templatesArr = [];
    await templatesStore.iterate((v) => { templatesArr.push(v); });
    const settings = await this.getSettings();

    // Attachments — convert Blob values to base64 data URLs so JSON export works.
    const files = {};
    await filesStore.iterate(async (value, key) => {
      if (value instanceof Blob) {
        const dataUrl = await new Promise((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.readAsDataURL(value);
        });
        files[key] = { kind: "blob", type: value.type, dataUrl };
      } else {
        files[key] = { kind: "raw", value };
      }
    });

    return {
      app: "IronRabbit",
      version: 1,
      exported_at: new Date().toISOString(),
      counts: { notes: notesArr.length, templates: templatesArr.length, files: Object.keys(files).length },
      notes: notesArr,
      templates: templatesArr,
      settings: settings || {},
      files,
    };
  },

  // Import a backup JSON. `mode` = "merge" (upsert by id, keep others) or
  // "replace" (wipe every user store first, then hydrate from backup).
  // Returns a summary of restored counts.
  async importAllData(payload, mode = "merge") {
    if (!payload || payload.app !== "IronRabbit") {
      throw new Error("Not an Iron Rabbit backup file.");
    }
    if (mode === "replace") {
      await notesStore.clear();
      await templatesStore.clear();
      await filesStore.clear();
      // settings intentionally kept unless payload explicitly overwrites it below
    }
    let notesRestored = 0, templatesRestored = 0, filesRestored = 0;
    for (const n of payload.notes || []) {
      if (!n?.id) continue;
      await notesStore.setItem(n.id, n);
      notesRestored++;
    }
    for (const t of payload.templates || []) {
      if (!t?.id) continue;
      await templatesStore.setItem(t.id, t);
      templatesRestored++;
    }
    for (const [key, entry] of Object.entries(payload.files || {})) {
      if (!entry) continue;
      if (entry.kind === "blob" && entry.dataUrl) {
        // Convert base64 dataUrl back to a Blob before storing.
        const resp = await fetch(entry.dataUrl);
        const blob = await resp.blob();
        await filesStore.setItem(key, blob);
      } else if (entry.kind === "raw") {
        await filesStore.setItem(key, entry.value);
      }
      filesRestored++;
    }
    if (payload.settings && mode === "replace") {
      await settingsStore.setItem("app_settings", payload.settings);
    } else if (payload.settings && mode === "merge") {
      const current = (await settingsStore.getItem("app_settings")) || {};
      await settingsStore.setItem("app_settings", { ...current, ...payload.settings });
    }
    return { notesRestored, templatesRestored, filesRestored };
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
  MAX_ATTACHMENT_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_ATTACHMENTS_PER_NOTE: 10,

  async saveAttachment(file) {
    if (!this.ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type || 'unknown'}. Allowed: images (JPG, PNG, GIF, WebP) and PDF.`);
    }
    if (file.size > this.MAX_ATTACHMENT_BYTES) {
      throw new Error(`File too large. Max 10 MB per attachment.`);
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
      }
    };
  },

  async importAllData(backupData) {
    if (!backupData || !backupData.data) {
      throw new Error('Invalid backup file');
    }

    const { notes = [], settings, templates = [], files = {} } = backupData.data;

    // Clear existing data
    await notesStore.clear();
    await templatesStore.clear();
    await filesStore.clear();

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

    // Import notes
    for (const note of notes) {
      await notesStore.setItem(note.id, note);
    }

    // Import templates
    for (const template of templates) {
      await templatesStore.setItem(template.id, template);
    }

    // Import settings (merge with defaults)
    if (settings) {
      await settingsStore.setItem('app_settings', settings);
    }

    return { notes: notes.length, templates: templates.length, files: Object.keys(files).length };
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
    const withId = {
      id: item.id || `pantry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      added_at: item.added_at || new Date().toISOString(),
      ...item,
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
