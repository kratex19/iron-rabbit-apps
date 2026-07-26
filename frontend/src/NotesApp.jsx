import React, { useState, useEffect, useCallback, useMemo } from "react";
import "@/App.css";
import { Toaster, toast } from "sonner";
import { format, isToday, isThisWeek, isThisMonth, parseISO } from "date-fns";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import { v4 as uuidv4 } from "uuid";
import * as chrono from "chrono-node";
import {
  Plus, Settings, Calculator, ExternalLink, Sun, Moon, Search, Filter,
  FolderTree, Download, LayoutGrid, List, Pin, Zap, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import StorageService from "./storage/storageService";
import notificationService from "./notifications/notificationService";
import NoteTile from "./components/NoteTile";
import IconPicker from "./components/IconPicker";
import { haptic } from "./utils/haptic";
import { presetForIcon } from "./data/quickAddTemplates";
import TilePacksModal from "./notes/TilePacksModal";
import FirstRunTour from "./notes/FirstRunTour";
import { maybeShowWeeklyRecap } from "./utils/weeklyRecap";

import { NOTE_COLORS, DEFAULT_TEMPLATES, SORT_OPTIONS, FILTER_OPTIONS } from "./notes/constants";
import AccordionNoteItem from "./notes/AccordionNoteItem";
import CategoryGroup from "./notes/CategoryGroup";
import NoteModal from "./notes/NoteModal";
import CalculatorWidget from "./notes/CalculatorWidget";
import ShareModal from "./notes/ShareModal";
import SettingsModal from "./notes/SettingsModal";
import FullScreenNote from "./notes/FullScreenNote";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Root Notes App (routed at `/`).
 * Owns app-wide state and orchestrates the extracted view/modal components
 * living in ./notes/*.
 */
export default function NotesApp() {
  // Data
  const [notes, setNotes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [categories, setCategories] = useState({});
  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [viewMode, setViewMode] = useState("list");        // 'list' | 'icon'
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false); // legacy flag, no longer used

  // Modals
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorCallback, setCalculatorCallback] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingNote, setSharingNote] = useState(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [fullScreenNote, setFullScreenNote] = useState(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [tilePacksOpen, setTilePacksOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [clearStep, setClearStep] = useState(0); // 0=closed, 1=first confirm, 2=second confirm

  // Keep full-screen editor in sync with the notes array
  useEffect(() => {
    if (!fullScreenNote) return;
    const fresh = notes.find(n => n.id === fullScreenNote.id);
    if (!fresh) setFullScreenNote(null);
    else if (fresh.updated_at !== fullScreenNote.updated_at) setFullScreenNote(fresh);
  }, [notes, fullScreenNote]);

  // Flip shadcn CSS vars for light mode so all Radix components (Badge, Button
  // variant="outline", Popover, Dialog etc.) render with dark text on light
  // surfaces even when they portal outside the app container.
  useEffect(() => {
    document.body.classList.toggle('nx-light', !isDark);
    return () => document.body.classList.remove('nx-light');
  }, [isDark]);

  // Follow OS `prefers-color-scheme` on first visit (only when the user has
  // never set their own preference in this app).
  useEffect(() => {
    if (settings?.theme_preference) {
      setIsDark(settings.theme_preference === 'dark');
      return;
    }
    if (settings && !settings.theme_preference && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.theme_preference]);

  // Keyboard shortcuts (desktop-only feel): n = new note, / = focus search,
  // g = toggle grid/list. Ignored when a form field is focused.
  useEffect(() => {
    const isFormEl = (el) => {
      if (!el) return false;
      const t = el.tagName;
      return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || el.isContentEditable;
    };
    const handler = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isFormEl(document.activeElement)) return;
      if (e.key === "n") {
        e.preventDefault();
        setEditingNote(null); setNoteModalOpen(true); haptic("tap");
      } else if (e.key === "/") {
        e.preventDefault();
        const input = document.querySelector('input[placeholder="Search..."]');
        if (input) input.focus();
      } else if (e.key === "g") {
        e.preventDefault();
        handleChangeViewMode(viewMode === "list" ? "icon" : "list"); haptic("tap");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const fetchData = useCallback(async () => {
    try {
      // One-time migration from backend for existing users
      const migration = await StorageService.migrateFromBackend(BACKEND_URL);
      if (migration.migrated && migration.notes > 0) {
        toast.success(`Restored ${migration.notes} notes from server`, { duration: 5000 });
      }

      const [notesData, settingsData, catsData, templatesData, storageData] = await Promise.all([
        StorageService.getAllNotes(),
        StorageService.getSettings(),
        StorageService.getCategories(),
        StorageService.getTemplates(),
        StorageService.getStorageInfo(),
      ]);
      setNotes(notesData);
      setSettings(settingsData);
      if (settingsData?.view_mode) setViewMode(settingsData.view_mode);
      setCategories(catsData);
      setStorageInfo(storageData);
      if (templatesData.length > 0) setTemplates(templatesData);

      // First-run tour: show once, when there are no notes AND user has never
      // completed/dismissed the tour.
      if (settingsData && !settingsData.tour_completed && notesData.length === 0) {
        setTimeout(() => setTourOpen(true), 800);
      }

      // Weekly recap: fires a local notification if it's Sunday & not already
      // sent this week. Silently no-ops otherwise.
      maybeShowWeeklyRecap(notesData);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Local alarm checker
  useEffect(() => {
    notificationService.startAlarmChecker(() => notes);
    return () => notificationService.stopAlarmChecker();
  }, [notes]);
  useEffect(() => { notificationService.requestPermission(); }, []);

  // ---------- Handlers ----------

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      toast.info("App is already installed or install not available on this browser");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') toast.success("App installed!");
    setDeferredPrompt(null);
  };

  const handleClearAllData = () => {
    // Two-step confirmation — actual wipe happens in performClearAllData()
    setClearStep(1);
  };

  const performClearAllData = async () => {
    try {
      await StorageService.clearAllData();
      toast.success("All data cleared");
      setClearStep(0);
      setSettingsModalOpen(false);
      haptic("error");
      fetchData();
    } catch (err) {
      console.error("Clear error:", err);
      toast.error("Failed to clear data");
      setClearStep(0);
    }
  };

  const handleRestoreFromServer = async () => {
    try {
      toast.info("Checking server for your notes...");
      const result = await StorageService.migrateFromBackend(BACKEND_URL, true);
      if (result.migrated && (result.notes > 0 || result.templates > 0)) {
        toast.success(`Restored ${result.notes} notes and ${result.templates} templates from server`, { duration: 5000 });
        fetchData();
      } else {
        toast.info("No additional notes to restore");
      }
    } catch (err) {
      console.error("Restore error:", err);
      toast.error("Failed to restore from server");
    }
  };

  const handleSaveNote = async (noteData, noteId) => {
    try {
      const now = new Date().toISOString();

      // ---- Natural-language reminder detection ----
      // If the user didn't manually set an alarm, try to parse the title for
      // a phrase like "tomorrow at 8am" and auto-populate one.
      const enriched = { ...noteData };
      const hasManualAlarm = noteData.alarm?.datetime;
      if (!hasManualAlarm && noteData.title) {
        const results = chrono.parse(noteData.title, new Date(), { forwardDate: true });
        const first = results[0];
        if (first?.start) {
          const dt = first.start.date();
          if (dt.getTime() > Date.now()) {
            enriched.alarm = {
              enabled: true,
              datetime: dt.toISOString(),
              sound: noteData.alarm?.sound || "bell",
              haptic: noteData.alarm?.haptic || false,
              auto_detected: true,
            };
          }
        }
      }

      if (noteId) {
        const existing = await StorageService.getNote(noteId);
        const updated = { ...existing, ...enriched, updated_at: now };
        await StorageService.saveNote(updated);
        toast.success("Updated!");
      } else {
        const maxOrder = notes.reduce((max, n) => Math.max(max, n.order || 0), 0);
        const newNote = {
          id: uuidv4(),
          ...enriched,
          order: maxOrder + 1,
          created_at: now,
          updated_at: now,
          last_viewed: now,
        };
        await StorageService.saveNote(newNote);
        if (enriched.alarm?.auto_detected) {
          toast.success(`Created — reminder set for ${new Date(enriched.alarm.datetime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`, { duration: 5000 });
        } else {
          toast.success("Created!");
        }
      }
      fetchData();
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to save");
    }
  };

  // Quick Add: user picked an icon in the library → create a preset note.
  const handleQuickAdd = async (icon) => {
    try {
      const preset = presetForIcon(icon.name, icon.label);
      const now = new Date().toISOString();
      const maxOrder = notes.reduce((max, n) => Math.max(max, n.order || 0), 0);
      const newNote = {
        id: uuidv4(),
        ...preset,
        order: maxOrder + 1,
        created_at: now,
        updated_at: now,
        last_viewed: now,
      };
      await StorageService.saveNote(newNote);
      haptic("success");
      toast.success(`Added "${preset.title}"`);
      fetchData();
    } catch (err) {
      console.error("Quick add error:", err);
      toast.error("Could not create note");
    }
  };

  // Tile Pack: bulk-create every note in the pack.
  const handleApplyPack = async (pack) => {
    try {
      const now = new Date().toISOString();
      let maxOrder = notes.reduce((max, n) => Math.max(max, n.order || 0), 0);
      for (const n of pack.notes) {
        maxOrder += 1;
        await StorageService.saveNote({
          id: uuidv4(),
          ...n,
          order: maxOrder,
          created_at: now,
          updated_at: now,
          last_viewed: now,
        });
      }
      haptic("success");
      toast.success(`Applied "${pack.name}" — ${pack.notes.length} tiles added`, { duration: 5000 });
      setTilePacksOpen(false);
      fetchData();
    } catch (err) {
      console.error("Apply pack error:", err);
      toast.error("Could not apply pack");
    }
  };

  const handleTourDismiss = async () => {
    setTourOpen(false);
    try {
      const updated = await StorageService.saveSettings({ tour_completed: true });
      setSettings(updated);
    } catch { /* non-fatal */ }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      const doomed = await StorageService.getNote(noteId);
      await StorageService.deleteNote(noteId);
      haptic("long");
      fetchData();
      // Undo grace period — sonner action lets the user restore
      toast("Note deleted", {
        duration: 5000,
        action: doomed ? {
          label: "Undo",
          onClick: async () => {
            try {
              await StorageService.saveNote(doomed);
              haptic("success");
              toast.success("Restored");
              fetchData();
            } catch { toast.error("Could not undo"); }
          },
        } : undefined,
      });
    } catch (err) {
      toast.error("Failed");
    }
  };

  const handleTogglePin = async (noteId) => {
    try {
      const existing = await StorageService.getNote(noteId);
      if (!existing) return;
      const updated = { ...existing, pinned: !existing.pinned, updated_at: new Date().toISOString() };
      await StorageService.saveNote(updated);
      haptic("tap");
      fetchData();
    } catch (err) {
      toast.error("Failed");
    }
  };

  // Silent auto-save from the full-screen editor
  const handleSaveInline = async (noteId, patch) => {
    try {
      const existing = await StorageService.getNote(noteId);
      if (!existing) return;
      const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
      await StorageService.saveNote(updated);
      const [notesData, catsData] = await Promise.all([
        StorageService.getAllNotes(),
        StorageService.getCategories(),
      ]);
      setNotes(notesData);
      setCategories(catsData);
    } catch (err) {
      console.error("Inline save error:", err);
      toast.error("Failed to save");
    }
  };

  const handleSaveSettings = async (settingsData) => {
    try {
      const updated = await StorageService.saveSettings(settingsData);
      setSettings(updated);
    } catch (err) {
      toast.error("Failed");
    }
  };

  const handleChangeViewMode = async (mode) => {
    setViewMode(mode);
    try {
      const updated = await StorageService.saveSettings({ view_mode: mode });
      setSettings(updated);
    } catch (err) {
      // non-fatal — just doesn't persist
    }
  };

  const handleToggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    haptic("tap");
    try {
      const updated = await StorageService.saveSettings({ theme_preference: next ? 'dark' : 'light' });
      setSettings(updated);
    } catch { /* non-fatal */ }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(processedNotes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    try {
      await StorageService.reorderNotes(items.map(item => item.id));
      fetchData();
    } catch (err) {
      console.error("Reorder error:", err);
    }
  };

  const handleBackup = async () => {
    try {
      const data = await StorageService.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const filename = `iron-rabbit-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
      saveAs(blob, filename);
      toast.success("Backup exported!");
    } catch (err) {
      console.error("Backup error:", err);
      toast.error("Backup failed");
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await StorageService.importAllData(data);
      toast.success(`Restored ${result.notes} notes, ${result.templates} templates`);
      fetchData();
    } catch (err) {
      console.error("Restore error:", err);
      toast.error("Invalid backup file");
    }
    e.target.value = '';
  };

  // ---------- Derived data ----------

  const processedNotes = useMemo(() => {
    let result = [...notes];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        n.category?.toLowerCase().includes(q) ||
        n.subcategory?.toLowerCase().includes(q)
      );
    }
    if (filterBy !== "all") {
      result = result.filter(n => {
        const date = parseISO(n.created_at);
        if (filterBy === "today") return isToday(date);
        if (filterBy === "week") return isThisWeek(date);
        if (filterBy === "month") return isThisMonth(date);
        return true;
      });
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "custom":            return (a.order || 0) - (b.order || 0);
        case "newest":            return new Date(b.created_at) - new Date(a.created_at);
        case "oldest":            return new Date(a.created_at) - new Date(b.created_at);
        case "a-z":               return (a.title || "").localeCompare(b.title || "");
        case "z-a":               return (b.title || "").localeCompare(a.title || "");
        case "recently-viewed":   return new Date(b.last_viewed || b.updated_at) - new Date(a.last_viewed || a.updated_at);
        case "recently-edited":   return new Date(b.updated_at) - new Date(a.updated_at);
        case "category":          return (a.category || "").localeCompare(b.category || "");
        default:                  return 0;
      }
    });
    return result;
  }, [notes, searchQuery, filterBy, sortBy]);

  const { grouped, uncategorized } = useMemo(() => {
    const map = new Map();
    const uncat = [];
    processedNotes.forEach(n => {
      if (n.pinned) return; // shown in the dedicated pinned rail
      if (n.category?.trim()) {
        if (!map.has(n.category)) map.set(n.category, []);
        map.get(n.category).push(n);
      } else {
        uncat.push(n);
      }
    });
    return { grouped: Array.from(map.entries()), uncategorized: uncat };
  }, [processedNotes]);

  const pinnedNotes = useMemo(
    () => processedNotes.filter(n => n.pinned),
    [processedNotes]
  );

  const exportToPDF = () => {
    const doc = new jsPDF();
    let y = 15;
    doc.setFontSize(18); doc.text(settings?.company_name || "Iron Rabbit", 15, y); y += 10;
    doc.setFontSize(9); doc.text(`Exported: ${format(new Date(), "MMM d, yyyy HH:mm")}`, 15, y); y += 10;
    processedNotes.forEach((note) => {
      if (y > 270) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.setTextColor(NOTE_COLORS.find(c => c.name === note.color)?.accent || "#000");
      doc.text(note.title || "Untitled", 15, y); y += 6;
      doc.setFontSize(8); doc.setTextColor(100);
      doc.text(`${format(new Date(note.created_at), "MMM d, yyyy HH:mm")}${note.category ? ` | ${note.category}` : ''}`, 15, y); y += 5;
      doc.setFontSize(10); doc.setTextColor(0);
      doc.splitTextToSize(note.content || "", 180).forEach(line => {
        if (y > 280) { doc.addPage(); y = 15; }
        doc.text(line, 15, y); y += 5;
      });
      y += 8;
    });
    doc.save(`${settings?.company_name || "notes"}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exported!");
  };

  const openEditModal            = (note) => { setEditingNote(note); setNoteModalOpen(true); };
  const openShareModal           = (note) => { setSharingNote(note); setShareModalOpen(true); };
  const openCalculatorWithCallback = (cb)   => { setCalculatorCallback(() => cb); setCalculatorOpen(true); };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#020617]' : 'bg-gray-50'}`}>
        <div className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  // ---------- Render ----------

  const renderPinnedRail = () => {
    if (pinnedNotes.length === 0) return null;
    return (
      <div className="mb-4" data-testid="pinned-rail">
        <div className={`text-xs font-semibold uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          <Pin className="w-3 h-3" /> Pinned
        </div>
        {viewMode === "icon" ? (
          <div className="notes-grid">
            {pinnedNotes.map(note => (
              <NoteTile key={note.id} note={note} onOpen={setFullScreenNote} onEdit={openEditModal} isDark={isDark} />
            ))}
          </div>
        ) : (
          <div>
            {pinnedNotes.map(note => (
              <AccordionNoteItem
                key={note.id}
                note={note}
                onEdit={openEditModal}
                onDelete={handleDeleteNote}
                onShare={openShareModal}
                onFullScreen={setFullScreenNote}
                onTogglePin={handleTogglePin}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderNotes = () => {
    if (processedNotes.length === 0) {
      const emptyCopy = searchQuery
        ? `No matches for "${searchQuery}"`
        : filterBy === "today" ? "Nothing scheduled today"
        : filterBy === "week"  ? "Nothing this week"
        : filterBy === "month" ? "Nothing this month"
        : "Your notes will live here";
      return (
        <div className="text-center py-12">
          <div className="text-5xl mb-3 opacity-25">📝</div>
          <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{emptyCopy}</p>
          {!searchQuery && filterBy === "all" && (
            <Button onClick={() => { setEditingNote(null); setNoteModalOpen(true); haptic("tap"); }} size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Create your first note
            </Button>
          )}
          <p className={`text-xs mt-6 font-mono ${isDark ? 'text-slate-600' : 'text-gray-400'} hidden md:block`}>
            Shortcuts: <kbd className="px-1 py-0.5 rounded bg-black/10">n</kbd> new
            {" · "}<kbd className="px-1 py-0.5 rounded bg-black/10">/</kbd> search
            {" · "}<kbd className="px-1 py-0.5 rounded bg-black/10">g</kbd> toggle view
          </p>
        </div>
      );
    }

    if (viewMode === "icon") {
      if (groupByCategory) {
        return (
          <div data-testid="notes-icon-grouped">
            {grouped.map(([cat, items]) => (
              <div key={cat} className="mb-5">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 px-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{cat}</h3>
                <div className="notes-grid">
                  {items.map(note => (
                    <NoteTile key={note.id} note={note} onOpen={setFullScreenNote} onEdit={openEditModal} isDark={isDark} />
                  ))}
                </div>
              </div>
            ))}
            {uncategorized.length > 0 && (
              <div>
                {grouped.length > 0 && (
                  <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 px-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Uncategorized</h3>
                )}
                <div className="notes-grid" data-testid="notes-icon-uncategorized">
                  {uncategorized.map(note => (
                    <NoteTile key={note.id} note={note} onOpen={setFullScreenNote} onEdit={openEditModal} isDark={isDark} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }
      return (
        <div className="notes-grid" data-testid="notes-icon-flat">
          {processedNotes.map(note => (
            <NoteTile key={note.id} note={note} onOpen={setFullScreenNote} onEdit={openEditModal} isDark={isDark} />
          ))}
        </div>
      );
    }

    // List view
    if (sortBy === "custom" && !groupByCategory) {
      return (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="notes">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {processedNotes.map((note, index) => (
                  <Draggable key={note.id} draggableId={note.id} index={index}>
                    {(prov, snap) => (
                      <div ref={prov.innerRef} {...prov.draggableProps}>
                        <AccordionNoteItem
                          note={note}
                          onEdit={openEditModal}
                          onDelete={handleDeleteNote}
                          onShare={openShareModal}
                          onFullScreen={setFullScreenNote}
                          onTogglePin={handleTogglePin}
                          isDark={isDark}
                          dragHandleProps={prov.dragHandleProps}
                          isDragging={snap.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      );
    }

    if (groupByCategory) {
      return (
        <div data-testid="notes-grouped">
          {grouped.map(([cat, items]) => (
            <CategoryGroup
              key={cat}
              category={cat}
              notes={items}
              onEdit={openEditModal}
              onDelete={handleDeleteNote}
              onShare={openShareModal}
              onFullScreen={setFullScreenNote}
              onTogglePin={handleTogglePin}
              isDark={isDark}
            />
          ))}
          {uncategorized.length > 0 && (
            <div data-testid="notes-uncategorized">
              {uncategorized.map(note => (
                <AccordionNoteItem
                  key={note.id}
                  note={note}
                  onEdit={openEditModal}
                  onDelete={handleDeleteNote}
                  onShare={openShareModal}
                  onFullScreen={setFullScreenNote}
                  onTogglePin={handleTogglePin}
                  isDark={isDark}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        {processedNotes.map(note => (
          <AccordionNoteItem
            key={note.id}
            note={note}
            onEdit={openEditModal}
            onDelete={handleDeleteNote}
            onShare={openShareModal}
            onFullScreen={setFullScreenNote}
            onTogglePin={handleTogglePin}
            isDark={isDark}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#020617]' : 'bg-gray-50'}`} data-testid="app-container">
      <Toaster position="top-right" theme={isDark ? "dark" : "light"} />

      {/* Compact Header */}
      <header
        className={`header-compact ${isDark ? '' : 'light'}`}
        style={{ backgroundImage: settings?.header_bg ? `url(${settings.header_bg})` : undefined }}
      >
        <div className="relative z-10 w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings?.logo_url && (
              <a href={settings?.website_url || "#"} target="_blank" rel="noopener noreferrer">
                <img src={settings.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-white/20" />
              </a>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                {settings?.company_name || "Iron Rabbit"}
              </h1>
              {settings?.website_url && (
                <a href={settings.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-300 hover:text-white flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  {settings.website_url.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => { setQuickAddOpen(true); haptic("tap"); }} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" title="Quick Add" data-testid="header-quick-add"><Zap className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => { setTilePacksOpen(true); haptic("tap"); }} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" title="Tile Packs" data-testid="header-tile-packs"><Package className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={exportToPDF} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"><Download className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={handleToggleTheme} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8">{isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</Button>
            <Button variant="ghost" size="icon" onClick={() => setCalculatorOpen(true)} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"><Calculator className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsModalOpen(true)} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"><Settings className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-3 max-w-4xl mx-auto">
        {/* Search & Controls */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className={`pl-8 h-9 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-gray-200'}`}
            />
          </div>
          <div className="flex gap-2">
            <div className={`view-toggle ${isDark ? "" : "light"}`} data-testid="view-mode-toggle">
              <button
                type="button"
                onClick={() => handleChangeViewMode("list")}
                className={viewMode === "list" ? "active" : ""}
                aria-label="List view"
                data-testid="view-mode-list"
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleChangeViewMode("icon")}
                className={viewMode === "icon" ? "active" : ""}
                aria-label="Icon view"
                data-testid="view-mode-icon"
                title="Icon view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className={`w-28 h-9 text-xs ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                <Filter className="w-3 h-3 mr-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}>
                {FILTER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className={`w-36 h-9 text-xs ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}>
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    <span className="flex items-center gap-1.5"><opt.icon className="w-3 h-3" />{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Group toggle + count */}
        <div className={`flex items-center justify-between mb-2 gap-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          <button
            type="button"
            onClick={() => setGroupByCategory(v => !v)}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
              groupByCategory
                ? (isDark ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-800')
                : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-700')
            }`}
            aria-pressed={groupByCategory}
            data-testid="group-toggle"
            title="Toggle category grouping"
          >
            <FolderTree className="w-3.5 h-3.5" /> Group by category
          </button>
          <div className="text-xs font-mono">{processedNotes.length} notes</div>
        </div>

        {renderPinnedRail()}
        {renderNotes()}
      </main>

      {/* FAB */}
      <button
        onClick={() => { setEditingNote(null); setNoteModalOpen(true); haptic("tap"); }}
        className={`fab-button-sm ${isDark ? '' : 'light'}`}
        aria-label="Add note"
        data-testid="fab-add-note"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modals */}
      <NoteModal
        isOpen={noteModalOpen}
        onClose={() => { setNoteModalOpen(false); setEditingNote(null); }}
        note={editingNote}
        onSave={handleSaveNote}
        onOpenCalculator={openCalculatorWithCallback}
        isDark={isDark}
        categories={categories}
        templates={templates}
      />
      <CalculatorWidget
        isOpen={calculatorOpen}
        onClose={() => { setCalculatorOpen(false); setCalculatorCallback(null); }}
        onInsertResult={calculatorCallback}
        isDark={isDark}
      />
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => { setShareModalOpen(false); setSharingNote(null); }}
        note={sharingNote}
        isDark={isDark}
      />
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onBackup={handleBackup}
        onRestore={handleRestore}
        onClearData={handleClearAllData}
        onInstallPWA={handleInstallPWA}
        canInstallPWA={!!deferredPrompt}
        storageInfo={storageInfo}
        onRestoreFromServer={handleRestoreFromServer}
        isDark={isDark}
      />
      <FullScreenNote
        note={fullScreenNote}
        isOpen={!!fullScreenNote}
        onClose={() => setFullScreenNote(null)}
        onSaveInline={handleSaveInline}
        onDelete={handleDeleteNote}
        onShare={openShareModal}
        isDark={isDark}
      />
      <IconPicker
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        mode="quick-add"
        onQuickAdd={handleQuickAdd}
        onSelect={() => {}}
        isDark={isDark}
      />
      <TilePacksModal
        isOpen={tilePacksOpen}
        onClose={() => setTilePacksOpen(false)}
        onApply={handleApplyPack}
        isDark={isDark}
      />
      <FirstRunTour open={tourOpen} onDismiss={handleTourDismiss} isDark={isDark} />

      {/* Two-step "Clear All Data" confirmation */}
      <Dialog open={clearStep === 1} onOpenChange={(o) => !o && setClearStep(0)}>
        <DialogContent
          className={`max-w-sm ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}
          data-testid="clear-confirm-step-1"
        >
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : 'text-gray-900'}>
              Are you sure you want to delete all data?
            </DialogTitle>
            <DialogDescription className={isDark ? 'text-slate-400' : 'text-gray-500'}>
              This will clear every note, template, category and setting stored on this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setClearStep(0)}
              className={`flex-1 sm:flex-none ${isDark ? 'border-white/10 text-slate-300' : ''}`}
              data-testid="clear-step-1-no"
            >
              No
            </Button>
            <Button
              onClick={() => setClearStep(2)}
              className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white"
              data-testid="clear-step-1-yes"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clearStep === 2} onOpenChange={(o) => !o && setClearStep(0)}>
        <DialogContent
          className={`max-w-sm ${isDark ? 'bg-[#0B1221] border-red-500/40' : 'bg-white border-red-300'}`}
          data-testid="clear-confirm-step-2"
        >
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              Are you absolutely positive?
            </DialogTitle>
            <DialogDescription className={isDark ? 'text-slate-300' : 'text-gray-600'}>
              In doing so you will lose <strong>any and all</strong> data — notes, files, images and videos.
              This cannot be undone.
              <br /><br />
              Do you wish to proceed with data wipe?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setClearStep(0)}
              className={`flex-1 sm:flex-none ${isDark ? 'border-white/10 text-slate-300' : ''}`}
              data-testid="clear-step-2-no"
            >
              No, take me back
            </Button>
            <Button
              onClick={performClearAllData}
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white"
              data-testid="clear-step-2-yes"
            >
              Yes, wipe everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
