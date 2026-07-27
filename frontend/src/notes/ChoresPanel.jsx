import React, { useState } from "react";
import {
  Plus, Trash2, ClipboardList, DollarSign, Check, Circle, ChevronRight,
  RotateCcw, Trophy, Calendar, Repeat, Wallet, Flame,
} from "lucide-react";
import AllowanceLedgerModal from "./AllowanceLedgerModal";
import { computeChoreStreak } from "./streakUtils";

const FREQUENCIES = [
  { key: "daily",     label: "Daily" },
  { key: "weekly",    label: "Weekly" },
  { key: "bimonthly", label: "Bi-monthly" },
  { key: "monthly",   label: "Monthly" },
];

/**
 * 3-stop progress pill for chore status.
 * Kids tap Todo → In Progress → Done. The rightmost circle only shows an
 * inner ✓ once the parent has approved (parent_approved=true).
 */
function StatusPill({ status, parentApproved, onChange, onApprove, isDark }) {
  const stops = [
    { key: "todo",     color: "bg-red-500",    ring: "ring-red-400/60",     label: "Todo" },
    { key: "progress", color: "bg-amber-500",  ring: "ring-amber-400/60",   label: "In Progress" },
    { key: "done",     color: "bg-emerald-500",ring: "ring-emerald-400/60", label: "Done" },
  ];
  return (
    <div className="flex items-center gap-1.5" data-testid="chore-status-pill">
      {stops.map((s, i) => {
        const active = (status === s.key) || (status === "done" && i < 2) || (status === "progress" && i === 0);
        const isCurrent = s.key === status;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${active ? s.color : (isDark ? "bg-white/10" : "bg-gray-200")} ${isCurrent ? `ring-2 ring-offset-1 ring-offset-transparent ${s.ring}` : ""}`}
            title={s.label}
            data-testid={`chore-status-${s.key}`}
          >
            {s.key === "done" && parentApproved && <Check className="w-3.5 h-3.5 text-white" />}
          </button>
        );
      })}
      {status === "done" && (
        <button
          type="button"
          onClick={onApprove}
          className={`ml-1 h-6 px-2 rounded-full text-[10px] font-semibold flex items-center gap-1 transition-colors ${
            parentApproved
              ? "bg-emerald-500 text-white"
              : (isDark ? "bg-white/10 text-slate-300 hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200")
          }`}
          data-testid="chore-parent-approve"
          title={parentApproved ? "Parent approved" : "Approve as parent"}
        >
          {parentApproved ? <><Trophy className="w-3 h-3" /> Approved</> : <>Parent ✓</>}
        </button>
      )}
    </div>
  );
}

/**
 * Inline panel shown in FullScreenNote when `note.chores` is an array.
 * Renders every chore with: title (editable), frequency dropdown, 3-stop
 * status pill, $ offered / $ paid, and a freeform notes textarea for
 * bonuses/penalties/holiday/vacation adjustments. Parent can tick approval.
 */
export default function ChoresPanel({ chores = [], onChange, isDark }) {
  const [expanded, setExpanded] = useState(new Set());
  const [ledgerOpen, setLedgerOpen] = useState(false);

  const update = (id, patch) => {
    const next = chores.map((c) => {
      if (c.id !== id) return c;
      const merged = { ...c, ...patch, updated_at: new Date().toISOString() };

      // When a chore transitions to `status: done && parent_approved: true`,
      // append a completion entry to its history so the streak + ledger stay
      // in sync. We use a de-dupe guard so double-tapping "Approve" doesn't
      // record twice within the same minute.
      const wasComplete = c.status === "done" && c.parent_approved === true;
      const isComplete  = merged.status === "done" && merged.parent_approved === true;
      if (!wasComplete && isComplete) {
        const hist = Array.isArray(merged.history) ? [...merged.history] : [];
        const last = hist[hist.length - 1];
        const nowIso = new Date().toISOString();
        const nowMs  = Date.now();
        const dedupe = last && (nowMs - new Date(last.date).getTime()) < 60_000;
        if (!dedupe) {
          hist.push({ date: nowIso, paid: Number(merged.paid) || 0, status: "done" });
        }
        merged.history = hist;
      }
      return merged;
    });
    onChange(next);
  };
  const remove = (id) => onChange(chores.filter((c) => c.id !== id));
  const addNew = () => {
    onChange([
      ...chores,
      {
        id: `chore-${Date.now()}`,
        title: "New chore",
        frequency: "weekly",
        status: "todo",
        parent_approved: false,
        offered: 0, paid: 0,
        notes: "",
        history: [],
        updated_at: new Date().toISOString(),
      },
    ]);
  };
  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totals = chores.reduce((acc, c) => {
    acc.offered += Number(c.offered) || 0;
    acc.paid    += Number(c.paid)    || 0;
    if (c.status === "done" && c.parent_approved) acc.completed += 1;
    return acc;
  }, { offered: 0, paid: 0, completed: 0 });

  return (
    <div className={`rounded-lg p-3 border ${isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="chores-panel">
      <div className={`flex items-center gap-2 text-xs font-semibold mb-2 ${isDark ? "text-slate-100" : "text-gray-800"}`}>
        <ClipboardList className="w-4 h-4 text-indigo-400" /> Chores
        <span className={`ml-auto font-mono font-normal ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          {totals.completed}/{chores.length} · ${totals.paid}/${totals.offered}
        </span>
        <button
          type="button"
          onClick={() => setLedgerOpen(true)}
          className={`ml-1 h-6 px-2 rounded-md text-[10px] font-semibold flex items-center gap-1 border ${
            isDark
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
          data-testid="chores-ledger-btn"
          title="Open weekly/monthly allowance ledger"
        >
          <Wallet className="w-3 h-3" /> Ledger
        </button>
      </div>

      <div className="space-y-1.5">
        {chores.map((c) => {
          const isOpen = expanded.has(c.id);
          const streak = computeChoreStreak(c);
          return (
            <div
              key={c.id}
              className={`rounded-md border overflow-hidden ${isDark ? "bg-black/20 border-white/10" : "bg-white border-gray-200"}`}
              data-testid={`chore-item-${c.id}`}
            >
              <div className="flex items-center gap-2 p-2">
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${isDark ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
                  aria-label="Toggle chore details"
                  data-testid={`chore-toggle-${c.id}`}
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""} ${isDark ? "text-slate-400" : "text-gray-500"}`} />
                </button>
                <input
                  value={c.title}
                  onChange={(e) => update(c.id, { title: e.target.value })}
                  className={`flex-1 min-w-0 bg-transparent border-0 outline-none text-sm ${isDark ? "text-white" : "text-gray-900"}`}
                  aria-label="Chore title"
                  data-testid={`chore-title-${c.id}`}
                />
                {streak > 0 && (
                  <span
                    className={`flex items-center gap-0.5 h-5 px-1.5 rounded-full text-[10px] font-bold ${
                      isDark ? "bg-orange-500/20 text-orange-300 border border-orange-400/30" : "bg-orange-50 text-orange-700 border border-orange-200"
                    }`}
                    title={`${streak} ${c.frequency || "day"} streak`}
                    data-testid={`chore-streak-${c.id}`}
                  >
                    <Flame className="w-3 h-3" /> {streak}
                  </span>
                )}
                <StatusPill
                  status={c.status}
                  parentApproved={!!c.parent_approved}
                  onChange={(s) => update(c.id, { status: s, parent_approved: s === "done" ? c.parent_approved : false })}
                  onApprove={() => update(c.id, { parent_approved: !c.parent_approved })}
                  isDark={isDark}
                />
              </div>

              {isOpen && (
                <div className={`px-3 pb-3 pt-1 border-t ${isDark ? "border-white/10" : "border-gray-200"} space-y-2`}>
                  <div className="flex items-center gap-2">
                    <Repeat className={`w-3.5 h-3.5 ${isDark ? "text-slate-400" : "text-gray-500"}`} />
                    <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>Frequency:</span>
                    <select
                      value={c.frequency || "weekly"}
                      onChange={(e) => update(c.id, { frequency: e.target.value })}
                      className={`h-7 rounded text-[11px] px-1.5 border ${isDark ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"}`}
                      data-testid={`chore-freq-${c.id}`}
                    >
                      {FREQUENCIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className={`text-[11px] flex items-center gap-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      <DollarSign className="w-3 h-3" /> Offered
                      <input
                        type="number" min="0" step="0.01"
                        value={c.offered ?? 0}
                        onChange={(e) => update(c.id, { offered: parseFloat(e.target.value) || 0 })}
                        className={`h-7 flex-1 rounded text-[11px] px-1.5 border ${isDark ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"}`}
                        data-testid={`chore-offered-${c.id}`}
                      />
                    </label>
                    <label className={`text-[11px] flex items-center gap-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      <DollarSign className="w-3 h-3" /> Paid
                      <input
                        type="number" min="0" step="0.01"
                        value={c.paid ?? 0}
                        onChange={(e) => update(c.id, { paid: parseFloat(e.target.value) || 0 })}
                        className={`h-7 flex-1 rounded text-[11px] px-1.5 border ${isDark ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"}`}
                        data-testid={`chore-paid-${c.id}`}
                      />
                    </label>
                  </div>

                  <textarea
                    value={c.notes || ""}
                    onChange={(e) => update(c.id, { notes: e.target.value })}
                    placeholder="Notes: bonuses, penalties, holiday/vacation pay, overdue %…"
                    rows={2}
                    className={`w-full text-[11px] rounded p-2 border resize-none ${isDark ? "bg-black/20 border-white/10 text-white placeholder:text-slate-500" : "bg-white border-gray-200 placeholder:text-gray-400"}`}
                    data-testid={`chore-notes-${c.id}`}
                  />

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => update(c.id, { status: "todo", parent_approved: false, paid: 0 })}
                      className={`h-7 px-2 rounded text-[11px] flex items-center gap-1 ${isDark ? "text-slate-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"}`}
                      data-testid={`chore-reset-${c.id}`}
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className={`h-7 px-2 rounded text-[11px] flex items-center gap-1 ${isDark ? "text-red-400 hover:bg-red-500/20" : "text-red-600 hover:bg-red-50"}`}
                      data-testid={`chore-remove-${c.id}`}
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addNew}
        className={`mt-2 w-full h-8 rounded-md text-xs flex items-center justify-center gap-1 border-2 border-dashed transition-colors ${
          isDark ? "border-white/10 text-slate-400 hover:bg-white/5 hover:border-white/20" : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300"
        }`}
        data-testid="chores-add-btn"
      >
        <Plus className="w-3.5 h-3.5" /> Add chore
      </button>

      <AllowanceLedgerModal
        isOpen={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        chores={chores}
        isDark={isDark}
      />
    </div>
  );
}
