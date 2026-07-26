import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
import { Package, Sparkles, Pin, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TILE_PACKS } from "../data/tilePacks";
import { getBackgroundStyle } from "../components/BackgroundPicker";

/**
 * Curated tile-pack picker. Selecting a pack calls onApply with the pack's
 * notes so the caller can bulk-create them. Includes a search field to
 * filter across the 30+ packs by name or tagline.
 */
export default function TilePacksModal({ isOpen, onClose, onApply, isDark }) {
  const [query, setQuery] = useState("");

  const filtered = TILE_PACKS.filter(pack => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      pack.name.toLowerCase().includes(q) ||
      pack.tagline.toLowerCase().includes(q) ||
      pack.notes.some(n => n.title.toLowerCase().includes(q))
    );
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
            <span className={`text-xs font-normal ml-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{TILE_PACKS.length} bundles</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(pack => (
              <div
                key={pack.id}
                className={`rounded-xl border p-4 flex flex-col gap-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}
                data-testid={`tile-pack-${pack.id}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: pack.accent }}>
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{pack.name}</div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{pack.notes.length} tiles</div>
                  </div>
                </div>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{pack.tagline}</p>

                {/* Preview strip */}
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
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className={`text-center py-10 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              No packs match &quot;{query}&quot;
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
