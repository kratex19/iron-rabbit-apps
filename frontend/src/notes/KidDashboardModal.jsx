import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  X, Flame, Wallet, Trophy, Check, Circle, ArrowLeft, User, ChevronRight, PartyPopper, Lock, Unlock, ShieldCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NOTE_COLORS } from "./constants";
import { computeChoreStreak, computeNoteStreak, buildLedger } from "./streakUtils";
import { haptic } from "../utils/haptic";

/**
 * A giant-button, single-kid view designed for shared tablets.
 *
 * Props:
 *   isOpen, onClose      — modal control
 *   notes                — full list of notes (parent filters chores notes)
 *   onSaveNote(id, patch)— parent handler that persists updates via storage
 *   isDark
 */
export default function KidDashboardModal({ isOpen, onClose, notes, onSaveNote, isDark }) {
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [pinGateNote, setPinGateNote] = useState(null); // note awaiting PIN
  const [pinSetNoteId, setPinSetNoteId] = useState(null); // note being (re-)PIN'd

  // Notes that carry at least one chore = "kids"
  const kidNotes = useMemo(
    () => (notes || []).filter(n => Array.isArray(n.chores) && n.chores.length > 0 && !n.archived_at && !n.deleted_at),
    [notes]
  );
  const selected = kidNotes.find(n => n.id === selectedNoteId) || null;

  const handleClose = () => {
    setSelectedNoteId(null);
    setPinGateNote(null);
    setPinSetNoteId(null);
    onClose();
  };

  const handlePickKid = (n) => {
    if (n.kid_pin && String(n.kid_pin).length === 4) {
      setPinGateNote(n);
      return;
    }
    setSelectedNoteId(n.id);
    haptic("tap");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent
        className={`max-w-3xl max-h-[92vh] overflow-y-auto p-0 ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`}
        data-testid="kid-dashboard-modal"
      >
        <DialogTitle className="sr-only">Kid Mode</DialogTitle>
        {/* Header — huge & fun */}
        <div className={`sticky top-0 z-10 px-5 py-4 flex items-center gap-3 border-b ${isDark ? "bg-gradient-to-r from-indigo-900/80 via-purple-900/60 to-pink-900/80 border-white/10" : "bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 border-gray-200"}`}>
          {selected ? (
            <button
              type="button"
              onClick={() => setSelectedNoteId(null)}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white hover:bg-gray-100 text-gray-800 shadow-sm"}`}
              aria-label="Back to kid picker"
              data-testid="kid-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : null}
          <div className="flex-1 min-w-0">
            <div className={`text-2xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              <PartyPopper className="w-6 h-6 text-amber-400" />
              {selected ? (selected.title || "Chores") : "Kid Mode"}
            </div>
            <div className={`text-xs ${isDark ? "text-slate-300" : "text-gray-600"}`}>
              {selected ? "Tap a chore to check it off. Grown-up must approve to earn!" : "Choose whose chores to open."}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white hover:bg-gray-100 text-gray-800 shadow-sm"}`}
            aria-label="Exit kid mode"
            data-testid="kid-exit-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {!selected ? (
            <KidPicker
              kidNotes={kidNotes}
              onPick={handlePickKid}
              onSetPin={(id) => setPinSetNoteId(id)}
              isDark={isDark}
            />
          ) : (
            <KidBoard
              note={selected}
              onSaveNote={onSaveNote}
              isDark={isDark}
            />
          )}
        </div>

        {/* PIN gate — shown when tapping a kid card that has a PIN set */}
        {pinGateNote && (
          <KidPinGate
            note={pinGateNote}
            onCancel={() => setPinGateNote(null)}
            onSuccess={() => {
              const id = pinGateNote.id;
              setPinGateNote(null);
              setSelectedNoteId(id);
              haptic("success");
            }}
            isDark={isDark}
          />
        )}

        {/* PIN setter — long-press-like "Set PIN" gear from the card */}
        {pinSetNoteId && (
          <KidPinSetter
            note={kidNotes.find(n => n.id === pinSetNoteId)}
            onCancel={() => setPinSetNoteId(null)}
            onSave={(newPin) => {
              onSaveNote(pinSetNoteId, { kid_pin: newPin || null });
              setPinSetNoteId(null);
              toast.success(newPin ? "PIN set" : "PIN removed");
            }}
            isDark={isDark}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function KidPicker({ kidNotes, onPick, onSetPin, isDark }) {
  if (kidNotes.length === 0) {
    return (
      <div className={`text-center py-16 ${isDark ? "text-slate-400" : "text-gray-500"}`} data-testid="kid-empty">
        <User className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <div className="text-sm">No chores notes yet.</div>
        <div className="text-xs mt-1">Apply the Daily Chores tile pack to get started.</div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="kid-picker">
      {kidNotes.map(n => {
        const colorCfg = NOTE_COLORS.find(c => c.name === n.color) || NOTE_COLORS[0];
        const streak = computeNoteStreak(n);
        const total = n.chores.length;
        const done = n.chores.filter(c => c.status === "done" && c.parent_approved).length;
        const earnings = (n.chores || []).reduce((s, c) => {
          const h = Array.isArray(c.history) ? c.history : [];
          return s + h.reduce((ss, x) => ss + (Number(x.paid) || 0), 0);
        }, 0);
        return (
          <div
            key={n.id}
            role="button"
            tabIndex={0}
            onClick={() => onPick(n)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(n); } }}
            className={`relative text-left p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              isDark ? "bg-white/[0.03] border-white/10 hover:border-white/30" : "bg-white border-gray-200 hover:border-indigo-400 shadow-sm"
            }`}
            style={{ borderLeftColor: colorCfg.accent, borderLeftWidth: "6px" }}
            data-testid={`kid-card-${n.id}`}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSetPin(n.id); }}
              className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition ${
                n.kid_pin
                  ? isDark ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : isDark ? "bg-white/5 text-slate-500 hover:bg-white/10" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
              }`}
              title={n.kid_pin ? "PIN protected — tap to change" : "Set a PIN"}
              data-testid={`kid-pin-toggle-${n.id}`}
            >
              {n.kid_pin ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
            <div className="flex items-center gap-2 mb-2 pr-8">
              <div className={`text-lg font-bold truncate flex-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                {n.title || "Untitled"}
              </div>
              <ChevronRight className={isDark ? "text-slate-500" : "text-gray-400"} />
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className={`flex items-center gap-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                <Trophy className="w-4 h-4 text-amber-500" /> {done}/{total}
              </span>
              {streak > 0 && (
                <span className={`flex items-center gap-1 font-semibold ${isDark ? "text-orange-300" : "text-orange-600"}`}>
                  <Flame className="w-4 h-4" /> {streak}
                </span>
              )}
              <span className={`flex items-center gap-1 ml-auto font-mono ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                <Wallet className="w-4 h-4" /> ${earnings.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KidBoard({ note, onSaveNote, isDark }) {
  const chores = Array.isArray(note.chores) ? note.chores : [];
  const streak = computeNoteStreak(note);
  const ledger = useMemo(() => buildLedger(chores), [chores]);
  const thisWeek = ledger.weekly[ledger.weekly.length - 1]?.total || 0;
  const thisMonth = ledger.monthly[ledger.monthly.length - 1]?.total || 0;
  const lifetime = ledger.grandTotal;
  const total = chores.length;
  const done = chores.filter(c => c.status === "done" && c.parent_approved).length;

  const updateChore = (id, patch) => {
    const next = chores.map(c => {
      if (c.id !== id) return c;
      const merged = { ...c, ...patch, updated_at: new Date().toISOString() };
      // Mirror ChoresPanel: record history on transition to done+approved.
      const wasComplete = c.status === "done" && c.parent_approved === true;
      const isComplete  = merged.status === "done" && merged.parent_approved === true;
      if (!wasComplete && isComplete) {
        const hist = Array.isArray(merged.history) ? [...merged.history] : [];
        const last = hist[hist.length - 1];
        const dedupe = last && (Date.now() - new Date(last.date).getTime()) < 60_000;
        if (!dedupe) hist.push({ date: new Date().toISOString(), paid: Number(merged.paid) || 0, status: "done" });
        merged.history = hist;
      }
      return merged;
    });
    onSaveNote(note.id, { chores: next });
  };

  const toggleChoreStatus = (c) => {
    haptic("tap");
    // Simple 3-step cycle for kid view: todo → done → todo
    const nextStatus = c.status === "done" ? "todo" : "done";
    updateChore(c.id, { status: nextStatus });
    if (nextStatus === "done") toast.success(`Nice! Ask a grown-up to approve "${c.title}".`);
  };

  return (
    <div className="space-y-4">
      {/* Big stats row */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Streak" value={streak} icon={<Flame className="w-6 h-6" />} accent="text-orange-500" isDark={isDark} testid="kid-stat-streak" />
        <StatCard label="Approved" value={`${done}/${total}`} icon={<Trophy className="w-6 h-6" />} accent="text-amber-500" isDark={isDark} testid="kid-stat-done" />
        <StatCard label="This week" value={`$${thisWeek.toFixed(2)}`} icon={<Wallet className="w-6 h-6" />} accent="text-emerald-500" isDark={isDark} testid="kid-stat-week" />
      </div>
      <div className={`text-xs flex justify-between px-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
        <span>This month: <b className={isDark ? "text-emerald-300" : "text-emerald-700"}>${thisMonth.toFixed(2)}</b></span>
        <span>Lifetime: <b className={isDark ? "text-emerald-300" : "text-emerald-700"}>${lifetime.toFixed(2)}</b></span>
      </div>

      {/* Giant chore buttons */}
      <div className="space-y-2" data-testid="kid-chore-list">
        {chores.map(c => {
          const isDone = c.status === "done";
          const isApproved = c.parent_approved;
          const cStreak = computeChoreStreak(c);
          return (
            <div
              key={c.id}
              className={`rounded-2xl border-2 overflow-hidden transition-all ${
                isDone
                  ? isApproved
                    ? isDark ? "bg-emerald-500/10 border-emerald-400/40" : "bg-emerald-50 border-emerald-300"
                    : isDark ? "bg-amber-500/10 border-amber-400/40" : "bg-amber-50 border-amber-300"
                  : isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200"
              }`}
              data-testid={`kid-chore-${c.id}`}
            >
              <button
                type="button"
                onClick={() => toggleChoreStatus(c)}
                className="w-full text-left p-4 flex items-center gap-3"
                data-testid={`kid-chore-toggle-${c.id}`}
              >
                <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${
                  isDone
                    ? isDark ? "bg-emerald-500 border-emerald-400 text-white" : "bg-emerald-500 border-emerald-400 text-white"
                    : isDark ? "border-white/20 text-slate-500" : "border-gray-300 text-gray-400"
                }`}>
                  {isDone ? <Check className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-lg font-bold truncate ${
                    isDone ? isDark ? "text-emerald-200 line-through" : "text-emerald-800 line-through" : isDark ? "text-white" : "text-gray-900"
                  }`}>
                    {c.title}
                  </div>
                  <div className={`text-xs flex items-center gap-2 mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${isDark ? "bg-white/10" : "bg-gray-100"}`}>
                      {c.frequency || "daily"}
                    </span>
                    <span className={`font-mono ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                      ${Number(c.paid || c.offered || 0).toFixed(2)}
                    </span>
                    {cStreak > 0 && (
                      <span className={`flex items-center gap-0.5 font-bold ${isDark ? "text-orange-300" : "text-orange-600"}`}>
                        <Flame className="w-3 h-3" /> {cStreak}
                      </span>
                    )}
                    {isDone && !isApproved && (
                      <span className={`ml-auto text-[11px] font-semibold ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                        Waiting for grown-up ✓
                      </span>
                    )}
                    {isApproved && (
                      <span className={`ml-auto text-[11px] font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                        Approved!
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
        {chores.length === 0 && (
          <div className={`text-center py-8 text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            No chores yet.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent, isDark, testid }) {
  return (
    <div
      className={`rounded-2xl p-3 flex flex-col items-center justify-center text-center ${
        isDark ? "bg-white/[0.04] border border-white/10" : "bg-white border border-gray-200 shadow-sm"
      }`}
      data-testid={testid}
    >
      <div className={accent}>{icon}</div>
      <div className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}>{value}</div>
      <div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>
        {label}
      </div>
    </div>
  );
}

/**
 * PIN gate — appears when tapping a kid card that has a `kid_pin` set.
 * Blocks access to that kid's KidBoard until the correct 4-digit PIN is
 * entered. 5 failed attempts triggers a 30-second cool-down.
 */
function KidPinGate({ note, onCancel, onSuccess, isDark }) {
  const [entered, setEntered] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const isLocked = Date.now() < lockedUntil;

  const submit = (val) => {
    if (isLocked) return;
    if (val === note.kid_pin) {
      onSuccess();
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    setEntered("");
    if (next >= 5) {
      setLockedUntil(Date.now() + 30_000);
      toast.error("Too many attempts. Try again in 30 seconds.");
    } else {
      toast.error(`Wrong PIN · ${5 - next} attempt${5 - next === 1 ? "" : "s"} left`);
    }
    haptic("error");
  };

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className={`max-w-sm ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`} data-testid="kid-pin-gate">
        <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          Enter PIN for {note.title || "this kid"}
        </DialogTitle>
        <div className="py-3 space-y-3">
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-10 h-12 rounded-lg flex items-center justify-center text-xl font-bold border-2 ${
                  isDark ? "border-white/10 bg-white/5 text-white" : "border-gray-200 bg-gray-50 text-gray-900"
                }`}
              >
                {entered[i] ? "•" : ""}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
              <button
                key={i}
                type="button"
                disabled={isLocked || k === ""}
                onClick={() => {
                  if (k === "") return;
                  if (k === "⌫") { setEntered(prev => prev.slice(0, -1)); return; }
                  const next = (entered + k).slice(0, 4);
                  setEntered(next);
                  if (next.length === 4) setTimeout(() => submit(next), 100);
                }}
                className={`h-12 rounded-lg text-lg font-semibold transition-colors ${
                  k === "" ? "invisible" :
                  isDark ? "bg-white/5 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
                         : "bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-200 disabled:opacity-40"
                }`}
                data-testid={`kid-pin-key-${k}`}
              >
                {k}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={onCancel} className="w-full h-9" data-testid="kid-pin-cancel">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * PIN setter — parent enters a new 4-digit PIN (or clears it to remove
 * protection). No confirm-twice step to keep the UI simple; parents can
 * always come back and change it.
 */
function KidPinSetter({ note, onCancel, onSave, isDark }) {
  const [entered, setEntered] = useState(note?.kid_pin || "");
  if (!note) return null;
  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className={`max-w-sm ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`} data-testid="kid-pin-setter">
        <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
          <Lock className="w-5 h-5 text-indigo-400" />
          {note.kid_pin ? "Change" : "Set"} PIN for {note.title || "this kid"}
        </DialogTitle>
        <div className="py-3 space-y-3">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            autoFocus
            value={entered}
            onChange={(e) => setEntered(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="4-digit PIN"
            className={`w-full h-12 text-center text-2xl font-bold tracking-widest rounded-lg border-2 outline-none focus:ring-2 focus:ring-indigo-400 ${
              isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600" : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
            }`}
            data-testid="kid-pin-setter-input"
          />
          <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
            Leave empty and tap Save to remove PIN protection.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onCancel} className="h-9" data-testid="kid-pin-setter-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => onSave(entered.length === 4 ? entered : "")}
              disabled={entered.length !== 0 && entered.length !== 4}
              className="h-9 bg-indigo-500 hover:bg-indigo-600 text-white"
              data-testid="kid-pin-setter-save"
            >
              {entered.length === 4 ? "Save PIN" : "Remove PIN"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

