// ==========================================================================
// Iron Rabbit — Floating Rich-Text Editor · Adapters
// --------------------------------------------------------------------------
// Read-only integration surface for the Floating Rich-Text Toolbar.
//
// Module 1 scope (this file):
//   - Expose live Iron Rabbit data (Tile/Forms Packs + Category Hierarchy)
//     to the toolbar so the picker screens can browse them.
//   - Return typed shapes so Module 2 (Hierarchy Extraction & Placement)
//     can plug in without a schema migration.
//
// Module 2 will add the "Insert Here" / "Place Here" write paths.  For now
// every write-path helper returns `{ ok: false, reason: "module_2_pending" }`
// and the toolbar surfaces that via a toast — this is the "read but don't
// yet insert" behavior the product owner confirmed.
// ==========================================================================

import { TILE_PACKS } from "../../data/tilePacks";

// --------------------------------------------------------------------------
// Forms Pack Adapter
// --------------------------------------------------------------------------
// Iron Rabbit's Forms/Tile Packs live in data/tilePacks.js as an array of
// pack descriptors (`{ id, name, accent, ... }`).  We deliberately do NOT
// re-implement any pack storage here — this is a thin read facade.
export const FormsPackAdapter = {
  isAvailable() {
    return Array.isArray(TILE_PACKS) && TILE_PACKS.length > 0;
  },

  listPacks() {
    if (!this.isAvailable()) return [];
    return TILE_PACKS.map(p => ({
      id: p.id,
      name: p.name,
      accent: p.accent || "#8b5cf6",
      tileCount: Array.isArray(p.tiles) ? p.tiles.length : 0,
    }));
  },

  getPack(packId) {
    if (!this.isAvailable()) return null;
    return TILE_PACKS.find(p => p.id === packId) || null;
  },

  // Module 2 write path — deliberately no-op today.
  insertPackIntoEditor(/* packId, editorRef */) {
    return { ok: false, reason: "module_2_pending" };
  },
};

// --------------------------------------------------------------------------
// Hierarchy Adapter
// --------------------------------------------------------------------------
// Iron Rabbit's category hierarchy is materialised at the note level via
// `note.category_path` (an array of segments, deepest first or last per the
// caller's convention).  We build a shallow, on-demand tree here without
// mutating any note.  Module 2 will consume the same `buildTree()` output.
export const HierarchyAdapter = {
  // Build a { name, children: [...] } tree from a live notes array.
  // Uses the same segmentation convention as NotesApp.processedNotes.
  buildTree(notes) {
    if (!Array.isArray(notes) || notes.length === 0) return [];
    const root = {};
    for (const n of notes) {
      const path = Array.isArray(n?.category_path) ? n.category_path : (
        n?.category ? [n.category, ...(n.subcategory ? [n.subcategory] : [])] : []
      );
      if (path.length === 0) continue;
      let cursor = root;
      for (const seg of path) {
        if (!seg) continue;
        if (!cursor[seg]) cursor[seg] = {};
        cursor = cursor[seg];
      }
    }
    // Recursively convert to array of { name, children } for stable render
    const toArray = (node) =>
      Object.keys(node).sort((a, b) => a.localeCompare(b)).map(key => ({
        name: key,
        children: toArray(node[key]),
      }));
    return toArray(root);
  },

  // Module 2 write path — deliberately no-op today.
  placeAtPath(/* pathSegments, payload */) {
    return { ok: false, reason: "module_2_pending" };
  },
};
