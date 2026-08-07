/**
 * CommunityShareDialog — polished replacement for the window.confirm+prompt
 * flow that used to guard `/api/community/tip` submissions.
 *
 * Renders a themed modal showing:
 *  - one-time consent line (only until the user checks "don't ask again")
 *  - the tip preview being submitted (read-only)
 *  - optional email field + "Ping me when it goes live" checkbox
 *  - Cancel / Share
 *
 * Never blocks anonymous submissions — leave the fields empty and share.
 */

import React, { useState } from "react";
import { Sparkles, X, Mail, AtSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICK_RE = /^[A-Za-z0-9_]{2,20}$/;

export default function CommunityShareDialog({
  isOpen,
  onClose,
  card,             // { heading, body, theme } from the caller
  consentGranted,   // did the user already opt in to sharing?
  onConfirm,        // (payload) => Promise<void> — payload = { heading, body, theme, contributor_email, contributor_opt_in }
}) {
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [nickname, setNickname] = useState("");
  const [rememberConsent, setRememberConsent] = useState(consentGranted);
  const [busy, setBusy] = useState(false);

  if (!isOpen || !card) return null;

  const emailValid = !email || EMAIL_RE.test(email.trim());
  const trimmedNick = nickname.trim();
  const nicknameValid = !trimmedNick || NICK_RE.test(trimmedNick);

  const submit = async () => {
    if (!emailValid || !nicknameValid) return;
    setBusy(true);
    try {
      await onConfirm({
        heading: card.heading || "",
        body: card.body || "",
        theme: card.theme?.value || null,
        contributor_email: optIn ? email.trim() : "",
        contributor_opt_in: !!(optIn && email.trim()),
        nickname: trimmedNick || null,
        remember_consent: rememberConsent,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" data-testid="community-share-dialog">
      <div className="w-full max-w-md rounded-2xl bg-[#0F172A] border border-white/10 shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10b981 0%,#0284c7 100%)" }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">Share as community tip</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Anonymous by default</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Consent line — only shown until the user checks 'don't ask again' */}
          {!consentGranted && (
            <p className="text-xs text-slate-400 leading-relaxed" data-testid="share-consent-line">
              The best tips are baked into future updates for everyone. Nothing that
              identifies you is sent — just the heading, body, and which guide it belongs to.
            </p>
          )}

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Preview</div>
            <div className="text-sm font-semibold text-white">{card.heading || <span className="italic text-slate-500">Untitled</span>}</div>
            {card.body && <div className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">{card.body}</div>}
          </div>

          {/* Optional nickname — appears on the Community card + Featured strip
              + Contributor Wall when the tip is promoted. Left blank = fully anonymous. */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
            <label className="text-sm text-white font-medium flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-fuchsia-400" />
              Nickname (optional)
            </label>
            <Input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. cook_ninja"
              maxLength={20}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-9 text-sm"
              data-testid="share-nickname-input"
            />
            <div className="text-[11px] text-slate-500">
              Letters, numbers, underscore · 2-20 chars · shown next to your tip
            </div>
            {!nicknameValid && (
              <div className="text-[11px] text-red-400">Only letters, numbers, and underscore. Try again or leave blank.</div>
            )}
          </div>

          {/* Opt-in email — the whole reason this dialog exists */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(e) => setOptIn(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-500"
                data-testid="share-optin-checkbox"
              />
              <div className="flex-1">
                <div className="text-sm text-white font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  Ping me when it goes live
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  We&apos;ll email you once — only if this tip is promoted.
                </div>
              </div>
            </label>
            {optIn && (
              <div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-9 text-sm"
                  data-testid="share-email-input"
                  autoFocus
                />
                {!emailValid && (
                  <div className="text-[11px] text-red-400 mt-1">Enter a valid email or uncheck the box</div>
                )}
              </div>
            )}
          </div>

          {!consentGranted && (
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
              <input
                type="checkbox"
                checked={rememberConsent}
                onChange={(e) => setRememberConsent(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-500"
                data-testid="share-remember-consent"
              />
              Don&apos;t ask this again — I&apos;m happy to share future tips anonymously.
            </label>
          )}
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-white/10">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-white/10 text-slate-300 hover:bg-white/5"
            disabled={busy}
          >
            Cancel
          </Button>
          <div className="flex-1" />
          <Button
            onClick={submit}
            disabled={busy || !emailValid || !nicknameValid || (optIn && !email.trim())}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            data-testid="share-submit"
          >
            {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
            {busy ? "Sharing…" : "Share tip"}
          </Button>
        </div>
      </div>
    </div>
  );
}
