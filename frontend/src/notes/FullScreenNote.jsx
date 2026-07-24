import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Share2, Trash2, Clock, Bell, Repeat, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Attachments from "../components/Attachments";
import { NOTE_COLORS } from "./constants";

/**
 * Full-screen note editor with inline auto-save.
 * Debounces title/content changes and flushes on close.
 */
export default function FullScreenNote({ note, isOpen, onClose, onSaveInline, onDelete, onShare, isDark }) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const noteIdRef = useRef(note?.id);

  // When note changes (new note opened, or synced from parent after edit), reset local state
  useEffect(() => {
    if (!note) return;
    if (note.id !== noteIdRef.current || !dirty) {
      setTitle(note.title || "");
      setContent(note.content || "");
      setDirty(false);
      noteIdRef.current = note.id;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id, note?.updated_at]);

  // Auto-save when title/content change (debounced 700ms)
  useEffect(() => {
    if (!dirty || !note) return;
    const t = setTimeout(async () => {
      setSaving(true);
      await onSaveInline(note.id, { title: title.trim() || "Untitled", content });
      setSaving(false);
      setSavedAt(Date.now());
      setDirty(false);
    }, 700);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, dirty]);

  if (!isOpen || !note) return null;
  const colorConfig = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[0];
  const hasAlarm = note.alarm?.enabled && note.alarm?.datetime;
  const hasRecurring = note.recurring?.enabled;
  const createdDate = new Date(note.created_at);
  const updatedDate = new Date(note.updated_at);
  const wasEdited = updatedDate.getTime() - createdDate.getTime() > 1000;

  const handleClose = async () => {
    if (dirty) {
      setSaving(true);
      await onSaveInline(note.id, { title: title.trim() || "Untitled", content });
      setSaving(false);
    }
    onClose();
  };

  const savedRecently = savedAt && (Date.now() - savedAt < 2500);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="fullscreen-note">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className={`relative w-full max-w-4xl h-[90vh] rounded-2xl overflow-hidden flex flex-col ${isDark ? 'bg-[#0B1221]' : 'bg-white'} border ${colorConfig.class}`} style={{ borderWidth: '2px' }}>
        {/* Header */}
        <div className={`flex items-center justify-between gap-3 p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: colorConfig.accent }} />
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
              placeholder="Untitled"
              className={`fs-title-input flex-1 min-w-0 bg-transparent border-0 outline-none text-xl font-bold ${isDark ? 'text-white placeholder:text-slate-600' : 'text-gray-900 placeholder:text-gray-400'}`}
              data-testid="fullscreen-title-input"
              aria-label="Note title"
            />
            {note.category && <Badge variant="outline" className={`text-xs hidden sm:inline-flex flex-shrink-0 ${isDark ? '' : 'text-gray-800 border-gray-300'}`}>{note.category}{note.subcategory && ` > ${note.subcategory}`}</Badge>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={`text-xs font-mono px-2 min-w-[70px] text-right ${isDark ? 'text-slate-500' : 'text-gray-400'}`} data-testid="fullscreen-save-status" aria-live="polite">
              {saving ? "Saving…" : dirty ? "Editing…" : savedRecently ? "Saved" : ""}
            </span>
            <Button variant="ghost" size="icon" onClick={() => onShare(note)} className={isDark ? 'text-white/70 hover:text-white' : ''} data-testid="fullscreen-share-btn" aria-label="Share"><Share2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => { onClose(); onDelete(note.id); }} className={isDark ? 'text-white/70 hover:text-red-400' : 'hover:text-red-600'} data-testid="fullscreen-delete-btn" aria-label="Delete"><Trash2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={handleClose} className={isDark ? 'text-white/70 hover:text-white' : ''} data-testid="fullscreen-close-btn" aria-label="Close"><X className="w-5 h-5" /></Button>
          </div>
        </div>
        {/* Editable content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setDirty(true); }}
            placeholder="Start writing…"
            className={`fs-content-input w-full flex-1 bg-transparent border-0 outline-none resize-none text-base leading-relaxed font-sans ${isDark ? 'text-slate-200 placeholder:text-slate-600' : 'text-gray-700 placeholder:text-gray-400'}`}
            data-testid="fullscreen-content-input"
            aria-label="Note content"
          />
          <Attachments
            attachments={note.attachments || []}
            onChange={(newAttachments) => onSaveInline(note.id, { attachments: newAttachments })}
            isDark={isDark}
          />
        </div>
        {/* Footer */}
        <div className={`flex items-center justify-between p-4 border-t text-xs font-mono ${isDark ? 'border-white/10 text-slate-500' : 'border-gray-200 text-gray-400'}`}>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Created: {format(createdDate, "MMM d, yyyy HH:mm")}</span>
            {wasEdited && <span className="flex items-center gap-1 text-indigo-400"><Pencil className="w-3 h-3" /> Edited: {format(updatedDate, "MMM d, yyyy HH:mm")}</span>}
          </div>
          <div className="flex items-center gap-3">
            {hasAlarm && <span className="flex items-center gap-1 text-yellow-500"><Bell className="w-3 h-3" /> {format(new Date(note.alarm.datetime), "MMM d, HH:mm")}</span>}
            {hasRecurring && <span className="flex items-center gap-1 text-green-500"><Repeat className="w-3 h-3" /> {note.recurring.frequency}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
