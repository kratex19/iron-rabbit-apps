/**
 * PasteTipsDialog — modal for the "Import from Text" flow.
 *
 * Two modes:
 *  - mode="admin" — inside the Community Dashboard. After parsing, the admin
 *    can Save-all-as-pending (submit each card via /api/community/tip) or
 *    Save-and-promote-all (submit + immediately promote using the admin
 *    endpoints). Requires the admin token.
 *  - mode="quickguide" — inside QuickGuideModal. After parsing, cards are
 *    added as user cards on the currently-open guide via `onSaveAsUserCards`.
 *
 * The dialog handles: text input → parse call → editable preview list →
 * per-card include toggle → save. Deliberately kept dumb; parsing lives on
 * the backend so the same LLM prompt is shared between both modes.
 */

import React, { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, X, Check, Trash2, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

async function parseTips(text) {
  const base = process.env.REACT_APP_BACKEND_URL;
  const res = await fetch(`${base}/api/community/tips/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: `${res.status}` }));
    throw new Error(detail.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function submitTip(card, resourceId) {
  const base = process.env.REACT_APP_BACKEND_URL;
  const res = await fetch(`${base}/api/community/tip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      heading: card.heading,
      body: card.body,
      resource_id: resourceId || "",
    }),
  });
  if (!res.ok) throw new Error("submit failed");
  return res.json();
}

async function promoteTip(id, token) {
  const base = process.env.REACT_APP_BACKEND_URL;
  const res = await fetch(`${base}/api/community/tips/${id}/promote`, {
    method: "POST",
    headers: { "X-Admin-Token": token },
  });
  if (!res.ok) throw new Error("promote failed");
  return res.json();
}

