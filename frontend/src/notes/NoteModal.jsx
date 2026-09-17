import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import * as LucideIcons from "lucide-react";
import {
  Bell, Repeat, FileText, Calculator, StickyNote as StickyNoteIcon, Pin, Mic, MicOff, Hash, X, Languages,
} from "lucide-react";
import useVoiceInput from "../utils/useVoiceInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TextareaAutosize from "react-textarea-autosize";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import IconPicker from "../components/IconPicker";
import BackgroundPicker, { getBackgroundStyle } from "../components/BackgroundPicker";
import Attachments from "../components/Attachments";
import { brightnessToText, brightnessToBg } from "./BrightnessSliders";
import { sanitizeHtml, looksLikeHtml } from "../utils/htmlSanitize";
import DisplayControlsButton from "./DisplayControlsButton";
import QuickGuideButton from "../quickguide/QuickGuideButton";
import StorageService from "../storage/storageService";
import { NOTE_COLORS, SOUND_OPTIONS } from "./constants";
import TemplateModal from "./TemplateModal";
import TranslateModal from "./TranslateModal";
import EventsSection from "./EventsSection";
import ChecklistSection from "./ChecklistSection";
import CategoryPathAccordion from "./CategoryPathAccordion";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Create/edit dialog for a note. Includes icon + background editor
 * for the Icon-view tile.
 */
