import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Search, Check, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SUPPORTED_LANGUAGES, RTL_LANGS } from "../i18n";

/**
 * Rich language picker dialog — searchable flag grid.
 * Used from the header globe button and the Settings modal.
 */
export default function LanguagePicker({ isOpen, onClose, isDark }) {
  const { i18n } = useTranslation();
  const [query, setQuery] = useState("");

  const currentLng = (i18n.language || "en").split("-")[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.en && l.en.toLowerCase().includes(q))
    );
  }, [query]);

  const pick = (code) => {
    i18n.changeLanguage(code);
    try {
      localStorage.setItem("ir_lang", code);
    } catch (_e) {
      /* noop */
    }
    document.documentElement.lang = code;
    document.documentElement.dir = RTL_LANGS.includes(code) ? "rtl" : "ltr";
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    toast.success(`${lang?.flag || "🌐"} ${lang?.label}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-md ${
          isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"
        }`}
        data-testid="language-picker-modal"
      >
        <DialogHeader>
          <DialogTitle
            className={`flex items-center gap-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            <Globe className="w-5 h-5 text-indigo-500" /> Language / Idioma
          </DialogTitle>
          <DialogDescription
            className={isDark ? "text-slate-400" : "text-gray-500"}
          >
            {SUPPORTED_LANGUAGES.length} languages available. Content stays in
            the language you typed it — only the app UI translates.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-2">
          <Search
            className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isDark ? "text-slate-500" : "text-gray-400"
            }`}
          />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search language…"
            className={`pl-8 h-9 ${
              isDark
                ? "bg-black/20 border-white/10 text-white placeholder:text-slate-500"
                : ""
            }`}
            data-testid="lang-picker-search"
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
          {filtered.map((lng) => {
            const active = lng.code === currentLng;
            return (
              <button
                key={lng.code}
                type="button"
                onClick={() => pick(lng.code)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-left transition-all ${
                  active
                    ? isDark
                      ? "bg-indigo-500/20 border border-indigo-400 text-white"
                      : "bg-indigo-50 border border-indigo-400 text-indigo-900"
                    : isDark
                    ? "bg-white/5 hover:bg-white/10 border border-transparent text-slate-200"
                    : "bg-gray-50 hover:bg-gray-100 border border-transparent text-gray-800"
                }`}
                data-testid={`lang-option-${lng.code}`}
              >
                <span className="text-xl leading-none">{lng.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{lng.label}</div>
                  <div
                    className={`text-[10px] uppercase font-mono ${
                      isDark ? "text-slate-500" : "text-gray-400"
                    }`}
                  >
                    {lng.code}
                  </div>
                </div>
                {active && (
                  <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div
              className={`col-span-2 text-center py-6 text-sm ${
                isDark ? "text-slate-500" : "text-gray-400"
              }`}
            >
              No languages match &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
