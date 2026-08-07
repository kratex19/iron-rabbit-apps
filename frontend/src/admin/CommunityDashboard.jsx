/**
 * Community Dashboard — private admin console for Iron Rabbit.
 *
 * Purpose: review anonymous tip submissions arriving at `/api/community/tip`,
 * pick winners with one click, and promote them into the shipped Quick Guide
 * experience. Promoted tips appear as read-only "Community" cards inside the
 * matching guide's card carousel.
 *
 * Access: gated by AdminGate (checks the ADMIN_TOKEN backend env against a
 * token the admin pastes/saves locally). No login system — this is a lightweight
 * moderation surface for a solo launch.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck, RefreshCcw, ThumbsUp, ThumbsDown, Trash2, Loader2, MessageSquareQuote, Rocket, Filter, X, ClipboardPaste, Mail, Bell, BellOff, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminGate, { getStoredAdminToken, clearStoredAdminToken } from "./AdminGate";
import PasteTipsDialog from "./PasteTipsDialog";
import AnalyticsChart from "./AnalyticsChart";
import RecoveryFunnel from "./RecoveryFunnel";

const STATUS_TABS = [
  { key: "pending", label: "Pending" },
  { key: "promoted", label: "Promoted" },
  { key: "rejected", label: "Rejected" },
];

async function apiFetch(path, token, opts = {}) {
  const base = process.env.REACT_APP_BACKEND_URL;
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": token,
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`${res.status}`);
  if (res.status === 204) return null;
  try { return await res.json(); } catch { return null; }
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  } catch { return iso; }
}

export default function CommunityDashboard() {
  const [token, setToken] = useState(() => getStoredAdminToken());
  const [tips, setTips] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, promoted: 0, rejected: 0 });
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [digestBusy, setDigestBusy] = useState(false);
  const [digestStatus, setDigestStatus] = useState(null); // {enabled, last_sent_at, scheduler_next_run, ...}

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = status ? `?status_filter=${encodeURIComponent(status)}` : "";
      const data = await apiFetch(`/api/community/tips${q}`, token);
      setTips(Array.isArray(data?.tips) ? data.tips : []);
      setCounts(data?.counts || { pending: 0, promoted: 0, rejected: 0 });
    } catch (e) {
      if (String(e.message) === "unauthorized") {
        toast.error("Admin token rejected — sign in again");
        clearStoredAdminToken();
        setToken(null);
      } else {
        toast.error("Couldn't load tips");
      }
    } finally {
      setLoading(false);
    }
  }, [token, status]);

  useEffect(() => { if (token) load(); }, [token, load]);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    try {
      const s = await apiFetch(`/api/community/digest/status`, token);
      setDigestStatus(s);
    } catch (e) {
      // Silent — status is a decoration, not blocking.
    }
  }, [token]);

  useEffect(() => { if (token) loadStatus(); }, [token, loadStatus]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tips;
    return tips.filter(t =>
      (t.heading || "").toLowerCase().includes(q) ||
      (t.body || "").toLowerCase().includes(q) ||
      (t.resource_id || "").toLowerCase().includes(q)
    );
  }, [tips, query]);

  const promote = async (tip) => {
    setBusyId(tip.id);
    try {
      await apiFetch(`/api/community/tips/${tip.id}/promote`, token, { method: "POST" });
      toast.success("Promoted — now visible in Quick Guide");
      load();
    } catch (e) {
      toast.error("Couldn't promote");
    } finally { setBusyId(null); }
  };

  const reject = async (tip) => {
    setBusyId(tip.id);
    try {
      await apiFetch(`/api/community/tips/${tip.id}/reject`, token, { method: "POST" });
      toast.success("Marked as rejected");
      load();
    } catch (e) {
      toast.error("Couldn't reject");
    } finally { setBusyId(null); }
  };

  const hardDelete = async (tip) => {
    if (!window.confirm("Delete this tip permanently? This cannot be undone.")) return;
    setBusyId(tip.id);
    try {
      await apiFetch(`/api/community/tips/${tip.id}`, token, { method: "DELETE" });
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error("Couldn't delete");
    } finally { setBusyId(null); }
  };

  const signOut = () => {
    clearStoredAdminToken();
    setToken(null);
    setTips([]);
    setCounts({ pending: 0, promoted: 0, rejected: 0 });
  };

  const sendDigest = async (dryRun = false) => {
    setDigestBusy(true);
    try {
      const url = `/api/community/digest/send${dryRun ? "?dry_run=1" : ""}`;
      const data = await apiFetch(url, token, { method: "POST" });
      if (data?.ok) {
        if (dryRun) {
          toast.success(`Digest preview OK · ${data.counts.pending} pending, ${data.counts.promoted} promoted`);
        } else if (data.sent_to) {
          toast.success(`Digest sent to ${data.sent_to}`);
        } else {
          toast.info(data.reason || "Digest processed");
        }
      } else {
        toast.error(data?.reason || "Digest failed");
      }
      loadStatus();
    } catch (e) {
      if (String(e.message) === "unauthorized") {
        toast.error("Admin token rejected");
        clearStoredAdminToken();
        setToken(null);
      } else {
        toast.error("Digest send failed");
      }
    } finally { setDigestBusy(false); }
  };

  const toggleDigest = async () => {
    if (!digestStatus) return;
    setDigestBusy(true);
    try {
      const s = await apiFetch(`/api/community/digest/toggle`, token, {
        method: "POST",
        body: JSON.stringify({ enabled: !digestStatus.enabled }),
      });
      setDigestStatus(s);
      toast.success(s.enabled ? "Weekly digest turned ON" : "Weekly digest turned OFF");
    } catch (e) {
      toast.error("Couldn't toggle digest");
    } finally { setDigestBusy(false); }
  };

  if (!token) {
    return <AdminGate onAuthenticated={(t) => setToken(t)} />;
  }

  return (
    <div className="min-h-screen bg-[#0B1221] text-white" data-testid="community-dashboard">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-fuchsia-500">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Community Dashboard</h1>
            <div className="text-xs text-slate-400">
              Review anonymous tip submissions · promote winners into the shipped Quick Guide
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="text-slate-300 border-white/10 hover:bg-white/5" data-testid="admin-sign-out">
            Sign out
          </Button>
        </div>

        {/* Featured tip analytics — top of dashboard so I know what lands */}
        <AnalyticsChart apiFetch={apiFetch} token={token} />

        {/* Recovery funnel — one number answers "is the magic link worth it?" */}
        <RecoveryFunnel apiFetch={apiFetch} token={token} />

        {/* Digest schedule strip — quick at-a-glance state of the weekly cron.
            Toggle here doubles as the "unsubscribe re-enable" surface. */}
        {digestStatus && (
          <div
            className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 flex flex-wrap items-center gap-3"
            data-testid="digest-status-strip"
          >
            <div className="flex items-center gap-2">
              {digestStatus.enabled
                ? <Bell className="w-4 h-4 text-emerald-400" />
                : <BellOff className="w-4 h-4 text-slate-500" />
              }
              <div className="text-xs">
                <div className={`font-semibold ${digestStatus.enabled ? "text-emerald-300" : "text-slate-400"}`}>
                  Weekly digest {digestStatus.enabled ? "ON" : "OFF (unsubscribed)"}
                </div>
                <div className="text-[10px] text-slate-500">
                  {digestStatus.enabled && digestStatus.scheduler_next_run
                    ? <><Calendar className="w-3 h-3 inline mr-1 -mt-0.5" />Next: {new Date(digestStatus.scheduler_next_run).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · </>
                    : null}
                  {digestStatus.last_sent_at
                    ? <>Last sent {new Date(digestStatus.last_sent_at).toLocaleDateString()}</>
                    : "Never sent"}
                  {!digestStatus.resend_key_configured && (
                    <span className="text-amber-400 ml-2">· RESEND_API_KEY missing</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={toggleDigest}
              disabled={digestBusy}
              className="text-slate-300 border-white/10 hover:bg-white/5"
              data-testid="digest-toggle"
            >
              {digestStatus.enabled ? "Turn OFF" : "Turn ON"}
            </Button>
          </div>
        )}

        {/* Status tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={`px-3 h-8 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                status === tab.key
                  ? "bg-indigo-500 text-white"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
              data-testid={`admin-tab-${tab.key}`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${status === tab.key ? "bg-white/20" : "bg-white/10"}`}>
                {counts[tab.key] ?? 0}
              </span>
            </button>
          ))}
          <div className="flex-1" />
          <div className="relative">
            <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter…"
              className="pl-8 pr-2 h-8 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
              data-testid="admin-filter-input"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10"
                aria-label="Clear filter"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={load} className="text-slate-300 border-white/10 hover:bg-white/5" data-testid="admin-refresh">
            <RefreshCcw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setPasteOpen(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
            data-testid="admin-bulk-paste"
          >
            <ClipboardPaste className="w-3.5 h-3.5 mr-1" /> Bulk paste
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendDigest(false)}
            disabled={digestBusy}
            className="text-slate-300 border-white/10 hover:bg-white/5"
            title="Send the current pending list as an email digest"
            data-testid="admin-send-digest"
          >
            {digestBusy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1" />}
            Send digest
          </Button>
        </div>

        {/* List */}
        {loading && tips.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500" data-testid="admin-empty">
            <MessageSquareQuote className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <div className="text-sm">
              {status === "pending" && "No pending tips — quiet inbox."}
              {status === "promoted" && "No promoted tips yet."}
              {status === "rejected" && "No rejected tips."}
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map(tip => (
              <li
                key={tip.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-2"
                data-testid={`admin-tip-${tip.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {tip.heading || <span className="italic text-slate-500">Untitled tip</span>}
                    </div>
                    <div className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">
                      {tip.body || <span className="italic text-slate-500">No body</span>}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-2 uppercase tracking-wide flex items-center gap-3 flex-wrap">
                      <span data-testid={`admin-tip-resource-${tip.id}`}>{tip.resource_id || "—"}</span>
                      <span>·</span>
                      <span>submitted {formatDate(tip.created_at)}</span>
                      {tip.promoted_at && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-400">promoted {formatDate(tip.promoted_at)}</span>
                        </>
                      )}
                      {tip.contributor_opt_in && tip.contributor_email && (
                        <>
                          <span>·</span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                              tip.thank_you_sent_at
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-indigo-500/15 text-indigo-300"
                            }`}
                            data-testid={`admin-tip-optin-${tip.id}`}
                            title={tip.thank_you_sent_at ? "Thank-you email sent" : "Will email contributor on promote"}
                          >
                            <Mail className="w-2.5 h-2.5" />
                            {tip.thank_you_sent_at ? "notified" : "opt-in"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    tip.status === "promoted" ? "bg-emerald-500/20 text-emerald-300"
                    : tip.status === "rejected" ? "bg-red-500/15 text-red-300"
                    : "bg-amber-500/20 text-amber-300"
                  }`}>
                    {tip.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {tip.status !== "promoted" && (
                    <Button
                      size="sm"
                      onClick={() => promote(tip)}
                      disabled={busyId === tip.id}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-xs"
                      data-testid={`admin-promote-${tip.id}`}
                    >
                      <Rocket className="w-3.5 h-3.5 mr-1" />
                      Promote to shipped
                    </Button>
                  )}
                  {tip.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reject(tip)}
                      disabled={busyId === tip.id}
                      className="border-white/10 text-slate-300 hover:bg-white/5 h-8 text-xs"
                      data-testid={`admin-reject-${tip.id}`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                  )}
                  {tip.status === "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => promote(tip)}
                      disabled={busyId === tip.id}
                      className="border-white/10 text-slate-300 hover:bg-white/5 h-8 text-xs"
                      data-testid={`admin-repromote-${tip.id}`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                      Restore
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => hardDelete(tip)}
                    disabled={busyId === tip.id}
                    className="border-red-500/20 text-red-300 hover:bg-red-500/10 h-8 text-xs ml-auto"
                    data-testid={`admin-delete-${tip.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PasteTipsDialog
        isOpen={pasteOpen}
        onClose={() => setPasteOpen(false)}
        mode="admin"
        adminToken={token}
        onFinished={load}
      />
    </div>
  );
}
