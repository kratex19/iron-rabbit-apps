import React, { useEffect, useMemo, useState } from "react";
import * as LucideIcons from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ICON_CATEGORIES } from "../data/noteIcons";
import { Search, X, Star, Clock } from "lucide-react";
import StorageService from "../storage/storageService";

const ICON_RECENTS_KEY = "iron_rabbit_icon_recents_v1";
const MAX_ICON_RECENTS = 12;

// Load recents from localStorage. Pinned icons are hydrated from IndexedDB
// on mount so they survive across devices via Backup/Restore.
function loadIconRecents() {
  const empty = { recents: [], pinned: [] };
  try {
    const raw = localStorage.getItem(ICON_RECENTS_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      recents: Array.isArray(parsed.recents) ? parsed.recents.filter(n => typeof n === "string") : [],
      pinned: Array.isArray(parsed.pinned) ? parsed.pinned.filter(n => typeof n === "string") : [],
    };
  } catch {
    return empty;
  }
}

function saveIconRecentsLocal(next) {
  try {
    localStorage.setItem(ICON_RECENTS_KEY, JSON.stringify(next));
  } catch {
    // storage full / private mode — silently ignore
  }
}

function saveIconPinsToDB(pinned) {
  StorageService.saveSettings({ icon_pins: pinned }).catch(err =>
    console.error("[IconPicker] persist pins failed:", err)
  );
}

// Look up an icon record (name + label) by name across every category.
function findIconRecord(name) {
  for (const cat of ICON_CATEGORIES) {
    const hit = cat.icons.find(i => i.name === name);
    if (hit) return { icon: hit, category: cat.label };
  }
  return null;
}

// Weighted icon-search scoring, matching the pattern used for Quick Guides.
//   label × 5   (exact label match e.g. "gym" → "Gym")
//   name  × 3   (component name e.g. "dumbbell" → "Dumbbell")
//   category × 2 (e.g. "shopping" surfaces every icon in Shopping)
function scoreIcon(icon, categoryLabel, q) {
  if (!q) return 0;
  const label = (icon.label || "").toLowerCase();
  const name = (icon.name || "").toLowerCase();
  const cat = (categoryLabel || "").toLowerCase();
  let s = 0;
  if (label.includes(q)) s += 5;
  if (name.includes(q)) s += 3;
  if (cat.includes(q)) s += 2;
  return s;
}

