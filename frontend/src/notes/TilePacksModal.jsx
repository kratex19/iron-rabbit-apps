import React, { useState, useEffect, useCallback } from "react";
import * as LucideIcons from "lucide-react";
import { Package, Sparkles, Pin, Search, Plus, Pencil, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TILE_PACKS } from "../data/tilePacks";
import { getBackgroundStyle } from "../components/BackgroundPicker";
import PackBuilderModal from "./PackBuilderModal";
import StorageService from "../storage/storageService";

/**
 * Curated tile-pack picker. Selecting a pack calls onApply with the pack's
 * notes so the caller can bulk-create them. Includes a search field to
 * filter across the 30+ packs by name or tagline.
 */
export default function TilePacksModal({ isOpen, onClose, onApply, isDark }) {
  const [query, setQuery] = useState("");
  const [customPacks, setCustomPacks] = useState([]);
  const [pinnedPackIds, setPinnedPackIds] = useState([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingPack, setEditingPack] = useState(null);

  const loadCustom = useCallback(async () => {
    try {
      const s = await StorageService.getSettings();
      setCustomPacks(Array.isArray(s?.custom_packs) ? s.custom_packs : []);
      setPinnedPackIds(Array.isArray(s?.pack_pins) ? s.pack_pins : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (isOpen) loadCustom(); }, [isOpen, loadCustom]);

  const handleSavePack = async (pack) => {
    const others = customPacks.filter(p => p.id !== pack.id);
    const next = [...others, pack];
    setCustomPacks(next);
    await StorageService.saveSettings({ custom_packs: next });
  };
  const handleDeletePack = async (id) => {
    const next = customPacks.filter(p => p.id !== id);
    setCustomPacks(next);
    await StorageService.saveSettings({ custom_packs: next });
    // Also drop it from pins if pinned
    if (pinnedPackIds.includes(id)) {
      const nextPins = pinnedPackIds.filter(pid => pid !== id);
      setPinnedPackIds(nextPins);
      await StorageService.saveSettings({ pack_pins: nextPins });
    }
  };

  // Toggle pin state for a pack — persisted in app_settings.pack_pins so
  // Backup/Restore captures favourites just like the other pins.
  const togglePin = async (id) => {
    const isPinned = pinnedPackIds.includes(id);
    const next = isPinned
      ? pinnedPackIds.filter(pid => pid !== id)
      : [id, ...pinnedPackIds.filter(pid => pid !== id)];
    setPinnedPackIds(next);
    try {
      await StorageService.saveSettings({ pack_pins: next });
    } catch (e) {
      console.error("[TilePacksModal] persist pins failed:", e);
    }
  };

  const allPacks = [...TILE_PACKS, ...customPacks];
  const filtered = allPacks.filter(pack => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      pack.name.toLowerCase().includes(q) ||
      pack.tagline.toLowerCase().includes(q) ||
      pack.notes.some(n => n.title.toLowerCase().includes(q))
    );
  });
  // Sort pinned first (in pin-order), keeping the incoming order otherwise.
  const sorted = [...filtered].sort((a, b) => {
    const ai = pinnedPackIds.indexOf(a.id);
    const bi = pinnedPackIds.indexOf(b.id);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-3xl max-h-[85vh] flex flex-col ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}
        data-testid="tile-packs-modal"
      >
        <DialogHeader>
          <DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Package className="w-5 h-5 text-indigo-500" /> Tile Packs
            <span className={`text-xs font-normal ml-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{allPacks.length} bundles</span>
          </DialogTitle>
          <DialogDescription className={isDark ? 'text-slate-400' : 'text-gray-500'}>
            Apply a curated bundle to drop 4–5 ready-to-use notes into your library.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search packs..."
            className={`pl-8 h-9 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-gray-200'}`}
            data-testid="tile-packs-search"
          />
        </div>

        <div className="overflow-y-auto flex-1 -mx-6 px-6 pb-2">
          {/* Split into "Pinned" + "All" sections when both exist */}
          {(() => {
            const pinnedList   = sorted.filter(p => pinnedPackIds.includes(p.id));
            const unpinnedList = sorted.filter(p => !pinnedPackIds.includes(p.id));
            const showSplit = pinnedList.length > 0 && unpinnedList.length > 0;

            const renderCard = (pack) => {
              const isPinned = pinnedPackIds.includes(pack.id);
              return (
              <div
                key={pack.id}
                className={`relative rounded-xl border p-4 flex flex-col gap-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} ${isPinned ? 'ring-1 ring-amber-400/50' : ''}`}
                data-testid={`tile-pack-${pack.id}`}
              >
                <button
                  type="button"
                  onClick={() => togglePin(pack.id)}
                  className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    isPinned
                      ? "bg-amber-400 text-black"
                      : isDark ? "text-slate-500 hover:text-amber-300 hover:bg-white/10" : "text-gray-400 hover:text-amber-500 hover:bg-gray-100"
                  }`}
                  aria-label={isPinned ? `Unpin ${pack.name}` : `Pin ${pack.name}`}
                  title={isPinned ? "Unpin pack" : "Pin to top"}
                  data-testid={`pack-pin-${pack.id}`}
                >
                  <Star className={`w-4 h-4 ${isPinned ? "fill-current" : ""}`} />
                </button>
                <div className="flex items-center gap-2 pr-8">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: pack.accent }}>
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{pack.name}</div>
                      {pack.custom && (
                        <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>Custom</span>
                      )}
                    </div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{pack.notes.length} tiles</div>
                  </div>
                </div>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{pack.tagline}</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {pack.notes.slice(0, 5).map((n, i) => {
                    const Ico = n.icon && LucideIcons[n.icon] ? LucideIcons[n.icon] : LucideIcons.StickyNote;
                    return (
                      <div key={i} className="aspect-square rounded-md relative overflow-hidden flex items-center justify-center" style={getBackgroundStyle(n.background)} title={n.title}>
                        <span className="absolute inset-0 bg-black/30" />
                        <Ico className="w-4 h-4 text-white relative z-10" strokeWidth={1.6} />
                        {n.pinned && <Pin className="w-2.5 h-2.5 text-white absolute top-1 left-1 z-10" />}
                      </div>
                    );
                  })}
                </div>
                <Button
                  onClick={() => onApply(pack)}
                  size="sm"
                  className="w-full h-8 bg-indigo-500 hover:bg-indigo-600 text-white text-xs"
                  data-testid={`apply-pack-${pack.id}`}
                >
                  Apply Pack
                </Button>
                {pack.custom && (
                  <Button
                    variant="outline"
                    onClick={() => { setEditingPack(pack); setBuilderOpen(true); }}
                    size="sm"
                    className={`w-full h-7 text-xs mt-1 ${isDark ? 'border-white/10 text-slate-300' : ''}`}
                    data-testid={`edit-pack-${pack.id}`}
                  >
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                  </Button>
                )}
              </div>
              );
            };

            const buildYourOwnCard = (
              <button
                key="build-your-own"
                type="button"
                onClick={() => { setEditingPack(null); setBuilderOpen(true); }}
                className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 p-4 min-h-[180px] transition-all ${isDark ? 'border-white/20 hover:border-indigo-400 hover:bg-indigo-500/5 text-slate-400 hover:text-indigo-300' : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600'}`}
                data-testid="build-your-own-pack"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)" }}>
                  <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div className="text-sm font-semibold">Build Your Own Pack</div>
                <div className="text-[11px] text-center leading-tight px-2">Create a reusable bundle of tiles</div>
              </button>
            );

            if (!showSplit) {
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sorted.map(renderCard)}
                  {buildYourOwnCard}
                </div>
              );
            }
            return (
              <>
                <h4 className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider mb-2 ${isDark ? "text-amber-300" : "text-amber-600"}`}
                    data-testid="tile-packs-pinned-header">
                  <Star className="w-3 h-3 fill-current" /> Pinned
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {pinnedList.map(renderCard)}
                </div>
                <h4 className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}
                    data-testid="tile-packs-all-header">
                  All packs
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {unpinnedList.map(renderCard)}
                  {buildYourOwnCard}
                </div>
              </>
            );
          })()}
          {sorted.length === 0 && (
            <div className={`text-center py-10 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              No packs match &quot;{query}&quot;
            </div>
          )}
        </div>
      </DialogContent>

      <PackBuilderModal
        isOpen={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditingPack(null); }}
        onSave={handleSavePack}
        onDelete={handleDeletePack}
        existingPack={editingPack}
        isDark={isDark}
      />
    </Dialog>
  );
}
