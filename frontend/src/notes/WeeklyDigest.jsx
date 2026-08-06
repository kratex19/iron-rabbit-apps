import React, { useEffect, useMemo, useState } from "react";
import * as LucideIcons from "lucide-react";
import { Sparkles, Star, X, FileText, Calendar, Palette, TrendingUp, UtensilsCrossed } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import StorageService from "../storage/storageService";

const ICON_RECENTS_KEY = "iron_rabbit_icon_recents_v1";
const BG_RECENTS_KEY   = "iron_rabbit_bg_recents_v1";
const DAY = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY;
const MONTH_MS = 30 * DAY;
// Windows during which each digest may fire. Missed the window if user was away.
const DIGEST_WINDOW_MS = 7 * DAY;   // day 7 → 14 for the weekly
const MONTH_WINDOW_MS  = 14 * DAY;  // day 30 → 44 for the monthly

function loadLocal(key, empty) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : empty;
  } catch { return empty; }
}

/**
 * Weekly Digest — a one-time celebratory summary card shown on/around day 7.
 *
 * Never fires when:
 *   • The user has fewer than a week of usage (`first_use_at`)
 *   • The digest has already been shown once (`digest_shown_at`)
 *   • It's been more than 14 days since first use (we missed the window)
 *
 * Ships lightly — no analytics, no ping, just a warm moment inside the app.
 */
