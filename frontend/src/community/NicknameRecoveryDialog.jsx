/**
 * NicknameRecoveryDialog — two-step recovery flow:
 *   1. User requests a code — backend emails the ORIGINAL owner.
 *   2. User enters the 6-digit code + a new email to take ownership.
 *
 * Anti-hijack: the code goes to the original owner's inbox, not the caller's.
 * If email isn't configured on the server, step 1 returns delivered=false —
 * we tell the user "email disabled, contact support" instead of leaking the code.
 */

import React, { useState } from "react";
import { toast } from "sonner";
import { X, KeyRound, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

async function api(path, body) {
  const base = process.env.REACT_APP_BACKEND_URL;
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function formatLockUntil(iso) {
  if (!iso) return "later";
  try {
    const dt = new Date(iso);
    const mins = Math.max(1, Math.round((dt.getTime() - Date.now()) / 60000));
    if (mins >= 60) return `about ${Math.round(mins / 60)}h`;
    return `${mins} min`;
  } catch (e) { return "later"; }
}

export default function NicknameRecoveryDialog({ isOpen, nickname, onClose }) {
  const [step, setStep] = useState(1);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isOpen || !nickname) return null;

  const close = () => {
    setStep(1); setMaskedEmail(""); setCode(""); setNewEmail(""); setBusy(false);
    onClose();
  };

  const requestCode = async () => {
    setBusy(true);
    try {
      const res = await api(`/api/community/nicknames/${encodeURIComponent(nickname)}/recovery`, { nickname });
      if (res.reason === "not-claimed") {
        toast.info("This nickname isn't claimed — just share a tip with it to claim it");
        close(); return;
      }
      if (res.reason === "locked") {
        toast.error(`Too many attempts. Try again in ${formatLockUntil(res.locked_until)}.`);
        close(); return;
      }
      setMaskedEmail(res.masked_email || "");
      if (res.delivered) {
        toast.success(`Code sent to ${res.masked_email || "the owner"}`);
      } else {
        toast.info("Server email is disabled — contact the admin to retrieve the code");
      }
      setStep(2);
    } catch (e) {
      toast.error(String(e.message || "Couldn't request code"));
    } finally { setBusy(false); }
  };

  const verifyCode = async () => {
    if (!code.trim() || !newEmail.trim()) return;
    setBusy(true);
    try {
      await api(`/api/community/nicknames/${encodeURIComponent(nickname)}/recovery/verify`, {
        nickname, code: code.trim(), new_email: newEmail.trim(),
      });
      // Save ownership locally so the Wall renders the "You" badge.
      try {
        const prev = JSON.parse(localStorage.getItem("irr.owned_nicknames") || "[]");
        localStorage.setItem("irr.owned_nicknames", JSON.stringify(Array.from(new Set([...prev, nickname])).slice(-50)));
      } catch (e) { /* ignore */ }
      toast.success(`@${nickname} is now yours — welcome back!`);
      close();
      // Reload so the Wall re-fetches with new ownership.
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      if (e.status === 429) {
        toast.error("Too many attempts — try again in about an hour.");
        close(); return;
      }
      toast.error(String(e.message || "Couldn't verify"));
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" data-testid="recovery-dialog">
      <div className="w-full max-w-md rounded-2xl bg-[#0F172A] border border-white/10 shadow-2xl flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-fuchsia-500">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div className="text-sm font-semibold text-white flex-1">Recover @{nickname}</div>
          <button
            type="button"
            onClick={close}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {step === 1 && (
            <>
              <p className="text-xs text-slate-400 leading-relaxed">
                We&apos;ll email a 6-digit unlock code to the address that originally claimed
                <strong className="text-white"> @{nickname}</strong>. Enter that code on the next screen
                to move ownership to a new email.
              </p>
              <div className="rounded-lg bg-amber-500/10 border border-amber-400/20 p-3 text-[11px] text-amber-300">
                For your safety, we never reveal the original owner&apos;s full email. You must have
                access to that inbox to complete recovery.
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-xs text-slate-400">
                Code sent to <strong className="text-white">{maskedEmail || "the original owner"}</strong>.
                Enter it below along with the new email you&apos;d like to own <strong className="text-white">@{nickname}</strong>.
              </p>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Unlock code</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  autoFocus
                  className="bg-white/5 border-white/10 text-white h-10 mt-1 text-center text-lg tracking-[0.5em] font-bold"
                  data-testid="recovery-code-input"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">New email address</label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-white/5 border-white/10 text-white h-9 mt-1"
                  data-testid="recovery-newemail-input"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-white/10">
          <Button onClick={close} variant="outline" disabled={busy} className="border-white/10 text-slate-300 hover:bg-white/5">
            Cancel
          </Button>
          <div className="flex-1" />
          {step === 1 ? (
            <Button onClick={requestCode} disabled={busy} className="bg-indigo-500 hover:bg-indigo-600 text-white" data-testid="recovery-send-code">
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <KeyRound className="w-4 h-4 mr-1.5" />}
              Send unlock code
            </Button>
          ) : (
            <Button
              onClick={verifyCode}
              disabled={busy || code.length !== 6 || !newEmail.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              data-testid="recovery-verify"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-1.5" />}
              Take ownership
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
