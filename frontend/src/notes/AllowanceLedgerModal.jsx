import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Wallet, Download, TrendingUp, Trophy, Calendar as CalIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { buildLedger, agoLabel } from "./streakUtils";

/**
 * Weekly / Monthly allowance ledger for a Chores note. Reads only from
 * `chore.history[]` (which is appended-to whenever a chore is
 * done + parent_approved in ChoresPanel).
 */
export default function AllowanceLedgerModal({ isOpen, onClose, chores, isDark, currency = "$" }) {
  const [tab, setTab] = useState("weekly");
  const data = useMemo(() => buildLedger(chores || []), [chores]);

  const cardCls = isDark
    ? "rounded-xl border border-white/10 bg-white/[0.03] p-3.5"
    : "rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm";
  const labelCls = `text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`;

  const bins = tab === "weekly" ? data.weekly : data.monthly;
  const maxBin = Math.max(1, ...bins.map(b => b.total));

  const handleExportCSV = () => {
    if (data.flat.length === 0) {
      toast.warning("No completions yet — nothing to export.");
      return;
    }
    const rows = [["Date", "Chore", "Paid", "Status"]];
    for (const h of [...data.flat].sort((a, b) => a.date - b.date)) {
      rows.push([
        format(h.date, "yyyy-MM-dd HH:mm"),
        (h.choreTitle || "").replace(/"/g, '""'),
        Number(h.paid || 0).toFixed(2),
        h.status || "done",
      ]);
    }
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `allowance-ledger-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.flat.length} entries`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`}
        data-testid="allowance-ledger-modal"
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <Wallet className="w-5 h-5 text-emerald-400" /> Allowance Ledger
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Every parent-approved completion is logged here. Amounts total the <b>paid</b> value at the moment of approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className={cardCls} data-testid="ledger-kpi-total">
              <div className={labelCls}>Lifetime paid</div>
              <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {currency}{data.grandTotal.toFixed(2)}
              </div>
            </div>
            <div className={cardCls} data-testid="ledger-kpi-entries">
              <div className={labelCls}>Completions</div>
              <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{data.flat.length}</div>
            </div>
            <div className={cardCls} data-testid="ledger-kpi-week">
              <div className={labelCls}>This week</div>
              <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {currency}{(data.weekly[data.weekly.length - 1]?.total || 0).toFixed(2)}
              </div>
            </div>
            <div className={cardCls} data-testid="ledger-kpi-month">
              <div className={labelCls}>This month</div>
              <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {currency}{(data.monthly[data.monthly.length - 1]?.total || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Tab switch */}
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTab("weekly")}
                  className={`px-3 h-7 text-xs font-medium ${
                    tab === "weekly"
                      ? "bg-emerald-500 text-white"
                      : isDark ? "bg-white/5 text-slate-300" : "bg-white text-gray-700"
                  }`}
                  data-testid="ledger-tab-weekly"
                >
                  Weekly · 8w
                </button>
                <button
                  type="button"
                  onClick={() => setTab("monthly")}
                  className={`px-3 h-7 text-xs font-medium ${
                    tab === "monthly"
                      ? "bg-emerald-500 text-white"
                      : isDark ? "bg-white/5 text-slate-300" : "bg-white text-gray-700"
                  }`}
                  data-testid="ledger-tab-monthly"
                >
                  Monthly · 6mo
                </button>
              </div>
              <div className={`text-[11px] flex items-center gap-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                <TrendingUp className="w-3 h-3" />
                {tab === "weekly" ? "Last 8 weeks" : "Last 6 months"}
              </div>
            </div>

            <div className="flex items-end justify-between gap-1.5 h-28" data-testid="ledger-chart">
              {bins.map((b, i) => {
                const pct = (b.total / maxBin) * 100;
                const isCurrent = i === bins.length - 1;
                return (
                  <div key={b.startISO} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-gray-500"} h-3`}>
                      {b.total > 0 ? `${currency}${b.total.toFixed(0)}` : ""}
                    </div>
                    <div className={`w-full rounded-t-md relative overflow-hidden flex flex-col-reverse ${isDark ? "bg-white/5" : "bg-gray-100"}`} style={{ height: "70px" }}>
                      <div
                        className={`w-full transition-all ${
                          b.total === 0
                            ? ""
                            : isCurrent
                            ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                            : "bg-gradient-to-t from-emerald-500/60 to-emerald-400/40"
                        }`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <div className={`text-[10px] font-medium ${isCurrent ? (isDark ? "text-emerald-400" : "text-emerald-600") : isDark ? "text-slate-400" : "text-gray-500"}`}>
                      {b.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-chore rollup */}
          <div className={cardCls}>
            <div className={`flex items-center gap-1.5 mb-2 font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
              <Trophy className="w-4 h-4 text-amber-400" /> Per chore
            </div>
            {data.perChore.length === 0 ? (
              <div className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>No chores tracked yet.</div>
            ) : (
              <div className="space-y-1" data-testid="ledger-per-chore">
                {data.perChore.map(c => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${isDark ? "text-slate-100" : "text-gray-800"}`}>{c.title}</div>
                      <div className={`text-[10px] flex items-center gap-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                        <CalIcon className="w-3 h-3" /> {c.count} completions · last {agoLabel(c.lastCompleted)}
                      </div>
                    </div>
                    <div className={`text-sm font-mono font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                      {currency}{c.total.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={data.flat.length === 0}
              className={`flex-1 h-9 ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : ""}`}
              data-testid="ledger-export-csv"
            >
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
            <Button onClick={onClose} className="h-9 bg-indigo-500 hover:bg-indigo-600 text-white">
              <X className="w-4 h-4 mr-1.5" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
