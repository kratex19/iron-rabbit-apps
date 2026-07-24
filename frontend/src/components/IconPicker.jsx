import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ICON_CATEGORIES } from "../data/noteIcons";
import { Search, X } from "lucide-react";

export default function IconPicker({ isOpen, onClose, value, onSelect, isDark = true }) {
  const [query, setQuery] = useState("");

  const filtered = ICON_CATEGORIES.map(cat => ({
    ...cat,
    icons: cat.icons.filter(i =>
      !query ||
      i.label.toLowerCase().includes(query.toLowerCase()) ||
      i.name.toLowerCase().includes(query.toLowerCase())
    ),
  })).filter(cat => cat.icons.length > 0);

  const pick = (iconName) => {
    onSelect(iconName);
    onClose();
  };

  const clearIcon = () => {
    onSelect(null);
    onClose();
  };

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
            Choose an icon
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Pick an icon that represents this note — shown on tiles in Icon view.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons..."
            className={`pl-8 h-9 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : "bg-white border-gray-200"}`}
            data-testid="icon-picker-search"
          />
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
          {filtered.map(cat => (
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
                      onClick={() => pick(icon.name)}
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
          {filtered.length === 0 && (
            <div className={`text-center py-8 text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              No icons match &quot;{query}&quot;
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={clearIcon}
            className={`flex-1 h-9 ${isDark ? "border-white/10 text-slate-300" : ""}`}
            data-testid="icon-picker-clear"
          >
            <X className="w-4 h-4 mr-1" /> No icon
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className={`flex-1 h-9 ${isDark ? "border-white/10 text-slate-300" : ""}`}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
