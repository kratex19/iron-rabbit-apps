/**
 * ScreenshotFreshness — compact "Play carousel freshness" strip.
 *
 * Sits between the Recovery Funnel and the digest strip on
 * /admin/community. Shows the last regen's status + timestamp and offers a
 * one-click "Regen now" that fires POST /api/admin/screenshots/regen and
 * polls status every 3s while a run is active. Zero recharts, no visual
 * churn — a strip, not a panel.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, RefreshCcw, Loader2, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatRelative(iso) {
  if (!iso) return "never";
  try {
    const now = Date.now();
    const then = Date.parse(iso);
    const diff = Math.max(0, now - then);
    const mins = Math.round(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  } catch { return iso; }
}

export default function ScreenshotFreshness({ apiFetch, token }) {
  const [status, setStatus] = useState(null);   // {running, recent[]}
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/admin/screenshots/status`, token);
      setStatus(res || { running: false, recent: [] });
    } catch (e) {
      // 404 means the endpoint isn't wired yet on this build. Silently hide.
      setStatus({ running: false, recent: [], _unavailable: true });
    }
  }, [apiFetch, token]);

  useEffect(() => { load(); }, [load]);

  // Poll every 3s while a regen is running; stop when it finishes.
  useEffect(() => {
    if (!status?.running) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(load, 3000);
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [status?.running, load]);

  const regen = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/screenshots/regen`, token, { method: "POST" });
      toast.success("Regen started — refreshing status…");
      // Small delay so the server has time to insert the running-row.
      setTimeout(load, 600);
    } catch (e) {
      if (String(e.message) === "409") {
        toast.info("A regen is already running");
      } else {
        toast.error("Couldn't start regen");
      }
    } finally { setBusy(false); }
  };

  if (!status || status._unavailable) return null;

  const last = (status.recent || [])[0];
  const running = !!status.running;
  const lastStatus = last?.status || "";
  const isError = lastStatus === "error" || lastStatus === "crashed";

  return (
    <div
      className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 flex flex-wrap items-center gap-3"
      data-testid="screenshot-freshness-strip"
    >
      <Camera className={`w-4 h-4 ${running ? "text-indigo-300" : isError ? "text-amber-300" : "text-emerald-300"}`} />
      <div className="text-xs flex-1 min-w-0">
        <div className="font-semibold text-white flex items-center gap-2">
          Play carousel
          {running && (
            <span className="inline-flex items-center gap-1 text-indigo-300 text-[10px] font-medium">
              <Loader2 className="w-3 h-3 animate-spin" /> regen running
            </span>
          )}
          {!running && lastStatus === "ok" && (
            <span className="inline-flex items-center gap-1 text-emerald-300 text-[10px] font-medium">
              <CheckCircle2 className="w-3 h-3" /> {last?.framed_count ?? 0} framed shots ready
            </span>
          )}
          {!running && isError && (
            <span className="inline-flex items-center gap-1 text-amber-300 text-[10px] font-medium" data-testid="screenshot-freshness-error">
              <AlertTriangle className="w-3 h-3" /> last run {lastStatus}
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
          <Clock className="w-3 h-3" />
          {last?.finished_at
            ? <>Last refreshed {formatRelative(last.finished_at)}</>
            : last?.started_at
              ? <>Started {formatRelative(last.started_at)} — waiting…</>
              : <>Never run — click Regen now to build the first carousel</>}
          {last?.trigger && (
            <>
              <span>·</span>
              <span className="uppercase tracking-wider">{last.trigger}</span>
            </>
          )}
          {isError && last?.error && (
            <>
              <span>·</span>
              <span className="text-amber-400/80 truncate max-w-[420px]" title={last.error}>{String(last.error).slice(0, 80)}</span>
            </>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={regen}
        disabled={busy || running}
        className="border-white/10 text-slate-200 hover:bg-white/5 h-8 text-xs"
        data-testid="screenshot-regen-now"
      >
        {busy || running ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5 mr-1" />}
        {running ? "Running…" : "Regen now"}
      </Button>
    </div>
  );
}
