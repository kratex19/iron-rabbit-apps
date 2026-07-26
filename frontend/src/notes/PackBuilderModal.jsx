import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
import { Plus, X, Sparkles, Save, Trash2, StickyNote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import IconPicker from "../components/IconPicker";
import BackgroundPicker, { getBackgroundStyle } from "../components/BackgroundPicker";
import { toast } from "sonner";

const rid = () => Math.random().toString(36).slice(2, 10);
const DEFAULT_ACCENTS = ["#6366f1", "#10b981", "#ec4899", "#f97316", "#0ea5e9", "#a855f7", "#f59e0b", "#059669"];

/**
 * Modal for building/editing a custom Tile Pack. Users can name the pack,
 * pick an accent color, and add multiple tiles — each with a title, icon,
 * and background. Saved packs live in settings.custom_packs and appear in
 * the same Tile Packs picker alongside built-ins.
 */
export default function PackBuilderModal({ isOpen, onClose, onSave, existingPack, onDelete, isDark }) {
  const isEdit = !!existingPack;
  const [name, setName] = useState(existingPack?.name || "");
  const [tagline, setTagline] = useState(existingPack?.tagline || "");
  const [accent, setAccent] = useState(existingPack?.accent || DEFAULT_ACCENTS[0]);
  const [tiles, setTiles] = useState(existingPack?.notes || []);

  // Mini form for the tile currently being added
  const [tileTitle, setTileTitle] = useState("");
  const [tileContent, setTileContent] = useState("");
  const [tileIcon, setTileIcon] = useState(null);
  const [tileBg, setTileBg] = useState(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName(existingPack?.name || "");
      setTagline(existingPack?.tagline || "");
      setAccent(existingPack?.accent || DEFAULT_ACCENTS[0]);
      setTiles(existingPack?.notes || []);
      setTileTitle(""); setTileContent(""); setTileIcon(null); setTileBg(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, existingPack]);

  const addTile = () => {
    if (!tileTitle.trim()) { toast.error("Tile title required"); return; }
    setTiles(prev => [...prev, {
      title: tileTitle.trim(),
      content: tileContent,
      color: "purple",
      icon: tileIcon,
      background: tileBg || { type: "gradient", value: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" },
      category: name.trim() || "Custom",
    }]);
    setTileTitle(""); setTileContent(""); setTileIcon(null); setTileBg(null);
  };
  const removeTile = (idx) => setTiles(prev => prev.filter((_, i) => i !== idx));

  const savePack = () => {
    if (!name.trim()) { toast.error("Pack needs a name"); return; }
    if (tiles.length === 0) { toast.error("Add at least one tile"); return; }
    const pack = {
      id: existingPack?.id || `custom-${rid()}`,
      name: name.trim(),
      tagline: tagline.trim() || `${tiles.length} custom tiles`,
      accent,
      custom: true,
      notes: tiles,
    };
    onSave(pack);
    onClose();
  };

  const deletePack = () => {
    if (!existingPack) return;
    if (window.confirm(`Delete pack "${existingPack.name}"?`)) {
      onDelete(existingPack.id);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className={`max-w-lg max-h-[90vh] flex flex-col ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}
          data-testid="pack-builder-modal"
        >
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Sparkles className="w-5 h-5 text-indigo-500" /> {isEdit ? "Edit Pack" : "Build Your Own Pack"}
            </DialogTitle>
            <DialogDescription className={isDark ? 'text-slate-400' : 'text-gray-500'}>
              Create a reusable bundle. Give it a name, pick a color, then add tiles.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 -mx-6 px-6 space-y-3">
            {/* Pack meta */}
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Pack Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Weekend Camping" className={`h-9 ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`} data-testid="pack-name-input" />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Tagline (optional)</label>
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One-line summary" className={`h-9 ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`} />
            </div>
            <div>
              <label className={`text-xs mb-1.5 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Accent Color</label>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_ACCENTS.map(c => (
                  <button key={c} type="button" onClick={() => setAccent(c)}
                    className={`w-7 h-7 rounded-full border-2 transition ${accent === c ? 'border-white ring-2 ring-indigo-500' : 'border-transparent hover:border-white/40'}`}
                    style={{ background: c }} title={c} />
                ))}
              </div>
            </div>

            {/* Existing tiles */}
            {tiles.length > 0 && (
              <div>
                <label className={`text-xs mb-1.5 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Tiles in this pack ({tiles.length})</label>
                <div className="grid grid-cols-4 gap-2">
                  {tiles.map((t, i) => {
                    const Ico = t.icon && LucideIcons[t.icon] ? LucideIcons[t.icon] : StickyNote;
                    return (
                      <div key={i} className="aspect-square rounded-md relative overflow-hidden flex items-center justify-center" style={getBackgroundStyle(t.background)}>
                        <span className="absolute inset-0 bg-black/40" />
                        <Ico className="w-5 h-5 text-white relative z-10" strokeWidth={1.6} />
                        <span className="absolute bottom-0.5 left-1 right-1 text-[9px] text-white text-center leading-tight truncate z-10">{t.title}</span>
                        <button type="button" onClick={() => removeTile(i)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white z-20 flex items-center justify-center"
                          data-testid={`remove-tile-${i}`}>
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add-tile form */}
            <div className={`rounded-lg p-3 space-y-2 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
              <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Add a tile</label>
              <Input value={tileTitle} onChange={(e) => setTileTitle(e.target.value)} placeholder="Tile title" className={`h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`} data-testid="tile-title-input" />
              <Textarea value={tileContent} onChange={(e) => setTileContent(e.target.value)} rows={2} placeholder="Starter content (optional)" className={`text-xs resize-none ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`} />
              <div className="flex items-center gap-2">
                <button type="button"
                  className="editor-tile-preview" style={{ ...getBackgroundStyle(tileBg), width: 60, height: 60 }}
                  onClick={() => setBgPickerOpen(true)} data-testid="pack-tile-bg-btn">
                  <span className="preview-overlay" />
                  {(() => {
                    const Ico = tileIcon && LucideIcons[tileIcon] ? LucideIcons[tileIcon] : StickyNote;
                    return <Ico className="w-5 h-5 relative z-10" strokeWidth={1.6} />;
                  })()}
                </button>
                <div className="flex-1 flex flex-col gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIconPickerOpen(true)} className={`justify-start h-7 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`}>
                    <Sparkles className="w-3 h-3 mr-1" /> {tileIcon || "Icon"}
                  </Button>
                  <Button type="button" size="sm" onClick={addTile} className="h-7 text-xs bg-indigo-500 hover:bg-indigo-600 text-white" data-testid="pack-add-tile-btn">
                    <Plus className="w-3 h-3 mr-1" /> Add Tile
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-between">
            {isEdit && (
              <Button variant="outline" onClick={deletePack} className="text-red-500 border-red-500/30 hover:bg-red-500/10 h-9" data-testid="pack-delete-btn">
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={onClose} className={`h-9 ${isDark ? 'border-white/10 text-slate-300' : ''}`}>Cancel</Button>
              <Button onClick={savePack} className="h-9 bg-indigo-500 hover:bg-indigo-600 text-white" data-testid="pack-save-btn">
                <Save className="w-4 h-4 mr-1" /> {isEdit ? "Update" : "Save Pack"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <IconPicker isOpen={iconPickerOpen} onClose={() => setIconPickerOpen(false)} value={tileIcon} onSelect={setTileIcon} isDark={isDark} />
      <BackgroundPicker isOpen={bgPickerOpen} onClose={() => setBgPickerOpen(false)} value={tileBg} onSelect={setTileBg} isDark={isDark} />
    </>
  );
}
