import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SUPPORTED_LANGUAGES, RTL_LANGS } from "./index";

const SUGGESTED_KEY = "ir_lang_suggested";
const CURRENT_KEY = "ir_lang";

/**
 * On first launch (per device), if the browser/OS language is one of our
 * supported locales AND differs from the currently active language, show a
 * one-time toast offering to switch. Dismissing or accepting marks the flag
 * so we never nag again.
 */
export default function useLanguageSuggest() {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Already asked? Bail.
    try {
      if (localStorage.getItem(SUGGESTED_KEY)) return;
    } catch { return; }

    // Detect OS/browser language, normalize to 2-letter code
    const raw = (navigator.language || "en").toLowerCase();
    const code = raw.split("-")[0];
    const active = (i18n.language || "en").split("-")[0];

    // If already using their language OR we don't support it, mark asked & bail
    const match = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    if (!match || code === active) {
      try { localStorage.setItem(SUGGESTED_KEY, "1"); } catch { /* noop */ }
      return;
    }

    // Delay slightly so the toast doesn't compete with the first-run tour
    const t = setTimeout(() => {
      toast(`${match.flag} We noticed you speak ${match.label}`, {
        description: "Switch Iron Rabbit's language?",
        duration: 15000,
        action: {
          label: "Switch",
          onClick: () => {
            i18n.changeLanguage(match.code);
            try {
              localStorage.setItem(CURRENT_KEY, match.code);
              localStorage.setItem(SUGGESTED_KEY, "1");
            } catch { /* noop */ }
            document.documentElement.lang = match.code;
            document.documentElement.dir = RTL_LANGS.includes(match.code) ? "rtl" : "ltr";
            toast.success(`${match.flag} ${match.label}`);
          },
        },
        cancel: {
          label: "No thanks",
          onClick: () => {
            try { localStorage.setItem(SUGGESTED_KEY, "1"); } catch { /* noop */ }
          },
        },
        onDismiss: () => {
          try { localStorage.setItem(SUGGESTED_KEY, "1"); } catch { /* noop */ }
        },
        onAutoClose: () => {
          try { localStorage.setItem(SUGGESTED_KEY, "1"); } catch { /* noop */ }
        },
      });
    }, 2500);

    return () => clearTimeout(t);
  }, [i18n]);
}
