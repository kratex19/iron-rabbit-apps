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
import ru from "./locales/ru.json";
import ko from "./locales/ko.json";
import tr from "./locales/tr.json";
import vi from "./locales/vi.json";
import id from "./locales/id.json";
import th from "./locales/th.json";
import pl from "./locales/pl.json";
import nl from "./locales/nl.json";
import sv from "./locales/sv.json";
import uk from "./locales/uk.json";
import he from "./locales/he.json";
import fa from "./locales/fa.json";
import ur from "./locales/ur.json";
import bn from "./locales/bn.json";
import ms from "./locales/ms.json";

// Right-to-left script languages
export const RTL_LANGS = ["ar", "he", "fa", "ur"];

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English",    flag: "🇺🇸", en: "english" },
  { code: "es", label: "Español",    flag: "🇪🇸", en: "spanish" },
  { code: "fr", label: "Français",   flag: "🇫🇷", en: "french" },
  { code: "de", label: "Deutsch",    flag: "🇩🇪", en: "german" },
  { code: "pt", label: "Português",  flag: "🇧🇷", en: "portuguese" },
  { code: "it", label: "Italiano",   flag: "🇮🇹", en: "italian" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱", en: "dutch" },
  { code: "sv", label: "Svenska",    flag: "🇸🇪", en: "swedish" },
  { code: "pl", label: "Polski",     flag: "🇵🇱", en: "polish" },
  { code: "tr", label: "Türkçe",     flag: "🇹🇷", en: "turkish" },
  { code: "ru", label: "Русский",    flag: "🇷🇺", en: "russian" },
  { code: "uk", label: "Українська", flag: "🇺🇦", en: "ukrainian" },
  { code: "he", label: "עברית",       flag: "🇮🇱", en: "hebrew" },
  { code: "ar", label: "العربية",     flag: "🇸🇦", en: "arabic" },
  { code: "fa", label: "فارسی",       flag: "🇮🇷", en: "persian farsi" },
  { code: "ur", label: "اردو",        flag: "🇵🇰", en: "urdu" },
  { code: "hi", label: "हिन्दी",       flag: "🇮🇳", en: "hindi" },
  { code: "bn", label: "বাংলা",       flag: "🇧🇩", en: "bengali" },
  { code: "th", label: "ไทย",         flag: "🇹🇭", en: "thai" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳", en: "vietnamese" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩", en: "indonesian" },
  { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾", en: "malay" },
  { code: "zh", label: "中文",        flag: "🇨🇳", en: "chinese mandarin" },
  { code: "ja", label: "日本語",       flag: "🇯🇵", en: "japanese" },
  { code: "ko", label: "한국어",       flag: "🇰🇷", en: "korean" },
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
      ru: { translation: ru },
      ko: { translation: ko },
      tr: { translation: tr },
      vi: { translation: vi },
      id: { translation: id },
      th: { translation: th },
      pl: { translation: pl },
      nl: { translation: nl },
      sv: { translation: sv },
      uk: { translation: uk },
      he: { translation: he },
      fa: { translation: fa },
      ur: { translation: ur },
      bn: { translation: bn },
      ms: { translation: ms },
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