export default function NoteModal({ isOpen, onClose, note, onSave, onSaveInline, onOpenCalculator, isDark, categories, existingPaths = [], templates, allTags = [], uiBrightness, onBrightnessChange, focusOverrideBrightness = null, pinnedSubcategoryKeys = null }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("purple");
  const [icon, setIcon] = useState(null);
  const [background, setBackground] = useState(null);
  const [pinned, setPinned] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [events, setEvents] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  // Infinite-nested category path. Level 0 mirrors `category`, level 1
  // mirrors `subcategory`; anything deeper is stored ONLY in this array
  // (persisted as `category_path` on the note).
  const [categoryPath, setCategoryPath] = useState([]);
  const [alarm, setAlarm] = useState({ enabled: false, datetime: null, sound: "bell", haptic: false });
  const [alarmDate, setAlarmDate] = useState(null);
  const [alarmTime, setAlarmTime] = useState("12:00");
  const [recurring, setRecurring] = useState({ enabled: false, frequency: "weekly", days: [] });
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Per-note brightness. Initialized from the note's own saved
  // `ui_brightness` (if any); falls back to the global default while the
  // user hasn't touched the sliders on this note yet. Local edits stay
  // scoped to this modal instance and are persisted to the note on save,
  // so re-opening the same note restores the same slider positions.
  //
  // 🔒 LOCKED (Quick Edit brightness — flush-on-hide + new-note scratch added
  // 2026-02-27 pw 2020). Brand new notes (no id) now also persist their
  // in-progress brightness to `localStorage.ir_new_note_brightness_v1` so
  // that closing/backgrounding the New Note modal doesn't lose the drag.
  // The scratch key is cleared once the note is saved.
  const NEW_NOTE_SCRATCH_KEY = "ir_new_note_brightness_v1";
  const readNewNoteScratch = () => {
    try {
      const raw = localStorage.getItem(NEW_NOTE_SCRATCH_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.text === "number" && typeof parsed.bg === "number") return parsed;
      return null;
    } catch { return null; }
  };
  const writeNewNoteScratch = (val) => {
    try { localStorage.setItem(NEW_NOTE_SCRATCH_KEY, JSON.stringify(val)); }
    catch { /* ignore quota */ }
  };
  const clearNewNoteScratch = () => {
    try { localStorage.removeItem(NEW_NOTE_SCRATCH_KEY); }
    catch { /* ignore */ }
  };
  const [noteBrightness, setNoteBrightness] = useState(
    note?.ui_brightness || (!note ? readNewNoteScratch() : null) || uiBrightness || { text: 0.7, bg: 0.3 }
  );

  // Belt-and-suspenders text color forcing: the textarea's inline `color`
  // style occasionally loses out to a UA / browser-extension `-webkit-text-
  // fill-color` cascade. Setting the property with `!important` via ref
  // guarantees the paint changes every time `noteBrightness.text` changes.
  // 🔒 LOCKED (Quick Edit brightness) — see /app/memory/LOCKED_SURFACES.md
  // Password required to modify: 2020
  // Do not alter the colour-forcing useLayoutEffect, the debounced
  // brightness auto-save useEffect, `brightnessAutoSaveRef`, or the
  // TextareaAutosize + light-underlay wrapper (search for
  // `note-content-underlay`) without an explicit unlock from the user.
  // The top bar and other form fields of this dialog are NOT locked.
  //
  // 🔓 UNLOCKED with password 2020 on 2026-02-22 to add a rendered
  // contentEditable swap when the note content is HTML (Format-mode
  // output). Underlay + brightness math preserved 1:1; textarea is
  // kept intact for plain-text notes.
  const contentTextareaRef = useRef(null);
  const htmlEditableRef = useRef(null);
  const lastAppliedHtmlRef = useRef(null);
  const isHtml = looksLikeHtml(content);
  // Effective brightness used ONLY for painting text + underlay colours.
  // Falls through to the note's own `noteBrightness` unless Focus Mode is
  // active AND the user has enabled Night Visuals with "Apply to all notes"
  // — in which case NotesApp hands us the override object via
  // `focusOverrideBrightness`. Slider UI, save-on-close, and the ledger
  // continue to reference `noteBrightness` so the note's OWN preference
  // is never overwritten by the override.
  const paintBrightness = focusOverrideBrightness || noteBrightness;
  useLayoutEffect(() => {
    const c = brightnessToText(paintBrightness?.text ?? 0.7);
    const ta = contentTextareaRef.current;
    if (ta) {
      ta.style.setProperty("color", c, "important");
      ta.style.setProperty("-webkit-text-fill-color", c, "important");
    }
    const he = htmlEditableRef.current;
    if (he) {
      he.style.setProperty("color", c, "important");
      he.style.setProperty("-webkit-text-fill-color", c, "important");
    }
  }, [paintBrightness?.text, isHtml]);

  // Sync `content` → contentEditable innerHTML when the value changes
  // externally (mode swap, note switch, translate) — but NEVER while the
  // user is actively typing, otherwise the caret jumps to position 0.
  useLayoutEffect(() => {
    if (!isHtml) return;
    const el = htmlEditableRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const clean = sanitizeHtml(content || "");
    if (lastAppliedHtmlRef.current === clean && el.innerHTML === clean) return;
    el.innerHTML = clean;
    lastAppliedHtmlRef.current = clean;
  }, [content, isHtml]);

  const handleHtmlInput = () => {
    const el = htmlEditableRef.current;
    if (!el) return;
    const html = el.innerHTML;
    lastAppliedHtmlRef.current = html;
    setContent(html);
  };
  const handleHtmlPaste = (e) => {
    // Force plain-text paste so external formatting never leaks in.
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    if (typeof text === "string") {
      try { document.execCommand("insertText", false, text); } catch { /* noop */ }
    }
  };

  // Debounced brightness auto-save for EXISTING notes. Mirrors the
  // FullScreenNote behavior so slider drags persist immediately without
  // requiring the user to hit "Update". Skips the initial mount and
  // any note-switch reset so we don't re-save just-loaded values, and
  // only fires when the user has actually touched the sliders in this
  // modal instance.
  //
  // For NEW notes (no id yet) we ALSO persist the in-progress value to
  // a localStorage scratch key so closing/backgrounding preserves the
  // drag until the user actually hits Save. Cleared on successful save.
  //
  // Flush-on-hide: `pendingBrightness` holds the latest value awaiting
  // save; on unmount, `visibilitychange` (hidden), and `pagehide` we
  // fire the save synchronously so a mobile browser suspending
  // setTimeout can't eat the last drag.
  const brightnessAutoSaveRef = useRef({ noteId: null, dirty: false });
  const pendingBrightness = useRef(null);
  useEffect(() => {
    // Reset the dirty flag whenever the note being edited changes.
    brightnessAutoSaveRef.current = { noteId: note?.id || null, dirty: false };
  }, [note?.id]);
  const flushBrightnessSave = () => {
    const pending = pendingBrightness.current;
    if (!pending) return;
    pendingBrightness.current = null;
    if (pending.kind === "note-save" && pending.noteId && onSaveInline) {
      onSaveInline(pending.noteId, { ui_brightness: pending.value });
    }
    // Scratch writes are synchronous anyway; nothing to flush here.
  };
  useEffect(() => {
    if (!isOpen) return undefined;
    const state = brightnessAutoSaveRef.current;
    // The initial render sets noteBrightness from note.ui_brightness;
    // ignore that pass. Subsequent changes (real user drags) flip dirty.
    if (!state.dirty) {
      state.dirty = true;
      return undefined;
    }
    // Brand-new notes: persist to scratch key IMMEDIATELY so the drag
    // survives a Cancel/close/backgrounding round-trip.
    if (!note?.id) {
      writeNewNoteScratch(noteBrightness);
      return undefined;
    }
    if (!onSaveInline) return undefined;
    pendingBrightness.current = { kind: "note-save", noteId: note.id, value: noteBrightness };
    const t = setTimeout(() => {
      pendingBrightness.current = null;
      onSaveInline(note.id, { ui_brightness: noteBrightness });
    }, 250);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteBrightness?.text, noteBrightness?.bg, isOpen, note?.id]);
  // Flush pending save on unmount / hide / pagehide so mobile browsers
  // pausing setTimeout during backgrounding don't drop the last drag.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onHide = () => { if (document.visibilityState === "hidden") flushBrightnessSave(); };
    const onPageHide = () => flushBrightnessSave();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
      flushBrightnessSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const [translateOpen, setTranslateOpen] = useState(false);
  const voice = useVoiceInput();

  // Append voice transcript into the note content as speech is recognised.
  useEffect(() => {
    if (voice.transcript) {
      setContent(prev => (prev ? prev + " " : "") + voice.transcript);
      voice.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.transcript]);

  useEffect(() => {
    if (note) {
      setTitle(note.title || ""); setContent(note.content || ""); setColor(note.color || "purple");
      setIcon(note.icon || null); setBackground(note.background || null);
      // Infinite path: prefer the modern `category_path` if present, else
      // migrate from legacy category/subcategory. Trim trailing empties.
      const initialPath = Array.isArray(note.category_path) && note.category_path.length > 0
        ? note.category_path
        : [note.category, note.subcategory].filter((s) => s && String(s).trim());
      // Pin state — for nested paths (>= 2), pin means "this subcategory
      // is in Green rail"; for flat paths, pin means "this note is in Blue rail".
      const cleanInitPath = initialPath.map((s) => String(s || "").trim()).filter(Boolean);
      if (cleanInitPath.length >= 2 && pinnedSubcategoryKeys) {
        const key = cleanInitPath.join("\u241E");
        setPinned(pinnedSubcategoryKeys.has(key));
      } else {
        setPinned(!!note.pinned);
      }
      setTags(Array.isArray(note.tags) ? note.tags.map(t => String(t).toLowerCase()) : []);
      setTagDraft("");
      setAttachments(Array.isArray(note.attachments) ? note.attachments : []);
      setEvents(Array.isArray(note.events) ? note.events : []);
      setChecklist(Array.isArray(note.checklist) ? note.checklist : []);
      setCategory(note.category || ""); setSubcategory(note.subcategory || "");
      setCategoryPath(initialPath);
      if (note.alarm) {
        setAlarm(note.alarm);
        if (note.alarm.datetime) {
          const dt = new Date(note.alarm.datetime);
          setAlarmDate(dt);
          setAlarmTime(format(dt, "HH:mm"));
        }
      }
      if (note.recurring) setRecurring(note.recurring);
      // Restore this note's own saved brightness — falls back to the
      // current global default if the note has never had sliders touched.
      setNoteBrightness(note.ui_brightness || uiBrightness || { text: 0.7, bg: 0.3 });
    } else {
      setTitle(""); setContent(""); setColor("purple"); setIcon(null); setBackground(null);
      setPinned(false);
      setTags([]);
      setTagDraft("");
      setEvents([]);
      setChecklist([]);
      setCategory(""); setSubcategory("");
      setCategoryPath([]);
      setAlarm({ enabled: false, datetime: null, sound: "bell", haptic: false });
      setAlarmDate(null); setAlarmTime("12:00");
      setRecurring({ enabled: false, frequency: "weekly", days: [] });
      // Brand-new note: start at the current global brightness.
      setNoteBrightness(uiBrightness || { text: 0.7, bg: 0.3 });
    }
  }, [note, isOpen]);

  const handleSelectTemplate = (template) => {
    setTitle(template.title || "");
    setContent(template.content || "");
    setColor(template.color || "purple");
    setIcon(template.icon || null);
    setBackground(template.background || null);
    setCategory(template.category || "");
    setSubcategory(template.subcategory || "");
    // Templates predate infinite nesting; derive a legacy 2-level path.
    setCategoryPath([template.category, template.subcategory].filter((s) => s && String(s).trim()));
    setShowTemplates(false);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Please enter a title"); return; }
    setSaving(true);
    let alarmDateTime = null;
    if (alarm.enabled && alarmDate) {
      const [hours, minutes] = alarmTime.split(":").map(Number);
      const dt = new Date(alarmDate);
      dt.setHours(hours, minutes, 0, 0);
      alarmDateTime = dt.toISOString();
    }
    // Fold any un-committed tag draft into tags before saving
    const draftTags = tagDraft
      .split(",")
      .map(t => t.trim().toLowerCase().replace(/^#/, ""))
      .filter(Boolean);
    const finalTags = Array.from(new Set([...tags, ...draftTags]));
    // When the content is HTML (Format-mode output being edited here),
    // run it through DOMPurify one more time on save so anything the
    // user pasted that slipped past the render step is neutralised
    // before it hits storage.
    const safeContent = looksLikeHtml(content) ? sanitizeHtml(content) : content;
    // Normalize the nested path (drop empty strings, trim segments).
    const cleanPath = (Array.isArray(categoryPath) ? categoryPath : [])
      .map((s) => String(s || "").trim())
      .filter(Boolean);
    // Legacy fields stay in sync with the top two levels so grouping,
    // filtering, PDF export and search keep working unchanged. When
    // the path is populated we trust it as the sole source of truth —
    // stale `category` / `subcategory` state from an existing note
    // reload can never overwrite the fresh hierarchy the user just
    // built (which was the "hierarchy collapses on Home" bug).
    const legacyCat = cleanPath.length > 0 ? cleanPath[0] : category.trim();
    const legacySub = cleanPath.length > 1 ? cleanPath[1] : (cleanPath.length > 0 ? "" : subcategory.trim());
    const noteData = {
      title: title.trim(), content: safeContent, color, icon, background,
      // Pin semantics depend on where the note lives:
      //   - flat path (length < 2) → drives note.pinned (Blue rail)
      //   - nested path (>= 2)     → drives Green rail (settings.pinned_subcategory_paths)
      // We always ship note.pinned so a nested→flat move preserves clean
      // state, plus an intent field consumed by handleSaveNote.
      pinned: cleanPath.length >= 2 ? false : pinned,
      _pin_intent: {
        wants: !!pinned,
        path: cleanPath,
      },
      tags: finalTags,
      attachments,
      events,
      checklist,
      category: legacyCat, subcategory: legacySub,
      category_path: cleanPath,
      alarm: { ...alarm, datetime: alarmDateTime }, recurring,
      // Persist per-note brightness so re-opening this note restores its
      // exact slider positions regardless of grid/list view or theme.
      ui_brightness: noteBrightness,
    };
    await onSave(noteData, note?.id);
    // If this was a brand-new note, its brightness scratch buffer has
    // now been folded into the note itself — clear the scratch key so
    // the NEXT new note starts from the global default instead of the
    // previous note's colour choices.
    if (!note?.id) clearNewNoteScratch();
    setSaving(false);
    onClose();
  };

  const insertCalculatorResult = (result) => {
    setContent(prev => prev + (prev ? "\n" : "") + result);
  };
  const toggleDay = (day) => {
    setRecurring(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day],
    }));
  };
  const subcategories = categories[category] || [];

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-lg max-h-[85vh] overflow-y-auto ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className={`font-semibold flex items-center justify-between ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <span>{note ? t("note.edit") : t("note.new")}</span>
              <div className="flex items-center gap-1">
                {!note && (
                  <Button variant="ghost" size="sm" onClick={() => setShowTemplates(true)} className="text-indigo-500 h-7">
                    <FileText className="w-4 h-4 mr-1" /> Templates
                  </Button>
                )}
                <QuickGuideButton resourceId="IRR-1900" origin="note-editor" isDark={isDark} size="sm" />
                <DisplayControlsButton
                  value={noteBrightness}
                  onChange={setNoteBrightness}
                  isDark={isDark}
                  testidPrefix="quicktext-brightness"
                  title="Display brightness (Text & Background) — saved per note"
                />
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              {note ? "Edit this note's title, content, color, category, alarm, and recurring settings." : "Create a new note with title, content, color, category, alarm, and recurring settings."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t("note.title")}</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("note.title_placeholder")} className={`h-9 ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 caret-indigo-600'}`} data-testid="note-title-input" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t("note.content")}</label>
                <div className="flex items-center gap-1">
                  {voice.supported && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => voice.listening ? voice.stop() : voice.start()}
                      className={`h-6 text-xs ${voice.listening ? "text-red-500 animate-pulse" : (isDark ? "text-slate-400" : "")}`}
                      data-testid="voice-input-btn"
                    >
                      {voice.listening ? <MicOff className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />}
                      {voice.listening ? "Listening…" : "Voice"}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => onOpenCalculator(insertCalculatorResult)} className={`h-6 text-xs ${isDark ? 'text-slate-400' : ''}`}>
                    <Calculator className="w-3 h-3 mr-1" /> Calc
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTranslateOpen(true)}
                    disabled={!content?.trim()}
                    className={`h-6 text-xs ${isDark ? 'text-slate-400' : ''}`}
                    data-testid="note-translate-btn"
                    title="Translate note content"
                  >
                    <Languages className="w-3 h-3 mr-1" /> Translate
                  </Button>
                </div>
              </div>
              {/* Text content area only. The BG slider must go from
                  100% opaque black → 0% transparent (completely clear).
                  Because the textarea sits on a very dark modal card,
                  "transparent" alone looks identical to "opaque black" —
                  so we place a light underlay directly behind it. The
                  textarea's own inline `background: brightnessToBg(bg)`
                  keeps the exact user-requested math: BG=0 → opaque
                  black covers the underlay; BG=100% → textarea fully
                  transparent, underlay shows through and the area
                  reads as "clear". Scoped to the text content area
                  only — nothing else in the modal changes. */}
              <div className="relative rounded-md overflow-hidden">
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 pointer-events-none ${isDark ? 'bg-white/[0.10]' : 'bg-black/[0.05]'}`}
                  data-testid="note-content-underlay"
                />
                {isHtml ? (
                  <div
                    ref={htmlEditableRef}
                    role="textbox"
                    contentEditable
                    suppressContentEditableWarning
                    aria-multiline
                    aria-label="Note content"
                    spellCheck
                    onInput={handleHtmlInput}
                    onBlur={handleHtmlInput}
                    onPaste={handleHtmlPaste}
                    className={`ir-brightness-scope fs-content-editable relative w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[5.5rem] max-h-[26rem] overflow-y-auto ${isDark ? 'border-white/10' : 'border-gray-200'}`}
                    style={{
                      background: brightnessToBg(paintBrightness?.bg ?? 0.3),
                      color: brightnessToText(paintBrightness?.text ?? 0.7),
                      // Belt-and-suspenders: WebKit inherits
                      // `-webkit-text-fill-color` from ancestors and
                      // overrides plain `color`. Match it explicitly
                      // so the slider value survives re-mounts.
                      WebkitTextFillColor: brightnessToText(paintBrightness?.text ?? 0.7),
                    }}
                    data-testid="note-content-input-html"
                  />
                ) : (
                  <TextareaAutosize
                    ref={contentTextareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t("note.content_placeholder")}
                    minRows={3}
                    maxRows={20}
                    className={`ir-brightness-scope relative w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:opacity-60 ${isDark ? 'border-white/10' : 'border-gray-200 caret-indigo-600 selection:bg-indigo-100 selection:text-gray-900'}`}
                    style={{
                      background: brightnessToBg(paintBrightness?.bg ?? 0.3),
                      color: brightnessToText(paintBrightness?.text ?? 0.7),
                      // WebKit / mobile browsers keep an inherited
                      // `-webkit-text-fill-color` from the tree that
                      // beats plain `color`. Setting it explicitly here
                      // makes the slider value survive re-mounts even
                      // if the useLayoutEffect ref-force hasn't landed
                      // yet on the first paint after reopening the note.
                      WebkitTextFillColor: brightnessToText(paintBrightness?.text ?? 0.7),
                    }}
                    data-testid="note-content-input"
                  />
                )}
              </div>
            </div>

            <div>
              <CategoryPathAccordion
                path={categoryPath}
                onChange={(next) => {
                  setCategoryPath(next);
                  // Keep legacy top-two in sync for downstream consumers
                  // that still read `category` / `subcategory` directly.
                  setCategory(next[0] || "");
                  setSubcategory(next[1] || "");
                }}
                categories={categories}
                existingPaths={existingPaths}
                isDark={isDark}
              />
            </div>

            <div>
              <label className={`text-xs mb-1.5 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t("note.color")}</label>
              <div className="flex flex-wrap gap-2" data-testid="note-color-picker">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.name)}
                    className={`color-swatch-sm ${color === c.name ? "active" : ""}`}
                    style={{ background: c.gradient || c.accent }}
                    title={c.label}
                    data-testid={`note-color-swatch-${c.name}`}
                  />
                ))}
              </div>
            </div>

            {/* Icon-view tile: Icon + Background */}
            <div>
              <label className={`text-xs mb-1.5 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Tile appearance (Icon view)</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="editor-tile-preview"
                  style={getBackgroundStyle(background)}
                  onClick={() => setBgPickerOpen(true)}
                  data-testid="editor-open-bg-picker"
                  title="Change background"
                >
                  <span className="preview-overlay" />
                  {(() => {
                    // No icon selected → render nothing so the picker preview
                    // matches the actual tile appearance (no placeholder).
                    if (!icon || !LucideIcons[icon]) return null;
                    const Ico = LucideIcons[icon];
                    return <Ico className="w-8 h-8 relative z-10" strokeWidth={1.6} />;
                  })()}
                </button>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setIconPickerOpen(true)}
                    className={`justify-start h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`}
                    data-testid="editor-open-icon-picker"
                  >
                    <LucideIcons.Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    {icon ? `Icon: ${icon}` : "Choose icon"}
                  </Button>
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setBgPickerOpen(true)}
                    className={`justify-start h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`}
                    data-testid="editor-open-bg-picker-btn"
                  >
                    <LucideIcons.Palette className="w-3.5 h-3.5 mr-1.5" />
                    {background?.type === "image" ? "Background: Image" : background?.value ? "Background: Custom" : "Choose background"}
                  </Button>
                </div>
              </div>
            </div>

            {(() => {
              const cleanPath = (Array.isArray(categoryPath) ? categoryPath : [])
                .map((s) => String(s || "").trim())
                .filter(Boolean);
              const isNested = cleanPath.length >= 2;
              // Dynamic label so the user knows exactly what they're
              // pinning based on the current path.
              const pinLabel = !isNested
                ? "Pin note to top"
                : cleanPath.length === 2
                  ? `Pin subcategory: ${cleanPath[0]} / ${cleanPath[1]}`
                  : `Pin subcategory: ${cleanPath[0]} / … / ${cleanPath[cleanPath.length - 2]} / ${cleanPath[cleanPath.length - 1]}`;
              const pinColor = pinned
                ? isNested
                  ? (isDark ? "text-emerald-400" : "text-emerald-600")
                  : (isDark ? "text-amber-400" : "text-amber-600")
                : (isDark ? "text-slate-400" : "text-gray-500");
              return (
                <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <label className={`text-xs flex items-center gap-1.5 min-w-0 ${pinColor}`}>
                      <Pin className="w-3.5 h-3.5 flex-shrink-0" fill={pinned ? "currentColor" : "none"} />
                      <span className="truncate">{pinLabel}</span>
                    </label>
                    <Switch checked={pinned} onCheckedChange={setPinned} data-testid="pin-toggle" />
                  </div>
                </div>
              );
            })()}

            {/* Tags */}
            <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <label className={`text-xs mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <Hash className="w-3.5 h-3.5" /> Tags
                <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>· press Enter or comma to add</span>
              </label>
              <div
                className={`min-h-9 rounded-md border flex flex-wrap gap-1.5 items-center px-2 py-1.5 ${
                  isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'
                }`}
                data-testid="tags-editor"
              >
                {tags.map(t => (
                  <span
                    key={t}
                    className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${
                      isDark ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                    data-testid={`tag-chip-${t}`}
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => setTags(prev => prev.filter(x => x !== t))}
                      className={`hover:opacity-70 ${isDark ? 'text-indigo-100' : 'text-indigo-700'}`}
                      title={`Remove ${t}`}
                      aria-label={`Remove tag ${t}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagDraft}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v.includes(",")) {
                      const parts = v.split(",");
                      const trailing = parts.pop();
                      const additions = parts
                        .map(p => p.trim().toLowerCase().replace(/^#/, ""))
                        .filter(p => p && !tags.includes(p));
                      if (additions.length) {
                        setTags(prev => Array.from(new Set([...prev, ...additions])));
                      }
                      setTagDraft(trailing);
                    } else {
                      setTagDraft(v);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const t = tagDraft.trim().toLowerCase().replace(/^#/, "");
                      if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
                      setTagDraft("");
                    } else if (e.key === "Backspace" && !tagDraft && tags.length > 0) {
                      setTags(prev => prev.slice(0, -1));
                    }
                  }}
                  onBlur={() => {
                    const t = tagDraft.trim().toLowerCase().replace(/^#/, "");
                    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
                    setTagDraft("");
                  }}
                  placeholder={tags.length === 0 ? "e.g., work, urgent, ideas" : "Add tag…"}
                  className={`flex-1 min-w-[6rem] bg-transparent text-xs outline-none ${
                    isDark ? 'text-white placeholder:text-slate-600' : 'text-gray-900 placeholder:text-gray-400'
                  }`}
                  list="all-note-tags"
                  data-testid="tag-input"
                />
                <datalist id="all-note-tags">
                  {allTags.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>
              {allTags.length > 0 && tags.length < 3 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {allTags
                    .filter(t => !tags.includes(t))
                    .slice(0, 6)
                    .map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTags(prev => [...prev, t])}
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isDark ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }`}
                        title={`Add tag #${t}`}
                        data-testid={`tag-suggestion-${t}`}
                      >
                        + #{t}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <Bell className="w-3.5 h-3.5" /> Alarm
                </label>
                <Switch checked={alarm.enabled} onCheckedChange={(checked) => setAlarm(prev => ({ ...prev, enabled: checked }))} />
              </div>
              {alarm.enabled && (
                <div className="space-y-2 pl-5">
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={`flex-1 h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`}>
                          {alarmDate ? format(alarmDate, "MMM d") : "Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className={`p-0 ${isDark ? 'bg-[#0B1221] border-white/10' : ''}`}>
                        <Calendar mode="single" selected={alarmDate} onSelect={setAlarmDate} />
                      </PopoverContent>
                    </Popover>
                    <Input type="time" value={alarmTime} onChange={(e) => setAlarmTime(e.target.value)} className={`w-24 h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`} />
                  </div>
                  <div className="flex gap-1">
                    {SOUND_OPTIONS.map((s) => (
                      <button key={s.value} onClick={() => setAlarm(prev => ({ ...prev, sound: s.value }))} className={`sound-option-sm flex-1 ${alarm.sound === s.value ? "active" : ""} ${isDark ? '' : 'light'}`}>
                        <span>{s.icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <EventsSection value={events} onChange={setEvents} isDark={isDark} />

            <ChecklistSection value={checklist} onChange={setChecklist} isDark={isDark} />

            {/* Photos & attachments */}
            <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <label className={`text-xs mb-2 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <LucideIcons.Image className="w-3.5 h-3.5" /> Photos & files
                <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                  · up to {StorageService.MAX_IMAGES_PER_NOTE ?? 10} images + {StorageService.MAX_FILES_PER_NOTE ?? 10} files · {Math.round((StorageService.MAX_ATTACHMENT_BYTES ?? 10485760) / (1024 * 1024))} MB each · JPG/PNG/GIF/WebP/PDF · hover image → 🔍 to OCR
                </span>
              </label>
              <Attachments
                attachments={attachments}
                onChange={setAttachments}
                isDark={isDark}
                compact
                onExtractText={(text) => setContent(prev => (prev || "") + `\n\n${text}`)}
              />
            </div>


            <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <Repeat className="w-3.5 h-3.5" /> Recurring
                </label>
                <Switch checked={recurring.enabled} onCheckedChange={(checked) => setRecurring(prev => ({ ...prev, enabled: checked }))} />
              </div>
              {recurring.enabled && (
                <div className="space-y-2 pl-5">
                  <Select value={recurring.frequency} onValueChange={(v) => setRecurring(prev => ({ ...prev, frequency: v, days: [] }))}>
                    <SelectTrigger className={`h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`}><SelectValue /></SelectTrigger>
                    <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10' : ''}>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  {recurring.frequency === "weekly" && (
                    <div className="flex gap-1 flex-wrap">
                      {DAYS.map((day, i) => (
                        <button key={day} onClick={() => toggleDay(i)} className={`px-2 py-1 rounded text-xs font-medium ${recurring.days.includes(i) ? 'bg-indigo-500 text-white' : isDark ? 'bg-white/10 text-slate-400' : 'bg-gray-100 text-gray-600'}`}>
                          {day}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} data-testid="note-modal-cancel" className={`flex-1 h-9 ${isDark ? 'border-white/10 text-slate-300' : ''}`}>{t("action.cancel")}</Button>
              <Button onClick={handleSave} disabled={saving} data-testid="note-modal-save" className="flex-1 h-9 bg-indigo-500 hover:bg-indigo-600 text-white">
                {saving ? "..." : (note ? t("action.update") : t("action.create"))}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TemplateModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} templates={templates} onSelect={handleSelectTemplate} isDark={isDark} />
      <TranslateModal
        isOpen={translateOpen}
        onClose={() => setTranslateOpen(false)}
        text={content}
        onAppend={(block) => setContent(prev => (prev || "") + block)}
        isDark={isDark}
      />
      <IconPicker
        isOpen={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        value={icon}
        onSelect={setIcon}
        isDark={isDark}
      />
      <BackgroundPicker
        isOpen={bgPickerOpen}
        onClose={() => setBgPickerOpen(false)}
        value={background}
        onSelect={setBackground}
        isDark={isDark}
      />
    </>
  );
}
