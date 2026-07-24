import React from "react";
import * as LucideIcons from "lucide-react";
import { Package, Sparkles, Pin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TILE_PACKS } from "../data/tilePacks";
import { getBackgroundStyle } from "../components/BackgroundPicker";

/**
 * Curated tile-pack picker. Selecting a pack calls onApply with the pack's
 * notes so the caller can bulk-create them.
 */
export default function TilePacksModal({ isOpen, onClose, onApply, isDark }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-2xl max-h-[85vh] overflow-y-auto ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}
        data-testid="tile-packs-modal"
      >
        <DialogHeader>
          <DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Package className="w-5 h-5 text-indigo-500" /> Tile Packs
          </DialogTitle>
          <DialogDescription className={isDark ? 'text-slate-400' : 'text-gray-500'}>
            Apply a curated bundle to drop 4–5 ready-to-use notes into your library.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TILE_PACKS.map(pack => (
            <div
              key={pack.id}
              className={`rounded-xl border p-4 flex flex-col gap-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}
              data-testid={`tile-pack-${pack.id}`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: pack.accent }}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{pack.name}</div>
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
      </DialogContent>
    </Dialog>
  );
}