export default function WeeklyDigest({ notes = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("weekly"); // "weekly" | "monthly"
  const [settings, setSettings] = useState(null);
  const [pickedIcon, setPickedIcon] = useState(null);
  const [pickedColor, setPickedColor] = useState(null);

  // Boot check — decide whether to show a digest this session, weekly or monthly.
  useEffect(() => {
    (async () => {
      try {
        const s = await StorageService.getSettings();
        setSettings(s || {});
        if (!s?.first_use_at) return;
        const firstUse = new Date(s.first_use_at).getTime();
        const age = Date.now() - firstUse;

        // Monthly digest takes priority — richer moment, more mature user.
        if (age >= MONTH_MS && age <= MONTH_MS + MONTH_WINDOW_MS && !s.monthly_digest_shown_at) {
          setMode("monthly");
          const t = setTimeout(() => setIsOpen(true), 4000);
          return () => clearTimeout(t);
        }
        // Weekly fallback for the day 7-14 window.
        if (age >= WEEK_MS && age <= WEEK_MS + DIGEST_WINDOW_MS && !s.digest_shown_at) {
          setMode("weekly");
          const t = setTimeout(() => setIsOpen(true), 4000);
          return () => clearTimeout(t);
        }
      } catch { /* silent */ }
    })();
  }, []);

  // Derive the digest stats and default pin candidates when the modal opens.
  const stats = useMemo(() => {
    if (!isOpen || !settings) return null;
    const firstUse = new Date(settings.first_use_at).getTime();
    const cutoff = mode === "monthly" ? firstUse : firstUse; // both count from install
    const notesInPeriod = notes.filter(n => new Date(n.created_at || 0).getTime() >= cutoff).length;

    const iconRecents = loadLocal(ICON_RECENTS_KEY, { recents: [], pinned: [] });
    const bgRecents   = loadLocal(BG_RECENTS_KEY,   { colors: [] });
    const iconPinned  = new Set(settings?.icon_pins || []);
    const colorPinned = new Set(settings?.bg_pins?.colors || []);

    const topIcon  = (iconRecents.recents || []).find(n => !iconPinned.has(n)) || null;
    const topColor = (bgRecents.colors || []).find(v => !colorPinned.has(v)) || null;

    // Monthly extras: notes-per-week trend + Meal Planner nudge.
    let weeklyBars = [];
    let mealPlannerUsed = false;
    if (mode === "monthly") {
      const weeks = 4;
      weeklyBars = Array.from({ length: weeks }, (_, w) => {
        const start = firstUse + w * WEEK_MS;
        const end = start + WEEK_MS;
        return notes.filter(n => {
          const t = new Date(n.created_at || 0).getTime();
          return t >= start && t < end;
        }).length;
      });
      // A note is Meal-Planner-flavoured if it has category "Meal Plan"
      // or tag "meal-plan" or a meal-plan grid inside.
      mealPlannerUsed = notes.some(n =>
        (n.category === "Meal Plan") ||
        (Array.isArray(n.tags) && n.tags.includes("meal-plan")) ||
        !!n.meal_plan
      );
    }

    return { notesInPeriod, topIcon, topColor, weeklyBars, mealPlannerUsed };
  }, [isOpen, settings, notes, mode]);

  useEffect(() => {
    if (stats) {
      setPickedIcon(stats.topIcon);
      setPickedColor(stats.topColor);
    }
  }, [stats]);

  const close = async () => {
    setIsOpen(false);
    try {
      const patch = mode === "monthly"
        ? { monthly_digest_shown_at: new Date().toISOString() }
        : { digest_shown_at: new Date().toISOString() };
      await StorageService.saveSettings(patch);
    } catch { /* silent */ }
  };

  const pinFavourites = async () => {
    try {
      const patch = {};
      if (pickedIcon) {
        const cur = settings?.icon_pins || [];
        patch.icon_pins = cur.includes(pickedIcon) ? cur : [pickedIcon, ...cur];
      }
      if (pickedColor) {
        const cur = settings?.bg_pins || {};
        const nextColors = (cur.colors || []).includes(pickedColor)
          ? (cur.colors || [])
          : [pickedColor, ...(cur.colors || [])];
        patch.bg_pins = { colors: nextColors, gradients: cur.gradients || [] };
      }
      if (Object.keys(patch).length) await StorageService.saveSettings(patch);
      toast.success("Favourites pinned — see them at the top of each picker");
    } catch {
      toast.error("Couldn't pin — try again");
    } finally {
      close();
    }
  };

  if (!isOpen || !stats) return null;

  const IconComp = pickedIcon && LucideIcons[pickedIcon] ? LucideIcons[pickedIcon] : null;
  const isMonthly = mode === "monthly";
  const maxBar = Math.max(1, ...(stats.weeklyBars || [1]));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent
        className="max-w-sm bg-[#0B1221] border-white/10 text-white"
        data-testid={isMonthly ? "monthly-digest-modal" : "weekly-digest-modal"}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-amber-300" />
            {isMonthly ? "Your first month" : "Your first week"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isMonthly
              ? "A look at your first 30 days with Iron Rabbit."
              : "A quick look at how Iron Rabbit is shaping to you."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          {/* Notes created */}
          <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400">
                {isMonthly ? "Notes created this month" : "Notes created"}
              </div>
              <div className="text-lg font-semibold text-white" data-testid="digest-notes-count">
                {stats.notesInPeriod}
              </div>
            </div>
          </div>

          {/* Monthly-only: weekly bar chart */}
          {isMonthly && (
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5" data-testid="digest-weekly-chart">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                <div className="text-xs text-slate-400">Notes per week</div>
              </div>
              <div className="flex items-end gap-1.5 h-16">
                {stats.weeklyBars.map((n, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-indigo-500 to-fuchsia-400"
                      style={{ height: `${Math.max(4, (n / maxBar) * 100)}%`, minHeight: n === 0 ? 2 : undefined, opacity: n === 0 ? 0.3 : 1 }}
                      data-testid={`digest-bar-week-${i + 1}`}
                    />
                    <div className="text-[9px] text-slate-500 font-mono">{n}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                <span>Wk 1</span><span>Wk 2</span><span>Wk 3</span><span>Wk 4</span>
              </div>
            </div>
          )}

          {/* Top icon */}
          <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/30 flex items-center justify-center flex-shrink-0">
              {IconComp ? <IconComp className="w-4 h-4 text-fuchsia-200" /> : <Star className="w-4 h-4 text-slate-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400">Top icon</div>
              <div className="text-sm font-medium truncate" data-testid="digest-top-icon">
                {pickedIcon || "None yet — try adding an icon to a note"}
              </div>
            </div>
          </div>

          {/* Top color */}
          <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center flex-shrink-0"
                 style={{ background: pickedColor || "linear-gradient(135deg,#334155 0%,#0f172a 100%)" }}>
              <Palette className={`w-4 h-4 ${pickedColor ? "text-white/80 mix-blend-difference" : "text-slate-400"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400">Top background color</div>
              <div className="text-sm font-mono truncate" data-testid="digest-top-color">
                {pickedColor || "None yet"}
              </div>
            </div>
          </div>

          {/* Monthly-only: Meal Planner nudge if unused */}
          {isMonthly && !stats.mealPlannerUsed && (
            <div className="flex items-start gap-3 rounded-lg bg-emerald-500/10 border border-emerald-400/30 px-3 py-2.5" data-testid="digest-meal-planner-nudge">
              <UtensilsCrossed className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-emerald-200">Haven&apos;t tried Meal Planner?</div>
                <div className="text-[11px] text-emerald-100/70 mt-0.5">
                  Plan a week of meals, auto-build a shopping list, and cross ingredients off as you go. Tap ✚ → Meal Plan.
                </div>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
            <Calendar className="w-3 h-3" /> {isMonthly ? "Day 30" : "Day 7"} of Iron Rabbit
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={close}
            className="flex-1 text-slate-300 hover:bg-white/5"
            data-testid="digest-dismiss"
          >
            <X className="w-4 h-4 mr-1" /> Not now
          </Button>
          <Button
            onClick={pinFavourites}
            disabled={!pickedIcon && !pickedColor}
            className="flex-1 bg-amber-400 text-black hover:bg-amber-300 disabled:bg-white/5 disabled:text-slate-500"
            data-testid="digest-pin-favourites"
          >
            <Star className="w-4 h-4 mr-1 fill-current" /> Pin favourites
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
