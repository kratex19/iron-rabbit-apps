import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import pt from "./locales/pt.json";
import it from "./locales/it.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import hi from "./locales/hi.json";
import ar from "./locales/ar.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English",    flag: "🇺🇸", en: "english" },
  { code: "es", label: "Español",    flag: "🇪🇸", en: "spanish" },
  { code: "fr", label: "Français",   flag: "🇫🇷", en: "french" },
  { code: "de", label: "Deutsch",    flag: "🇩🇪", en: "german" },
  { code: "pt", label: "Português",  flag: "🇧🇷", en: "portuguese" },
  { code: "it", label: "Italiano",   flag: "🇮🇹", en: "italian" },
  { code: "zh", label: "中文",        flag: "🇨🇳", en: "chinese mandarin" },
  { code: "ja", label: "日本語",       flag: "🇯🇵", en: "japanese" },
  { code: "hi", label: "हिन्दी",       flag: "🇮🇳", en: "hindi" },
  { code: "ar", label: "العربية",     flag: "🇸🇦", en: "arabic" },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      pt: { translation: pt },
      it: { translation: it },
      zh: { translation: zh },
      ja: { translation: ja },
      hi: { translation: hi },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "ir_lang",
    },
  });

export default i18n;
