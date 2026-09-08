import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import "@/App.css";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format, isToday, isThisWeek, isThisMonth, parseISO } from "date-fns";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import { v4 as uuidv4 } from "uuid";
import * as chrono from "chrono-node";
import {
  Plus, Settings, ExternalLink, Sun, Moon,
  Download, Pin, Package, CalendarDays, Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import StorageService from "./storage/storageService";
import notificationService, { isInFocusWindow } from "./notifications/notificationService";
import NoteTile from "./components/NoteTile";
import { haptic } from "./utils/haptic";
import { presetForIcon } from "./data/quickAddTemplates";
import useLanguageSuggest from "./i18n/useLanguageSuggest";
import CategoryHeader from "./notes/CategoryHeader";
import AppHeader from "./notes/AppHeader";
import InstallPrompt from "./notes/InstallPrompt";
import { QuickGuideProvider, QuickGuideModal } from "./quickguide";
import WeeklyDigest from "./notes/WeeklyDigest";
import AppSearchBar from "./notes/AppSearchBar";
import { useEffectiveGridColumns } from "./notes/TilesColumnsButton";
import FeaturedTipStrip from "./notes/FeaturedTipStrip";
import UpcomingAlarmsRail from "./notes/UpcomingAlarmsRail";
import AppModals from "./notes/AppModals";
import ThemeChooserModal from "./onboarding/ThemeChooserModal";
import { brightnessToText, brightnessToBg } from "./notes/BrightnessSliders";
import { isScreenshotMode } from "./utils/screenshotMode";
import { TILE_PACKS } from "./data/tilePacks";
import useBulkActions from "./hooks/useBulkActions";
import useAutoLock from "./security/useAutoLock";
import SecurityService from "./security/SecurityService";
import { SUPPORTED_LANGUAGES } from "./i18n";
import { maybeShowWeeklyRecap } from "./utils/weeklyRecap";
import { maybeShowWeeklyChoreSummary } from "./utils/weeklyChoreSummary";
import { maybeShowPantryAlerts } from "./utils/pantryAlerts";
import { maybeShowStreakRecoveryNudge } from "./utils/streakRecoveryNudge";
import { maybeOfferYearWrap } from "./utils/yearWrapOffer";

import { NOTE_COLORS, DEFAULT_TEMPLATES } from "./notes/constants";
import AccordionNoteItem from "./notes/AccordionNoteItem";
import CategoryGroup from "./notes/CategoryGroup";
import PhotoLightbox from "./components/PhotoLightbox";
import YearlyWrapStoryModal from "./components/YearlyWrapStoryModal";
import { KIOSK_MODE_KEY } from "./notes/RestaurantsGaloreDashboardModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Root Notes App (routed at `/`).
 * Owns app-wide state and orchestrates the extracted view/modal components
 * living in ./notes/*.
 */
export default function NotesApp() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
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
  const [storageCleanupOpen, setStorageCleanupOpen] = useState(false);
  const [storageCleanupSmart, setStorageCleanupSmart] = useState(false);
  const [fullScreenNote, setFullScreenNote] = useState(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [tilePacksOpen, setTilePacksOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [kidModeOpen, setKidModeOpen] = useState(false);
  const [shoppingModeOpen, setShoppingModeOpen] = useState(false);
  const [tripJournalOpen, setTripJournalOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [mealPlannerOpen, setMealPlannerOpen] = useState(false);
  const [pantryOpen, setPantryOpen] = useState(false);
  const [restaurantsGaloreOpen, setRestaurantsGaloreOpen] = useState(false);
  const [restaurantDirectoryOpen, setRestaurantDirectoryOpen] = useState(false);
  const [restaurantMenusOpen, setRestaurantMenusOpen] = useState(false);
  const [restaurantMealsOpen, setRestaurantMealsOpen] = useState(false);
  const [restaurantOrdersOpen, setRestaurantOrdersOpen] = useState(false);
  // Optional filter passed to the Orders modal — set by the sparkline tap.
  const [restaurantOrdersInitialMonth, setRestaurantOrdersInitialMonth] = useState(null);
  // Wall Mode / Kiosk — the fullscreen Photo Journal slideshow launched on
  // cold-start when localStorage[KIOSK_MODE_KEY] is "1".
  const [kioskImages, setKioskImages] = useState([]);
  const [kioskOpen, setKioskOpen] = useState(false);
  // Year Wrap Story — auto-offered on new-year cold-start (via toast action
  // dispatching `rg:open-year-wrap`).
  const [yearWrapOpen, setYearWrapOpen] = useState(null);
  const [restaurantSpendingOpen, setRestaurantSpendingOpen] = useState(false);
  const [restaurantCouponsOpen, setRestaurantCouponsOpen] = useState(false);
  const [restaurantReviewsOpen, setRestaurantReviewsOpen] = useState(false);
  const [restaurantDeliveryOpen, setRestaurantDeliveryOpen] = useState(false);
  const [restaurantStaffOpen, setRestaurantStaffOpen] = useState(false);
  const [restaurantWishlistOpen, setRestaurantWishlistOpen] = useState(false);
  const [restaurantPhotosOpen, setRestaurantPhotosOpen] = useState(false);
  const [restaurantVoiceOpen, setRestaurantVoiceOpen] = useState(false);
  const [restaurantSearchOpen, setRestaurantSearchOpen] = useState(false);
  const [restaurantBeveragesOpen, setRestaurantBeveragesOpen] = useState(false);
  const [restaurantDessertsOpen, setRestaurantDessertsOpen] = useState(false);
  const [restaurantAIOpen, setRestaurantAIOpen] = useState(false);
  const [restaurantBackupOpen, setRestaurantBackupOpen] = useState(false);
  const [restaurantSmartOpen, setRestaurantSmartOpen] = useState(false);
  const [restaurantRecipesOpen, setRestaurantRecipesOpen] = useState(false);
  const [restaurantFamilyOpen, setRestaurantFamilyOpen] = useState(false);
  const [restaurantShoppingOpen, setRestaurantShoppingOpen] = useState(false);
  const [restaurantMealPlanOpen, setRestaurantMealPlanOpen] = useState(false);
  const [floatingCalendarOpen, setFloatingCalendarOpen] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [organizationOpen, setOrganizationOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [themeChooserOpen, setThemeChooserOpen] = useState(false);
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

  // Cross-component nav — sparkline dots in the Live Stats tile broadcast
  // "rg:open-orders" with the target { year, month }. We open the Orders
  // modal and hand the filter through as `initialMonth`.
  useEffect(() => {
    const onOpenOrders = (e) => {
      const detail = e?.detail || null;
      if (detail && Number.isInteger(detail.year) && Number.isInteger(detail.month)) {
        setRestaurantOrdersInitialMonth({ year: detail.year, month: detail.month });
      } else {
        setRestaurantOrdersInitialMonth(null);
      }
      setRestaurantsGaloreOpen(false);
      setRestaurantOrdersOpen(true);
    };
    window.addEventListener("rg:open-orders", onOpenOrders);
    return () => window.removeEventListener("rg:open-orders", onOpenOrders);
  }, []);

  // Year Wrap — the auto-offer toast dispatches this event when the user
  // taps "View wrap". Also fired by the toast/action inside components.
  useEffect(() => {
    const onOpenYearWrap = (e) => {
      const yr = e?.detail?.year;
      if (Number.isInteger(yr)) setYearWrapOpen(yr);
    };
    window.addEventListener("rg:open-year-wrap", onOpenYearWrap);
    return () => window.removeEventListener("rg:open-year-wrap", onOpenYearWrap);
  }, []);

  // Flip shadcn CSS vars for light mode so all Radix components (Badge, Button
  // variant="outline", Popover, Dialog etc.) render with dark text on light
  // surfaces even when they portal outside the app container.
  useEffect(() => {
    document.body.classList.toggle('nx-light', !isDark);
    return () => document.body.classList.remove('nx-light');
  }, [isDark]);

  // Follow the user's explicit theme choice only. If they've never tapped
  // the sun/moon toggle, we default to DARK mode (Iron Rabbit's brand
  // aesthetic) rather than following the OS `prefers-color-scheme` —
  // several UI surfaces (wallpaper, headers, note tiles) are hard-styled
  // for dark backdrops, so honouring a light OS preference produced
  // hybrid rendering (dark chrome + light-mode text colours on note
  // expands). One source of truth: `settings.theme_preference`.
  useEffect(() => {
    if (!settings) return undefined;
    if (settings.theme_preference) {
      setIsDark(settings.theme_preference === 'dark');
      return undefined;
    }
    // Settings loaded but no explicit preference → force dark default
    // AND surface the one-time Choose-Your-Theme picker (unless
    // already dismissed or `?screenshot=1` is set).
    setIsDark(true);
    if (settings.theme_chooser_seen || isScreenshotMode()) return undefined;
    const t = setTimeout(() => setThemeChooserOpen(true), 400);
    // CRITICAL: return cleanup so that if `settings` changes again
    // before the timeout fires (which happens during load when the
    // settings object is hydrated in phases), we cancel the pending
    // reopen. Without this the modal would reopen after the user hit
    // the X button because a stale timeout was still queued.
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.theme_preference, settings?.theme_chooser_seen, !!settings]);

  const handleThemeChooserPick = async (choice) => {
    setThemeChooserOpen(false);
    const next = { ...(settings || {}), theme_preference: choice, theme_chooser_seen: true };
    await StorageService.saveSettings(next);
    setSettings(next);
    setIsDark(choice === "dark");
  };

  // Uncategorized section collapse — the Uncategorized "Sparkles" header
  // on the home page (grid & list views) is now tappable to fold the
  // notes underneath into the header, matching the behaviour of normal
  // named categories. Persisted per-device in localStorage.
  const [uncategorizedOpen, setUncategorizedOpen] = useState(() => {
    try {
      const v = localStorage.getItem("ir_uncategorized_open");
      return v === null ? true : v === "1";
    } catch { return true; }
  });
  const toggleUncategorized = () => {
    setUncategorizedOpen((v) => {
      const next = !v;
      try { localStorage.setItem("ir_uncategorized_open", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  // Q8: Tile Pack accordion — Grid view only. Setting lives at
  // `settings.pack_accordion_mode`: "off" | "open" | "closed". Off keeps the
  // legacy always-visible behaviour; open/closed set the initial fold state
  // and the user can then toggle each pack section individually. Toggle
  // state is persisted per-device in localStorage under "ir_pack_open".
  const [packOpenState, setPackOpenState] = useState(() => {
    try {
      const raw = localStorage.getItem("ir_pack_open");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const togglePackOpen = (key) => {
    setPackOpenState((prev) => {
      const currentIsOpen = key in prev
        ? prev[key]
        : ((settings?.pack_accordion_mode || "off") !== "closed");
      const next = { ...prev, [key]: !currentIsOpen };
      try { localStorage.setItem("ir_pack_open", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const isPackOpen = (key) => {
    if (key in packOpenState) return packOpenState[key];
    return (settings?.pack_accordion_mode || "off") !== "closed";
  };

  // Persist BrightnessSliders values to settings. Called by all three
  // scoped surfaces (Home body, NoteModal quick-text, FullScreenNote
  // expanded-text). Uses a debounce via requestAnimationFrame so drag
  // updates don't hammer StorageService.
  //
  // 🔒 LOCKED (Home Page brightness — flush-on-hide added 2026-02-27 with pw 2020)
  // A pending save is kept in `brightnessSavePending` so we can flush it
  // synchronously when the tab becomes hidden / the page is about to
  // unload — mobile browsers pause `setTimeout` when backgrounded,
  // which used to eat the last slider drag before it reached disk.
  const brightnessSaveTimer = useRef(null);
  const brightnessSavePending = useRef(null); // holds the latest `merged` awaiting save
  const flushBrightnessSave = () => {
    if (brightnessSavePending.current) {
      const pending = brightnessSavePending.current;
      brightnessSavePending.current = null;
      if (brightnessSaveTimer.current) {
        clearTimeout(brightnessSaveTimer.current);
        brightnessSaveTimer.current = null;
      }
      StorageService.saveSettings(pending).catch(() => {});
    }
  };
  const handleBrightnessChange = (next) => {
    const merged = { ...(settings || {}), ui_brightness: next };
    setSettings(merged);
    brightnessSavePending.current = merged;
    if (brightnessSaveTimer.current) clearTimeout(brightnessSaveTimer.current);
    brightnessSaveTimer.current = setTimeout(() => {
      brightnessSavePending.current = null;
      brightnessSaveTimer.current = null;
      StorageService.saveSettings(merged).catch(() => {});
    }, 250);
  };
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") flushBrightnessSave(); };
    const onPageHide = () => flushBrightnessSave();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
      flushBrightnessSave(); // Also flush on component unmount just in case.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (isScreenshotMode()) return;  // suppress for App/Play Store screenshot capture
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

  // Wire the 90% "Smart Cleanup" toast action to open the Storage Cleanup
  // Wizard in smart-preselect mode. Registered once on mount.
  useEffect(() => {
    let cancelled = false;
    import("./storage/storageWarnings").then((m) => {
      if (cancelled) return;
      m.registerSmartCleanupHandler(() => {
        setStorageCleanupSmart(true);
        setStorageCleanupOpen(true);
      });
    }).catch(() => { /* ignore */ });
    return () => {
      cancelled = true;
      import("./storage/storageWarnings")
        .then((m) => m.registerSmartCleanupHandler(null))
        .catch(() => { /* ignore */ });
    };
  }, []);

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
      // Apply user-adjusted attachment limits (images/files/MB) at boot
      if (settingsData?.attachment_limits) {
        StorageService.configureAttachmentLimits(settingsData.attachment_limits);
      }
      setCategories(catsData);
      setStorageInfo(storageData);
      // Warn once per session if we're already at 80%+ of device quota
      import("./storage/storageWarnings").then(m => m.checkStorageQuota()).catch(() => {});
      if (templatesData.length > 0) setTemplates(templatesData);

      // First-run tour: show once, when there are no notes AND user has never
      // completed/dismissed the tour. Suppressed by `?screenshot=1`.
      if (settingsData && !settingsData.tour_completed && notesData.length === 0 && !isScreenshotMode()) {
        setTimeout(() => setTourOpen(true), 800);
      }

      // Weekly recap: fires a local notification if it's Sunday & not already
      // sent this week. Silently no-ops otherwise.
      maybeShowWeeklyRecap(notesData);
      maybeShowWeeklyChoreSummary(notesData);
      maybeShowPantryAlerts();
      maybeShowStreakRecoveryNudge();
      maybeOfferYearWrap();

      // Restaurants Galore — run scheduled backup if it's overdue
      // (weekly/monthly per user preference). Silently no-ops otherwise.
      try {
        const { runScheduledBackupIfDue } = await import("./notes/rg/RestaurantWorkspacesP5");
        const result = await runScheduledBackupIfDue();
        if (result?.ran) {
          const suffix = result.encrypted ? " (encrypted)" : "";
          toast.success(`Auto-backup saved to ${result.target}${suffix}`);
        }
      } catch (e) {
        // Non-fatal — user can still back up manually
        console.warn("Auto-backup check failed", e);
      }

      // Wall Mode / Kiosk cold-start — if the user has flipped the toggle in
      // Restaurants Galore, auto-launch the Photo Journal slideshow. Guarded
      // by a session-scoped flag so we only fire once per app cold-start
      // (not on every hot reload or focus event).
      try {
        const kioskOn = localStorage.getItem(KIOSK_MODE_KEY) === "1";
        const alreadyFired = sessionStorage.getItem("iron_rabbit_rg_kiosk_fired_v1") === "1";
        if (kioskOn && !alreadyFired && !isScreenshotMode()) {
          sessionStorage.setItem("iron_rabbit_rg_kiosk_fired_v1", "1");
          // Prefer the "Photo Journal" tile — fall back to any note flagged
          // as a photo_mosaic special action (e.g. Menu Snapshot Gallery).
          const journal =
            notesData.find((n) => n?.title === "Photo Journal" && Array.isArray(n?.attachments) && n.attachments.length > 0) ||
            notesData.find((n) => n?.special_action === "photo_mosaic" && Array.isArray(n?.attachments) && n.attachments.some((a) => (a.type || "").startsWith("image/")));
          const imgs = (journal?.attachments || []).filter((a) => (a.type || "").startsWith("image/"));
          if (imgs.length > 0) {
            setKioskImages(imgs);
            // Small delay so the app has a chance to paint before we cover
            // the whole viewport with the lightbox.
            setTimeout(() => setKioskOpen(true), 400);
          } else {
            toast("Wall Mode is on, but Photo Journal has no photos yet.", {
              description: "Add photos to the Photo Journal tile to fill the slideshow.",
              duration: 4200,
            });
          }
        }
      } catch (e) {
        console.warn("Kiosk auto-launch skipped", e);
      }
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

  // Push the Focus Mode config (manual toggle + Focus-Now timer +
  // per-day schedule) into the notification service every time any of
  // them changes so the next alarm honours the latest state without
  // waiting for a service tick.
  useEffect(() => {
    notificationService.setFocusConfig({
      manual: !!settings?.focus_mode,
      until: (typeof settings?.focus_until === "number" && Number.isFinite(settings?.focus_until)) ? settings.focus_until : null,
      schedule: settings?.focus_schedule || null,
    });
  }, [settings?.focus_mode, settings?.focus_until, settings?.focus_schedule]);

  // Force a re-render every 30s so home-page brightness (which depends
  // on `notificationService.isFocusActive()`) can flip when a scheduled
  // window opens/closes or the Focus-Now timer elapses.
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setFocusTick((t) => t + 1), 30 * 1000);
    return () => clearInterval(iv);
  }, []);

  // Effective brightness for the home page. Night Visuals overrides the
  // saved home-page sliders whenever Focus Mode is active — the user's
  // per-note brightness is preserved (this only fills in for surfaces
  // that already fell back to the global default).
  //
  // We compute the active state LOCALLY from settings (mirrors the
  // notification-service logic) instead of calling
  // `notificationService.isFocusActive()` because `useMemo` runs during
  // render while `setFocusConfig` fires in a post-commit `useEffect` —
  // reading the service here would use a stale config on the first
  // render after a settings change and the chip / dim would lag one
  // render behind.
  const focusActiveNow = useMemo(() => {
    if (settings?.focus_mode) return true;
    if (typeof settings?.focus_until === "number"
        && Number.isFinite(settings.focus_until)
        && Date.now() < settings.focus_until) return true;
    return isInFocusWindow(new Date(), settings?.focus_schedule);
  }, [
    settings?.focus_mode, settings?.focus_until, settings?.focus_schedule, focusTick,
  ]);
  const effectiveBrightness = useMemo(() => {
    const nv = settings?.focus_night_visuals;
    if (focusActiveNow && nv && nv.enabled && nv.ui_brightness) return nv.ui_brightness;
    return settings?.ui_brightness;
  }, [focusActiveNow, settings?.focus_night_visuals, settings?.ui_brightness]);

  // Handle alarm actions coming back from the Service Worker (either
  // via `postMessage` when the app was already open, or via URL params
  // when a cold-launch was needed). Powers the "Snooze 5m" and
  // "Turn off" buttons on the OS notification banner.
  useEffect(() => {
    const handleAlarmAction = (action, noteId) => {
      if (!noteId) return;
      if (action === "dismiss") {
        notificationService.dismissAlarm(noteId);
      } else if (action === "snooze-5") {
        notificationService.snoozeAlarm(noteId, 5);
      } else if (action === "snooze-60") {
        notificationService.snoozeAlarm(noteId, 60);
      }
    };
    // 1) SW → open tab, via postMessage
    const onMsg = (e) => {
      if (e?.data?.type === "ALARM_ACTION") {
        handleAlarmAction(e.data.action, e.data.noteId);
      }
    };
    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", onMsg);
    }
    // 2) Cold-launch URL params (?alarm-action=…&alarm-note=…)
    try {
      const url = new URL(window.location.href);
      const action = url.searchParams.get("alarm-action");
      const noteId = url.searchParams.get("alarm-note");
      if (action && noteId) {
        handleAlarmAction(action, noteId);
        url.searchParams.delete("alarm-action");
        url.searchParams.delete("alarm-note");
        window.history.replaceState({}, "", url.toString());
      }
    } catch { /* ignore */ }
    return () => {
      if (typeof navigator !== "undefined" && navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener("message", onMsg);
      }
    };
  }, []);

  // Auto-backup — silently exports a weekly JSON when opted-in.
  // Delayed ~5s so it never competes with cold-boot rendering.
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { maybeRunAutoBackup } = await import("./storage/autoBackup");
        const result = await maybeRunAutoBackup();
        if (result.ran) {
          toast.success("Weekly backup saved to Downloads", { duration: 6000 });
        }
      } catch (e) {
        // Silent — auto-backup should never surface an error toast
      }
    }, 5000);
    return () => clearTimeout(t);
  }, []);

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
      // Only runs on BRAND-NEW notes (no noteId) that don't already
      // have an alarm configured, and never when the user has
      // deliberately toggled the alarm OFF (`enabled === false`). This
      // is what prevents the "toggle off → save → alarm comes back on
      // because chrono re-parsed the title" bug: on edits we now
      // respect the user's explicit choices verbatim. Users can also
      // disable auto-detection globally via Settings → Reminders.
      const enriched = { ...noteData };
      const isEdit = !!noteId;
      const userTurnedOff = noteData.alarm && noteData.alarm.enabled === false;
      const alreadyHasAlarm = !!noteData.alarm?.datetime;
      let autoDetectDisabled = false;
      try { autoDetectDisabled = localStorage.getItem("ir_auto_detect_reminders") === "0"; }
      catch { /* localStorage blocked → assume enabled (opt-in default) */ }
      const shouldAutoDetect = !isEdit && !userTurnedOff && !alreadyHasAlarm && !autoDetectDisabled;
      if (shouldAutoDetect && noteData.title) {
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

  // 🔒 LOCKED (star-mode expanded text) — see /app/memory/LOCKED_SURFACES.md
  // Password required to modify: 2020
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

  const handleGridColumnsChange = async (nextGridColumns) => {
    // Optimistic UI — persist to IndexedDB in the background.
    setSettings((prev) => ({ ...prev, grid_columns: nextGridColumns }));
    try {
      const updated = await StorageService.saveSettings({ grid_columns: nextGridColumns });
      setSettings(updated);
    } catch {
      /* non-fatal */
    }
  };

  // Effective column count for the currently-active viewport class.
  // Falls back to the fluid `.notes-grid` behaviour when the user has
  // never customised (initial gridColumns is undefined).
  const effectiveGridColumns = useEffectiveGridColumns(settings?.grid_columns);
  // Inline-style spread applied to every `.notes-grid` render — only
  // sets grid-template-columns when the user has actively customised;
  // otherwise stays empty so the fluid auto-fill CSS keeps working.
  const gridStyle = effectiveGridColumns
    ? { gridTemplateColumns: `repeat(${effectiveGridColumns}, minmax(0, 1fr))` }
    : undefined;
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

  // Modifier-key state during drag. Hold ⌘ / Ctrl while dropping across
  // packs to switch the default COPY behaviour into a MOVE. The ref is
  // updated by a window-level key listener (below) so drag-end can read
  // the live value without state-timing races.
  const modifierHeldRef = useRef(false);
  useEffect(() => {
    const onKey = (e) => {
      modifierHeldRef.current = !!(e.metaKey || e.ctrlKey);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

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
    bulkExportMarkdown,
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
        // IMPORTANT: await fetchData() so the settings state (and therefore
        // the `grouped` memo dependent on it) is fully re-hydrated before
        // React re-renders. Previously this was fire-and-forget, causing
        // the toast to appear while the DOM still showed stale order.
        await fetchData();
        haptic("success");
        toast.success(`Moved "${moved}"`);
        return;
      }

      // 2) NOTE MOVE
      const noteId = draggableId.replace(/^note-/, "");
      const CAT_PREFIX = "notes-in-";
      const NESTED_PREFIX = "notes-at-path::";
      const NESTED_SEP = "|";

      // 2a) NESTED-PATH DROP — dropped INSIDE a deep sub-group. Rewrite
      // the note's `category_path` (and legacy category/subcategory) to
      // match the destination sub-group's full path.
      if (destination.droppableId.startsWith(NESTED_PREFIX)) {
        const dstPath = destination.droppableId
          .slice(NESTED_PREFIX.length)
          .split(NESTED_SEP)
          .map((s) => s.replace("/", NESTED_SEP)) // reverse of encode
          .filter((s) => s && s.trim());
        // No-op if source is exactly the same path
        const srcPath = source.droppableId.startsWith(NESTED_PREFIX)
          ? source.droppableId.slice(NESTED_PREFIX.length).split(NESTED_SEP)
          : null;
        if (srcPath && srcPath.join("\u241E") === dstPath.join("\u241E")) return;

        const original = notes.find((n) => n.id === noteId);
        if (!original) return;
        const prevPath = Array.isArray(original.category_path) && original.category_path.length > 0
          ? original.category_path
          : [original.category, original.subcategory].filter((s) => s && String(s).trim());

        await StorageService.saveNote({
          ...original,
          category: dstPath[0] || "",
          subcategory: dstPath[1] || "",
          category_path: dstPath,
          updated_at: new Date().toISOString(),
        });
        await fetchData();
        haptic("success");
        toast.success(`Moved to "${dstPath.join(" › ")}"`, {
          action: {
            label: "Undo",
            onClick: async () => {
              const back = await StorageService.getNote(noteId);
              if (!back) return;
              await StorageService.saveNote({
                ...back,
                category: prevPath[0] || "",
                subcategory: prevPath[1] || "",
                category_path: prevPath,
                updated_at: new Date().toISOString(),
              });
              fetchData();
            },
          },
          duration: 6000,
        });
        return;
      }

      const srcCat = source.droppableId.startsWith(CAT_PREFIX) ? source.droppableId.slice(CAT_PREFIX.length) : null;
      const dstCat = destination.droppableId.startsWith(CAT_PREFIX) ? destination.droppableId.slice(CAT_PREFIX.length) : null;

      // Cross-category tile drag. DEFAULT = COPY (original stays, new
      // duplicate lands in the destination). Hold ⌘ (Mac) or Ctrl
      // (Windows/Linux) at drop time to switch to MOVE. Move is still
      // available via NoteModal → Category field or Batch Studio → Move.
      if (srcCat !== null && dstCat !== null && srcCat !== dstCat) {
        const original = notes.find(n => n.id === noteId);
        if (!original) return;
        const wantMove = modifierHeldRef.current === true;

        if (wantMove) {
          const prev = await StorageService.moveNoteToCategory(noteId, dstCat, "");
          await fetchData();
          toast.success(`Moved to "${dstCat}"`, {
            action: prev ? {
              label: "Undo",
              onClick: async () => {
                await StorageService.moveNoteToCategory(noteId, prev.category, prev.subcategory);
                fetchData();
              },
            } : undefined,
            duration: 6000,
          });
          return;
        }

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
        await fetchData();
        toast.success(`Copied to "${dstCat}" · Hold ⌘/Ctrl to move`, {
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

  // Every unique nested category path across active notes — powers the
  // depth-aware suggestions in the CategoryPathAccordion inside NoteModal.
  // We deduplicate by joined string but return the underlying arrays.
  const existingPaths = useMemo(() => {
    const seen = new Map();
    for (const n of notes) {
      if (n.archived_at || n.deleted_at) continue;
      const modern = Array.isArray(n.category_path) ? n.category_path : null;
      const legacy = [n.category, n.subcategory].filter((s) => s && String(s).trim());
      const path = (modern && modern.length > 0 ? modern : legacy)
        .map((s) => String(s || "").trim())
        .filter(Boolean);
      if (path.length === 0) continue;
      const key = path.join("\u241E");
      if (!seen.has(key)) seen.set(key, path);
    }
    return Array.from(seen.values());
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

  const openEditModal            = (note) => {
    // Launcher tiles bypass the note editor and jump straight into the
    // corresponding dedicated workspace. We also detect it via the
    // pack_id + title combo so existing installs work without re-applying.
    if (
      note?.special_action === "open_restaurants_galore" ||
      (note?.pack_id === "restaurants-galore" && note?.title === "Restaurants Galore")
    ) {
      setRestaurantsGaloreOpen(true);
      haptic("tap");
      return;
    }
    setEditingNote(note); setNoteModalOpen(true);
  };
  const openFullScreen           = (note) => {
    // Route full-screen taps on launcher tiles to the workspace too.
    if (
      note?.special_action === "open_restaurants_galore" ||
      (note?.pack_id === "restaurants-galore" && note?.title === "Restaurants Galore")
    ) {
      setRestaurantsGaloreOpen(true);
      haptic("tap");
      return;
    }
    setFullScreenNote(note);
  };
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
          <div className="notes-grid" style={gridStyle}>
            {pinnedNotes.map(note => (
              <NoteTile key={note.id} note={note} onOpen={openFullScreen} onEdit={openEditModal} isDark={isDark} selectMode={inSelectMode} selected={isSelected(note.id)} onToggleSelect={toggleSelect} />
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
                onFullScreen={openFullScreen}
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
          {/* Rusty rabbit greets the user in place of a generic 📝
              emoji so empty views feel on-brand instead of default. */}
          <img
            src="/icon-192.png"
            alt="Iron Rabbit"
            className="mx-auto mb-4 w-20 h-20 opacity-70 select-none"
            style={{ filter: "drop-shadow(0 8px 24px rgba(180, 90, 40, 0.25))" }}
            data-testid="empty-state-rabbit"
          />
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
                      {(catDp, catSnap) => {
                        // Q8 accordion — only wire toggle when the setting is
                        // on AND this category has notes from a Tile Pack.
                        const accordionMode = settings?.pack_accordion_mode || "off";
                        const hasPack = items.some((n) => n?.pack_id);
                        const useAccordion = accordionMode !== "off" && hasPack;
                        const packKey = items.find((n) => n?.pack_id)?.pack_id || cat;
                        const open = useAccordion ? isPackOpen(packKey) : true;
                        return (
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
                            onToggle={useAccordion ? () => togglePackOpen(packKey) : undefined}
                            isOpen={useAccordion ? open : undefined}
                          />
                          <Droppable droppableId={`notes-in-${cat}`} type="note">
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.droppableProps}
                                className={`notes-grid rounded-lg transition-colors ${snap.isDraggingOver ? (isDark ? "ring-2 ring-indigo-400/50 bg-indigo-500/5" : "ring-2 ring-indigo-400/50 bg-indigo-50") : ""} ${useAccordion && !open ? "hidden" : ""}`}
                                style={gridStyle}
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
                                        <NoteTile note={note} onOpen={openFullScreen} onEdit={openEditModal} isDark={isDark} selectMode={inSelectMode} selected={isSelected(note.id)} onToggleSelect={toggleSelect} />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {prov.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                        );
                      }}
                    </Draggable>
                  ))}
                  {catProv.placeholder}
                </div>
              )}
            </Droppable>
            {uncategorized.length > 0 && (
              <div>
                {grouped.length > 0 && (
                  <CategoryHeader
                    title="Uncategorized"
                    notes={uncategorized}
                    isDark={isDark}
                    onToggle={toggleUncategorized}
                    isOpen={uncategorizedOpen}
                  />
                )}
                <Droppable droppableId="notes-in-" type="note">
                  {(prov, snap) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.droppableProps}
                      className={`notes-grid rounded-lg transition-colors ${snap.isDraggingOver ? (isDark ? "ring-2 ring-indigo-400/50 bg-indigo-500/5" : "ring-2 ring-indigo-400/50 bg-indigo-50") : ""} ${grouped.length > 0 && !uncategorizedOpen ? "hidden" : ""}`}
                      style={gridStyle}
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
                              <NoteTile note={note} onOpen={openFullScreen} onEdit={openEditModal} isDark={isDark} selectMode={inSelectMode} selected={isSelected(note.id)} onToggleSelect={toggleSelect} />
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
          <Droppable droppableId="notes-grid" type="note">
            {(prov) => (
              <div ref={prov.innerRef} {...prov.droppableProps} className="notes-grid" style={gridStyle} data-testid="notes-icon-flat">
                {processedNotes.map((note, idx) => (
                  <Draggable key={note.id} draggableId={`note-${note.id}`} index={idx}>
                    {(dp, ds) => (
                      <div
                        ref={dp.innerRef}
                        {...dp.draggableProps}
                        {...dp.dragHandleProps}
                        className={ds.isDragging ? "scale-105 shadow-2xl opacity-90 rotate-1" : ""}
                      >
                        <NoteTile note={note} onOpen={openFullScreen} onEdit={openEditModal} isDark={isDark} selectMode={inSelectMode} selected={isSelected(note.id)} onToggleSelect={toggleSelect} />
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
                          onFullScreen={openFullScreen}
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
                          onFullScreen={openFullScreen}
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
                          <CategoryHeader
                            title="Uncategorized"
                            notes={uncategorized}
                            isDark={isDark}
                            onToggle={toggleUncategorized}
                            isOpen={uncategorizedOpen}
                          />
                        </div>
                        <div className={uncategorizedOpen ? "" : "hidden"}>
                        {uncategorized.map((note, idx) => (
                          <Draggable key={note.id} draggableId={`note-${note.id}`} index={idx} isDragDisabled={inSelectMode}>
                            {(prov2, snap2) => (
                              <div ref={prov2.innerRef} {...prov2.draggableProps}>
                                <AccordionNoteItem
                                  note={note}
                                  onEdit={openEditModal}
                                  onDelete={handleDeleteNote}
                                  onShare={openShareModal}
                                  onFullScreen={openFullScreen}
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
            onFullScreen={openFullScreen}
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
    <QuickGuideProvider>
    <div
      className={`ir-app-shell transition-colors duration-300 ${isDark ? 'bg-[#020617]' : 'bg-gray-50'}`}
      data-testid="app-container"
    >
      <Toaster position="bottom-right" theme={isDark ? "dark" : "light"} />
      <QuickGuideModal isDark={isDark} />
      <WeeklyDigest notes={notes} />
      <InstallPrompt isDark={isDark} />

      {/* Compact Header (extracted) */}
      <AppHeader
        isDark={isDark}
        settings={settings}
        notes={notes}
        hasActiveGrocery={notes.some(n =>
          (n.category === "Grocery" || (Array.isArray(n.tags) && n.tags.includes("grocery")))
          && !n.archived_at && !n.deleted_at
        )}
        onQuickAdd={() => setQuickAddOpen(true)}
        onTilePacks={() => setTilePacksOpen(true)}
        onExportPdf={exportToPDF}
        onToggleTheme={handleToggleTheme}
        onOpenThemeChooser={() => setThemeChooserOpen(true)}
        onCalculator={() => setCalculatorOpen(true)}
        onCalendar={() => setFloatingCalendarOpen(true)}
        onLanguagePicker={() => setLanguagePickerOpen(true)}
        onInsights={() => setInsightsOpen(true)}
        onKidMode={() => setKidModeOpen(true)}
        onShoppingMode={() => setShoppingModeOpen(true)}
        onMealPlanner={() => setMealPlannerOpen(true)}
        onPantry={() => setPantryOpen(true)}
        onBarcode={() => setBarcodeOpen(true)}
        onTripJournal={() => setTripJournalOpen(true)}
        onRestaurantsGalore={() => setRestaurantsGaloreOpen(true)}
        onArchiveTrash={() => setArchiveTrashOpen(true)}
        onSettings={() => setSettingsModalOpen(true)}
        onDashboard={() => navigate("/dashboard")}
        uiBrightness={settings?.ui_brightness}
        onBrightnessChange={handleBrightnessChange}
        focusStatus={{
          active: focusActiveNow,
          manual: !!settings?.focus_mode,
          until: (typeof settings?.focus_until === "number" && Number.isFinite(settings?.focus_until) && Date.now() < settings.focus_until) ? settings.focus_until : null,
          scheduleActive: !settings?.focus_mode && !(typeof settings?.focus_until === "number" && Date.now() < settings.focus_until) && focusActiveNow,
        }}
        onCancelFocus={() => {
          // One-tap "kill Focus" from the header pill. Clears both the
          // manual toggle AND the Focus-Now timer so the pill goes
          // away immediately. Schedule is left alone — user's clearly
          // told us they want quiet later; we just override the
          // current window until the schedule's next start boundary.
          const next = { ...(settings || {}), focus_mode: false, focus_until: 0 };
          handleSaveSettings(next);
        }}
      />

      {/* 🔒 LOCKED (Home Page brightness) — see /app/memory/LOCKED_SURFACES.md
          Password required to modify: 2020
          Do NOT alter the wrapper div, the underlay div, the <main>'s
          `background`/`color`/`--ir-text` inline style, or the
          `ir-brightness-scope` class without an explicit unlock. The
          matching CSS rule lives in `index.css` under the same lock. */}
      {/* Main Content — brightness sliders on the home page.
          The `<main>` sits on the near-black app-container so a raw
          "transparent" state looked identical to opaque black. We wrap
          it in a positioned container with a subtle light underlay
          (visible in dark mode only) so BG=0 → main paints opaque black
          over the underlay, and BG=100% → main goes transparent and the
          underlay shows through. Result: a visible dim→bright fade
          scoped to the notes area, not the surrounding chrome.
          The text colour is exposed as the `--ir-text` CSS custom
          property so a targeted rule in `index.css` can force it onto
          note titles / meta text that would otherwise be locked to
          their Tailwind colour classes. */}
      <div className="relative flex-1 flex flex-col">
        <div
          aria-hidden="true"
          className={`absolute inset-0 pointer-events-none ${isDark ? 'bg-white/[0.08]' : 'bg-black/[0.03]'}`}
          data-testid="home-brightness-underlay"
        />
        <main
          className="relative ir-app-main ir-brightness-scope"
          style={{
            background: brightnessToBg(effectiveBrightness?.bg ?? 0.3),
            color: brightnessToText(effectiveBrightness?.text ?? 0.7),
            "--ir-text": brightnessToText(effectiveBrightness?.text ?? 0.7),
          }}
        >
        <AppSearchBar
          isDark={isDark}
          notes={notes}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onChangeViewMode={handleChangeViewMode}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
          sortBy={sortBy}
          onSortChange={setSortBy}
          activeTag={activeTag}
          onSelectTag={setActiveTag}
          groupByCategory={groupByCategory}
          onToggleGroup={() => setGroupByCategory(v => !v)}
          selectMode={selectMode}
          onEnterSelectMode={enterSelectMode}
          onClearSelection={clearSelection}
          selectedCount={selectedIds.size}
          visibleCount={processedNotes.length}
          gridColumns={settings?.grid_columns}
          onGridColumnsChange={handleGridColumnsChange}
        />

        {renderPinnedRail()}
        <UpcomingAlarmsRail
          notes={notes}
          isDark={isDark}
          onOpenNote={(noteId) => {
            const n = notes.find((x) => x.id === noteId);
            if (n) openEditModal(n);
          }}
        />
        <FeaturedTipStrip isDark={isDark} />
        {renderNotes()}
      </main>
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditingNote(null); setNoteModalOpen(true); haptic("tap"); }}
        className={`fab-button-sm ${isDark ? '' : 'light'}`}
        aria-label="Add note"
        data-testid="fab-add-note"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* All modals, dialogs, sheets and floating pills (extracted) */}
      <ThemeChooserModal
        isOpen={themeChooserOpen}
        onPick={handleThemeChooserPick}
      />
      <AppModals
        // — data —
        notes={notes}
        settings={settings}
        categories={categories}
        existingPaths={existingPaths}
        templates={templates}
        allTags={allTags}
        storageInfo={storageInfo}
        canInstallPWA={!!deferredPrompt}
        grouped={grouped}
        selectedIds={selectedIds}
        autoLock={autoLock}
        // — open/close state + setters —
        noteModalOpen={noteModalOpen} setNoteModalOpen={setNoteModalOpen}
        editingNote={editingNote} setEditingNote={setEditingNote}
        calculatorOpen={calculatorOpen} setCalculatorOpen={setCalculatorOpen}
        calculatorCallback={calculatorCallback} setCalculatorCallback={setCalculatorCallback}
        shareModalOpen={shareModalOpen} setShareModalOpen={setShareModalOpen}
        sharingNote={sharingNote} setSharingNote={setSharingNote}
        settingsModalOpen={settingsModalOpen} setSettingsModalOpen={setSettingsModalOpen}
        storageCleanupOpen={storageCleanupOpen} setStorageCleanupOpen={setStorageCleanupOpen}
        storageCleanupSmart={storageCleanupSmart} setStorageCleanupSmart={setStorageCleanupSmart}
        handleReloadNotes={fetchData}
        onOpenThemeChooser={() => setThemeChooserOpen(true)}
        uiBrightness={settings?.ui_brightness}
        onBrightnessChange={handleBrightnessChange}
        focusOverrideBrightness={
          focusActiveNow
            && settings?.focus_night_visuals?.enabled
            && settings?.focus_night_visuals?.apply_to_notes !== false
            && settings?.focus_night_visuals?.ui_brightness
            ? settings.focus_night_visuals.ui_brightness
            : null
        }
        fullScreenNote={fullScreenNote} setFullScreenNote={setFullScreenNote}
        quickAddOpen={quickAddOpen} setQuickAddOpen={setQuickAddOpen}
        tilePacksOpen={tilePacksOpen} setTilePacksOpen={setTilePacksOpen}
        floatingCalendarOpen={floatingCalendarOpen} setFloatingCalendarOpen={setFloatingCalendarOpen}
        tourOpen={tourOpen}
        insightsOpen={insightsOpen} setInsightsOpen={setInsightsOpen}
        kidModeOpen={kidModeOpen} setKidModeOpen={setKidModeOpen}
        shoppingModeOpen={shoppingModeOpen} setShoppingModeOpen={setShoppingModeOpen}
        tripJournalOpen={tripJournalOpen} setTripJournalOpen={setTripJournalOpen}
        restaurantsGaloreOpen={restaurantsGaloreOpen} setRestaurantsGaloreOpen={setRestaurantsGaloreOpen}
        restaurantDirectoryOpen={restaurantDirectoryOpen} setRestaurantDirectoryOpen={setRestaurantDirectoryOpen}
        restaurantMenusOpen={restaurantMenusOpen} setRestaurantMenusOpen={setRestaurantMenusOpen}
        restaurantMealsOpen={restaurantMealsOpen} setRestaurantMealsOpen={setRestaurantMealsOpen}
        restaurantOrdersOpen={restaurantOrdersOpen} setRestaurantOrdersOpen={setRestaurantOrdersOpen}
        restaurantOrdersInitialMonth={restaurantOrdersInitialMonth}
        restaurantSpendingOpen={restaurantSpendingOpen} setRestaurantSpendingOpen={setRestaurantSpendingOpen}
        restaurantCouponsOpen={restaurantCouponsOpen} setRestaurantCouponsOpen={setRestaurantCouponsOpen}
        restaurantReviewsOpen={restaurantReviewsOpen} setRestaurantReviewsOpen={setRestaurantReviewsOpen}
        restaurantDeliveryOpen={restaurantDeliveryOpen} setRestaurantDeliveryOpen={setRestaurantDeliveryOpen}
        restaurantStaffOpen={restaurantStaffOpen} setRestaurantStaffOpen={setRestaurantStaffOpen}
        restaurantWishlistOpen={restaurantWishlistOpen} setRestaurantWishlistOpen={setRestaurantWishlistOpen}
        restaurantPhotosOpen={restaurantPhotosOpen} setRestaurantPhotosOpen={setRestaurantPhotosOpen}
        restaurantVoiceOpen={restaurantVoiceOpen} setRestaurantVoiceOpen={setRestaurantVoiceOpen}
        restaurantSearchOpen={restaurantSearchOpen} setRestaurantSearchOpen={setRestaurantSearchOpen}
        restaurantBeveragesOpen={restaurantBeveragesOpen} setRestaurantBeveragesOpen={setRestaurantBeveragesOpen}
        restaurantDessertsOpen={restaurantDessertsOpen} setRestaurantDessertsOpen={setRestaurantDessertsOpen}
        restaurantAIOpen={restaurantAIOpen} setRestaurantAIOpen={setRestaurantAIOpen}
        restaurantBackupOpen={restaurantBackupOpen} setRestaurantBackupOpen={setRestaurantBackupOpen}
        restaurantSmartOpen={restaurantSmartOpen} setRestaurantSmartOpen={setRestaurantSmartOpen}
        restaurantRecipesOpen={restaurantRecipesOpen} setRestaurantRecipesOpen={setRestaurantRecipesOpen}
        restaurantFamilyOpen={restaurantFamilyOpen} setRestaurantFamilyOpen={setRestaurantFamilyOpen}
        restaurantShoppingOpen={restaurantShoppingOpen} setRestaurantShoppingOpen={setRestaurantShoppingOpen}
        restaurantMealPlanOpen={restaurantMealPlanOpen} setRestaurantMealPlanOpen={setRestaurantMealPlanOpen}
        barcodeOpen={barcodeOpen} setBarcodeOpen={setBarcodeOpen}
        mealPlannerOpen={mealPlannerOpen} setMealPlannerOpen={setMealPlannerOpen}
        pantryOpen={pantryOpen} setPantryOpen={setPantryOpen}
        languagePickerOpen={languagePickerOpen} setLanguagePickerOpen={setLanguagePickerOpen}
        securityOpen={securityOpen} setSecurityOpen={setSecurityOpen}
        organizationOpen={organizationOpen} setOrganizationOpen={setOrganizationOpen}
        moveToOpen={moveToOpen} setMoveToOpen={setMoveToOpen}
        pendingCopyTarget={pendingCopyTarget} setPendingCopyTarget={setPendingCopyTarget}
        batchStudioOpen={batchStudioOpen} setBatchStudioOpen={setBatchStudioOpen}
        deleteChoice={deleteChoice} setDeleteChoice={setDeleteChoice}
        recentAction={recentAction} setRecentAction={setRecentAction}
        archiveTrashOpen={archiveTrashOpen} setArchiveTrashOpen={setArchiveTrashOpen}
        quickAccessOpen={quickAccessOpen}
        backupOpen={backupOpen} setBackupOpen={setBackupOpen}
        clearStep={clearStep} setClearStep={setClearStep}
        // — handlers —
        isDark={isDark}
        fetchData={fetchData}
        handleSaveNote={handleSaveNote}
        handleSaveInline={handleSaveInline}
        handleDeleteNote={handleDeleteNote}
        openShareModal={openShareModal}
        openCalculatorWithCallback={openCalculatorWithCallback}
        handleSaveSettings={handleSaveSettings}
        handleBackup={handleBackup}
        handleRestore={handleRestore}
        handleClearAllData={handleClearAllData}
        handleInstallPWA={handleInstallPWA}
        handleRestoreFromServer={handleRestoreFromServer}
        handleSyncPackColors={handleSyncPackColors}
        handleQuickAdd={handleQuickAdd}
        handleApplyPack={handleApplyPack}
        handleTourDismiss={handleTourDismiss}
        handleCloseQuickAccess={handleCloseQuickAccess}
        bulkMoveTo={bulkMoveTo}
        bulkCopyTo={bulkCopyTo}
        bulkDuplicateInPlace={bulkDuplicateInPlace}
        bulkTogglePin={bulkTogglePin}
        bulkSetColor={bulkSetColor}
        bulkSetAlarm={bulkSetAlarm}
        bulkClearAlarm={bulkClearAlarm}
        bulkExportPDF={bulkExportPDF}
        bulkExportMarkdown={bulkExportMarkdown}
        performArchive={performArchive}
        performTrash={performTrash}
        performClearAllData={performClearAllData}
        clearSelection={clearSelection}
        undoRecentAction={undoRecentAction}
      />

      {/* Wall Mode kiosk lightbox — auto-launched on cold start when the
          user has opted in from the Restaurants Galore dashboard. */}
      <PhotoLightbox
        open={kioskOpen}
        images={kioskImages}
        initialIndex={0}
        startInSlideshow={true}
        onClose={() => setKioskOpen(false)}
      />

      {/* Year Wrap Story — auto-offered on new-year cold-start, also
          launchable from the Restaurants Galore dashboard. */}
      <YearlyWrapStoryModal
        open={yearWrapOpen !== null}
        onClose={() => setYearWrapOpen(null)}
        year={yearWrapOpen}
      />
    </div>
    </QuickGuideProvider>
  );
}