export default function IconPicker({ isOpen, onClose, value, onSelect, isDark = true, mode = "select", onQuickAdd }) {
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState(() => loadIconRecents());

  // Hydrate pins from IndexedDB on open. Merge with any pre-existing
  // localStorage pins the first time (migration).
  useEffect(() => {
    if (!isOpen) return;
    const local = loadIconRecents();
    setRecents(local);
    (async () => {
      try {
        const settings = await StorageService.getSettings();
        const dbPins = settings?.icon_pins;
        if (!dbPins) {
          if (local.pinned.length) saveIconPinsToDB(local.pinned);
          return;
        }
        const merged = {
          ...local,
          pinned: Array.isArray(dbPins) ? dbPins.filter(n => typeof n === "string") : [],
        };
        setRecents(merged);
        saveIconRecentsLocal(merged);
      } catch (e) {
        console.error("[IconPicker] hydrate pins failed:", e);
      }
    })();
  }, [isOpen]);

  const pushIconRecent = (name) => {
    setRecents(prev => {
      // Don't add to recents if it's already pinned.
      if ((prev.pinned || []).includes(name)) return prev;
      const list = [name, ...(prev.recents || []).filter(n => n !== name)].slice(0, MAX_ICON_RECENTS);
      const next = { ...prev, recents: list };
      saveIconRecentsLocal(next);
      return next;
    });
  };

  const toggleIconPin = (name) => {
    setRecents(prev => {
      const isPinned = (prev.pinned || []).includes(name);
      let next;
      if (isPinned) {
        // Unpin → drop from pinned, prepend to recents
        next = {
          ...prev,
          pinned: (prev.pinned || []).filter(n => n !== name),
          recents: [name, ...(prev.recents || []).filter(n => n !== name)].slice(0, MAX_ICON_RECENTS),
        };
      } else {
        next = {
          ...prev,
          pinned: [name, ...(prev.pinned || []).filter(n => n !== name)],
          recents: (prev.recents || []).filter(n => n !== name),
        };
      }
      saveIconRecentsLocal(next);
      saveIconPinsToDB(next.pinned);
      return next;
    });
  };

  const removeIconRecent = (name) => {
    setRecents(prev => {
      const next = { ...prev, recents: (prev.recents || []).filter(n => n !== name) };
      saveIconRecentsLocal(next);
      return next;
    });
  };

  const trimmed = query.trim().toLowerCase();

  // Categorized view when no query — same visual grouping as before.
  const categorized = useMemo(() => {
    if (trimmed) return [];
    return ICON_CATEGORIES;
  }, [trimmed]);

  // Flat, ranked list when a query is active — top 60 by score.
  const flatResults = useMemo(() => {
    if (!trimmed) return [];
    const all = [];
    for (const cat of ICON_CATEGORIES) {
      for (const icon of cat.icons) {
        const s = scoreIcon(icon, cat.label, trimmed);
        if (s > 0) all.push({ icon, category: cat.label, score: s });
      }
    }
    all.sort((a, b) => b.score - a.score);
    return all.slice(0, 60);
  }, [trimmed]);

  const pick = (icon) => {
    // Remember this icon in the picker's recents (unless it's pinned).
    pushIconRecent(icon.name);
    if (mode === "quick-add" && onQuickAdd) {
      onQuickAdd(icon);
      onClose();
      return;
    }
    onSelect(icon.name);
    onClose();
  };

  const clearIcon = () => {
    onSelect(null);
    onClose();
  };

  const isQuick = mode === "quick-add";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-2xl max-h-[85vh] overflow-hidden flex flex-col ${
          isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"
        }`}
        data-testid="icon-picker-dialog"
      >
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>
            {isQuick ? "Quick Add — pick an icon" : "Choose an icon"}
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            {isQuick
              ? "Tap any icon to instantly create a smart note (Shopping List, Workout Log, Meds, etc.)"
              : "Pick an icon that represents this note — shown on tiles in Icon view."}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons — e.g. gym, meds, coffee…"
            className={`pl-8 h-9 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : "bg-white border-gray-200"}`}
            data-testid="icon-picker-search"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
              aria-label="Clear icon search"
              data-testid="icon-picker-search-clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
          {/* Flat ranked results when searching */}
          {trimmed && flatResults.length > 0 && (
            <div className="mb-4">
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                {flatResults.length} match{flatResults.length === 1 ? "" : "es"}
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {flatResults.map(({ icon, category }) => {
                  const Ico = LucideIcons[icon.name];
                  if (!Ico) return null;
                  const active = value === icon.name;
                  return (
                    <button
                      key={`${category}-${icon.name}`}
                      type="button"
                      onClick={() => pick(icon)}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 p-1.5 transition-all border ${
                        active
                          ? "border-indigo-500 bg-indigo-500/20"
                          : isDark
                          ? "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                          : "border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                      }`}
                      title={`${icon.label} — ${category}`}
                      data-testid={`icon-option-${icon.name}`}
                    >
                      <Ico className={`w-5 h-5 ${isDark ? "text-white" : "text-gray-800"}`} />
                      <span className={`text-[10px] leading-tight ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {icon.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {trimmed && flatResults.length === 0 && (
            <div className={`text-center py-8 text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              No icons match &quot;{query}&quot;
            </div>
          )}

          {/* Pinned + Recent icons — always at the top when idle (no query).
              Pinned first, recents below, each with a star toggle & remove ×. */}
          {!trimmed && (recents.pinned.length > 0 || recents.recents.length > 0) && (
            <div className="mb-4" data-testid="icon-picker-recents">
              {recents.pinned.length > 0 && (
                <>
                  <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDark ? "text-amber-300" : "text-amber-600"}`}>
                    <Star className="w-3 h-3 fill-current" /> Pinned
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-3">
                    {recents.pinned.map(name => {
                      const rec = findIconRecord(name);
                      const Ico = LucideIcons[name];
                      if (!Ico) return null;
                      const label = rec?.icon?.label || name;
                      const active = value === name;
                      return (
                        <IconSwatch
                          key={`pin-${name}`}
                          name={name}
                          label={label}
                          Ico={Ico}
                          active={active}
                          pinned
                          isDark={isDark}
                          onPick={() => pick(rec?.icon || { name, label })}
                          onTogglePin={() => toggleIconPin(name)}
                          onRemove={() => toggleIconPin(name)}
                        />
                      );
                    })}
                  </div>
                </>
              )}
              {recents.recents.length > 0 && (
                <>
                  <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    <Clock className="w-3 h-3" /> Recent
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {recents.recents.map(name => {
                      const rec = findIconRecord(name);
                      const Ico = LucideIcons[name];
                      if (!Ico) return null;
                      const label = rec?.icon?.label || name;
                      const active = value === name;
                      return (
                        <IconSwatch
                          key={`rec-${name}`}
                          name={name}
                          label={label}
                          Ico={Ico}
                          active={active}
                          pinned={false}
                          isDark={isDark}
                          onPick={() => pick(rec?.icon || { name, label })}
                          onTogglePin={() => toggleIconPin(name)}
                          onRemove={() => removeIconRecent(name)}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Categorized view when idle */}
          {!trimmed && categorized.map(cat => (
            <div key={cat.label} className="mb-4">
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                {cat.label}
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {cat.icons.map(icon => {
                  const Ico = LucideIcons[icon.name];
                  if (!Ico) return null;
                  const active = value === icon.name;
                  return (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => pick(icon)}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 p-1.5 transition-all border ${
                        active
                          ? "border-indigo-500 bg-indigo-500/20"
                          : isDark
                          ? "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                          : "border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                      }`}
                      title={icon.label}
                      data-testid={`icon-option-${icon.name}`}
                    >
                      <Ico className={`w-5 h-5 ${isDark ? "text-white" : "text-gray-800"}`} />
                      <span className={`text-[10px] leading-tight ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {icon.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          {!isQuick && (
            <Button
              variant="outline"
              onClick={clearIcon}
              className={`flex-1 h-9 ${isDark ? "border-white/10 text-slate-300" : ""}`}
              data-testid="icon-picker-clear"
            >
              <X className="w-4 h-4 mr-1" /> No icon
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className={`flex-1 h-9 ${isDark ? "border-white/10 text-slate-300" : ""}`}
          >
            {isQuick ? "Close" : "Cancel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// Compact icon swatch used in the "Pinned" + "Recent" strips at the top of
// the picker. Overlay star toggles pin state; overlay × removes/unpins.
function IconSwatch({ name, label, Ico, active, pinned, isDark, onPick, onTogglePin, onRemove }) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onPick}
        className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center gap-1 p-1.5 transition-all border ${
          active
            ? "border-indigo-500 bg-indigo-500/20"
            : isDark
            ? "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
            : "border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        }`}
        title={label}
        data-testid={`icon-option-${name}`}
      >
        <Ico className={`w-5 h-5 ${isDark ? "text-white" : "text-gray-800"}`} />
        <span className={`text-[10px] leading-tight ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          {label}
        </span>
      </button>
      {/* Star pin toggle (top-left) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
        className={`absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center transition-opacity ${
          pinned
            ? "bg-amber-400 text-black opacity-100"
            : "bg-black/70 text-white opacity-0 group-hover:opacity-100"
        }`}
        aria-label={pinned ? "Unpin icon" : "Pin icon"}
        title={pinned ? "Unpin" : "Pin to keep at the top"}
        data-testid={`icon-pin-${name}`}
      >
        <Star className={`w-2.5 h-2.5 ${pinned ? "fill-current" : ""}`} />
      </button>
      {/* Remove/unpin (top-right) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/70 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={pinned ? "Unpin icon" : "Remove from recents"}
        title={pinned ? "Unpin" : "Remove"}
        data-testid={`icon-remove-${name}`}
      >
        ×
      </button>
    </div>
  );
}
