import React from "react";
import { FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { NOTE_COLORS } from "./constants";

/**
 * Template picker — pre-fills the new-note editor.
 */
export default function TemplateModal({ isOpen, onClose, templates, onSelect, isDark }) {
  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}>
        <DialogHeader>
          <DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <FileText className="w-5 h-5 text-indigo-500" /> Templates
          </DialogTitle>
          <DialogDescription className="sr-only">Choose a template to pre-fill your new note.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {templates.map((t, i) => (
            <button
              key={t.id || i}
              onClick={() => onSelect(t)}
              className={`w-full p-2.5 rounded-lg text-left transition-all ${isDark ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}`}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NOTE_COLORS.find(c => c.name === t.color)?.accent || '#a855f7' }} />
                <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.name}</span>
                {t.category && <Badge variant="outline" className={`text-xs ${isDark ? '' : 'text-gray-800 border-gray-300'}`}>{t.category}</Badge>}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
