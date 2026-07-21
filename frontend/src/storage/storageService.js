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
        website_url: 'https://otropis.com',
        company_name: 'Iron Rabbit',
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

  // ========== BACKUP & RESTORE ==========
  async exportAllData() {
    const notes = await this.getAllNotes();
    const settings = await this.getSettings();
    const templates = await this.getTemplates();
    const exportedAt = new Date().toISOString();

    return {
      version: '1.0',
      app: 'Iron Rabbit',
      exported_at: exportedAt,
      data: {
        notes,
        settings,
        templates,
      }
    };
  },

  async importAllData(backupData) {
    if (!backupData || !backupData.data) {
      throw new Error('Invalid backup file');
    }

    const { notes = [], settings, templates = [] } = backupData.data;

    // Clear existing data
    await notesStore.clear();
    await templatesStore.clear();

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

    return { notes: notes.length, templates: templates.length };
  },

  async clearAllData() {
    await notesStore.clear();
    await settingsStore.clear();
    await templatesStore.clear();
    await metadataStore.clear();
    return true;
  },

  // ========== METADATA ==========
  async getMetadata(key) {
    return await metadataStore.getItem(key);
  },

  async setMetadata(key, value) {
    await metadataStore.setItem(key, value);
    return value;
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