export default function PasteTipsDialog({
  isOpen,
  onClose,
  mode = "quickguide",     // "admin" | "quickguide"
  adminToken = "",
  resourceId = "",
  onSaveAsUserCards,       // quickguide-mode callback: (cards) => void
  onFinished,              // admin-mode callback: () => void — parent should refresh
}) {
  const [text, setText] = useState("");
  const [resource, setResource] = useState(resourceId || "");
  const [busy, setBusy] = useState(false);
  const [cards, setCards] = useState(null);  // parsed cards (null = not parsed yet)
  const [selected, setSelected] = useState({}); // { index: bool }

  if (!isOpen) return null;

  const reset = () => {
    setText(""); setCards(null); setSelected({}); setBusy(false);
  };
  const close = () => { reset(); onClose(); };

  const runParse = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { cards: parsed } = await parseTips(text.trim());
      if (!parsed || parsed.length === 0) {
        toast.error("No tips detected — try adding blank lines between them");
        return;
      }
      setCards(parsed);
      // default: all selected
      setSelected(Object.fromEntries(parsed.map((_, i) => [i, true])));
    } catch (e) {
      toast.error(String(e.message || "Parse failed"));
    } finally { setBusy(false); }
  };

  const editCard = (idx, patch) => {
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  };
  const removeCard = (idx) => {
    setCards(prev => prev.filter((_, i) => i !== idx));
    setSelected(prev => {
      const next = { ...prev }; delete next[idx];
      // reindex is a pain — since we filter by index in save, just leave gaps.
      return next;
    });
  };
  const toggleSelect = (idx) => {
    setSelected(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const chosen = () => (cards || []).filter((_, i) => selected[i]);

  const saveAsUserCards = () => {
    const list = chosen();
    if (list.length === 0) return;
    onSaveAsUserCards && onSaveAsUserCards(list);
    toast.success(`Added ${list.length} card${list.length === 1 ? "" : "s"}`);
    close();
  };

  const submitAsPending = async () => {
    const list = chosen();
    if (list.length === 0) return;
    setBusy(true);
    try {
      for (const c of list) {
        await submitTip(c, resource);
      }
      toast.success(`Submitted ${list.length} tip${list.length === 1 ? "" : "s"}`);
      onFinished && onFinished();
      close();
    } catch (e) {
      toast.error(String(e.message || "Submit failed"));
    } finally { setBusy(false); }
  };

  const submitAndPromote = async () => {
    const list = chosen();
    if (list.length === 0) return;
    if (!adminToken) { toast.error("Missing admin token"); return; }
    setBusy(true);
    try {
      let promoted = 0;
      for (const c of list) {
        const { id } = await submitTip(c, resource);
        await promoteTip(id, adminToken);
        promoted += 1;
      }
      toast.success(`Promoted ${promoted} tip${promoted === 1 ? "" : "s"} to shipped`);
      onFinished && onFinished();
      close();
    } catch (e) {
      toast.error(String(e.message || "Promote failed"));
    } finally { setBusy(false); }
  };

  const chosenCount = chosen().length;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" data-testid="paste-tips-dialog">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0F172A] border border-white/10 shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b border-white/10">
          <ClipboardPaste className="w-4 h-4 text-indigo-400" />
          <div className="text-sm font-semibold text-white flex-1">
            Import from Text
            <span className="text-[10px] text-slate-500 font-normal ml-2 uppercase tracking-wider">
              {mode === "admin" ? "Admin bulk import" : "Add multiple cards"}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!cards ? (
            <>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Paste any text — an LLM will split it into clean cards
              </label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste tips, notes, or short paragraphs here.\n\nSeparate different tips with a blank line for best results.\n\nIron Rabbit will structure each into a clean heading + body."
                rows={12}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 resize-none text-sm"
                data-testid="paste-tips-textarea"
                maxLength={8000}
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{text.length}/8000</span>
                {mode === "admin" && (
                  <div className="flex items-center gap-2">
                    <span>Resource ID</span>
                    <Input
                      value={resource}
                      onChange={(e) => setResource(e.target.value)}
                      placeholder="IRR-1000"
                      className="h-7 text-xs bg-white/5 border-white/10 text-white w-24"
                      data-testid="paste-tips-resource-input"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                Preview · {cards.length} card{cards.length === 1 ? "" : "s"} · {chosenCount} selected
              </div>
              <ul className="space-y-2" data-testid="paste-tips-preview-list">
                {cards.map((c, i) => (
                  <li
                    key={i}
                    className={`rounded-lg border p-3 transition-colors ${
                      selected[i]
                        ? "bg-indigo-500/10 border-indigo-400/40"
                        : "bg-white/[0.03] border-white/10 opacity-60"
                    }`}
                    data-testid={`paste-tips-card-${i}`}
                  >
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelect(i)}
                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          selected[i]
                            ? "bg-indigo-500 text-white"
                            : "bg-white/5 border border-white/10 text-transparent"
                        }`}
                        data-testid={`paste-tips-select-${i}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex-1 space-y-1.5">
                        <Input
                          value={c.heading}
                          onChange={(e) => editCard(i, { heading: e.target.value })}
                          className="bg-white/5 border-white/10 text-white text-sm font-semibold h-8"
                          data-testid={`paste-tips-heading-${i}`}
                        />
                        <Textarea
                          value={c.body}
                          onChange={(e) => editCard(i, { body: e.target.value })}
                          rows={2}
                          className="bg-white/5 border-white/10 text-slate-300 text-xs resize-none"
                          data-testid={`paste-tips-body-${i}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCard(i)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                        aria-label="Remove card"
                        data-testid={`paste-tips-remove-${i}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-white/10">
          {!cards ? (
            <>
              <div className="flex-1" />
              <Button
                onClick={close}
                variant="outline"
                className="border-white/10 text-slate-300 hover:bg-white/5"
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                onClick={runParse}
                disabled={!text.trim() || busy}
                className="bg-indigo-500 hover:bg-indigo-600 text-white"
                data-testid="paste-tips-parse"
              >
                {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                {busy ? "Parsing…" : "Structure with AI"}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => { setCards(null); setSelected({}); }}
                variant="outline"
                className="border-white/10 text-slate-300 hover:bg-white/5"
                disabled={busy}
              >
                Re-parse
              </Button>
              <div className="flex-1" />
              {mode === "quickguide" && (
                <Button
                  onClick={saveAsUserCards}
                  disabled={chosenCount === 0 || busy}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  data-testid="paste-tips-save-usercards"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Add {chosenCount} to my cards
                </Button>
              )}
              {mode === "admin" && (
                <>
                  <Button
                    onClick={submitAsPending}
                    disabled={chosenCount === 0 || busy}
                    variant="outline"
                    className="border-white/10 text-slate-300 hover:bg-white/5"
                    data-testid="paste-tips-save-pending"
                  >
                    {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                    Save as pending ({chosenCount})
                  </Button>
                  <Button
                    onClick={submitAndPromote}
                    disabled={chosenCount === 0 || busy}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    data-testid="paste-tips-save-promote"
                  >
                    {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                    Promote all ({chosenCount})
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
