import React, { useState, useEffect, useCallback, useMemo } from "react";
import "@/App.css";
import { Toaster, toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format, isToday, isThisWeek, isThisMonth, parseISO } from "date-fns";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import { v4 as uuidv4 } from "uuid";
import * as chrono from "chrono-node";
import {
  Plus, Settings, Calculator, ExternalLink, Sun, Moon, Search, Filter,
  FolderTree, Download, LayoutGrid, List, Pin, Zap, Package, CalendarDays, Globe, Archive, BarChart3, Baby,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import StorageService from "./storage/storageService";
import notificationService from "./notifications/notificationService";
import NoteTile from "./components/NoteTile";
import IconPicker from "./components/IconPicker";
import { haptic } from "./utils/haptic";
import { presetForIcon } from "./data/quickAddTemplates";
import TilePacksModal from "./notes/TilePacksModal";
import FirstRunTour from "./notes/FirstRunTour";
import FloatingCalendarModal from "./notes/FloatingCalendarModal";
import LanguagePicker from "./notes/LanguagePicker";
import useLanguageSuggest from "./i18n/useLanguageSuggest";
import SecurityModal from "./notes/SecurityModal";
import OrganizationModal from "./notes/OrganizationModal";
import MultiSelectBar from "./notes/MultiSelectBar";
import MoveToCategoryModal from "./notes/MoveToCategoryModal";
import CopySuffixDialog from "./notes/CopySuffixDialog";
import BatchStudioSheet from "./notes/BatchStudioSheet";
import DeleteChoiceDialog from "./notes/DeleteChoiceDialog";
import RecentActionPill from "./notes/RecentActionPill";
import QuickAccessModal from "./notes/QuickAccessModal";
import BackupRestoreModal from "./notes/BackupRestoreModal";
import ArchiveTrashModal from "./notes/ArchiveTrashModal";
import TagFilterStrip from "./notes/TagFilterStrip";
import InsightsModal from "./notes/InsightsModal";
import KidDashboardModal from "./notes/KidDashboardModal";
import CategoryHeader from "./notes/CategoryHeader";
import { TILE_PACKS } from "./data/tilePacks";
import useBulkActions from "./hooks/useBulkActions";
import LockScreen from "./security/LockScreen";
import useAutoLock from "./security/useAutoLock";
import SecurityService from "./security/SecurityService";
import { SUPPORTED_LANGUAGES } from "./i18n";
import { maybeShowWeeklyRecap } from "./utils/weeklyRecap";
import { maybeShowWeeklyChoreSummary } from "./utils/weeklyChoreSummary";

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
  const { t, i18n } = useTranslation();
  // Suggest device language on first launch (once per device)
  useLanguageSuggest();
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
  const [activeTag, setActiveTag] = useState(null);
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
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [kidModeOpen, setKidModeOpen] = useState(false);
  const [floatingCalendarOpen, setFloatingCalendarOpen] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [organizationOpen, setOrganizationOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [clearStep, setClearStep] = useState(0); // 0=closed, 1=first confirm, 2=second confirm

  // App-lock (uses SecurityService + visibilitychange)
  const autoLock = useAutoLock();

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

  // First-launch Quick Access wizard — opens once when settings load and
  // `quick_access_wizard_seen` is not yet set. Persists the seen flag so
  // subsequent launches skip the prompt. Users can re-open from Settings.
  useEffect(() => {
    if (!settings) return;
    if (settings.quick_access_wizard_seen) return;
    // Small delay so first-launch tour has priority over the wizard.
    const t = setTimeout(() => setQuickAccessOpen(true), 1200);
    return () => clearTimeout(t);
  }, [settings]);

  // Persist the wizard-seen flag every time the wizard closes.
  const handleCloseQuickAccess = async () => {
    setQuickAccessOpen(false);
    if (settings && !settings.quick_access_wizard_seen) {
      const next = { ...settings, quick_access_wizard_seen: true };
      await StorageService.saveSettings(next);
      setSettings(next);
    }
  };

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
      maybeShowWeeklyChoreSummary(notesData);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Handle ?action= URL params from PWA home-screen shortcuts
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    if (!action) return;
    // Delay slightly so state is ready
    const t = setTimeout(() => {
      if (action === "new-note") { setEditingNote(null); setNoteModalOpen(true); }
      else if (action === "voice-note") { setEditingNote(null); setNoteModalOpen(true); }
      else if (action === "calendar") { setFloatingCalendarOpen(true); }
      else if (action === "calculator") { setCalculatorOpen(true); }
      // Clean up URL so the action doesn't re-fire on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete("action");
      window.history.replaceState({}, "", url.toString());
    }, 200);
    return () => clearTimeout(t);
  }, []);

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

  const handleClearAllData = async () => {
    // Optional biometric gate before showing the confirmation dialogs
    const toggles = await SecurityService.getToggles();
    const method = await SecurityService.getMethod();
    if (toggles.requireAuthClearAll && method === "biometric") {
      const ok = await SecurityService.verifyBiometric();
      if (!ok) { toast.error("Authentication failed"); return; }
    }
    // For PIN method, lock screen already gates all app entry, so no extra prompt needed
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
      // Attach pack-of-origin metadata so section headers can render the
      // exact same accent color you see on the pack card in TilePacksModal.
      // This is data-only — no visible ribbon is added to the tile itself.
      const packMeta = {
        pack_id: pack.id,
        pack_name: pack.name,
        pack_accent: pack.accent,
      };
      for (const n of pack.notes) {
        maxOrder += 1;
        await StorageService.saveNote({
          id: uuidv4(),
          ...n,
          ...packMeta,
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

  // Sync existing pack-applied notes back to their original pack's accent —
  // used by the Settings "Sync pack colors" button. Best-effort match by note
  // title against TILE_PACKS + any custom packs the user has built.
  const handleSyncPackColors = async () => {
    try {
      const s = await StorageService.getSettings();
      const customPacks = Array.isArray(s?.custom_packs) ? s.custom_packs : [];
      const allPacks = [...TILE_PACKS, ...customPacks];
      let updated = 0;
      for (const n of notes) {
        if (n.pack_accent || n.archived_at || n.deleted_at) continue;
        // Prefer an exact title + icon match (higher confidence),
        // fall back to title only.
        const match = allPacks.find(p => p.notes.some(pn =>
          pn.title === n.title && (pn.icon || null) === (n.icon || null)
        )) || allPacks.find(p => p.notes.some(pn => pn.title === n.title));
        if (!match) continue;
        await StorageService.saveNote({
          ...n,
          pack_id: match.id,
          pack_name: match.name,
          pack_accent: match.accent,
        });
        updated += 1;
      }
      if (updated === 0) {
        toast.info("No matches found — nothing to sync.");
      } else {
        toast.success(`Synced ${updated} tile${updated === 1 ? "" : "s"} back to their pack colors`);
      }
      fetchData();
    } catch (err) {
      console.error("Sync pack colors error:", err);
      toast.error("Could not sync pack colors");
    }
  };


  const handleTourDismiss = async () => {
    setTourOpen(false);
    try {
      const updated = await StorageService.saveSettings({ tour_completed: true });
      setSettings(updated);
    } catch { /* non-fatal */ }
  };

  // Delete flow — open a two-choice dialog (Archive vs Trash) and defer the
  // actual action. `recentAction` drives the persistent floating pill.
  const [deleteChoice, setDeleteChoice] = useState(null); // { ids: string[] } | null
  const [recentAction, setRecentAction] = useState(null); // { type, count, undoSnap } | null
  const [archiveTrashOpen, setArchiveTrashOpen] = useState(false);
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);

  const handleDeleteNote = (noteId) => {
    setDeleteChoice({ ids: [noteId] });
  };

  const performArchive = async (ids) => {
    const snap = new Map();
    for (const id of ids) {
      const prev = await StorageService.archiveNote(id);
      if (prev) snap.set(id, prev);
    }
    haptic("long");
    fetchData();
    setRecentAction({ type: "archive", count: ids.length, undoSnap: snap });
  };

  const performTrash = async (ids) => {
    const snap = new Map();
    for (const id of ids) {
      const prev = await StorageService.moveNoteToTrash(id);
      if (prev) snap.set(id, prev);
    }
    haptic("long");
    fetchData();
    setRecentAction({ type: "trash", count: ids.length, undoSnap: snap });
  };

  const undoRecentAction = async () => {
    if (!recentAction?.undoSnap) return;
    for (const [id, prev] of recentAction.undoSnap.entries()) {
      await StorageService.restoreLifecycle(id, prev);
    }
    setRecentAction(null);
    fetchData();
    toast.success("Restored");
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

  const handleDragStart = () => { haptic("tap"); };

  // Multi-select + bulk actions — every selection helper, modal flag,
  // and bulk handler is owned by the hook.
  const bulk = useBulkActions({ settings, fetchData });
  const {
    selectMode, selectedIds, setSelectMode,
    isSelected, toggleSelect, clearSelection, enterSelectMode,
    moveToOpen, setMoveToOpen,
    batchStudioOpen, setBatchStudioOpen,
    pendingCopyTarget, setPendingCopyTarget,
    confirmDeleteOpen, setConfirmDeleteOpen,
    openDeleteConfirm, confirmBulkDelete,
    bulkMoveTo, bulkCopyTo,
    bulkDuplicateInPlace,
    bulkTogglePin, bulkSetColor, bulkSetAlarm, bulkClearAlarm,
    bulkExportPDF,
  } = bulk;
  const inSelectMode = selectMode;
  // Swipe-to-select handler shared by every list-view row.
  const handleSwipeSelect = (noteId) => {
    if (!inSelectMode) enterSelectMode();
    toggleSelect(noteId);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId, type } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    try {
      // 1) CATEGORY REORDER
      if (type === "category") {
        const currentOrder = grouped.map(([name]) => name);
        const items = Array.from(currentOrder);
        const [moved] = items.splice(source.index, 1);
        items.splice(destination.index, 0, moved);
        await StorageService.saveCategoryOrder(items);
        fetchData();
        toast.success(`Moved "${moved}"`);
        return;
      }

      // 2) NOTE MOVE
      const noteId = draggableId.replace(/^note-/, "");
      const CAT_PREFIX = "notes-in-";
      const srcCat = source.droppableId.startsWith(CAT_PREFIX) ? source.droppableId.slice(CAT_PREFIX.length) : null;
      const dstCat = destination.droppableId.startsWith(CAT_PREFIX) ? destination.droppableId.slice(CAT_PREFIX.length) : null;

      // Cross-category tile drag = COPY by default. The original stays
      // put in its source category; a duplicate lands in the destination
      // with a new UUID (all other content, alarms, attachments and
      // metadata preserved). Users can still MOVE via the note's edit
      // form → Category field, or via Batch Studio → Move To.
      if (srcCat !== null && dstCat !== null && srcCat !== dstCat) {
        const original = notes.find(n => n.id === noteId);
        if (!original) return;
        const now = new Date().toISOString();
        const maxOrder = notes.reduce((m, n) => Math.max(m, n.order || 0), 0);
        const copy = {
          ...original,
          id: uuidv4(),
          category: dstCat,
          subcategory: "",
          created_at: now,
          updated_at: now,
          order: maxOrder + 1,
        };
        await StorageService.saveNote(copy);
        fetchData();
        toast.success(`Copied to "${dstCat}"`, {
          action: {
            label: "Undo",
            onClick: async () => {
              await StorageService.deleteNote(copy.id);
              fetchData();
            },
          },
          duration: 6000,
        });
        return;
      }

      // Same-list reorder (flat grid, flat list, or within one category).
      //
      // For per-category droppables (`notes-in-<cat>`), source.index /
      // destination.index are LOCAL to that category — we must reorder
      // against the local grouped[cat] slice, THEN splice the result back
      // into the FULL global note order before persisting. Persisting only
      // the local slice would reset `note.order` values 0..N-1 for that
      // category and collide with every other category's order values,
      // causing tiles to jump to unexpected positions on the next render.
      let localList;
      if (srcCat !== null) {
        const entry = srcCat === "" ? null : grouped.find(([n]) => n === srcCat);
        localList = entry ? entry[1] : uncategorized;
      } else {
        localList = processedNotes;
      }

      const reorderedLocal = Array.from(localList);
      const [reorderedItem] = reorderedLocal.splice(source.index, 1);
      if (!reorderedItem) return; // safety
      reorderedLocal.splice(destination.index, 0, reorderedItem);

      // Build the FULL new ordering: iterate the currently-sorted global
      // list and, whenever we hit a note that belonged to the reordered
      // slice, replace it with the next item from the new local order.
      // Every other note keeps its relative position.
      let finalOrderIds;
      if (srcCat === null) {
        // Flat / ungrouped path — the visible list IS the global list.
        finalOrderIds = reorderedLocal.map(n => n.id);
      } else {
        const localIds = new Set(localList.map(n => n.id));
        const globalSorted = [...notes].sort(
          (a, b) => ((a.order ?? 0) - (b.order ?? 0)) ||
                    ((a.created_at || "") < (b.created_at || "") ? 1 : -1)
        );
        const queue = [...reorderedLocal];
        finalOrderIds = globalSorted.map(n => (localIds.has(n.id) ? queue.shift().id : n.id));
      }

      await StorageService.reorderNotes(finalOrderIds);

      // Drag-and-drop implies "custom" sort. If the user is in a
      // different sort mode the reorder would be invisible (the view
      // would resort by date / title etc. and the item would snap back).
      // Auto-switching preserves the user's action.
      if (sortBy !== "custom") {
        setSortBy("custom");
        toast.success("Custom order enabled");
      }
      fetchData();
    } catch (err) {
      console.error("Reorder error:", err);
      toast.error("Could not move");
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
    // Lifecycle filter — hide archived and trashed from every view except
    // their dedicated "archived" / "trash" filter selections.
    if (filterBy === "archived") {
      result = result.filter(n => n.archived_at);
    } else if (filterBy === "trash") {
      result = result.filter(n => n.deleted_at);
    } else {
      result = result.filter(n => !n.archived_at && !n.deleted_at);
    }
    // Panic mode: filter to only the "safe" category (or empty view if none set)
    if (autoLock.panic) {
      const safeCat = autoLock.safeCategory || "";
      result = safeCat ? result.filter(n => (n.category || "") === safeCat) : [];
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      // Support "#tag" tokens as a direct tag filter alongside free-text search
      const tagTokens = (q.match(/#[a-z0-9_-]+/g) || []).map(t => t.slice(1));
      const rest = q.replace(/#[a-z0-9_-]+/g, "").trim();
      result = result.filter(n => {
        const tags = Array.isArray(n.tags) ? n.tags.map(x => String(x).toLowerCase()) : [];
        if (tagTokens.length && !tagTokens.every(tk => tags.includes(tk))) return false;
        if (!rest) return true;
        return (
          n.title?.toLowerCase().includes(rest) ||
          n.content?.toLowerCase().includes(rest) ||
          n.category?.toLowerCase().includes(rest) ||
          n.subcategory?.toLowerCase().includes(rest) ||
          tags.some(t => t.includes(rest))
        );
      });
    }
    if (activeTag) {
      const at = String(activeTag).toLowerCase();
      result = result.filter(n => {
        const tags = Array.isArray(n.tags) ? n.tags.map(x => String(x).toLowerCase()) : [];
        return tags.includes(at);
      });
    }
    if (filterBy !== "all" && filterBy !== "archived" && filterBy !== "trash") {
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
  }, [notes, searchQuery, filterBy, sortBy, activeTag, autoLock.panic, autoLock.safeCategory]);

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
    // Respect user-defined category order stored in settings
    const savedOrder = Array.isArray(settings?.category_order) ? settings.category_order : [];
    const entries = Array.from(map.entries());
    entries.sort(([a], [b]) => {
      const ai = savedOrder.indexOf(a);
      const bi = savedOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return { grouped: entries, uncategorized: uncat };
  }, [processedNotes, settings]);

  const pinnedNotes = useMemo(
    () => processedNotes.filter(n => n.pinned),
    [processedNotes]
  );

  // Every unique tag across active notes — used for autocomplete in NoteModal
  // and for the InsightsModal top-tag cloud.
  const allTags = useMemo(() => {
    const set = new Set();
    for (const n of notes) {
      if (n.archived_at || n.deleted_at) continue;
      const tags = Array.isArray(n.tags) ? n.tags : [];
      for (const raw of tags) {
        const t = String(raw || "").trim().toLowerCase();
        if (t) set.add(t);
      }
    }
    return Array.from(set).sort();
  }, [notes]);

  const exportToPDF = async () => {
    // Optional biometric gate before exporting
    const toggles = await SecurityService.getToggles();
    const method = await SecurityService.getMethod();
    if (toggles.requireAuthExport && method === "biometric") {
      const ok = await SecurityService.verifyBiometric();
      if (!ok) { toast.error("Authentication failed"); return; }
    }
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
        <CategoryHeader title="Pinned" notes={pinnedNotes} pinned isDark={isDark} />
        {viewMode === "icon" ? (
          <div className="notes-grid">
            {pinnedNotes.map(note => (
              <NoteTile key={note.id} note={note} onOpen={setFullScreenNote} onEdit={openEditModal} isDark={isDark} selectMode={inSelectMode} selected={isSelected(note.id)} onToggleSelect={toggleSelect} />
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
        : t("app.empty_title");
      return (
        <div className="text-center py-12">
          <div className="text-5xl mb-3 opacity-25">📝</div>
          <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{emptyCopy}</p>
          {!searchQuery && filterBy === "all" && (
            <Button onClick={() => { setEditingNote(null); setNoteModalOpen(true); haptic("tap"); }} size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> {t("app.create_first")}
            </Button>
          )}
          <p className={`text-xs mt-6 font-mono ${isDark ? 'text-slate-600' : 'text-gray-400'} hidden md:block`}>
            {t("app.shortcuts_hint")}
          </p>
        </div>
      );
    }

    if (viewMode === "icon") {
      if (groupByCategory) {
        return (
          <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Droppable droppableId="category-list-grid" type="category">
              {(catProv) => (
                <div ref={catProv.innerRef} {...catProv.droppableProps} data-testid="notes-icon-grouped">
                  {grouped.map(([cat, items], catIdx) => (
                    <Draggable key={cat} draggableId={`cat-${cat}`} index={catIdx}>
                      {(catDp, catSnap) => (
                        <div
                          ref={catDp.innerRef}
                          {...catDp.draggableProps}
                          className={`mb-5 ${catSnap.isDragging ? "opacity-90 shadow-2xl ring-2 ring-indigo-400/60 rounded-lg" : ""}`}
                        >
                          <CategoryHeader
                            title={cat}
                            notes={items}
                            isDark={isDark}
                            dragHandleProps={catDp.dragHandleProps}
                          />
                          <Droppable droppableId={`notes-in-${cat}`} type="note" direction="horizontal">
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.droppableProps}
                                className={`notes-grid rounded-lg transition-colors ${snap.isDraggingOver ? (isDark ? "ring-2 ring-indigo-400/50 bg-indigo-500/5" : "ring-2 ring-indigo-400/50 bg-indigo-50") : ""}`}
                              >
                                {items.map((note, idx) => (
                                  <Draggable key={note.id} draggableId={`note-${note.id}`} index={idx}>
                                    {(dp, ds) => (
                                      <div
                                        ref={dp.innerRef}
                                        {...dp.draggableProps}
                                        {...dp.dragHandleProps}
                                        className={ds.isDragging ? "scale-105 shadow-2xl opacity-90 rotate-1" : ""}
                                      >
                                        <NoteTile note={note} onOpen={setFullScreenNote} onEdit={openEditModal} isDark={isDark} selectMode={inSelectMode} selected={isSelected(note.id)} onToggleSelect={toggleSelect} />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {prov.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {catProv.placeholder}
                </div>
              )}
            </Droppable>
            {uncategorized.length > 0 && (
              <div>
                {grouped.length > 0 && (
                  <CategoryHeader title="Uncategorized" notes={uncategorized} isDark={isDark} />
                )}
                <Droppable droppableId="notes-in-" type="note" direction="horizontal">
                  {(prov, snap) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.droppableProps}
                      className={`notes-grid rounded-lg transition-colors ${snap.isDraggingOver ? (isDark ? "ring-2 ring-indigo-400/50 bg-indigo-500/5" : "ring-2 ring-indigo-400/50 bg-indigo-50") : ""}`}
                      data-testid="notes-icon-uncategorized"
                    >
                      {uncategorized.map((note, idx) => (
                        <Draggable key={note.id} draggableId={`note-${note.id}`} index={idx}>
                          {(dp, ds) => (
                            <div
                              ref={dp.innerRef}
                              {...dp.draggableProps}
                              {...dp.dragHandleProps}
                              className={ds.isDragging ? "scale-105 shadow-2xl opacity-90 rotate-1" : ""}
                            >
                              <NoteTile note={note} onOpen={setFullScreenNote} onEdit={openEditModal} isDark={isDark} selectMode={inSelectMode} selected={isSelected(note.id)} onToggleSelect={toggleSelect} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {prov.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )}
          </DragDropContext>
        );
      }
      return (
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Droppable droppableId="notes-grid" type="note" direction="horizontal">
            {(prov) => (
              <div ref={prov.innerRef} {...prov.droppableProps} className="notes-grid" data-testid="notes-icon-flat">
                {processedNotes.map((note, idx) => (
                  <Draggable key={note.id} draggableId={`note-${note.id}`} index={idx}>
                    {(dp, ds) => (
                      <div
                        ref={dp.innerRef}
                        {...dp.draggableProps}
                        {...dp.dragHandleProps}
                        className={ds.isDragging ? "scale-105 shadow-2xl opacity-90 rotate-1" : ""}
                      >
                        <NoteTile note={note} onOpen={setFullScreenNote} onEdit={openEditModal} isDark={isDark} selectMode={inSelectMode} selected={isSelected(note.id)} onToggleSelect={toggleSelect} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {prov.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
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
                  <Draggable key={note.id} draggableId={note.id} index={index} isDragDisabled={inSelectMode}>
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
                          selectMode={inSelectMode}
                          selected={isSelected(note.id)}
                          onToggleSelect={toggleSelect}
                          onSwipeSelect={handleSwipeSelect}
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
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Droppable droppableId="category-list" type="category">
            {(catProv) => (
              <div ref={catProv.innerRef} {...catProv.droppableProps} data-testid="notes-grouped">
                {grouped.map(([cat, items], index) => (
                  <Draggable key={cat} draggableId={`cat-${cat}`} index={index}>
                    {(prov, snap) => (
                      <div ref={prov.innerRef} {...prov.draggableProps}>
                        <CategoryGroup
                          category={cat}
                          notes={items}
                          onEdit={openEditModal}
                          onDelete={handleDeleteNote}
                          onShare={openShareModal}
                          onFullScreen={setFullScreenNote}
                          onTogglePin={handleTogglePin}
                          isDark={isDark}
                          dragHandleProps={prov.dragHandleProps}
                          isDragging={snap.isDragging}
                          selectMode={inSelectMode}
                          isSelected={isSelected}
                          onToggleSelect={toggleSelect}
                          onSwipeSelect={handleSwipeSelect}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {catProv.placeholder}
                {uncategorized.length > 0 && (
                  <Droppable droppableId="notes-in-" type="note">
                    {(uncProv, uncSnap) => (
                      <div
                        ref={uncProv.innerRef}
                        {...uncProv.droppableProps}
                        data-testid="notes-uncategorized"
                        className={`rounded-lg border p-1 mt-2 transition-colors ${
                          isDark ? "border-white/10" : "border-gray-200"
                        } ${uncSnap.isDraggingOver ? (isDark ? "bg-indigo-500/10" : "bg-indigo-50") : ""}`}
                      >
                        <div className="px-1 pt-1 pb-1">
                          <CategoryHeader title="Uncategorized" notes={uncategorized} isDark={isDark} />
                        </div>
                        {uncategorized.map((note, idx) => (
                          <Draggable key={note.id} draggableId={`note-${note.id}`} index={idx} isDragDisabled={inSelectMode}>
                            {(prov2, snap2) => (
                              <div ref={prov2.innerRef} {...prov2.draggableProps}>
                                <AccordionNoteItem
                                  note={note}
                                  onEdit={openEditModal}
                                  onDelete={handleDeleteNote}
                                  onShare={openShareModal}
                                  onFullScreen={setFullScreenNote}
                                  onTogglePin={handleTogglePin}
                                  isDark={isDark}
                                  dragHandleProps={prov2.dragHandleProps}
                                  isDragging={snap2.isDragging}
                                  selectMode={inSelectMode}
                                  selected={isSelected(note.id)}
                                  onToggleSelect={toggleSelect}
                                  onSwipeSelect={handleSwipeSelect}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {uncProv.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
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
            selectMode={inSelectMode}
            selected={isSelected(note.id)}
            onToggleSelect={toggleSelect}
            onSwipeSelect={handleSwipeSelect}
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
        <div className="relative z-10 w-full px-4 py-3 flex items-center justify-between flex-wrap gap-y-2 gap-x-3">
          <div className="flex items-center gap-3 min-w-0">
            {settings?.logo_url && (
              <a href={settings?.website_url || "#"} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <img src={settings.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-white/20" />
              </a>
            )}
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">
                {settings?.company_name || "Iron Rabbit"}
              </h1>
              {settings?.website_url && (
                <a href={settings.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-300 hover:text-white flex items-center gap-1 truncate">
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{settings.website_url.replace(/^https?:\/\//, "")}</span>
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end ml-auto" data-testid="header-icon-row">
            <Button variant="ghost" size="icon" onClick={() => { setQuickAddOpen(true); haptic("tap"); }} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" title={t("header.quick_add")} data-testid="header-quick-add"><Zap className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => { setTilePacksOpen(true); haptic("tap"); }} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" title={t("header.tile_packs")} data-testid="header-tile-packs"><Package className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={exportToPDF} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" title={t("header.export_pdf")}><Download className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={handleToggleTheme} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" title={t("header.toggle_theme")}>{isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</Button>
            <Button variant="ghost" size="icon" onClick={() => setCalculatorOpen(true)} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" title={t("header.calculator")}><Calculator className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => { setFloatingCalendarOpen(true); haptic("tap"); }} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" title={t("header.calendar")} data-testid="header-calendar"><CalendarDays className="w-4 h-4" /></Button>
            <button
              type="button"
              onClick={() => { setLanguagePickerOpen(true); haptic("tap"); }}
              className="h-8 min-w-8 px-1.5 rounded-md inline-flex items-center gap-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title={`${t("settings.language")} — ${SUPPORTED_LANGUAGES.find(l => l.code === (i18n.language || "en").split("-")[0])?.label || "English"}`}
              data-testid="header-language"
            >
              <Globe className="w-4 h-4" />
              <span className="text-base leading-none" aria-hidden="true">
                {SUPPORTED_LANGUAGES.find(l => l.code === (i18n.language || "en").split("-")[0])?.flag || "🌐"}
              </span>
            </button>
            <Button variant="ghost" size="icon" onClick={() => { setInsightsOpen(true); haptic("tap"); }} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" title="Insights" data-testid="header-insights"><BarChart3 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => { setKidModeOpen(true); haptic("tap"); }} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" title="Kid Mode" data-testid="header-kid-mode"><Baby className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setArchiveTrashOpen(true)} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" title="Archive & Trash" data-testid="archive-trash-btn"><Archive className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsModalOpen(true)} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8" title={t("header.settings")} data-testid="settings-btn"><Settings className="w-4 h-4" /></Button>
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
              placeholder={t("search.placeholder")}
              className={`pl-8 h-9 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-gray-200'}`}
              data-testid="search-input"
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
              <SelectTrigger className={`w-32 h-9 text-xs ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                <Filter className="w-3 h-3 mr-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}>
                {FILTER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs" data-testid={`filter-option-${opt.value}`}>{t(`filter.${opt.value}`, opt.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className={`w-40 h-9 text-xs ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-[#0B1221] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}>
                {SORT_OPTIONS.map(opt => {
                  const label = opt.value === "newest" ? t("sort.newest", opt.label)
                    : opt.value === "oldest" ? t("sort.oldest", opt.label)
                    : opt.value === "a-z" ? t("sort.az", opt.label)
                    : opt.value === "z-a" ? t("sort.za", opt.label)
                    : opt.label;
                  return (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      <span className="flex items-center gap-1.5"><opt.icon className="w-3 h-3" />{label}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tag filter strip (only shown when there are tags) */}
        <TagFilterStrip
          notes={notes}
          activeTag={activeTag}
          onSelectTag={(t) => { setActiveTag(t); haptic("tap"); }}
          isDark={isDark}
        />

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
            <FolderTree className="w-3.5 h-3.5" /> {t("app.groupBy")}
          </button>
          <button
            onClick={() => selectMode ? clearSelection() : enterSelectMode()}
            className={`text-xs px-3 py-1.5 rounded-md border flex items-center gap-1.5 ${
              selectMode
                ? "bg-indigo-500 border-indigo-500 text-white"
                : isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
            data-testid="select-mode-toggle"
            title={selectMode ? "Cancel selection" : "Select multiple notes"}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> {selectMode ? `Selected ${selectedIds.size}` : "Select"}
          </button>
          <div className="text-xs font-mono">{t("app.notes_count", { count: processedNotes.length })}</div>
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
        allTags={allTags}
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
        onOpenSecurity={() => setSecurityOpen(true)}
        onOpenOrganization={() => setOrganizationOpen(true)}
        onOpenQuickAccess={() => { setSettingsModalOpen(false); setQuickAccessOpen(true); }}
        onOpenBackup={() => { setSettingsModalOpen(false); setBackupOpen(true); }}
        onSyncPackColors={handleSyncPackColors}
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
      <FloatingCalendarModal
        isOpen={floatingCalendarOpen}
        onClose={() => setFloatingCalendarOpen(false)}
        notes={notes}
        onOpenNote={(noteId) => {
          const n = notes.find((x) => x.id === noteId);
          if (n) setFullScreenNote(n);
        }}
        onCreateEvent={async ({ title, datetime, alarm_enabled }) => {
          try {
            const now = new Date().toISOString();
            const maxOrder = notes.reduce((max, n) => Math.max(max, n.order || 0), 0);
            const newNote = {
              id: uuidv4(),
              title,
              content: "",
              color: "purple",
              category: "Calendar",
              order: maxOrder + 1,
              events: [{
                id: uuidv4(),
                title,
                datetime,
                alarm_enabled: !!alarm_enabled,
                notes: "",
              }],
              created_at: now,
              updated_at: now,
              last_viewed: now,
            };
            await StorageService.saveNote(newNote);
            toast.success(`Event added for ${new Date(datetime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`);
            fetchData();
          } catch (e) {
            toast.error("Could not create event");
          }
        }}
        isDark={isDark}
      />
      <FirstRunTour open={tourOpen} onDismiss={handleTourDismiss} isDark={isDark} />

      <InsightsModal
        isOpen={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        notes={notes}
        isDark={isDark}
      />

      <KidDashboardModal
        isOpen={kidModeOpen}
        onClose={() => setKidModeOpen(false)}
        notes={notes}
        onSaveNote={handleSaveInline}
        isDark={isDark}
      />

      <LanguagePicker
        isOpen={languagePickerOpen}
        onClose={() => setLanguagePickerOpen(false)}
        isDark={isDark}
      />

      <SecurityModal
        isOpen={securityOpen}
        onClose={() => { setSecurityOpen(false); autoLock.refresh(); }}
        categories={categories}
        isDark={isDark}
      />

      {/* App-lock overlay — rendered above everything when app is locked */}
      <LockScreen
        isOpen={autoLock.locked}
        onUnlock={autoLock.unlock}
        isDark={isDark}
      />

      <OrganizationModal
        isOpen={organizationOpen}
        onClose={() => setOrganizationOpen(false)}
        isDark={isDark}
      />

      <MoveToCategoryModal
        isOpen={moveToOpen}
        onClose={() => setMoveToOpen(false)}
        categories={grouped.map(([n]) => n)}
        count={selectedIds.size}
        onMove={bulkMoveTo}
        mode={settings?.dnd_prefs?.smartBatchMode || "move"}
        isDark={isDark}
      />

      <CopySuffixDialog
        isOpen={pendingCopyTarget !== null}
        onClose={() => setPendingCopyTarget(null)}
        count={selectedIds.size}
        targetCategory={pendingCopyTarget || ""}
        onConfirm={async (addSuffix) => {
          const target = pendingCopyTarget;
          setPendingCopyTarget(null);
          await bulkCopyTo(target, addSuffix);
        }}
        isDark={isDark}
      />

      <MultiSelectBar
        count={selectedIds.size}
        onClear={clearSelection}
        onOpenStudio={() => setBatchStudioOpen(true)}
        isDark={isDark}
      />

      <BatchStudioSheet
        isOpen={batchStudioOpen}
        onClose={() => setBatchStudioOpen(false)}
        count={selectedIds.size}
        mode={settings?.dnd_prefs?.smartBatchMode || "move"}
        onMoveTo={() => setMoveToOpen(true)}
        onDuplicate={bulkDuplicateInPlace}
        onTogglePin={bulkTogglePin}
        onSetColor={bulkSetColor}
        onSetAlarm={bulkSetAlarm}
        onClearAlarm={bulkClearAlarm}
        onExportPDF={bulkExportPDF}
        onDelete={() => setDeleteChoice({ ids: Array.from(selectedIds), fromBulk: true })}
        isDark={isDark}
      />

      {/* Delete choice — Archive vs Trash. Used by single delete AND bulk. */}
      <DeleteChoiceDialog
        isOpen={deleteChoice !== null}
        onClose={() => setDeleteChoice(null)}
        count={deleteChoice?.ids?.length || 0}
        retentionLabel={(() => {
          const d = settings?.trash_retention_days ?? 7;
          if (!d) return "Forever";
          if (d === 365) return "1 year";
          return `${d} days`;
        })()}
        onArchive={async () => {
          const ids = deleteChoice?.ids || [];
          const fromBulk = deleteChoice?.fromBulk;
          setDeleteChoice(null);
          await performArchive(ids);
          if (fromBulk) clearSelection();
        }}
        onTrash={async () => {
          const ids = deleteChoice?.ids || [];
          const fromBulk = deleteChoice?.fromBulk;
          setDeleteChoice(null);
          await performTrash(ids);
          if (fromBulk) clearSelection();
        }}
        isDark={isDark}
      />

      {/* Persistent floating Undo pill — stays until user acts on it */}
      <RecentActionPill
        action={recentAction}
        onUndo={undoRecentAction}
        onDismiss={() => setRecentAction(null)}
        isDark={isDark}
      />

      {/* Archive & Trash view */}
      <ArchiveTrashModal
        isOpen={archiveTrashOpen}
        onClose={() => setArchiveTrashOpen(false)}
        onDataChanged={fetchData}
        settings={settings}
        isDark={isDark}
      />

      {/* Quick Access — First-launch wizard + reopenable from Settings */}
      <QuickAccessModal
        isOpen={quickAccessOpen}
        onClose={handleCloseQuickAccess}
        canInstallPWA={!!deferredPrompt}
        onInstallPWA={handleInstallPWA}
        isDark={isDark}
      />

      {/* Offline JSON Backup & Restore */}
      <BackupRestoreModal
        isOpen={backupOpen}
        onClose={() => setBackupOpen(false)}
        onDataChanged={fetchData}
        isDark={isDark}
      />

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
