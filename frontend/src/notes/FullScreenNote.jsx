import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { format } from "date-fns";
import { Share2, Trash2, Clock, Bell, Repeat, Pencil, X, CheckSquare, Languages, ChevronDown, Paperclip, MoreHorizontal, FileDown, FileText } from "lucide-react";
import ChoresPanel from "./ChoresPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import Attachments from "../components/Attachments";
import TranslateModal from "./TranslateModal";
import { NOTE_COLORS } from "./constants";
import { noteToMarkdown, safeFilename, downloadTextFile, shareNoteAsMarkdown } from "../utils/markdown";
import { brightnessToText, brightnessToBg } from "./BrightnessSliders";
import DisplayControlsButton from "./DisplayControlsButton";

/**
 * Full-screen note editor with inline auto-save.
 * Debounces title/content changes and flushes on close.
 */
export default function FullScreenNote({ note, isOpen, onClose, onSaveInline, onDelete, onShare, isDark, uiBrightness, onBrightnessChange }) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [translateOpen, setTranslateOpen] = useState(false);
  // Collapsible images/attachments accordion — collapsed by default when the
  // note has attachments so the text area gets maximum vertical space. If
  // there are none, we expand it so the "Take photo / Attach files" call-to-
  // action is immediately visible.
  const initialAttachmentCount = (note?.attachments || []).length;
  const [attachmentsOpen, setAttachmentsOpen] = useState(initialAttachmentCount === 0);
  const noteIdRef = useRef(note?.id);

  // Belt-and-suspenders text color forcing. Applying `color` via inline
  // style occasionally loses to `-webkit-text-fill-color` on iOS/Android
  // webviews. Setting both properties with `!important` via a ref+layout
  // effect guarantees the paint tracks the slider in real time.
  const contentTextareaRef = useRef(null);
  useLayoutEffect(() => {
    const el = contentTextareaRef.current;
    if (!el) return;
    const c = brightnessToText(uiBrightness?.text ?? 0.7);
    el.style.setProperty("color", c, "important");
    el.style.setProperty("-webkit-text-fill-color", c, "important");
  }, [uiBrightness?.text]);

  // When note changes (new note opened, or synced from parent after edit), reset local state
  useEffect(() => {
    if (!note) return;
    if (note.id !== noteIdRef.current || !dirty) {
      setTitle(note.title || "");
      setContent(note.content || "");
      setDirty(false);
      // Reset accordion state for the new note based on its attachment count.
      setAttachmentsOpen((note.attachments || []).length === 0);
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
      <div
        className={`relative w-full max-w-4xl h-[90vh] rounded-2xl overflow-hidden flex flex-col ${isDark ? 'backdrop-blur-2xl' : ''} border ${colorConfig.class}`}
        style={{
          borderWidth: '2px',
          // Brightness BG applies at the OUTER container so "fully transparent"
          // truly reveals the page beneath (works identically in light + dark
          // themes). In dark mode we still get the backdrop-blur glass look;
          // in light mode the plain white default is now driven by the
          // brightness slider itself.
          background: brightnessToBg(uiBrightness?.bg ?? 0.3),
          ...(isDark
            ? {}
            : { borderColor: colorConfig.border || colorConfig.accent }),
        }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between gap-3 p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: colorConfig.gradient || colorConfig.accent }} />
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
              placeholder="Untitled"
              className={`fs-title-input flex-1 min-w-0 bg-transparent border-0 outline-none text-xl font-bold ${isDark ? 'text-white placeholder:text-slate-500' : 'text-gray-900 placeholder:text-gray-400'}`}
              data-testid="fullscreen-title-input"
              aria-label="Note title"
            />
            {note.category && <Badge variant="outline" className={`text-xs hidden sm:inline-flex flex-shrink-0 ${isDark ? '' : 'text-gray-800 border-gray-300'}`}>{note.category}{note.subcategory && ` > ${note.subcategory}`}</Badge>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={`text-xs font-mono px-2 min-w-[70px] text-right ${isDark ? 'text-slate-500' : 'text-gray-400'}`} data-testid="fullscreen-save-status" aria-live="polite">
              {saving ? "Saving…" : dirty ? "Editing…" : savedRecently ? "Saved" : ""}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setTranslateOpen(true)} disabled={!content?.trim()} className={isDark ? 'text-yellow-500 hover:text-yellow-400 hover:bg-white/5' : 'text-yellow-600 hover:text-yellow-500 hover:bg-yellow-50'} data-testid="fullscreen-translate-btn" aria-label="Translate" title="Translate note"><Languages className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onShare(note)} className={isDark ? 'text-yellow-500 hover:text-yellow-400 hover:bg-white/5' : 'text-yellow-600 hover:text-yellow-500 hover:bg-yellow-50'} data-testid="fullscreen-share-btn" aria-label="Share"><Share2 className="w-4 h-4" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={isDark ? 'text-yellow-500 hover:text-yellow-400 hover:bg-white/5' : 'text-yellow-600 hover:text-yellow-500 hover:bg-yellow-50'} data-testid="fullscreen-more-btn" aria-label="More"><MoreHorizontal className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={isDark ? "bg-slate-900 border-white/10 text-slate-100" : ""}>
                <DropdownMenuItem
                  onClick={() => {
                    try {
                      const current = { ...note, title, content };
                      downloadTextFile(noteToMarkdown(current), safeFilename(current.title || "note"));
                      toast.success("Note exported as .md");
                    } catch (e) { toast.error("Export failed"); }
                  }}
                  data-testid="fullscreen-export-md"
                >
                  <FileDown className="w-4 h-4 mr-2" /> Export as Markdown (.md)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const current = { ...note, title, content };
                      const result = await shareNoteAsMarkdown(current);
                      if (result.shared) toast.success("Shared as .md");
                      else if (result.downloaded) toast.success("Downloaded .md (share unsupported)");
                    } catch (e) { toast.error("Share failed"); }
                  }}
                  data-testid="fullscreen-share-md"
                >
                  <FileText className="w-4 h-4 mr-2" /> Share as Markdown
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={() => { onClose(); onDelete(note.id); }} className={isDark ? 'text-yellow-500 hover:text-red-400 hover:bg-white/5' : 'text-yellow-600 hover:text-red-500 hover:bg-red-50'} data-testid="fullscreen-delete-btn" aria-label="Delete"><Trash2 className="w-4 h-4" /></Button>
            {onBrightnessChange && (
              <DisplayControlsButton
                value={uiBrightness}
                onChange={onBrightnessChange}
                isDark={isDark}
                testidPrefix="fullscreen-brightness"
                title="Display brightness (Text & Background)"
                className={isDark ? "text-yellow-500 hover:text-yellow-400 hover:bg-white/5" : "text-yellow-600 hover:text-yellow-500 hover:bg-yellow-50"}
              />
            )}
            <Button variant="ghost" size="icon" onClick={handleClose} className={isDark ? 'text-yellow-500 hover:text-yellow-400 hover:bg-white/5' : 'text-yellow-600 hover:text-yellow-500 hover:bg-yellow-50'} data-testid="fullscreen-close-btn" aria-label="Close"><X className="w-5 h-5" /></Button>
          </div>
        </div>
        {/* Editable content — brightness scope. Text color is applied
            directly on the textarea (with ref-forced !important for iOS/
            Android WebViews). Background is driven by the outer modal
            container so "fully transparent" truly reveals the page. */}
        <div
          className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-4 ir-brightness-scope"
          style={{
            color: brightnessToText(uiBrightness?.text ?? 0.7),
          }}
        >
          <TextareaAutosize
            ref={contentTextareaRef}
            value={content}
            onChange={(e) => { setContent(e.target.value); setDirty(true); }}
            placeholder="Start writing…"
            minRows={3}
            className={`fs-content-input w-full bg-transparent border-0 outline-none resize-none text-base leading-relaxed font-sans placeholder:opacity-60`}
            style={{ color: brightnessToText(uiBrightness?.text ?? 0.7) }}
            data-testid="fullscreen-content-input"
            aria-label="Note content"
          />
          {Array.isArray(note.chores) && (
            <ChoresPanel
              chores={note.chores}
              onChange={(updated) => onSaveInline(note.id, { chores: updated })}
              isDark={isDark}
            />
          )}
          {Array.isArray(note.checklist) && note.checklist.length > 0 && (
            <div className={`rounded-lg p-3 space-y-1 border ${isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="fullscreen-checklist">
              <div className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                <CheckSquare className="w-3.5 h-3.5" /> Checklist
                <span className={`ml-auto font-mono font-normal ${isDark ? "text-slate-400" : "text-gray-400"}`}>
                  {note.checklist.filter((c) => c.done).length}/{note.checklist.length}
                </span>
              </div>
              {note.checklist.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const updated = note.checklist.map((c) => c.id === item.id ? { ...c, done: !c.done } : c);
                    onSaveInline(note.id, { checklist: updated });
                  }}
                  className={`w-full flex items-center gap-2 rounded px-1 py-1 transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-white"}`}
                  data-testid={`fs-checklist-toggle-${item.id}`}
                >
                  <span className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${item.done ? "bg-indigo-500 border-indigo-500" : isDark ? "border-slate-400" : "border-gray-300"}`}>
                    {item.done && (
                      <svg viewBox="0 0 12 12" className="w-3 h-3 text-white">
                        <path d="M2.5 6.5L5 9l4.5-5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-sm text-left flex-1 ${item.done ? (isDark ? "line-through text-slate-400" : "line-through text-gray-400") : (isDark ? "text-slate-100" : "text-gray-900")}`}>
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          )}
          {/* Collapsible Images & files accordion — pushed to the bottom of the
              scroll area (mt-auto) so the writing area gets maximum vertical
              breathing room. When the note has no attachments, it still sits at
              the bottom of the visible viewport as a subtle CTA. */}
          <div
            className={`rounded-lg border mt-auto ${isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50"}`}
            data-testid="fs-attachments-accordion"
          >
            <button
              type="button"
              onClick={() => setAttachmentsOpen(v => !v)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isDark ? "hover:bg-white/5 text-slate-200" : "hover:bg-white text-gray-700"
              }`}
              aria-expanded={attachmentsOpen}
              aria-controls="fs-attachments-panel"
              data-testid="fs-attachments-toggle"
            >
              <Paperclip className="w-3.5 h-3.5 opacity-70" />
              <span className="text-xs font-semibold">Images & files</span>
              {(note.attachments || []).length > 0 && (
                <span
                  className={`ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    isDark ? "bg-indigo-500/20 text-indigo-200 border border-indigo-400/30" : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  }`}
                  data-testid="fs-attachments-count"
                >
                  {(note.attachments || []).length}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 ml-auto transition-transform ${attachmentsOpen ? "rotate-180" : "rotate-0"} ${isDark ? "text-slate-400" : "text-gray-400"}`}
              />
            </button>
            {attachmentsOpen && (
              <div id="fs-attachments-panel" className="px-3 pb-3">
                <Attachments
                  attachments={note.attachments || []}
                  onChange={(newAttachments) => onSaveInline(note.id, { attachments: newAttachments })}
                  isDark={isDark}
                  onExtractText={(text) => {
                    const next = (content || "") + `\n\n${text}`;
                    setContent(next);
                    setDirty(true);
                    onSaveInline(note.id, { content: next });
                  }}
                />
              </div>
            )}
          </div>
        </div>
        {/* Footer */}
        <div className={`flex items-center justify-between p-4 border-t text-xs font-mono ${isDark ? 'border-white/10 text-slate-300' : 'border-gray-200 text-gray-400'}`}>
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
      <TranslateModal
        isOpen={translateOpen}
        onClose={() => setTranslateOpen(false)}
        text={content}
        onAppend={(block) => {
          const next = (content || "") + block;
          setContent(next);
          setDirty(true);
          // Fire an immediate save so the appended block persists even if the
          // user closes fast.
          onSaveInline(note.id, { content: next });
        }}
        isDark={isDark}
      />
    </div>
  );
}
