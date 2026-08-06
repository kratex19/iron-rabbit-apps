/**
 * AdminGate — password prompt for the Community Dashboard.
 *
 * The Iron Rabbit app is a single-user offline PWA; there is no user table.
 * For admin moderation we compare a token stored in the backend's ADMIN_TOKEN
 * env against what the admin pastes in here. On success we cache the token in
 * localStorage (session-persistent) so subsequent visits skip the prompt.
 */

import React, { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "irr.admin_token";

export function getStoredAdminToken() {
  try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
}

export function saveStoredAdminToken(token) {
  try { localStorage.setItem(STORAGE_KEY, token); } catch { /* ignore quota */ }
}

export function clearStoredAdminToken() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export default function AdminGate({ onAuthenticated }) {
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const value = token.trim();
    if (!value) return;
    setBusy(true);
    try {
      const base = process.env.REACT_APP_BACKEND_URL;
      const res = await fetch(`${base}/api/admin/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": value },
      });
      if (res.ok) {
        saveStoredAdminToken(value);
        onAuthenticated(value);
      } else if (res.status === 401) {
        toast.error("That token doesn't match");
      } else {
        toast.error("Sign-in failed");
      }
    } catch (e) {
      toast.error("Couldn't reach server — check connection");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1221] text-white flex items-center justify-center p-4" data-testid="admin-gate">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white/[0.03] border border-white/10 p-6 space-y-4">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-fuchsia-500">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-semibold">Admin sign-in</h1>
          <p className="text-xs text-slate-400 max-w-[280px]">
            Paste the ADMIN_TOKEN from the backend .env to review anonymous community tips.
          </p>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Admin token</label>
          <div className="relative mt-1">
            <Input
              type={show ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="irr-admin-…"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 pr-10 h-10"
              autoFocus
              data-testid="admin-token-input"
            />
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              aria-label={show ? "Hide token" : "Show token"}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button
          type="submit"
          disabled={!token.trim() || busy}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white h-10"
          data-testid="admin-submit"
        >
          {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
          {busy ? "Verifying…" : "Enter dashboard"}
        </Button>
      </form>
    </div>
  );
}
