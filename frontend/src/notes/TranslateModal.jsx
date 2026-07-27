import React, { useState } from "react";
import { toast } from "sonner";
import { Languages, Loader2, ArrowDownCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_LANGUAGES } from "../i18n";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * On-demand LLM translation of note content. Uses the backend `/api/translate`
 * endpoint (Emergent LLM key). Result is appended below the original with a
 * separator so the user's canonical content is never overwritten.
 *
 * Props:
 *   isOpen, onClose            — modal control
 *   text                       — current note.content
 *   defaultTarget              — optional preselected language code
 *   onAppend(translatedText)   — parent handler: appends below original
 *   isDark
 */
export default function TranslateModal({ isOpen, onClose, text, defaultTarget = null, onAppend, isDark }) {
  const [target, setTarget] = useState(defaultTarget || "es");
  const [translated, setTranslated] = useState("");
  const [busy, setBusy] = useState(false);

  const targetLangObj = SUPPORTED_LANGUAGES.find(l => l.code === target) || SUPPORTED_LANGUAGES[0];

  const handleTranslate = async () => {
    const src = (text || "").trim();
    if (!src) {
      toast.error("Nothing to translate — the note is empty.");
      return;
    }
    if (src.length > 12000) {
      toast.error("Text is too long (12,000 char max). Shorten the note first.");
      return;
    }
    setBusy(true);
    setTranslated("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: src,
          target_lang: targetLangObj.en || targetLangObj.label,
          source_lang: "auto",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setTranslated(data.translated || "");
    } catch (e) {
      toast.error(`Translation failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleAppend = () => {
    if (!translated.trim()) return;
    const block = `\n\n— ${targetLangObj.label} (${targetLangObj.flag}) —\n${translated.trim()}`;
    onAppend(block);
    toast.success(`Appended ${targetLangObj.label} translation`);
    onClose();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(translated);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-lg max-h-[85vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`}
        data-testid="translate-modal"
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <Languages className="w-5 h-5 text-indigo-400" /> Translate
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Powered by Claude Sonnet — appends the translation below your original text (never overwrites).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Translate to
            </label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className={`h-9 text-sm ${isDark ? "bg-black/20 border-white/10 text-white" : ""}`} data-testid="translate-target-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? "bg-[#0B1221] border-white/10 text-white" : ""}>
                {SUPPORTED_LANGUAGES.map(l => (
                  <SelectItem key={l.code} value={l.code} className="text-sm">
                    <span className="flex items-center gap-2">
                      <span className="text-base leading-none">{l.flag}</span> {l.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Original ({(text || "").length.toLocaleString()} chars)
            </label>
            <div
              className={`rounded-md border p-2.5 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto ${
                isDark ? "bg-black/20 border-white/10 text-slate-300" : "bg-gray-50 border-gray-200 text-gray-700"
              }`}
              data-testid="translate-original"
            >
              {text ? text : <span className="italic opacity-60">Note is empty.</span>}
            </div>
          </div>

          <Button
            onClick={handleTranslate}
            disabled={busy || !text?.trim()}
            className="w-full h-9 bg-indigo-500 hover:bg-indigo-600 text-white"
            data-testid="translate-run-btn"
          >
            {busy ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Translating…</>
            ) : (
              <><Languages className="w-4 h-4 mr-1.5" /> Translate to {targetLangObj.label}</>
            )}
          </Button>

          {translated && (
            <div data-testid="translate-result">
              <div className="flex items-center justify-between mb-1">
                <label className={`text-xs flex items-center gap-1.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  <span className="text-base leading-none">{targetLangObj.flag}</span> {targetLangObj.label}
                </label>
                <button
                  onClick={handleCopy}
                  className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                    isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                  data-testid="translate-copy-btn"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <div
                className={`rounded-md border p-2.5 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto ${
                  isDark ? "bg-black/20 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                }`}
              >
                {translated}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className={isDark ? "border-white/10 text-slate-300" : ""}>
            Close
          </Button>
          <Button
            onClick={handleAppend}
            disabled={!translated}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            data-testid="translate-append-btn"
          >
            <ArrowDownCircle className="w-4 h-4 mr-1.5" /> Append below original
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
