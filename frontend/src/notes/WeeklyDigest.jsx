import React, { useEffect, useMemo, useState } from "react";
import * as LucideIcons from "lucide-react";
import { Sparkles, Star, X, FileText, Calendar, Palette } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import StorageService from "../storage/storageService";

const ICON_RECENTS_KEY = "iron_rabbit_icon_recents_v1";
const BG_RECENTS_KEY   = "iron_rabbit_bg_recents_v1";
const DAY = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY;
// Window during which the digest may fire — day 7 through day 14. Missed it
// entirely if the user was away for two weeks. Keeps the moment feeling fresh.
const DIGEST_WINDOW_MS = 7 * DAY;

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
  const [settings, setSettings] = useState(null);
  const [pickedIcon, setPickedIcon] = useState(null);
  const [pickedColor, setPickedColor] = useState(null);

  // Boot check — decide whether to show the digest this session.
  useEffect(() => {
    (async () => {
      try {
        const s = await StorageService.getSettings();
        setSettings(s || {});
        if (!s?.first_use_at) return;
        if (s.digest_shown_at) return;
        const firstUse = new Date(s.first_use_at).getTime();
        const age = Date.now() - firstUse;
        if (age < WEEK_MS) return;                                // still learning
        if (age > WEEK_MS + DIGEST_WINDOW_MS) return;             // missed window

        // Wait until the app has settled — never race with cold-boot renders.
        const t = setTimeout(() => setIsOpen(true), 4000);
        return () => clearTimeout(t);
      } catch { /* silent */ }
    })();
  }, []);

  // Derive the digest stats and default pin candidates when the modal opens.
  const stats = useMemo(() => {
    if (!isOpen || !settings) return null;
    const firstUse = new Date(settings.first_use_at).getTime();
    const notesThisWeek = notes.filter(n => new Date(n.created_at || 0).getTime() >= firstUse).length;

    const iconRecents = loadLocal(ICON_RECENTS_KEY, { recents: [], pinned: [] });
    const bgRecents   = loadLocal(BG_RECENTS_KEY,   { colors: [] });
    const iconPinned  = new Set(settings?.icon_pins || []);
    const colorPinned = new Set(settings?.bg_pins?.colors || []);

    const topIcon  = (iconRecents.recents || []).find(n => !iconPinned.has(n)) || null;
    const topColor = (bgRecents.colors || []).find(v => !colorPinned.has(v)) || null;

    return { notesThisWeek, topIcon, topColor };
  }, [isOpen, settings, notes]);

  useEffect(() => {
    if (stats) {
      setPickedIcon(stats.topIcon);
      setPickedColor(stats.topColor);
    }
  }, [stats]);

  const close = async () => {
    setIsOpen(false);
    try {
      await StorageService.saveSettings({ digest_shown_at: new Date().toISOString() });
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent
        className="max-w-sm bg-[#0B1221] border-white/10 text-white"
        data-testid="weekly-digest-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-amber-300" /> Your first week
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            A quick look at how Iron Rabbit is shaping to you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          {/* Notes created */}
          <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400">Notes created</div>
              <div className="text-lg font-semibold text-white" data-testid="digest-notes-count">
                {stats.notesThisWeek}
              </div>
            </div>
          </div>

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

          {/* Day count */}
          <div className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
            <Calendar className="w-3 h-3" /> Day 7 of Iron Rabbit
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
